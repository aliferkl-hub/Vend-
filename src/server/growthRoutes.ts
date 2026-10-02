import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, pool } from '../db/index.ts';
import {
  affiliates,
  affiliateLinks,
  affiliateClicks,
  affiliateCommissions,
  growthCampaigns,
  interestedLeads,
  sellerProspects,
  products,
  stores,
  users,
  orders,
  categories,
  appSettings,
  payoutRequests,
  auditLogs,
  notifications,
  marketingEvents,
} from '../db/schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';

const router = Router();

// Helper to get app setting value with fallback
export async function getAppSetting(key: string, fallback: string): Promise<string> {
  try {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

// Helper to generate short unique link code
function generateLinkCode(): string {
  return crypto.randomBytes(4).toString('hex').toLowerCase();
}

// ============================================================================
// 1. HUB PÚBLICO E PRODUTOS ELEGÍVEIS (/api/growth/hub)
// ============================================================================
router.get('/hub', async (req: AuthRequest, res: Response) => {
  try {
    // 1. Fetch eligible products for affiliate promotion
    const eligibleProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        priceCents: products.priceCents,
        originalPriceCents: products.originalPriceCents,
        imageUrl: products.imageUrl,
        stock: products.stock,
        condition: products.condition,
        viewsCount: products.viewsCount,
        rating: products.rating,
        allowAffiliates: products.allowAffiliates,
        affiliateCommissionPercent: products.affiliateCommissionPercent,
        storeId: products.storeId,
        sellerId: products.sellerId,
        categoryId: products.categoryId,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.status, 'ACTIVE'), eq(products.allowAffiliates, true)))
      .orderBy(desc(products.viewsCount), desc(products.createdAt))
      .limit(30);

    const defaultAffiliatePercentStr = await getAppSetting('default_affiliate_commission_percent', '10');
    const defaultAffiliatePercent = parseInt(defaultAffiliatePercentStr, 10) || 10;

    const productsWithCommissions = eligibleProducts.map((p) => {
      const commPercent = p.affiliateCommissionPercent || defaultAffiliatePercent;
      const estimatedCommissionCents = Math.round((p.priceCents * commPercent) / 100);
      return {
        ...p,
        effectiveCommissionPercent: commPercent,
        estimatedCommissionCents,
      };
    });

    // 2. Featured real products (only if products exist)
    const featuredProducts = productsWithCommissions.slice(0, 6);

    // 3. Eligible stores
    const eligibleStores = await db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        logoUrl: stores.logoUrl,
        bannerUrl: stores.bannerUrl,
        description: stores.description,
        category: stores.category,
        rating: stores.rating,
      })
      .from(stores)
      .where(eq(stores.status, 'ACTIVE'))
      .limit(12);

    // 4. Active campaigns
    const campaigns = await db
      .select()
      .from(growthCampaigns)
      .where(eq(growthCampaigns.status, 'ACTIVE'))
      .orderBy(desc(growthCampaigns.createdAt))
      .limit(5);

    const isEmpty = productsWithCommissions.length === 0;

    return res.json({
      isEmpty,
      emptyMessage: isEmpty
        ? 'Os primeiros produtos VEND+ aparecerão aqui em breve. Faça parte dos primeiros divulgadores!'
        : null,
      eligibleProducts: productsWithCommissions,
      featuredProducts,
      eligibleStores,
      campaigns,
      defaultAffiliatePercent,
    });
  } catch (err: any) {
    console.error('[Growth Hub] Erro:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados do VEND+ Hub.' });
  }
});

