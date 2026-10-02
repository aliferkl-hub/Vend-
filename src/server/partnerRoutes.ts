import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, pool } from '../db/index.ts';
import {
  partnerApplications,
  stores,
  products,
  users,
  sellerProspects,
  auditLogs,
  notifications,
  orders,
  categories,
} from '../db/schema.ts';
import { eq, and, desc, sql, inArray, or, ilike } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';

const router = Router();

// ============================================================================
// 1. SOLICITAÇÃO DE PARCERIA ("QUERO SER PARCEIRO VEND+")
// ============================================================================
router.post('/apply', async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      businessName,
      businessType = 'PESSOA_FISICA',
      documentNumber,
      whatsapp,
      email,
      city,
      state,
      category,
      instagram,
      website,
      description,
      productsDescription,
      shippingMethods,
      pixKey,
      pixKeyType,
      referredByPartnerCode,
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return res.status(400).json({ error: 'Nome completo é obrigatório (mínimo 3 caracteres).' });
    }
    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return res.status(400).json({ error: 'Nome da loja ou marca é obrigatório.' });
    }
    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 8) {
      return res.status(400).json({ error: 'WhatsApp de contato é obrigatório.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }
    if (!city || typeof city !== 'string' || !state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Cidade e Estado são obrigatórios.' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Categoria do negócio é obrigatória.' });
    }

    const validBusinessTypes = ['PESSOA_FISICA', 'MEI', 'EMPRESA', 'VENDEDOR_PROFISSIONAL', 'PARCEIRO_COMERCIAL'];
    const cleanBusinessType = validBusinessTypes.includes(businessType) ? businessType : 'PESSOA_FISICA';

    // If MEI or EMPRESA, check if document was provided (recommended but flexible)
    const cleanDoc = documentNumber ? String(documentNumber).trim().replace(/[^\d]/g, '') : null;

    // Detect logged in user or user by email
    let userId = req.user?.id || null;
    let storeId: number | null = null;

    if (!userId && email) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.normalizedEmail, email.trim().toLowerCase()))
        .limit(1);
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (userId) {
      const [userStore] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.userId, userId))
        .limit(1);
      if (userStore) {
        storeId = userStore.id;
      }
    }

    // Insert partner application
    const [application] = await db
      .insert(partnerApplications)
      .values({
        userId,
        storeId,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        businessType: cleanBusinessType,
        documentNumber: cleanDoc,
        whatsapp: whatsapp.trim(),
        email: email.trim().toLowerCase(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        category: category.trim(),
        instagram: instagram ? instagram.trim() : null,
        website: website ? website.trim() : null,
        description: description ? description.trim() : null,
        productsDescription: productsDescription ? productsDescription.trim() : null,
        shippingMethods: shippingMethods ? String(shippingMethods).trim() : 'Correios, Retirada no Local',
        pixKey: pixKey ? pixKey.trim() : null,
        pixKeyType: pixKeyType ? pixKeyType.trim() : null,
        status: 'PENDENTE',
        referredByPartnerCode: referredByPartnerCode ? referredByPartnerCode.trim() : null,
      })
      .returning();

    // Traceability in CRM: record or update in seller_prospects
    try {
      await db.insert(sellerProspects).values({
        businessName: businessName.trim(),
        category: category.trim(),
        publicChannel: instagram ? 'INSTAGRAM' : whatsapp ? 'WHATSAPP' : 'WEBSITE',
        contactHandle: instagram || whatsapp,
        phone: whatsapp.trim(),
        email: email.trim().toLowerCase(),
        estimatedProducts: productsDescription || 'Parceiro Inscrito no Formulário',
        notes: `Origem: Formulário Quero ser Parceiro. Tipo: ${cleanBusinessType}. Local: ${city.trim()}/${state.trim().toUpperCase()}`,
        status: 'NEW',
        inviteCode: referredByPartnerCode || null,
        registeredUserId: userId,
      });
    } catch (crmErr) {
      console.warn('[Partner CRM Note]:', crmErr);
    }

    // In-app notification for the user if authenticated
    if (userId) {
      try {
        await db.insert(notifications).values({
          userId,
          title: 'Solicitação de Parceria Recebida',
          message: `Recebemos sua solicitação para a loja "${businessName}". Nossa equipe avaliará os dados em até 24 horas úteis.`,
          type: 'INFO',
          isRead: false,
        });
      } catch {}
    }

    return res.status(201).json({
      success: true,
      message: 'Solicitação de parceria enviada com sucesso! Analisaremos seu cadastro em até 24 horas úteis.',
      application: {
        id: application.id,
        businessName: application.businessName,
        status: application.status,
        createdAt: application.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Partner Apply] Erro:', err);
    return res.status(500).json({ error: 'Erro ao processar solicitação de parceria.' });
  }
});

