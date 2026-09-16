import { Router } from 'express';
import { db, persistDatabase } from '../db/index.ts';
import {
  users,
  products,
  services,
  orders,
  commissions,
  categories,
  plans,
  stores,
  payments,
  subscriptions,
  deliveryDrivers,
  appSettings,
  auditLogs,
} from '../db/schema.ts';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import { AuthRequest, requireMasterOwner } from '../middleware/auth.ts';

const router = Router();

// 1. DASHBOARD METRICS (GMV, commissions, counts, plans, pix, mercadopago)
router.get('/metrics', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    // Total users
    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);

    // Total products
    const [{ totalProducts }] = await db.select({ totalProducts: count() }).from(products);
    const allProducts = await db.select().from(products);
    const inStockProducts = allProducts.filter((p) => p.stock > 0).length;
    const outOfStockProducts = allProducts.filter((p) => p.stock <= 0).length;

    // Total services
    const [{ totalServices }] = await db.select({ totalServices: count() }).from(services);

    // Total stores
    const [{ totalStores }] = await db.select({ totalStores: count() }).from(stores);
    const allStores = await db.select().from(stores).orderBy(desc(stores.createdAt)).limit(20);

    // Total orders
    const [{ totalOrders }] = await db.select({ totalOrders: count() }).from(orders);

    // Financial calculations: GMV & Commissions
    const ordersResult = await db.select().from(orders);
    const paidOrders = ordersResult.filter(
      (o) => o.status !== 'CANCELLED' && o.status !== 'AWAITING_PAYMENT'
    );

    const gmvCents = paidOrders.reduce((sum, o) => sum + o.totalGrossCents, 0);
    const commissionsCents = paidOrders.reduce((sum, o) => sum + o.commissionCents, 0);
    const sellersNetCents = paidOrders.reduce((sum, o) => sum + o.sellerNetCents, 0);

    // Subscriptions & Plans
    const allSubscriptions = await db.select().from(subscriptions);
    const activeSubscriptions = allSubscriptions.filter((s) => s.status === 'ACTIVE').length;
    const plansSold = allSubscriptions.length;

    // Payments (PIX & Mercado Pago)
    const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const pixPayments = allPayments.filter((p) => p.paymentMethod === 'PIX');
    const pixApproved = pixPayments.filter((p) => p.status === 'APPROVED');
    const pixPending = pixPayments.filter((p) => p.status === 'PENDING');
    const pixRevenueCents = pixApproved.reduce((sum, p) => sum + p.amountCents, 0);

    const mpPayments = allPayments.filter((p) => p.paymentMethod === 'MERCADO_PAGO');
    const mpApproved = mpPayments.filter((p) => p.status === 'APPROVED');
    const mpRevenueCents = mpApproved.reduce((sum, p) => sum + p.amountCents, 0);

    // Plans revenue
    const planPayments = allPayments.filter(
      (p) => p.paymentType === 'SUBSCRIPTION' && p.status === 'APPROVED'
    );
    const plansRevenueCents = planPayments.reduce((sum, p) => sum + p.amountCents, 0);

    // Total platform gross revenue (commissions + plan subscriptions)
    const totalPlatformRevenueCents = commissionsCents + plansRevenueCents;

    // Recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalGrossCents: orders.totalGrossCents,
        commissionCents: orders.commissionCents,
        sellerNetCents: orders.sellerNetCents,
        deliveryCode: orders.deliveryCode,
        deliveryCodeUsed: orders.deliveryCodeUsed,
        createdAt: orders.createdAt,
        buyer: { name: users.name, email: users.email },
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return res.json({
      metrics: {
        totalUsers: Number(totalUsers),
        totalProducts: Number(totalProducts),
        inStockProducts,
        outOfStockProducts,
        totalServices: Number(totalServices),
        totalStores: Number(totalStores),
        totalOrders: Number(totalOrders),
        paidOrdersCount: paidOrders.length,
        gmvCents,
        commissionsCents,
        sellersNetCents,
        plansSold,
        activeSubscriptions,
        plansRevenueCents,
        totalPlatformRevenueCents,
        pix: {
          key: '11973479473',
          totalCount: pixPayments.length,
          approvedCount: pixApproved.length,
          pendingCount: pixPending.length,
          revenueCents: pixRevenueCents,
        },
        mercadoPago: {
          status: 'ONLINE',
          configured: true,
          totalCount: mpPayments.length,
          approvedCount: mpApproved.length,
          revenueCents: mpRevenueCents,
        },
      },
      recentOrders,
      recentStores: allStores,
      recentPayments: allPayments.slice(0, 15),
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    return res.status(500).json({ error: 'Erro ao carregar métricas administrativas.' });
  }
});