// ============================================================================
// 2. LISTA DE ESPERA / INTERESSADOS (/api/growth/waitlist)
// ============================================================================
router.post('/waitlist', async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, phone, segment = 'BUYER', categoryInterest, notes } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanSegment = ['BUYER', 'SELLER', 'AFFILIATE'].includes(segment) ? segment : 'BUYER';

    // Insert or update lead
    const [lead] = await db
      .insert(interestedLeads)
      .values({
        email: cleanEmail,
        name: typeof name === 'string' ? name.trim().slice(0, 100) : null,
        phone: typeof phone === 'string' ? phone.trim().slice(0, 30) : null,
        segment: cleanSegment,
        categoryInterest: typeof categoryInterest === 'string' ? categoryInterest.trim().slice(0, 100) : null,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
        ipAddress: req.ip || null,
        status: 'PENDING',
      })
      .returning();

    return res.json({
      success: true,
      message: 'Obrigado pelo seu interesse! Avisaremos você em primeira mão.',
      lead: { id: lead.id, email: lead.email, segment: lead.segment },
    });
  } catch (err: any) {
    console.error('[Growth Waitlist] Erro:', err);
    return res.status(500).json({ error: 'Erro ao registrar interesse.' });
  }
});

router.get('/waitlist', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    const leads = await db
      .select()
      .from(interestedLeads)
      .orderBy(desc(interestedLeads.createdAt))
      .limit(200);

    const counts = {
      total: leads.length,
      buyers: leads.filter((l) => l.segment === 'BUYER').length,
      sellers: leads.filter((l) => l.segment === 'SELLER').length,
      affiliates: leads.filter((l) => l.segment === 'AFFILIATE').length,
    };

    return res.json({ counts, leads });
  } catch (err: any) {
    console.error('[Growth Waitlist Admin] Erro:', err);
    return res.status(500).json({ error: 'Erro ao listar lista de espera.' });
  }
});

