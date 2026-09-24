import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, persistDatabase } from '../db/index.ts';
import { stores, products, services, users, categories, orders, orderItems, productImages } from '../db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import {
  generateStoreConceptAI,
  enhanceProductCopyAI,
  runCommercialAiTool,
  StoreConceptInput,
} from './geminiService.ts';

const router = Router();
const PERSISTED_LOGO_PATTERN = /^\/uploads\/vend_[A-Za-z0-9_-]+\.(jpg|png|webp)$/i;

function isPersistedLogoUrl(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && PERSISTED_LOGO_PATTERN.test(value));
}

function isValidProductImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('data:image/')
  );
}

// 1. GET SUPPLIER CATALOG
router.get('/ecosystem-catalog', async (req, res) => {
  return res.json({
    total: 0,
    products: [],
    message: 'Nenhum fornecedor verificado disponível no momento.',
    action: 'Adicionar fornecedor',
  });
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
      selectedProductOrigin = 'CLIENT', // Only user-owned products until a real supplier integration exists
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
    if (!validOrigins.has(selectedProductOrigin) || selectedProductOrigin === 'ECOSYSTEM') {
      return res.status(400).json({ error: 'Origem de produtos inválida.' });
    }
    if (!Array.isArray(customProducts) || customProducts.length > 50) {
      return res.status(400).json({ error: 'A loja pode ter no máximo 50 produtos personalizados.' });
    }
    for (const custom of customProducts) {
      if (
        !custom?.name?.trim() ||
        !isValidProductImageUrl(custom?.imageUrl) ||
        !Number.isFinite(Number(custom.costPriceCents)) ||
        Number(custom.costPriceCents) <= 0 ||
        Number(custom.stock) < 0
      ) {
        return res.status(400).json({ error: 'Cada produto personalizado precisa de nome, imagem válida (HTTP ou upload), custo e estoque válidos.' });
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

    // Step G: Process user-owned products only. Supplier imports remain disabled
    // until a real supplier integration and verification record exist.
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

        // Also record image in productImages table
        await tx.insert(productImages).values({
          productId: p.id,
          imageUrl: custom.imageUrl.trim(),
          isPrimary: true,
          displayOrder: 0,
          type: 'main',
        });

        insertedProducts.push(p);
      }
    }
    });

    persistDatabase();

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
    return res.status(500).json({
      error: 'Erro ao gerar loja com IA. Nenhuma alteração foi salva. Tente novamente.',
    });
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

    const productIds = storeProducts.map((sp) => sp.product.id);
    const dbImages =
      productIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(productImages.displayOrder)
        : [];

    const imagesByProductId = new Map<number, any[]>();
    for (const img of dbImages) {
      if (!imagesByProductId.has(img.productId)) {
        imagesByProductId.set(img.productId, []);
      }
      imagesByProductId.get(img.productId)!.push({
        id: img.id,
        url: img.imageUrl,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        type: img.type,
        position: img.displayOrder,
      });
    }

    const formattedStoreProducts = storeProducts.map((sp) => {
      const imgs = imagesByProductId.get(sp.product.id) || [
        {
          id: 0,
          url: sp.product.imageUrl,
          imageUrl: sp.product.imageUrl,
          isPrimary: true,
          type: 'main',
          position: 0,
        },
      ];
      return {
        ...sp.product,
        ownerId: sp.product.sellerId,
        sellerId: sp.product.sellerId,
        storeId: sp.product.storeId,
        price: sp.product.priceCents / 100,
        category: sp.category,
        categorySlug: sp.category?.slug,
        categoryName: sp.category?.name,
        images: imgs,
        productImages: imgs,
      };
    });

    // Calculate metrics
    const totalProductsCount = formattedStoreProducts.length;
    const activeProducts = formattedStoreProducts.filter((p) => p.status === 'ACTIVE');

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
      products: formattedStoreProducts,
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

// 5. GET STORE PRODUCTS BY STORE ID OR SLUG (Public Catalog API)
router.get('/:id/products', async (req, res) => {
  try {
    const rawId = req.params.id;
    let storeRecord = null;
    if (/^\d+$/.test(rawId)) {
      const [s] = await db.select().from(stores).where(eq(stores.id, parseInt(rawId))).limit(1);
      storeRecord = s;
    } else {
      const [s] = await db.select().from(stores).where(eq(stores.slug, rawId)).limit(1);
      storeRecord = s;
    }

    if (!storeRecord) {
      return res.status(404).json({ error: 'Loja não encontrada.' });
    }

    const storeProducts = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.storeId, storeRecord.id), eq(products.status, 'ACTIVE')))
      .orderBy(desc(products.createdAt));

    const productIds = storeProducts.map((sp) => sp.product.id);
    const dbImages =
      productIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(productImages.displayOrder)
        : [];

    const imagesByProductId = new Map<number, any[]>();
    for (const img of dbImages) {
      if (!imagesByProductId.has(img.productId)) {
        imagesByProductId.set(img.productId, []);
      }
      imagesByProductId.get(img.productId)!.push({
        id: img.id,
        url: img.imageUrl,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        type: img.type,
        position: img.displayOrder,
      });
    }

    const formattedProducts = storeProducts.map((sp) => {
      const imgs = imagesByProductId.get(sp.product.id) || [
        {
          id: 0,
          url: sp.product.imageUrl,
          imageUrl: sp.product.imageUrl,
          isPrimary: true,
          type: 'main',
          position: 0,
        },
      ];
      return {
        ...sp.product,
        ownerId: sp.product.sellerId,
        sellerId: sp.product.sellerId,
        storeId: sp.product.storeId,
        price: sp.product.priceCents / 100,
        category: sp.category,
        categorySlug: sp.category?.slug,
        categoryName: sp.category?.name,
        images: imgs,
        productImages: imgs,
      };
    });

    return res.json({
      storeId: storeRecord.id,
      storeSlug: storeRecord.slug,
      products: formattedProducts,
      total: formattedProducts.length,
    });
  } catch (err) {
    console.error('Get store products error:', err);
    return res.status(500).json({ error: 'Erro ao carregar produtos da loja.' });
  }
});

