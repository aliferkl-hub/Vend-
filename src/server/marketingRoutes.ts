import { Router, Response } from 'express';
import { db, pool, persistDatabase } from '../db/index.ts';
import {
  marketingCampaigns,
  marketingEvents,
  referrals,
  users,
  stores,
  products,
  orders,
} from '../db/schema.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';
import QRCode from 'qrcode';

const router = Router();

// Helper to sanitize UTM inputs
function cleanStr(val: any, maxLen = 120): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLen) : undefined;
}

// Helper to extract or generate referral code for a user
export function getReferralCodeForUser(userId: number): string {
  return `VEND${userId}`;
}

export function parseReferralCode(code: string): number | null {
  if (!code) return null;
  const match = code.toUpperCase().match(/^VEND(\d+)$/);
  if (match && match[1]) {
    const id = parseInt(match[1], 10);
    return isNaN(id) ? null : id;
  }
  const numeric = parseInt(code, 10);
  return isNaN(numeric) ? null : numeric;
}

// -------------------------------------------------------------
// 1. POST /api/marketing/event & /api/marketing/events — Track visit, action, or conversion
// -------------------------------------------------------------
const trackEventHandler = async (req: AuthRequest, res: Response) => {
  try {
    const {
      sessionId,
      eventType = 'page_view',
      source,
      medium,
      campaign,
      content,
      term,
      landingPath,
      referrerUrl,
      referralCode,
      storeId,
      productId,
      orderId,
      metadata,
    } = req.body;

    const cleanSessionId = cleanStr(sessionId, 80) || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanEventType = cleanStr(eventType, 40) || 'page_view';
    const cleanSource = cleanStr(source, 60);
    const cleanMedium = cleanStr(medium, 60);
    const cleanCampaign = cleanStr(campaign, 80);
    const cleanContent = cleanStr(content, 100);
    const cleanTerm = cleanStr(term, 100);
    const cleanLandingPath = cleanStr(landingPath, 255) || '/';
    const cleanReferrerUrl = cleanStr(referrerUrl, 500);
    const cleanRefCode = cleanStr(referralCode, 50);

    const userId = req.user?.id || (typeof req.body.userId === 'number' ? req.body.userId : null);

    // Insert tracking event
    await db.insert(marketingEvents).values({
      sessionId: cleanSessionId,
      eventType: cleanEventType,
      source: cleanSource,
      medium: cleanMedium,
      campaign: cleanCampaign,
      content: cleanContent,
      term: cleanTerm,
      landingPath: cleanLandingPath,
      referrerUrl: cleanReferrerUrl,
      userId: userId || null,
      referralCode: cleanRefCode || null,
      storeId: typeof storeId === 'number' ? storeId : null,
      productId: typeof productId === 'number' ? productId : null,
      orderId: typeof orderId === 'number' ? orderId : null,
      metadata: metadata ? JSON.stringify(metadata).slice(0, 1000) : null,
    });

    // Update campaign counters if campaign matches
    if (cleanCampaign) {
      if (cleanEventType === 'page_view') {
        await pool.query(
          `UPDATE marketing_campaigns SET clicks_count = clicks_count + 1, updated_at = NOW() WHERE campaign_id = $1`,
          [cleanCampaign]
        );
      } else if (cleanEventType === 'signup' || cleanEventType === 'store_created' || cleanEventType === 'purchase_completed') {
        await pool.query(
          `UPDATE marketing_campaigns SET conversions_count = conversions_count + 1, updated_at = NOW() WHERE campaign_id = $1`,
          [cleanCampaign]
        );
      }
    }

    // Process referral attribution if refCode is present
    if (cleanRefCode) {
      const referrerId = parseReferralCode(cleanRefCode);
      if (referrerId && referrerId !== userId) {
        // Verify referrer exists
        const [refUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, referrerId)).limit(1);
        if (refUser) {
          if (cleanEventType === 'page_view') {
            // Check if visitor session is already registered
            const existingRef = await db
              .select()
              .from(referrals)
              .where(
                and(
                  eq(referrals.referrerId, referrerId),
                  eq(referrals.visitorSessionId, cleanSessionId)
                )
              )
              .limit(1);

            if (existingRef.length === 0) {
              await db.insert(referrals).values({
                referrerId,
                referralCode: cleanRefCode,
                visitorSessionId: cleanSessionId,
                status: 'VISITED',
              });
            }
          } else if (cleanEventType === 'signup' && userId) {
            // Check if already recorded for this referred user
            const existingUserRef = await db
              .select()
              .from(referrals)
              .where(eq(referrals.referredUserId, userId))
              .limit(1);

            if (existingUserRef.length === 0) {
              // Update existing visitor session or insert new
              const existingSession = await db
                .select()
                .from(referrals)
                .where(
                  and(
                    eq(referrals.referrerId, referrerId),
                    eq(referrals.visitorSessionId, cleanSessionId)
                  )
                )
                .limit(1);

              if (existingSession.length > 0) {
                await db
                  .update(referrals)
                  .set({
                    referredUserId: userId,
                    status: 'REGISTERED',
                    firstActionAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(referrals.id, existingSession[0].id));
              } else {
                await db.insert(referrals).values({
                  referrerId,
                  referralCode: cleanRefCode,
                  referredUserId: userId,
                  visitorSessionId: cleanSessionId,
                  status: 'REGISTERED',
                  firstActionAt: new Date(),
                });
              }
            }
          }
        }
      }
    }

    // If an action happens for an authenticated user who was referred previously, update their referral status
    if (userId && (cleanEventType === 'store_created' || cleanEventType === 'purchase_completed')) {
      const userReferral = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referredUserId, userId))
        .limit(1);

      if (userReferral.length > 0) {
        const refRecord = userReferral[0];
        if (cleanEventType === 'store_created') {
          await db
            .update(referrals)
            .set({
              status: refRecord.status === 'PURCHASED' ? 'PURCHASED' : 'STORE_CREATED',
              storesCreatedCount: refRecord.storesCreatedCount + 1,
              updatedAt: new Date(),
            })
            .where(eq(referrals.id, refRecord.id));
        } else if (cleanEventType === 'purchase_completed') {
          await db
            .update(referrals)
            .set({
              status: 'PURCHASED',
              purchasesCount: refRecord.purchasesCount + 1,
              firstPurchaseAt: refRecord.firstPurchaseAt || new Date(),
              updatedAt: new Date(),
            })
            .where(eq(referrals.id, refRecord.id));
        }
      }
    }

    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Marketing] Error logging event:', err);
    res.status(500).json({ error: 'Falha ao registrar evento de marketing.' });
  }
};