// ============================================================================
// 3. PROGRAMA DE AFILIADOS — CADASTRO E MEU PAINEL (/api/growth/affiliates)
// ============================================================================
router.post('/affiliates/register', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // Check if already registered
    const [existing] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);
    if (existing) {
      return res.json({
        message: 'Você já é um afiliado oficial VEND+!',
        affiliate: existing,
      });
    }

    // Generate unique affiliate code
    const baseCode = `AF${user.id}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: user.id,
        affiliateCode: baseCode,
        status: 'ACTIVE',
        termsAcceptedAt: new Date(),
        pixKeyType: req.body.pixKeyType || null,
        pixKey: req.body.pixKey ? String(req.body.pixKey).trim() : null,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'AFFILIATE_REGISTERED',
      entityType: 'AFFILIATE',
      entityId: String(newAffiliate.id),
      details: JSON.stringify({ affiliateCode: newAffiliate.affiliateCode }),
      ipAddress: req.ip || null,
    });

    return res.json({
      message: 'Cadastro de afiliado realizado com sucesso! Comece a divulgar produtos e faturar.',
      affiliate: newAffiliate,
    });
  } catch (err: any) {
    console.error('[Affiliate Register] Erro:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar afiliado.' });
  }
});

router.get('/affiliates/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);

    if (!affiliate) {
      return res.json({ isRegistered: false, affiliate: null });
    }

    const minPayoutStr = await getAppSetting('affiliate_min_payout_cents', '5000');
    const minPayoutCents = parseInt(minPayoutStr, 10) || 5000;

    return res.json({
      isRegistered: true,
      affiliate,
      minPayoutCents,
      canRequestPayout: affiliate.availableCommissionCents >= minPayoutCents,
    });
  } catch (err: any) {
    console.error('[Affiliate Me] Erro:', err);
    return res.status(500).json({ error: 'Erro ao obter dados de afiliado.' });
  }
});

router.put('/affiliates/pix-key', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { pixKeyType, pixKey } = req.body;

    if (!pixKey || !pixKeyType) {
      return res.status(400).json({ error: 'Tipo e chave PIX são obrigatórios.' });
    }

    const [updated] = await db
      .update(affiliates)
      .set({
        pixKeyType: String(pixKeyType).trim(),
        pixKey: String(pixKey).trim(),
        updatedAt: new Date(),
      })
      .where(eq(affiliates.userId, user.id))
      .returning();

    return res.json({ success: true, affiliate: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar chave PIX.' });
  }
});

// Gerador de links rastreáveis de afiliado
router.post('/affiliates/links', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { productId, storeId, customName } = req.body;

    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);
    if (!affiliate) {
      return res.status(403).json({ error: 'Você precisa se cadastrar como afiliado primeiro.' });
    }

    let destinationPath = '/hub';
    let prodRecord = null;
    let storeRecord = null;

    if (productId) {
      [prodRecord] = await db.select().from(products).where(eq(products.id, Number(productId))).limit(1);
      if (!prodRecord) return res.status(404).json({ error: 'Produto não encontrado.' });
      destinationPath = `/produto/${prodRecord.slug || prodRecord.id}`;
    } else if (storeId) {
      [storeRecord] = await db.select().from(stores).where(eq(stores.id, Number(storeId))).limit(1);
      if (!storeRecord) return res.status(404).json({ error: 'Loja não encontrada.' });
      destinationPath = `/loja/${storeRecord.slug}`;
    }

    const code = generateLinkCode();
    const destinationUrl = `${destinationPath}?af=${affiliate.affiliateCode}`;

    const [link] = await db
      .insert(affiliateLinks)
      .values({
        affiliateId: affiliate.id,
        productId: prodRecord ? prodRecord.id : null,
        storeId: storeRecord ? storeRecord.id : null,
        code,
        customName: customName ? String(customName).trim().slice(0, 80) : (prodRecord ? prodRecord.name : 'Link VEND+'),
        destinationUrl,
      })
      .returning();

    const origin = req.get('origin') || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const fullTrackedUrl = `${origin}/af/${code}`;

    return res.json({
      link,
      fullTrackedUrl,
      directUrl: `${origin}${destinationUrl}`,
    });
  } catch (err: any) {
    console.error('[Affiliate Create Link] Erro:', err);
    return res.status(500).json({ error: 'Erro ao gerar link de afiliado.' });
  }
});

router.get('/affiliates/links', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);
    if (!affiliate) return res.json({ links: [] });

    const links = await db
      .select({
        id: affiliateLinks.id,
        code: affiliateLinks.code,
        customName: affiliateLinks.customName,
        destinationUrl: affiliateLinks.destinationUrl,
        clicksCount: affiliateLinks.clicksCount,
        conversionsCount: affiliateLinks.conversionsCount,
        createdAt: affiliateLinks.createdAt,
        productName: products.name,
        productPriceCents: products.priceCents,
        productImage: products.imageUrl,
      })
      .from(affiliateLinks)
      .leftJoin(products, eq(affiliateLinks.productId, products.id))
      .where(eq(affiliateLinks.affiliateId, affiliate.id))
      .orderBy(desc(affiliateLinks.createdAt));

    const origin = req.get('origin') || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const linksWithFullUrl = links.map((l) => ({
      ...l,
      fullUrl: `${origin}/af/${l.code}`,
    }));

    return res.json({ links: linksWithFullUrl });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar links de afiliado.' });
  }
});

// Comissões do afiliado
router.get('/affiliates/commissions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);
    if (!affiliate) return res.json({ commissions: [] });

    const comms = await db
      .select({
        id: affiliateCommissions.id,
        orderId: affiliateCommissions.orderId,
        grossAmountCents: affiliateCommissions.grossAmountCents,
        commissionPercent: affiliateCommissions.commissionPercent,
        commissionCents: affiliateCommissions.commissionCents,
        status: affiliateCommissions.status,
        availableAt: affiliateCommissions.availableAt,
        paidAt: affiliateCommissions.paidAt,
        createdAt: affiliateCommissions.createdAt,
        orderNumber: orders.orderNumber,
        productName: products.name,
      })
      .from(affiliateCommissions)
      .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
      .leftJoin(products, eq(affiliateCommissions.productId, products.id))
      .where(eq(affiliateCommissions.affiliateId, affiliate.id))
      .orderBy(desc(affiliateCommissions.createdAt));

    return res.json({ commissions: comms });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar comissões.' });
  }
});

// Solicitação de repasse / saque da comissão disponível
router.post('/affiliates/payout-request', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, user.id)).limit(1);

    if (!affiliate) {
      return res.status(403).json({ error: 'Conta de afiliado não encontrada.' });
    }

    if (!affiliate.pixKey) {
      return res.status(400).json({ error: 'Cadastre sua chave PIX antes de solicitar o repasse.' });
    }

    const minPayoutStr = await getAppSetting('affiliate_min_payout_cents', '5000');
    const minPayoutCents = parseInt(minPayoutStr, 10) || 5000;

    const requestedAmount = req.body.amountCents ? parseInt(req.body.amountCents, 10) : affiliate.availableCommissionCents;

    if (requestedAmount < minPayoutCents) {
      return res.status(400).json({
        error: `O valor mínimo para solicitação de repasse é ${(minPayoutCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      });
    }

    if (requestedAmount > affiliate.availableCommissionCents) {
      return res.status(400).json({ error: 'Saldo de comissão disponível insuficiente.' });
    }

    // Create payout request in main table
    const requestNumber = `REQ-AF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const [reqRow] = await db
      .insert(payoutRequests)
      .values({
        requestNumber,
        sellerId: user.id, // mapped to user
        amountCents: requestedAmount,
        netAmountCents: requestedAmount,
        status: 'REQUESTED',
        receiptSnapshot: JSON.stringify({
          type: 'AFFILIATE_COMMISSION_PAYOUT',
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          pixKeyType: affiliate.pixKeyType,
          pixKey: affiliate.pixKey,
          userName: user.name,
        }),
      })
      .returning();

    // Deduct available balance and add to pending payout
    await db
      .update(affiliates)
      .set({
        availableCommissionCents: affiliate.availableCommissionCents - requestedAmount,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'AFFILIATE_PAYOUT_REQUESTED',
      entityType: 'PAYOUT_REQUEST',
      entityId: String(reqRow.id),
      details: JSON.stringify({ amountCents: requestedAmount, requestNumber }),
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: 'Solicitação de repasse via PIX enviada com sucesso! O processamento ocorre após análise antifraude.',
      request: reqRow,
    });
  } catch (err: any) {
    console.error('[Affiliate Payout Request] Erro:', err);
    return res.status(500).json({ error: 'Erro ao solicitar repasse de comissão.' });
  }
});

// Registro de clique de afiliado via API ou redirecionamento (/af/:code)
router.post('/affiliates/track-click', async (req: AuthRequest, res: Response) => {
  try {
    const { code, affiliateCode, productId, landingPath, source, medium, campaign, sessionId } = req.body;

    let targetAffiliate: any = null;
    let targetLink: any = null;

    if (code) {
      [targetLink] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.code, String(code).trim())).limit(1);
      if (targetLink) {
        [targetAffiliate] = await db.select().from(affiliates).where(eq(affiliates.id, targetLink.affiliateId)).limit(1);
      }
    } else if (affiliateCode) {
      [targetAffiliate] = await db.select().from(affiliates).where(eq(affiliates.affiliateCode, String(affiliateCode).trim().toUpperCase())).limit(1);
    }

    if (!targetAffiliate || targetAffiliate.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Afiliado não encontrado ou inativo.' });
    }

    const sessId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const prodId = productId || (targetLink ? targetLink.productId : null);

    // Record click
    await db.insert(affiliateClicks).values({
      affiliateId: targetAffiliate.id,
      affiliateLinkId: targetLink ? targetLink.id : null,
      productId: prodId ? Number(prodId) : null,
      sessionId: sessId,
      ipHash: req.ip ? crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 16) : null,
      source: source || 'social',
      medium: medium || 'share',
      campaign: campaign || null,
      landingPath: landingPath || '/',
    });

    // Increment counters
    await db
      .update(affiliates)
      .set({
        totalClicks: targetAffiliate.totalClicks + 1,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, targetAffiliate.id));

    if (targetLink) {
      await db
        .update(affiliateLinks)
        .set({
          clicksCount: targetLink.clicksCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(affiliateLinks.id, targetLink.id));
    }

    return res.json({
      success: true,
      affiliateCode: targetAffiliate.affiliateCode,
      destinationUrl: targetLink ? targetLink.destinationUrl : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao registrar clique de afiliado.' });
  }
});

// ============================================================================
// 4. CONFIGURAÇÃO DE AFILIADO PELO VENDEDOR NO PRODUTO
// ============================================================================
router.put('/seller/product-affiliate/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { productId } = req.params;
    const { allowAffiliates, affiliateCommissionPercent } = req.body;

    const [prod] = await db.select().from(products).where(eq(products.id, parseInt(productId, 10))).limit(1);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });

    if (prod.sellerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    const cleanPercent = typeof affiliateCommissionPercent === 'number'
      ? Math.max(1, Math.min(50, affiliateCommissionPercent))
      : null;

    const [updated] = await db
      .update(products)
      .set({
        allowAffiliates: typeof allowAffiliates === 'boolean' ? allowAffiliates : prod.allowAffiliates,
        affiliateCommissionPercent: cleanPercent,
        updatedAt: new Date(),
      })
      .where(eq(products.id, prod.id))
      .returning();

    return res.json({ success: true, product: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao configurar afiliação do produto.' });
  }
});

// ============================================================================
// 5. MASTER OWNER — GROWTH DASHBOARD & FUNIL REAL (/api/growth/dashboard)
// ============================================================================
router.get('/dashboard', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    // Real counts
    const [usersCountRes] = (await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'SELLER') as sellers,
        COUNT(*) FILTER (WHERE role = 'BUYER' OR role = 'USER') as buyers
      FROM users
    `)).rows;

    const [affiliatesCountRes] = (await pool.query(`
      SELECT 
        COUNT(*) as total_affiliates,
        COALESCE(SUM(total_clicks), 0) as total_clicks,
        COALESCE(SUM(total_orders), 0) as total_orders,
        COALESCE(SUM(total_sales_cents), 0) as total_sales_cents,
        COALESCE(SUM(pending_commission_cents), 0) as pending_commission_cents,
        COALESCE(SUM(available_commission_cents), 0) as available_commission_cents,
        COALESCE(SUM(paid_commission_cents), 0) as paid_commission_cents
      FROM affiliates
    `)).rows;

    const [storesCountRes] = (await pool.query(`SELECT COUNT(*) as total FROM stores WHERE status = 'ACTIVE'`)).rows;
    const [productsCountRes] = (await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE allow_affiliates = true) as eligible_for_affiliates
      FROM products WHERE status = 'ACTIVE'
    `)).rows;

    const [ordersCountRes] = (await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE payment_status = 'APPROVED') as paid_orders,
        COALESCE(SUM(total_gross_cents) FILTER (WHERE payment_status = 'APPROVED'), 0) as gmv_cents,
        COALESCE(SUM(commission_cents) FILTER (WHERE payment_status = 'APPROVED'), 0) as platform_revenue_cents
      FROM orders
    `)).rows;

    const [visitorsCountRes] = (await pool.query(`
      SELECT COUNT(DISTINCT session_id) as unique_visitors, COUNT(*) as page_views
      FROM marketing_events
    `)).rows;

    const totalVisitors = parseInt(visitorsCountRes?.unique_visitors || '0', 10);
    const totalUsers = parseInt(usersCountRes?.total || '0', 10);
    const totalSellers = parseInt(usersCountRes?.sellers || '0', 10);
    const totalProducts = parseInt(productsCountRes?.total || '0', 10);
    const totalAffiliates = parseInt(affiliatesCountRes?.total_affiliates || '0', 10);
    const totalClicks = parseInt(affiliatesCountRes?.total_clicks || '0', 10);
    const totalOrders = parseInt(ordersCountRes?.total_orders || '0', 10);
    const totalPaidOrders = parseInt(ordersCountRes?.paid_orders || '0', 10);

    // Real Funnel: VISITANTES -> CADASTROS -> VENDEDORES -> PRODUTOS -> AFILIADOS -> CLIQUES -> PEDIDOS -> VENDAS
    const funnel = [
      { step: '1. Visitantes Únicos', count: totalVisitors, desc: 'Sessões rastreadas no VEND+' },
      { step: '2. Cadastros Reais', count: totalUsers, desc: 'Contas criadas na plataforma' },
      { step: '3. Vendedores', count: totalSellers, desc: 'Lojistas e vendedores' },
      { step: '4. Produtos Publicados', count: totalProducts, desc: 'Itens ativos no catálogo' },
      { step: '5. Afiliados / Divulgadores', count: totalAffiliates, desc: 'Rede ativa de afiliados' },
      { step: '6. Cliques em Links', count: totalClicks, desc: 'Tráfego gerado por divulgação' },
      { step: '7. Pedidos Criados', count: totalOrders, desc: 'Checkouts gerados' },
      { step: '8. Vendas Concluídas', count: totalPaidOrders, desc: 'Pedidos pagos e confirmados' },
    ];

    // List top affiliates
    const topAffiliates = await db
      .select({
        id: affiliates.id,
        affiliateCode: affiliates.affiliateCode,
        status: affiliates.status,
        totalClicks: affiliates.totalClicks,
        totalOrders: affiliates.totalOrders,
        totalSalesCents: affiliates.totalSalesCents,
        pendingCommissionCents: affiliates.pendingCommissionCents,
        availableCommissionCents: affiliates.availableCommissionCents,
        paidCommissionCents: affiliates.paidCommissionCents,
        userName: users.name,
        userEmail: users.email,
      })
      .from(affiliates)
      .leftJoin(users, eq(affiliates.userId, users.id))
      .orderBy(desc(affiliates.totalSalesCents), desc(affiliates.totalClicks))
      .limit(10);

    return res.json({
      metrics: {
        visitors: totalVisitors,
        users: totalUsers,
        sellers: totalSellers,
        buyers: parseInt(usersCountRes?.buyers || '0', 10),
        stores: parseInt(storesCountRes?.total || '0', 10),
        products: totalProducts,
        affiliateEligibleProducts: parseInt(productsCountRes?.eligible_for_affiliates || '0', 10),
        affiliates: totalAffiliates,
        affiliateClicks: totalClicks,
        orders: totalOrders,
        paidOrders: totalPaidOrders,
        gmvCents: parseInt(ordersCountRes?.gmv_cents || '0', 10),
        platformRevenueCents: parseInt(ordersCountRes?.platform_revenue_cents || '0', 10),
        affiliateCommissionsPendingCents: parseInt(affiliatesCountRes?.pending_commission_cents || '0', 10),
        affiliateCommissionsAvailableCents: parseInt(affiliatesCountRes?.available_commission_cents || '0', 10),
        affiliateCommissionsPaidCents: parseInt(affiliatesCountRes?.paid_commission_cents || '0', 10),
      },
      funnel,
      topAffiliates,
    });
  } catch (err: any) {
    console.error('[Growth Dashboard] Erro:', err);
    return res.status(500).json({ error: 'Erro ao gerar dashboard de Growth.' });
  }
});