// 2. FINANCIAL REPORT (Section 38)
router.get('/financial-report', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalGrossCents: orders.totalGrossCents,
        commissionCents: orders.commissionCents,
        sellerNetCents: orders.sellerNetCents,
        shippingFeeCents: orders.shippingFeeCents,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        buyer: { id: users.id, name: users.name, email: users.email },
        commission: commissions,
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(commissions, eq(orders.id, commissions.orderId))
      .orderBy(desc(orders.createdAt));

    return res.json(list);
  } catch (err) {
    console.error('Financial report error:', err);
    return res.status(500).json({ error: 'Erro ao carregar relatório financeiro.' });
  }
});

// 3. USERS MANAGEMENT
router.get('/users', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
    return res.json(list);
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// 4. UPDATE USER ROLE OR STATUS (Block/Suspend)
router.patch('/users/:id', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, status, planSlug } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (role && ['USER', 'MASTER_OWNER', 'DELIVERY_DRIVER'].includes(role)) {
      updates.role = role;
    }
    if (status && ['ACTIVE', 'SUSPENDED', 'BLOCKED'].includes(status)) {
      updates.status = status;
    }
    if (planSlug) {
      updates.planSlug = planSlug;
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, parseInt(id))).returning();
    persistDatabase();

    return res.json({ message: 'Usuário atualizado com sucesso!', user: updated });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// 5. UPDATE PLANS (Master Owner can edit price, commission, limits)
router.patch('/plans/:id', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { priceCents, commissionPercent, maxActiveListings, features, status } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (priceCents !== undefined) updates.priceCents = parseInt(priceCents);
    if (commissionPercent !== undefined) updates.commissionPercent = parseInt(commissionPercent);
    if (maxActiveListings !== undefined) updates.maxActiveListings = parseInt(maxActiveListings);
    if (features) updates.features = typeof features === 'string' ? features : JSON.stringify(features);
    if (status) updates.status = status;

    const [updated] = await db.update(plans).set(updates).where(eq(plans.id, parseInt(id))).returning();

    return res.json({ message: 'Plano atualizado com sucesso!', plan: updated });
  } catch (err) {
    console.error('Update plan error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar plano.' });
  }
});

// 6. CLEAR DEMO DATA (Section 48)
router.post('/clear-demo-data', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    // Delete demo products
    await db.delete(products).where(eq(products.isDemo, true));
    // Delete demo services
    await db.delete(services).where(eq(services.isDemo, true));

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'CLEAR_DEMO_DATA',
      entityType: 'CATALOG',
      details: 'Dados de demonstração removidos pelo Master Owner.',
    });

    return res.json({ message: 'Todos os dados de demonstração foram limpos com sucesso do banco de dados.' });
  } catch (err) {
    console.error('Clear demo data error:', err);
    return res.status(500).json({ error: 'Erro ao limpar dados de demonstração.' });
  }
});