router.post('/event', trackEventHandler);
router.post('/events', trackEventHandler);

// -------------------------------------------------------------
// 2. GET /api/marketing/dashboard — Master Owner Real Metrics
// -------------------------------------------------------------
router.get('/dashboard', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Total real visitors & events
    const visitorsRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT session_id) as unique_visitors,
        COUNT(*) as total_page_views
      FROM marketing_events 
      WHERE event_type = 'page_view'
    `);
    const uniqueVisitors = parseInt(visitorsRes.rows[0]?.unique_visitors || '0', 10);
    const totalPageViews = parseInt(visitorsRes.rows[0]?.total_page_views || '0', 10);

    // 2. Real users counts
    const usersCountRes = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'SELLER' OR id IN (SELECT DISTINCT seller_id FROM products) OR id IN (SELECT DISTINCT user_id FROM stores) THEN 1 END) as sellers_count,
        COUNT(CASE WHEN role = 'USER' OR role = 'BUYER' OR id IN (SELECT DISTINCT buyer_id FROM orders) THEN 1 END) as buyers_count
      FROM users
    `);
    const totalUsers = parseInt(usersCountRes.rows[0]?.total_users || '0', 10);
    const sellersCount = parseInt(usersCountRes.rows[0]?.sellers_count || '0', 10);
    const buyersCount = parseInt(usersCountRes.rows[0]?.buyers_count || '0', 10);

    // 3. Real stores count
    const storesCountRes = await pool.query(`SELECT COUNT(*) as total FROM stores`);
    const storesCreated = parseInt(storesCountRes.rows[0]?.total || '0', 10);

    // 4. Real products published count
    const productsCountRes = await pool.query(`SELECT COUNT(*) as total FROM products WHERE status = 'ACTIVE'`);
    const productsPublished = parseInt(productsCountRes.rows[0]?.total || '0', 10);

    // 5. Real orders & conversions
    const ordersCountRes = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status IN ('PAID', 'PREPARING', 'IN_TRANSIT', 'WAITING_CONFIRMATION', 'DELIVERED', 'RECEBIMENTO_VALIDADO') THEN 1 END) as paid_orders
      FROM orders
    `);
    const totalOrders = parseInt(ordersCountRes.rows[0]?.total_orders || '0', 10);
    const paidOrders = parseInt(ordersCountRes.rows[0]?.paid_orders || '0', 10);

    // 6. Conversions from marketing events
    const conversionsRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM marketing_events 
      WHERE event_type IN ('signup', 'store_created', 'purchase_completed')
    `);
    const totalConversions = parseInt(conversionsRes.rows[0]?.count || '0', 10);

    // 7. Funnel: VISITANTE -> CADASTRO -> PRIMEIRA AÇÃO -> LOJA/PRODUTO -> COMPRA
    // Baseline visitors is either uniqueVisitors or at least totalUsers if tracking was added later
    const funnelVisitors = Math.max(uniqueVisitors, totalUsers);
    const funnelSignups = totalUsers;
    const firstActionRes = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM (
        SELECT user_id FROM stores
        UNION
        SELECT seller_id as user_id FROM products
        UNION
        SELECT buyer_id as user_id FROM orders
      ) sub
    `);
    const funnelFirstAction = parseInt(firstActionRes.rows[0]?.count || '0', 10);
    const funnelStoreOrProduct = Math.max(storesCreated, productsPublished > 0 ? 1 : 0);
    const funnelPurchases = paidOrders;

    const funnel = {
      visitors: funnelVisitors,
      signups: funnelSignups,
      firstAction: funnelFirstAction,
      storeOrProduct: funnelStoreOrProduct,
      purchases: funnelPurchases,
      conversionRates: {
        visitorToSignup: funnelVisitors > 0 ? ((funnelSignups / funnelVisitors) * 100).toFixed(1) : '0',
        signupToFirstAction: funnelSignups > 0 ? ((funnelFirstAction / funnelSignups) * 100).toFixed(1) : '0',
        firstActionToStore: funnelFirstAction > 0 ? ((funnelStoreOrProduct / funnelFirstAction) * 100).toFixed(1) : '0',
        storeToPurchase: funnelStoreOrProduct > 0 ? ((funnelPurchases / funnelStoreOrProduct) * 100).toFixed(1) : '0',
        overall: funnelVisitors > 0 ? ((funnelPurchases / funnelVisitors) * 100).toFixed(1) : '0',
      },
    };

    // 8. Breakdown by Channel / Source (Real grouped counts)
    const channelRes = await pool.query(`
      SELECT 
        COALESCE(LOWER(source), 'direto') as channel,
        COUNT(DISTINCT session_id) as visitors,
        COUNT(CASE WHEN event_type = 'signup' THEN 1 END) as signups,
        COUNT(CASE WHEN event_type = 'store_created' THEN 1 END) as stores_created,
        COUNT(CASE WHEN event_type = 'checkout_started' THEN 1 END) as checkout_started,
        COUNT(CASE WHEN event_type = 'purchase_completed' THEN 1 END) as purchases
      FROM marketing_events
      GROUP BY COALESCE(LOWER(source), 'direto')
      ORDER BY visitors DESC
      LIMIT 20
    `);

    // Normalize known channels for UI cards
    const knownChannels = ['instagram', 'tiktok', 'whatsapp', 'facebook', 'youtube', 'google', 'referral', 'direto'];
    const channelMap = new Map<string, any>();
    channelRes.rows.forEach((r) => {
      channelMap.set(r.channel, {
        channel: r.channel,
        visitors: parseInt(r.visitors || '0', 10),
        signups: parseInt(r.signups || '0', 10),
        storesCreated: parseInt(r.stores_created || '0', 10),
        purchases: parseInt(r.purchases || '0', 10),
      });
    });

    const byChannel = knownChannels.map((ch) => {
      return (
        channelMap.get(ch) || {
          channel: ch,
          visitors: 0,
          signups: 0,
          storesCreated: 0,
          purchases: 0,
        }
      );
    });

    // Add any other custom sources found in database
    channelRes.rows.forEach((r) => {
      if (!knownChannels.includes(r.channel)) {
        byChannel.push({
          channel: r.channel,
          visitors: parseInt(r.visitors || '0', 10),
          signups: parseInt(r.signups || '0', 10),
          storesCreated: parseInt(r.stores_created || '0', 10),
          purchases: parseInt(r.purchases || '0', 10),
        });
      }
    });

    // 9. Top Accessed Landing Paths
    const topLinksRes = await pool.query(`
      SELECT 
        landing_path,
        COUNT(*) as hits,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM marketing_events
      WHERE landing_path IS NOT NULL AND landing_path != ''
      GROUP BY landing_path
      ORDER BY hits DESC
      LIMIT 10
    `);

    // 10. Real Campaigns summary
    const campaignsList = await db
      .select()
      .from(marketingCampaigns)
      .orderBy(desc(marketingCampaigns.createdAt))
      .limit(30);

    // 11. Recent 20 marketing events for transparency
    const recentEventsRes = await pool.query(`
      SELECT 
        e.id,
        e.event_type,
        e.source,
        e.medium,
        e.campaign,
        e.landing_path,
        e.referral_code,
        e.created_at,
        u.name as user_name
      FROM marketing_events e
      LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC
      LIMIT 20
    `);

    res.json({
      metrics: {
        uniqueVisitors,
        totalPageViews,
        totalUsers,
        sellersCount,
        buyersCount,
        storesCreated,
        productsPublished,
        totalOrders,
        paidOrders,
        totalConversions,
      },
      funnel,
      byChannel,
      topLinks: topLinksRes.rows,
      campaigns: campaignsList,
      recentEvents: recentEventsRes.rows,
    });
  } catch (err: any) {
    console.error('[Marketing] Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Falha ao carregar dashboard de marketing.' });
  }
});

// -------------------------------------------------------------
// 3. GET & POST /api/marketing/campaigns — Campaign Link Generator
// -------------------------------------------------------------
router.get('/campaigns', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db
      .select()
      .from(marketingCampaigns)
      .orderBy(desc(marketingCampaigns.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar campanhas.' });
  }
});

router.post('/campaigns', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { name, source, medium, content, destination, campaignId } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Nome e canal (source) são obrigatórios.' });
    }

    const cleanName = cleanStr(name, 100)!;
    const cleanSource = cleanStr(source, 60)!.toLowerCase();
    const cleanMedium = cleanStr(medium, 60) || 'social';
    const cleanContent = cleanStr(content, 100);
    const cleanDest = cleanStr(destination, 200) || '/';

    // Auto-generate campaignId if not provided
    const slugId =
      cleanStr(campaignId, 80)?.toLowerCase().replace(/[^a-z0-9_-]/g, '_') ||
      cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const finalCampaignId = `${slugId}_${Date.now().toString(36)}`;

    const [created] = await db
      .insert(marketingCampaigns)
      .values({
        campaignId: finalCampaignId,
        name: cleanName,
        source: cleanSource,
        medium: cleanMedium,
        content: cleanContent,
        destination: cleanDest,
        createdById: req.user!.id,
      })
      .returning();

    persistDatabase();

    // Construct full URL
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const destPath = cleanDest.startsWith('/') ? cleanDest : `/${cleanDest}`;
    const params = new URLSearchParams();
    params.set('utm_source', cleanSource);
    params.set('utm_medium', cleanMedium);
    params.set('utm_campaign', finalCampaignId);
    if (cleanContent) params.set('utm_content', cleanContent);

    const fullUrl = `${baseUrl}${destPath}?${params.toString()}`;
    const qrCodeDataUrl = await QRCode.toDataURL(fullUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    res.json({
      ...created,
      fullUrl,
      qrCodeDataUrl,
    });
  } catch (err: any) {
    console.error('[Marketing] Error creating campaign:', err);
    res.status(500).json({ error: 'Erro ao criar link de campanha.' });
  }
});

// -------------------------------------------------------------
// 4. GET /api/marketing/referrals/my — User's Personal Referrals Area
// -------------------------------------------------------------
router.get('/referrals/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const refCode = getReferralCodeForUser(userId);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const referralLink = `${baseUrl}/?ref=${refCode}&utm_source=user_referral&utm_medium=share`;

    // QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(referralLink, {
      width: 320,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    // Query user referrals
    const referralsList = await pool.query(
      `
      SELECT 
        r.id,
        r.referral_code,
        r.status,
        r.stores_created_count,
        r.purchases_count,
        r.total_spent_cents,
        r.created_at,
        r.first_action_at,
        r.first_purchase_at,
        u.name as referred_name,
        u.email as referred_email
      FROM referrals r
      LEFT JOIN users u ON u.id = r.referred_user_id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
      [userId]
    );

    // Aggregate statistics
    let visitorsCount = 0;
    let registeredCount = 0;
    let storesCreatedTotal = 0;
    let purchasesTotal = 0;

    referralsList.rows.forEach((r) => {
      visitorsCount += 1;
      if (r.status !== 'VISITED') registeredCount += 1;
      storesCreatedTotal += parseInt(r.stores_created_count || '0', 10);
      purchasesTotal += parseInt(r.purchases_count || '0', 10);
    });

    res.json({
      referralCode: refCode,
      referralLink,
      qrCodeDataUrl,
      stats: {
        visitorsCount,
        registeredCount,
        storesCreatedTotal,
        purchasesTotal,
      },
      referrals: referralsList.rows.map((r) => ({
        id: r.id,
        status: r.status,
        referredName: r.referred_name || 'Visitante Convidado',
        createdAt: r.created_at,
        firstActionAt: r.first_action_at,
        storesCreated: r.stores_created_count,
        purchases: r.purchases_count,
      })),
    });
  } catch (err: any) {
    console.error('[Marketing] Error fetching user referrals:', err);
    res.status(500).json({ error: 'Erro ao carregar dados de indicação.' });
  }
});

// -------------------------------------------------------------
// 5. GET /api/marketing/qr-code — Universal QR Code Generator
// -------------------------------------------------------------
router.get('/qr-code', async (req: AuthRequest, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória para gerar QR Code.' });
    }

    const dataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    res.json({ dataUrl, url });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar QR Code.' });
  }
});

export default router;