// ============================================================================
// 6. MASTER OWNER — VEND+ RADAR COM DADOS REAIS (/api/growth/radar)
// ============================================================================
router.get('/radar', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    // 1. Most viewed products
    const mostViewed = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        viewsCount: products.viewsCount,
        priceCents: products.priceCents,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(eq(products.status, 'ACTIVE'))
      .orderBy(desc(products.viewsCount))
      .limit(5);

    // 2. Categories without products
    const emptyCategoriesRes = await pool.query(`
      SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.slug
      HAVING COUNT(p.id) = 0
      LIMIT 10
    `);

    // 3. Products without affiliate promotion enabled
    const productsWithoutAffiliates = await db
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.priceCents,
        viewsCount: products.viewsCount,
      })
      .from(products)
      .where(and(eq(products.status, 'ACTIVE'), eq(products.allowAffiliates, false)))
      .limit(10);

    // 4. Inactive sellers (sellers without active products)
    const inactiveSellersRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, COUNT(p.id) as active_products
      FROM users u
      LEFT JOIN products p ON p.seller_id = u.id AND p.status = 'ACTIVE'
      WHERE u.role = 'SELLER'
      GROUP BY u.id, u.name, u.email, u.phone
      HAVING COUNT(p.id) = 0
      LIMIT 10
    `);

    const hasEnoughData = mostViewed.length > 0 || emptyCategoriesRes.rows.length > 0;

    return res.json({
      hasEnoughData,
      mostViewed,
      emptyCategories: emptyCategoriesRes.rows,
      productsWithoutAffiliates,
      inactiveSellers: inactiveSellersRes.rows,
      notice: !hasEnoughData ? 'Dados insuficientes no momento para mapear tendências complexas.' : null,
    });
  } catch (err: any) {
    console.error('[Growth Radar] Erro:', err);
    return res.status(500).json({ error: 'Erro ao gerar Radar de oportunidades.' });
  }
});

// ============================================================================
// 7. MASTER OWNER — PROSPECÇÃO DE VENDEDORES CRM (/api/growth/prospects)
// ============================================================================
router.get('/prospects', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(sellerProspects).orderBy(desc(sellerProspects.createdAt)).limit(100);
    return res.json({ prospects: list });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar prospecções.' });
  }
});

router.post('/prospects', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { businessName, category, publicChannel = 'INSTAGRAM', contactHandle, phone, email, estimatedProducts, notes } = req.body;

    if (!businessName || !category) {
      return res.status(400).json({ error: 'Nome comercial e categoria são obrigatórios.' });
    }

    const inviteCode = `CONVITE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const [prospect] = await db
      .insert(sellerProspects)
      .values({
        businessName: String(businessName).trim().slice(0, 100),
        category: String(category).trim().slice(0, 100),
        publicChannel: String(publicChannel).trim(),
        contactHandle: contactHandle ? String(contactHandle).trim().slice(0, 100) : null,
        phone: phone ? String(phone).trim().slice(0, 30) : null,
        email: email ? String(email).trim().toLowerCase().slice(0, 100) : null,
        estimatedProducts: estimatedProducts ? String(estimatedProducts).trim() : null,
        notes: notes ? String(notes).trim().slice(0, 500) : null,
        status: 'NEW',
        inviteCode,
      })
      .returning();

    return res.json({ success: true, prospect });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao cadastrar prospecção.' });
  }
});