// 7. IMPORT CATALOG FEED (Section 66)
router.post('/import-feed', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const { feedJson } = req.body;
    if (!feedJson) {
      return res.status(400).json({ error: 'JSON do feed é obrigatório.' });
    }

    let parsedItems: any[];
    try {
      parsedItems = typeof feedJson === 'string' ? JSON.parse(feedJson) : feedJson;
    } catch {
      return res.status(400).json({ error: 'Formato JSON inválido.' });
    }

    if (!Array.isArray(parsedItems)) {
      return res.status(400).json({ error: 'O feed deve ser uma lista (array) de produtos.' });
    }

    const inserted: any[] = [];
    const rejected: any[] = [];

    // Get categories map
    const catList = await db.select().from(categories);
    const catMap = new Map(catList.map((c) => [c.slug.toLowerCase(), c.id]));

    for (const item of parsedItems) {
      const { name, imageUrl, categorySlug, priceCents, description, stock = 1, location = 'Brasil' } = item;

      // Validation
      if (!name || !imageUrl || !priceCents || !categorySlug) {
        rejected.push({ item, reason: 'Campos obrigatórios ausentes (name, imageUrl, categorySlug, priceCents).' });
        continue;
      }

      const categoryId = catMap.get(String(categorySlug).toLowerCase());
      if (!categoryId) {
        rejected.push({ item, reason: `Categoria '${categorySlug}' não encontrada no sistema.` });
        continue;
      }

      const cleanSlugBase = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = `${cleanSlugBase}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

      const [newProduct] = await db
        .insert(products)
        .values({
          sellerId: req.user!.id,
          name: String(name).trim(),
          slug,
          description: description ? String(description).trim() : `Produto de catálogo importado: ${name}`,
          categoryId,
          condition: 'NOVO',
          priceCents: parseInt(priceCents),
          stock: Math.max(1, parseInt(stock) || 1),
          location: String(location).trim(),
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
          status: 'ACTIVE',
          imageUrl: String(imageUrl).trim(),
          isDemo: false,
        })
        .returning();

      inserted.push(newProduct);
    }

    return res.json({
      message: `Importação concluída. ${inserted.length} inseridos, ${rejected.length} rejeitados.`,
      insertedCount: inserted.length,
      rejectedCount: rejected.length,
      rejected,
    });
  } catch (err) {
    console.error('Import feed error:', err);
    return res.status(500).json({ error: 'Erro ao importar feed de catálogo.' });
  }
});

// 8. GET & UPDATE APP SETTINGS
router.get('/settings', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(appSettings);
    return res.json(list);
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: 'Erro ao listar configurações.' });
  }
});

router.post('/settings', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
    }

    const [updated] = await db
      .insert(appSettings)
      .values({ key, value: String(value), description })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      })
      .returning();

    return res.json({ message: 'Configuração atualizada com sucesso!', setting: updated });
  } catch (err) {
    console.error('Save setting error:', err);
    return res.status(500).json({ error: 'Erro ao salvar configuração.' });
  }
});

// 9. LIST ALL STORES
router.get('/stores', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        category: stores.category,
        location: stores.location,
        status: stores.status,
        followersCount: stores.followersCount,
        rating: stores.rating,
        createdAt: stores.createdAt,
        owner: { id: users.id, name: users.name, email: users.email },
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .orderBy(desc(stores.createdAt));
    return res.json(list);
  } catch (err) {
    console.error('Admin stores error:', err);
    return res.status(500).json({ error: 'Erro ao listar lojas.' });
  }
});

// 10. LIST ALL PRODUCTS WITH STOCK STATUS
router.get('/products', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
        stock: products.stock,
        condition: products.condition,
        status: products.status,
        location: products.location,
        imageUrl: products.imageUrl,
        seller: { id: users.id, name: users.name, email: users.email },
        category: { id: categories.id, name: categories.name },
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt))
      .limit(100);
    return res.json(list);
  } catch (err) {
    console.error('Admin products error:', err);
    return res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
});

// 11. LIST ALL SUBSCRIPTIONS & PLANS SOLD
router.get('/subscriptions', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        createdAt: subscriptions.createdAt,
        user: { id: users.id, name: users.name, email: users.email },
        plan: { id: plans.id, name: plans.name, slug: plans.slug, priceCents: plans.priceCents },
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.createdAt));
    return res.json(list);
  } catch (err) {
    console.error('Admin subscriptions error:', err);
    return res.status(500).json({ error: 'Erro ao listar assinaturas.' });
  }
});

export default router;