// 6. GET STORE BY SLUG (Public Storefront)
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

    // Fetch active products for this store
    const storeProducts = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.storeId, rawStore.id), eq(products.status, 'ACTIVE')))
      .orderBy(desc(products.createdAt))
      .limit(100);

    const productIds = storeProducts.map((sp) => sp.product.id);
    const dbImages =
      productIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(productImages.displayOrder)
        : [];

    const imagesByProductId = new Map<number, any[]>();
    for (const img of dbImages) {
      if (!imagesByProductId.has(img.productId)) {
        imagesByProductId.set(img.productId, []);
      }
      imagesByProductId.get(img.productId)!.push({
        id: img.id,
        url: img.imageUrl,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        type: img.type,
        position: img.displayOrder,
      });
    }

    const formattedProducts = storeProducts.map((sp) => {
      const imgs = imagesByProductId.get(sp.product.id) || [
        {
          id: 0,
          url: sp.product.imageUrl,
          imageUrl: sp.product.imageUrl,
          isPrimary: true,
          type: 'main',
          position: 0,
        },
      ];
      return {
        ...sp.product,
        ownerId: sp.product.sellerId,
        sellerId: sp.product.sellerId,
        storeId: sp.product.storeId,
        price: sp.product.priceCents / 100,
        category: sp.category,
        categorySlug: sp.category?.slug,
        categoryName: sp.category?.name,
        images: imgs,
        productImages: imgs,
      };
    });

    return res.json({
      ...rawStore,
      themeConfig,
      owner: storeRecord.owner,
      products: formattedProducts,
    });
  } catch (err) {
    console.error('Get store by slug error:', err);
    return res.status(500).json({ error: 'Erro ao carregar loja.' });
  }
});

// 6. UPDATE ONLY THE CURRENT STORE LOGO
router.patch('/:id/logo', requireAuth, async (req: AuthRequest, res) => {
  try {
    const storeId = Number(req.params.id);
    const user = req.user!;
    const { logoUrl } = req.body;
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

    if (!store) return res.status(404).json({ error: 'Loja não encontrada.' });
    if (store.userId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Você não pode alterar a logo desta loja.' });
    }
    if (!isPersistedLogoUrl(logoUrl)) {
      return res.status(400).json({ error: 'A logo deve ser uma imagem enviada ao storage persistente do VEND+.' });
    }

    const [updated] = await db
      .update(stores)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();

    persistDatabase();

    return res.json({ message: logoUrl ? 'Logo salva com sucesso.' : 'Logo removida com sucesso.', store: updated });
  } catch (err) {
    console.error('Update store logo error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar a logo da loja.' });
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
    if (logoUrl !== undefined) {
      if (!isPersistedLogoUrl(logoUrl)) {
        return res.status(400).json({ error: 'A logo deve ser uma imagem enviada ao storage persistente do VEND+.' });
      }
      updates.logoUrl = logoUrl;
    }
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

    persistDatabase();

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
      return res.status(403).json({ error: 'Acesso negado. Você não é proprietário desta loja.' });
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

    if (!name?.trim() || !isValidProductImageUrl(imageUrl)) {
      return res.status(400).json({ error: 'Nome e imagem fiel do produto são obrigatórios.' });
    }

    const cost = Number(costPriceCents) || 0;
    const computedPrice = priceCents ? Number(priceCents) : Math.round(cost * (1 + Number(marginPercent) / 100));
    const finalPrice = Math.max(50, computedPrice || 100);

    const cleanName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const slug = `${store.slug}-${cleanName}-${Date.now().toString(36)}`;

    const resolvedCategoryId = categoryId ? parseInt(categoryId) : 1;
    const [catRecord] = await db.select().from(categories).where(eq(categories.id, resolvedCategoryId)).limit(1);

    const [newProd] = await db
      .insert(products)
      .values({
        storeId: store.id,
        sellerId: user.id,
        name: name.trim(),
        slug,
        description: description ? description.trim() : `${name.trim()} com nota e garantia da ${store.name}.`,
        categoryId: resolvedCategoryId,
        condition,
        priceCents: finalPrice,
        originalPriceCents: cost > 0 ? cost : null,
        stock: Math.max(1, Number(stock) || 1),
        location: store.location,
        offersDelivery: Boolean(store.offersDelivery),
        offersPickup: Boolean(store.offersPickup),
        allowsNegotiation: false,
        status: 'ACTIVE',
        imageUrl: imageUrl.trim(),
      })
      .returning();

    // Insert image record in product_images
    await db.insert(productImages).values({
      productId: newProd.id,
      imageUrl: imageUrl.trim(),
      isPrimary: true,
      displayOrder: 0,
      type: 'main',
    });

    persistDatabase();

    const savedImages = [
      {
        id: 0,
        url: newProd.imageUrl,
        imageUrl: newProd.imageUrl,
        isPrimary: true,
        type: 'main',
        position: 0,
      },
    ];

    return res.status(201).json({
      message: 'Produto adicionado com sucesso à sua loja!',
      product: {
        ...newProd,
        ownerId: newProd.sellerId,
        storeId: newProd.storeId,
        price: newProd.priceCents / 100,
        category: catRecord || null,
        categorySlug: catRecord?.slug,
        categoryName: catRecord?.name,
        images: savedImages,
        productImages: savedImages,
      },
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

    persistDatabase();

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

    persistDatabase();

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

    persistDatabase();

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