router.put('/prospects/:id', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, contactHandle, phone, email } = req.body;

    const [updated] = await db
      .update(sellerProspects)
      .set({
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
        contactHandle: contactHandle !== undefined ? contactHandle : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        lastContactAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sellerProspects.id, parseInt(id, 10)))
      .returning();

    return res.json({ success: true, prospect: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar prospecção.' });
  }
});

router.delete('/prospects/:id', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(sellerProspects).where(eq(sellerProspects.id, parseInt(id, 10)));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao remover prospecção.' });
  }
});

// ============================================================================
// 8. MASTER OWNER — CAMPANHAS DE GROWTH (/api/growth/campaigns)
// ============================================================================
router.get('/campaigns', async (_req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(growthCampaigns).orderBy(desc(growthCampaigns.createdAt)).limit(50);
    return res.json({ campaigns: list });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar campanhas de Growth.' });
  }
});

router.post('/campaigns', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { name, targetAudience = 'ALL', targetCategory, benefitType = 'COMMISSION', benefitValue, startDate, endDate } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome da campanha é obrigatório.' });

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    const [campaign] = await db
      .insert(growthCampaigns)
      .values({
        name: String(name).trim(),
        slug,
        targetAudience,
        targetCategory: targetCategory ? String(targetCategory).trim() : null,
        benefitType,
        benefitValue: benefitValue ? String(benefitValue).trim() : null,
        status: 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    return res.json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar campanha de Growth.' });
  }
});