// ============================================================================
// 2. MEU STATUS DE PARCERIA (LOGGED-IN USER)
// ============================================================================
router.get('/my-status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Fetch user store if any
    const [store] = await db.select().from(stores).where(eq(stores.userId, userId)).limit(1);

    // Fetch latest partner application
    const [application] = await db
      .select()
      .from(partnerApplications)
      .where(or(eq(partnerApplications.userId, userId), store ? eq(partnerApplications.storeId, store.id) : undefined))
      .orderBy(desc(partnerApplications.createdAt))
      .limit(1);

    return res.json({
      hasStore: !!store,
      store: store || null,
      isVerifiedPartner: store?.isVerifiedPartner || false,
      partnerBadge: store?.partnerBadge || (store?.isVerifiedPartner ? 'PARCEIRO_VERIFICADO' : null),
      partnerInviteCode: store?.partnerInviteCode || null,
      application: application || null,
    });
  } catch (err: any) {
    console.error('[Partner My Status] Erro:', err);
    return res.status(500).json({ error: 'Erro ao verificar status da parceria.' });
  }
});

// ============================================================================
// 3. DIRETÓRIO PÚBLICO: "NEGÓCIOS & PARCEIROS PERTO DE VOCÊ"
// ============================================================================
router.get('/directory', async (req: AuthRequest, res: Response) => {
  try {
    const { city, state, category, search, verifiedOnly } = req.query;

    let queryStr = `
      SELECT 
        s.id,
        s.name,
        s.slug,
        s.logo_url as "logoUrl",
        s.banner_url as "bannerUrl",
        s.description,
        s.category,
        s.location,
        s.city,
        s.state,
        s.rating,
        s.is_verified_partner as "isVerifiedPartner",
        s.partner_type as "partnerType",
        s.partner_badge as "partnerBadge",
        s.shipping_methods as "shippingMethods",
        s.delivery_info as "deliveryInfo",
        s.offers_delivery as "offersDelivery",
        s.offers_pickup as "offersPickup",
        s.followers_count as "followersCount",
        s.created_at as "createdAt",
        (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.status = 'ACTIVE') as "productsCount"
      FROM stores s
      WHERE s.status = 'ACTIVE'
    `;

    const params: any[] = [];
    let pIdx = 1;

    if (verifiedOnly === 'true') {
      queryStr += ` AND s.is_verified_partner = true`;
    }

    if (city && typeof city === 'string' && city.trim()) {
      queryStr += ` AND (LOWER(s.city) = LOWER($${pIdx}) OR LOWER(s.location) LIKE LOWER($${pIdx + 1}))`;
      params.push(city.trim());
      params.push(`%${city.trim()}%`);
      pIdx += 2;
    }

    if (state && typeof state === 'string' && state.trim()) {
      queryStr += ` AND (UPPER(s.state) = UPPER($${pIdx}) OR UPPER(s.location) LIKE UPPER($${pIdx + 1}))`;
      params.push(state.trim());
      params.push(`%${state.trim()}%`);
      pIdx += 2;
    }

    if (category && typeof category === 'string' && category.trim() && category !== 'Todas') {
      queryStr += ` AND LOWER(s.category) = LOWER($${pIdx})`;
      params.push(category.trim());
      pIdx += 1;
    }

    if (search && typeof search === 'string' && search.trim()) {
      queryStr += ` AND (LOWER(s.name) LIKE LOWER($${pIdx}) OR LOWER(s.description) LIKE LOWER($${pIdx}))`;
      params.push(`%${search.trim()}%`);
      pIdx += 1;
    }

    queryStr += ` ORDER BY s.is_verified_partner DESC, s.rating DESC, s.created_at DESC LIMIT 50`;

    const result = await pool.query(queryStr, params);

    // Available categories in existing active stores
    const catResult = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM stores 
      WHERE status = 'ACTIVE' 
      GROUP BY category 
      ORDER BY count DESC
    `);

    // Available cities/states in existing active stores
    const locResult = await pool.query(`
      SELECT DISTINCT COALESCE(city, split_part(location, ',', 1)) as city, 
                      COALESCE(state, trim(split_part(location, ',', 2))) as state, 
                      COUNT(*) as count
      FROM stores
      WHERE status = 'ACTIVE'
      GROUP BY city, state
      ORDER BY count DESC
    `);

    return res.json({
      partners: result.rows,
      total: result.rows.length,
      availableCategories: catResult.rows,
      availableLocations: locResult.rows.filter((r) => r.city && r.city.trim()),
    });
  } catch (err: any) {
    console.error('[Partner Directory] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar negócios parceiros.' });
  }
});

// ============================================================================
// 4. JORNADA "PRIMEIRO VENDEDOR" (10 PASSOS)
// ============================================================================
router.get('/journey', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // 1. Account created
    const step1 = true;

    // 2. Store created
    const [store] = await db.select().from(stores).where(eq(stores.userId, user.id)).limit(1);
    const step2 = !!store;

    // 3. First product added
    let productsCount = 0;
    if (store) {
      const [pCount] = (
        await pool.query(`SELECT COUNT(*) as count FROM products WHERE store_id = $1`, [store.id])
      ).rows;
      productsCount = parseInt(pCount?.count || '0', 10);
    }
    const step3 = productsCount >= 1;

    // 4. Delivery configured
    const step4 = !!(store?.shippingMethods || store?.offersDelivery || store?.offersPickup);

    // 5. Payments / PIX configured
    const [payoutAcc] = (
      await pool.query(
        `SELECT id FROM seller_payout_accounts WHERE seller_id = $1 OR pix_key IS NOT NULL LIMIT 1`,
        [user.id]
      )
    ).rows;
    const [partApp] = (
      await pool.query(
        `SELECT id FROM partner_applications WHERE user_id = $1 AND pix_key IS NOT NULL LIMIT 1`,
        [user.id]
      )
    ).rows;
    const step5 = !!(payoutAcc || partApp);

    // 6. Published in catalog
    let activeProductsCount = 0;
    if (store) {
      const [apCount] = (
        await pool.query(`SELECT COUNT(*) as count FROM products WHERE store_id = $1 AND status = 'ACTIVE'`, [
          store.id,
        ])
      ).rows;
      activeProductsCount = parseInt(apCount?.count || '0', 10);
    }
    const step6 = activeProductsCount >= 1;

    // 7. Store shared
    const [shareEvents] = (
      await pool.query(
        `SELECT COUNT(*) as count FROM marketing_events WHERE user_id = $1 OR (store_id = $2 AND event_type IN ('page_view', 'checkout_started'))`,
        [user.id, store?.id || 0]
      )
    ).rows;
    const step7 = parseInt(shareEvents?.count || '0', 10) > 0;

    // 8. First sale made
    const [salesCount] = (
      await pool.query(
        `SELECT COUNT(*) as count FROM orders WHERE seller_id = $1 AND payment_status = 'APPROVED'`,
        [user.id]
      )
    ).rows;
    const step8 = parseInt(salesCount?.count || '0', 10) >= 1;

    // 9. Delivery completed with 4-digit code
    const [delivConfirmCount] = (
      await pool.query(
        `SELECT COUNT(*) as count FROM orders WHERE seller_id = $1 AND delivery_code_used = true`,
        [user.id]
      )
    ).rows;
    const step9 = parseInt(delivConfirmCount?.count || '0', 10) >= 1;

    // 10. Payout available or completed
    const [payoutsCount] = (
      await pool.query(
        `SELECT COUNT(*) as count FROM payout_requests WHERE seller_id = $1 AND status IN ('APPROVED', 'COMPLETED')`,
        [user.id]
      )
    ).rows;
    const step10 = parseInt(payoutsCount?.count || '0', 10) >= 1;

    const steps = [
      { step: 1, title: 'Criar conta no VEND+', done: step1, desc: 'Cadastro ativo e verificado' },
      { step: 2, title: 'Criar Loja com IA ou Manual', done: step2, desc: store ? `Loja "${store.name}" ativa` : 'Crie sua vitrine em 2 minutos' },
      { step: 3, title: 'Cadastrar primeiro produto', done: step3, desc: `${productsCount} produto(s) cadastrado(s)` },
      { step: 4, title: 'Configurar opções de entrega', done: step4, desc: 'Envio ou retirada no local configurados' },
      { step: 5, title: 'Ativar chave PIX para repasses', done: step5, desc: 'Chave de recebimento configurada com segurança' },
      { step: 6, title: 'Publicar no catálogo público', done: step6, desc: `${activeProductsCount} produto(s) ativo(s) na vitrine` },
      { step: 7, title: 'Divulgar o link da sua loja', done: step7, desc: 'Compartilhe no WhatsApp, Instagram e redes' },
      { step: 8, title: 'Realizar a primeira venda', done: step8, desc: `${salesCount?.count || 0} venda(s) aprovada(s)` },
      { step: 9, title: 'Confirmar entrega por código de 4 dígitos', done: step9, desc: 'Liberação protegida antifraude' },
      { step: 10, title: 'Receber primeiro repasse PIX', done: step10, desc: 'Dinheiro na sua conta sem burocracia' },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    const nextStep = steps.find((s) => !s.done) || null;

    return res.json({
      steps,
      completedCount,
      totalSteps: steps.length,
      progressPercent: Math.round((completedCount / steps.length) * 100),
      nextStep,
    });
  } catch (err: any) {
    console.error('[Partner Journey] Erro:', err);
    return res.status(500).json({ error: 'Erro ao carregar jornada do vendedor.' });
  }
});

// ============================================================================
// 5. MASTER OWNER — ADMINISTRAÇÃO DE PARCEIROS
// ============================================================================
router.get('/admin/applications', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, category, businessType } = req.query;

    let queryStr = `
      SELECT 
        pa.*,
        u.name as "userName",
        u.email as "userEmail",
        s.name as "storeName",
        s.slug as "storeSlug",
        s.is_verified_partner as "isStoreVerified"
      FROM partner_applications pa
      LEFT JOIN users u ON u.id = pa.user_id
      LEFT JOIN stores s ON s.id = pa.store_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let pIdx = 1;

    if (status && typeof status === 'string' && status !== 'ALL') {
      queryStr += ` AND pa.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    if (businessType && typeof businessType === 'string' && businessType !== 'ALL') {
      queryStr += ` AND pa.business_type = $${pIdx}`;
      params.push(businessType);
      pIdx++;
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      queryStr += ` AND pa.category = $${pIdx}`;
      params.push(category);
      pIdx++;
    }

    if (search && typeof search === 'string' && search.trim()) {
      queryStr += ` AND (LOWER(pa.business_name) LIKE LOWER($${pIdx}) OR LOWER(pa.full_name) LIKE LOWER($${pIdx}) OR LOWER(pa.email) LIKE LOWER($${pIdx}))`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    queryStr += ` ORDER BY pa.created_at DESC LIMIT 200`;

    const result = await pool.query(queryStr, params);

    // Counts by status
    const countRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PENDENTE') as pending,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as in_review,
        COUNT(*) FILTER (WHERE status = 'APROVADO') as approved,
        COUNT(*) FILTER (WHERE status = 'RECUSADO') as rejected,
        COUNT(*) FILTER (WHERE status = 'INFO_SOLICITADA') as info_requested
      FROM partner_applications
    `);

    return res.json({
      applications: result.rows,
      counts: countRes.rows[0] || {},
    });
  } catch (err: any) {
    console.error('[Admin Partner Applications] Erro:', err);
    return res.status(500).json({ error: 'Erro ao listar solicitações de parceiros.' });
  }
});

