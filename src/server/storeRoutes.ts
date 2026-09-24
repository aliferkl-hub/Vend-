import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.ts';
import { stores, products, services, users, categories, orders, orderItems } from '../db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { VERIFIED_ECOSYSTEM_PRODUCTS, EcosystemProduct } from './ecosystemCatalog.ts';
import {
  generateStoreConceptAI,
  enhanceProductCopyAI,
  runCommercialAiTool,
  StoreConceptInput,
} from './geminiService.ts';

const router = Router();

// 1. GET ECOSYSTEM CATALOG (Verified Suppliers Products)
router.get('/ecosystem-catalog', async (req, res) => {
  try {
    const { nicho, categoria, q } = req.query;
    let list = [...VERIFIED_ECOSYSTEM_PRODUCTS];

    if (nicho) {
      const n = String(nicho).toLowerCase();
      list = list.filter((p) => p.niche.toLowerCase().includes(n));
    }

    if (categoria) {
      const c = String(categoria).toLowerCase();
      list = list.filter((p) => p.categorySlug.toLowerCase() === c);
    }

    if (q) {
      const query = String(q).toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return res.json({
      total: list.length,
      products: list,
  });
  } catch (err: any) {
    console.error('Error fetching ecosystem catalog:', err);
    return res.status(500).json({ error: 'Erro ao listar catálogo do ecossistema.' });
  }
});

// 2. RUN COMMERCIAL AI TOOLS
router.post('/ai-tools', async (req, res) => {
  try {
    const { tool, data } = req.body;
    if (!tool) {
      return res.status(400).json({ error: 'Ferramenta não informada.' });
    }

    const result = await runCommercialAiTool(tool, data || {});
    return res.json(result);
  } catch (err: any) {
    console.error('AI Tools error:', err);
    return res.status(500).json({ error: 'Erro ao processar ferramenta de IA.' });
  }
});

// 3. GENERATE COMPLETE STORE WITH AI (Core Feature)
router.post('/generate-ai-store', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      storeName,
      niche,
      targetAudience,
      visualStyle,
      profitMarginPercent = 35,
      location = user.location || 'São Paulo, SP',
      phone = user.phone || '(11) 99999-0000',
      selectedProductOrigin = 'BOTH', // 'ECOSYSTEM' | 'CLIENT' | 'BOTH'
      ecosystemProductIds = [],
      customProducts = [],
    } = req.body;

    const margin = Number(profitMarginPercent);
    const validOrigins = new Set(['ECOSYSTEM', 'CLIENT', 'BOTH']);
    if (!String(niche || '').trim() || String(niche).length > 100) {
      return res.status(400).json({ error: 'O nicho da loja é obrigatório.' });
    }
    if (!Number.isFinite(margin) || margin < 0 || margin > 500) {
      return res.status(400).json({ error: 'A margem deve estar entre 0% e 500%.' });
    }
    if (!validOrigins.has(selectedProductOrigin)) {
      return res.status(400).json({ error: 'Origem de produtos inválida.' });
    }
    if (!Array.isArray(customProducts) || customProducts.length > 50) {
      return res.status(400).json({ error: 'A loja pode ter no máximo 50 produtos personalizados.' });
    }
    for (const custom of customProducts) {
      if (
        !custom?.name?.trim() ||
        !custom?.imageUrl?.trim() ||
        !/^https?:\/\//i.test(custom.imageUrl) ||
        !Number.isFinite(Number(custom.costPriceCents)) ||
        Number(custom.costPriceCents) <= 0 ||
        Number(custom.stock) < 0
      ) {
        return res.status(400).json({ error: 'Cada produto personalizado precisa de nome, imagem HTTP, custo e estoque válidos.' });
      }
    }

    // Step A: Generate store brand concept & visual identity via Gemini AI
    const aiConcept = await generateStoreConceptAI({
      storeName,
      niche,
      targetAudience,
      visualStyle,
      profitMarginPercent: Number(profitMarginPercent),
      location,
    });

    const finalStoreName = aiConcept.storeName || storeName || `${niche} Store`;

    // Step B: Build unique URL slug
    const cleanSlugBase = finalStoreName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = randomUUID().replace(/-/g, '').substring(0, 8);
    const slug = `${cleanSlugBase}-${randomSuffix}`;

    // Step C: Banner & Logo generation
    const logoUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalStoreName)}&backgroundColor=0f172a,0284c7,10b981`;
    const bannerUrl = null;

    // Step D: Pack full theme, FAQ, about, and banners into description JSON
    const storeThemeConfig = {
      bio: aiConcept.slogan,
      slogan: aiConcept.slogan,
      niche,
      targetAudience,
      visualStyle: aiConcept.visualStyle,
      colors: aiConcept.colors,
      bannerHeadline: aiConcept.bannerHeadline,
      bannerSubheadline: aiConcept.bannerSubheadline,
      bannerCtaText: aiConcept.bannerCtaText,
      promotionalBanners: aiConcept.promotionalBanners,
      aboutText: aiConcept.aboutText,
      faq: aiConcept.faq,
      seo: aiConcept.seo,
      contactInfo: {
        ...aiConcept.contactInfo,
        phone: phone || aiConcept.contactInfo.whatsapp,
        location,
      },
      profitMarginDefault: Number(profitMarginPercent),
    };

    // Step E: Insert store in database
    let createdStore: any;
    const insertedProducts: any[] = [];
    await db.transaction(async (tx) => {
      [createdStore] = await tx
      .insert(stores)
      .values({
        userId: user.id,
        name: finalStoreName,
        slug,
        category: niche,
        location: location.trim(),
        phone: phone ? phone.trim() : null,
        hours: aiConcept.contactInfo.businessHours || 'Seg a Sex: 08:00 - 18:00',
        logoUrl,
        bannerUrl,
        description: JSON.stringify(storeThemeConfig),
        offersDelivery: true,
        offersPickup: true,
        status: 'ACTIVE',
      })
      .returning();

    // Step F: Get available categories in database to link products
    const dbCategories = await tx.select().from(categories);
    if (dbCategories.length === 0) {
      throw new Error('Nenhuma categoria disponível para cadastrar produtos.');
    }
    const categoryMap = new Map(dbCategories.map((c) => [c.slug, c.id]));
    const defaultCategoryId = dbCategories[0]?.id || 1;

    // Step G: Process Ecosystem Products (if selected)
    const selectedEcosystemProducts = VERIFIED_ECOSYSTEM_PRODUCTS.filter(
      (p) =>
        (ecosystemProductIds && ecosystemProductIds.includes(p.id)) ||
        (selectedProductOrigin === 'ECOSYSTEM' && (!ecosystemProductIds || ecosystemProductIds.length === 0) && p.niche.toLowerCase().includes(niche.toLowerCase().split(' ')[0]))
    );

    // If user chose ECOSYSTEM or BOTH and didn't pick specific ones, pick relevant niche products
    const ecosystemToAdd =
      selectedEcosystemProducts.length > 0
        ? selectedEcosystemProducts
        : selectedProductOrigin !== 'CLIENT'
        ? VERIFIED_ECOSYSTEM_PRODUCTS.filter((p) => p.niche.toLowerCase().includes(niche.toLowerCase().split(' ')[0])).slice(0, 4)
        : [];

    for (const eco of ecosystemToAdd) {
      const catId = categoryMap.get(eco.categorySlug) || defaultCategoryId;
      const margin = Number(profitMarginPercent) || eco.defaultMarginPercent;
      const finalPriceCents = Math.round(eco.costPriceCents * (1 + margin / 100));

      const prodSlug = `${slug}-${eco.id}-${Math.random().toString(36).substring(2, 5)}`;

      const [p] = await tx
        .insert(products)
        .values({
          sellerId: user.id,
          storeId: createdStore.id,
          name: eco.name,
          slug: prodSlug,
          description: eco.description,
          categoryId: catId,
          condition: eco.condition,
          priceCents: finalPriceCents,
          originalPriceCents: eco.costPriceCents, // Stores real cost price for margin tracking
          stock: eco.stock,
          location: location.trim(),
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false,
          status: 'ACTIVE',
          imageUrl: eco.imageUrl, // 100% rigorous exact image
        })
        .returning();

      insertedProducts.push(p);
    }

    // Step H: Process Custom Client Products (if provided)
    if (Array.isArray(customProducts) && customProducts.length > 0) {
      for (const custom of customProducts) {
        if (!custom.name || !custom.imageUrl) continue;

        const costCents = Number(custom.costPriceCents) || 5000;
        const margin = Number(custom.marginPercent) || Number(profitMarginPercent);
        const salePrice = Math.round(costCents * (1 + margin / 100));
        const catId = (custom.categorySlug && categoryMap.get(custom.categorySlug)) || defaultCategoryId;

        const prodSlug = `${slug}-custom-${Math.random().toString(36).substring(2, 6)}`;

        const [p] = await tx
          .insert(products)
          .values({
            sellerId: user.id,
            storeId: createdStore.id,
            name: custom.name.trim(),
            slug: prodSlug,
            description: custom.description?.trim() || `${custom.name} com qualidade e garantia da ${finalStoreName}.`,
            categoryId: catId,
            condition: custom.condition || 'NOVO',
            priceCents: salePrice,
            originalPriceCents: costCents,
            stock: Number(custom.stock) || 5,
            location: location.trim(),
            offersDelivery: true,
            offersPickup: true,
            allowsNegotiation: false,
            status: 'ACTIVE',
            imageUrl: custom.imageUrl.trim(),
          })
          .returning();

        insertedProducts.push(p);
      }
    }
    });

    return res.status(201).json({
      message: 'Loja virtual com IA criada com sucesso!',
      store: {
        ...createdStore,
        themeConfig: storeThemeConfig,
      },
      productsCount: insertedProducts.length,
      slug: createdStore.slug,
      storeUrl: `/loja/${createdStore.slug}`,
    });
  } catch (err: any) {
    console.error('Error in generate-ai-store:', err);
    return res.status(500).json({ error: 'Erro ao gerar loja com IA. ' + (err?.message || '') });
  }
});

// 4. GET CURRENT USER'S STORE WITH METRICS (For "Minha Loja")
router.get('/my/current', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    // Find first store belonging to user
    const userStores = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, user.id))
      .orderBy(desc(stores.createdAt));

    if (userStores.length === 0) {
      return res.json({ hasStore: false });
    }

    const store = userStores[0];

    // Parse theme config
    let themeConfig: any = {};
    if (store.description && store.description.startsWith('{')) {
      try {
        themeConfig = JSON.parse(store.description);
      } catch {
        themeConfig = { bio: store.description };
      }
    } else {
      themeConfig = { bio: store.description };
    }

    // Fetch store products
    const storeProducts = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.storeId, store.id))
      .orderBy(desc(products.createdAt));

    // Calculate metrics
    const totalProductsCount = storeProducts.length;
    const activeProducts = storeProducts.filter((p) => p.product.status === 'ACTIVE');

    // Fetch store sales orders
    const storeOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.sellerId, user.id))
      .orderBy(desc(orders.createdAt));

    const totalGrossRevenueCents = storeOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalGrossCents, 0);

    const totalNetProfitCents = storeOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.sellerNetCents, 0);

    return res.json({
      hasStore: true,
      store: {
        ...store,
        themeConfig,
      },
      allStores: userStores,
      products: storeProducts.map((sp) => ({
        ...sp.product,
        category: sp.category,
      })),
      metrics: {
        totalProductsCount,
        activeProductsCount: activeProducts.length,
        totalOrdersCount: storeOrders.length,
        totalGrossRevenueCents,
        totalNetProfitCents,
      },
      recentOrders: storeOrders.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error fetching current user store:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados da loja.' });
  }
});

// 5. GET STORE BY SLUG (Public Storefront)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [storeRecord] = await db
      .select({
        store: stores,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .where(eq(stores.slug, slug))
      .limit(1);

    if (!storeRecord) {
      return res.status(404).json({ error: 'Loja não encontrada.' });
    }

    const rawStore = storeRecord.store;

    // Parse JSON theme config
    let themeConfig: any = {};
    if (rawStore.description && rawStore.description.startsWith('{')) {
      try {
        themeConfig = JSON.parse(rawStore.description);
      } catch {
        themeConfig = { bio: rawStore.description };
      }
    } else {
      themeConfig = { bio: rawStore.description };
    }

    // Fetch active products
    const storeProducts = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.storeId, rawStore.id), eq(products.status, 'ACTIVE')))
      .orderBy(desc(products.createdAt))
      .limit(60);

    return res.json({
      ...rawStore,
      themeConfig,
      owner: storeRecord.owner,
      products: storeProducts.map((sp) => ({
        ...sp.product,
        category: sp.category,
      })),
    });
  } catch (err) {
    console.error('Get store by slug error:', err);
    return res.status(500).json({ error: 'Erro ao carregar loja.' });
  }
});

// 6. UPDATE STORE SETTINGS & THEME
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const storeId = parseInt(req.params.id);

    const [existing] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Loja não encontrada.' });

    if (existing.userId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada para editar esta loja.' });
    }

    const {
      name,
      description,
      themeConfig,
      logoUrl,
      bannerUrl,
      phone,
      hours,
      location,
      offersDelivery,
      offersPickup,
    } = req.body;

    const updates: any = {
      updatedAt: new Date(),
    };

    if (name) updates.name = name.trim();
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
    if (phone !== undefined) updates.phone = phone;
    if (hours !== undefined) updates.hours = hours;
    if (location !== undefined) updates.location = location;
    if (offersDelivery !== undefined) updates.offersDelivery = Boolean(offersDelivery);
    if (offersPickup !== undefined) updates.offersPickup = Boolean(offersPickup);

    // If themeConfig provided, serialize it into description
    if (themeConfig) {
      updates.description = typeof themeConfig === 'string' ? themeConfig : JSON.stringify(themeConfig);
    } else if (description !== undefined) {
      updates.description = description;
    }

    const [updated] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, storeId))
      .returning();

    return res.json({
      message: 'Loja atualizada com sucesso!',
      store: updated,
    });
  } catch (err) {
    console.error('Update store error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar loja.' });
  }
});

// 7. ADD PRODUCT TO STORE (Custom or from Ecosystem)
router.post('/:id/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const storeId = parseInt(req.params.id);

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });
    if (store.userId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const {
      name,
      description,
      costPriceCents,
      marginPercent = 35,
      priceCents,
      stock = 1,
      imageUrl,
      categoryId,
      condition = 'NOVO',
      ecosystemProductId,
    } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({ error: 'Nome e imagem fiel do produto são obrigatórios.' });
    }

    const cost = Number(costPriceCents) || 0;
    const finalPrice = priceCents ? Number(priceCents) : Math.round(cost * (1 + Number(marginPercent) / 100));

    const cleanName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const slug = `${store.slug}-${cleanName}-${Date.now().toString(36)}`;

    const [newProd] = await db
      .insert(products)
      .values({
        storeId: store.id,
        sellerId: user.id,
        name: name.trim(),
        slug,
        description: description ? description.trim() : `${name} com nota e garantia.`,
        categoryId: categoryId || 1,
        condition,
        priceCents: finalPrice,
        originalPriceCents: cost > 0 ? cost : null,
        stock: Number(stock),
        location: store.location,
        offersDelivery: true,
        offersPickup: true,
        allowsNegotiation: false,
        status: 'ACTIVE',
        imageUrl: imageUrl.trim(),
      })
      .returning();

    return res.status(201).json({
      message: 'Produto adicionado com sucesso à sua loja!',
      product: newProd,
    });
  } catch (err: any) {
    console.error('Add product error:', err);
    return res.status(500).json({ error: 'Erro ao adicionar produto.' });
  }
});

// 8. UPDATE PRODUCT IN STORE
router.patch('/:id/products/:productId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const storeId = parseInt(req.params.id);
    const productId = parseInt(req.params.productId);

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store || (store.userId !== user.id && user.role !== 'MASTER_OWNER')) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const [prod] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!prod || prod.storeId !== storeId) {
      return res.status(404).json({ error: 'Produto não encontrado nesta loja.' });
    }

    const {
      name,
      description,
      priceCents,
      originalPriceCents,
      stock,
      status,
      imageUrl,
    } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (priceCents !== undefined) updates.priceCents = Number(priceCents);
    if (originalPriceCents !== undefined) updates.originalPriceCents = Number(originalPriceCents);
    if (stock !== undefined) updates.stock = Number(stock);
    if (status !== undefined) updates.status = status;
    if (imageUrl) updates.imageUrl = imageUrl.trim();

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, productId))
      .returning();

    return res.json({
      message: 'Produto atualizado!',
      product: updated,
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

// 9. DELETE PRODUCT FROM STORE
router.delete('/:id/products/:productId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const storeId = parseInt(req.params.id);
    const productId = parseInt(req.params.productId);

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store || (store.userId !== user.id && user.role !== 'MASTER_OWNER')) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    await db.delete(products).where(and(eq(products.id, productId), eq(products.storeId, storeId)));

    return res.json({ message: 'Produto removido da loja com sucesso.' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ error: 'Erro ao remover produto.' });
  }
});

// 10. BULK RE-ADJUST PROFIT MARGIN FOR STORE PRODUCTS
router.post('/:id/bulk-margin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const storeId = parseInt(req.params.id);
    const { marginPercent } = req.body;

    if (!marginPercent || isNaN(Number(marginPercent))) {
      return res.status(400).json({ error: 'Margem percentual inválida.' });
    }

    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!store || (store.userId !== user.id && user.role !== 'MASTER_OWNER')) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const margin = Number(marginPercent);
    const storeProds = await db.select().from(products).where(eq(products.storeId, storeId));

    let updatedCount = 0;
    for (const p of storeProds) {
      // If originalPriceCents (cost) is present, recompute priceCents
      if (p.originalPriceCents && p.originalPriceCents > 0) {
        const newPrice = Math.round(p.originalPriceCents * (1 + margin / 100));
        await db
          .update(products)
          .set({ priceCents: newPrice, updatedAt: new Date() })
          .where(eq(products.id, p.id));
        updatedCount++;
      }
    }

    return res.json({
      message: `Margem de ${margin}% aplicada com sucesso a ${updatedCount} produtos!`,
      updatedCount,
    });
  } catch (err) {
    console.error('Bulk margin error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar margem em massa.' });
  }
});

export default router;