// ============================================================================
// 9. MASTER OWNER — CONFIGURAÇÕES DE COMISSÕES E ANTIFRAUDE (/api/growth/config)
// ============================================================================
router.get('/config', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    const platformComm = await getAppSetting('platform_commission_percent', '7');
    const defaultAffiliateComm = await getAppSetting('default_affiliate_commission_percent', '10');
    const attributionModel = await getAppSetting('affiliate_attribution_model', 'LAST_CLICK');
    const cookieDays = await getAppSetting('affiliate_cookie_days', '30');
    const minPayout = await getAppSetting('affiliate_min_payout_cents', '5000');
    const preventSelfReferral = await getAppSetting('affiliate_prevent_self_referral', 'true');

    return res.json({
      platformCommissionPercent: parseInt(platformComm, 10),
      defaultAffiliateCommissionPercent: parseInt(defaultAffiliateComm, 10),
      attributionModel,
      cookieDays: parseInt(cookieDays, 10),
      minPayoutCents: parseInt(minPayout, 10),
      preventSelfReferral: preventSelfReferral === 'true',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao carregar configurações de Growth.' });
  }
});

router.put('/config', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const {
      platformCommissionPercent,
      defaultAffiliateCommissionPercent,
      attributionModel,
      cookieDays,
      minPayoutCents,
      preventSelfReferral,
    } = req.body;

    const updates: Array<{ key: string; value: string; desc: string }> = [];

    if (platformCommissionPercent !== undefined) {
      updates.push({
        key: 'platform_commission_percent',
        value: String(Math.max(1, Math.min(50, Number(platformCommissionPercent)))),
        desc: 'Comissão da plataforma (%)',
      });
    }

    if (defaultAffiliateCommissionPercent !== undefined) {
      updates.push({
        key: 'default_affiliate_commission_percent',
        value: String(Math.max(1, Math.min(50, Number(defaultAffiliateCommissionPercent)))),
        desc: 'Comissão padrão do afiliado (%)',
      });
    }

    if (attributionModel) {
      updates.push({
        key: 'affiliate_attribution_model',
        value: String(attributionModel),
        desc: 'Modelo de atribuição de comissão',
      });
    }

    if (cookieDays !== undefined) {
      updates.push({
        key: 'affiliate_cookie_days',
        value: String(Math.max(1, Math.min(365, Number(cookieDays)))),
        desc: 'Validade do clique em dias',
      });
    }

    if (minPayoutCents !== undefined) {
      updates.push({
        key: 'affiliate_min_payout_cents',
        value: String(Math.max(1000, Number(minPayoutCents))),
        desc: 'Valor mínimo para repasse em centavos',
      });
    }

    if (preventSelfReferral !== undefined) {
      updates.push({
        key: 'affiliate_prevent_self_referral',
        value: preventSelfReferral ? 'true' : 'false',
        desc: 'Impede o afiliado de comprar no próprio link',
      });
    }

    for (const u of updates) {
      await pool.query(
        `INSERT INTO app_settings (key, value, description, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [u.key, u.value, u.desc]
      );
    }

    return res.json({ success: true, message: 'Configurações atualizadas com sucesso!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

export default router;