// Update Partner Application Status (Approve, Reject, Request Info)
router.put('/admin/applications/:id/status', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { status, adminNotes, infoRequested } = req.body;
    const reviewer = req.user!;

    const validStatuses = ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'INFO_SOLICITADA'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status de parceiro inválido.' });
    }

    const [app] = await db
      .select()
      .from(partnerApplications)
      .where(eq(partnerApplications.id, appId))
      .limit(1);

    if (!app) {
      return res.status(404).json({ error: 'Solicitação de parceria não encontrada.' });
    }

    // Update application
    const [updatedApp] = await db
      .update(partnerApplications)
      .set({
        status,
        adminNotes: adminNotes !== undefined ? adminNotes : app.adminNotes,
        infoRequested: infoRequested !== undefined ? infoRequested : app.infoRequested,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(partnerApplications.id, appId))
      .returning();

    // If APPROVED: verify the partner's store and upgrade user
    if (status === 'APROVADO') {
      const inviteCode = `parceiro_${crypto.randomBytes(3).toString('hex').toLowerCase()}`;

      // If store exists for this user or application
      if (app.storeId || app.userId) {
        const storeCondition = app.storeId
          ? eq(stores.id, app.storeId)
          : eq(stores.userId, app.userId!);

        const [existingStore] = await db.select().from(stores).where(storeCondition).limit(1);

        if (existingStore) {
          await db
            .update(stores)
            .set({
              isVerifiedPartner: true,
              partnerType: app.businessType,
              partnerBadge: 'PARCEIRO_VERIFICADO',
              partnerApprovedAt: new Date(),
              city: app.city,
              state: app.state,
              shippingMethods: app.shippingMethods || existingStore.shippingMethods,
              partnerInviteCode: existingStore.partnerInviteCode || inviteCode,
              updatedAt: new Date(),
            })
            .where(eq(stores.id, existingStore.id));
        }
      }

      // Upgrade user role if not already MASTER_OWNER
      if (app.userId) {
        await pool.query(
          `UPDATE users SET role = 'SELLER', updated_at = NOW() WHERE id = $1 AND role = 'USER'`,
          [app.userId]
        );

        // Notify user
        await db.insert(notifications).values({
          userId: app.userId,
          title: '🎉 Sua parceria VEND+ foi aprovada!',
          message: `Parabéns! Sua loja "${app.businessName}" agora possui o selo oficial de Parceiro Verificado VEND+. Comece a publicar seu catálogo!`,
          type: 'SUCCESS',
          isRead: false,
        });
      }
    } else if (status === 'INFO_SOLICITADA' && app.userId) {
      await db.insert(notifications).values({
        userId: app.userId,
        title: 'Informações Adicionais para Parceria VEND+',
        message: infoRequested || 'Nossa equipe precisa de informações adicionais para aprovar seu cadastro de parceiro.',
        type: 'WARNING',
        isRead: false,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      userId: reviewer.id,
      action: 'UPDATE_PARTNER_STATUS',
      resource: 'PARTNER_APPLICATION',
      resourceId: appId,
      details: JSON.stringify({
        status,
        businessName: app.businessName,
        reviewedBy: reviewer.email,
        adminNotes,
      }),
      ipAddress: req.ip || null,
    });

    return res.json({
      success: true,
      message: `Status da parceria atualizado para "${status}".`,
      application: updatedApp,
    });
  } catch (err: any) {
    console.error('[Admin Partner Status Update] Erro:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status da parceria.' });
  }
});

export default router;
