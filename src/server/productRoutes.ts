import { Router } from 'express';
import { db } from '../db/index.ts';
import { products, categories, users, stores, productImages, plans, auditLogs } from '../db/schema.ts';
import { eq, and, or, ilike, gte, lte, desc, sql, count } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// Validation helper for Image Rule (Section 11)
function validateProductImageMatch(name: string, categoryName: string, imageUrl: string, priceCents: number): { valid: boolean; reason?: string } {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
    return { valid: false, reason: 'O produto precisa ter uma imagem válida ou placeholder neutro.' };
  }

  if (!name || name.trim().length < 3) {
    return { valid: false, reason: 'O produto precisa de um nome descritivo com pelo menos 3 caracteres.' };
  }

  if (priceCents <= 0) {
    return { valid: false, reason: 'O preço do produto deve ser maior que zero.' };
  }

  // Check URL scheme / format: allow data:image/ or http(s):// or neutral placeholders /assets/
  const isDataUrl = imageUrl.startsWith('data:image/');
  const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
  const isInternalPath = imageUrl.startsWith('/');

  if (!isDataUrl && !isHttpUrl && !isInternalPath) {
    return { valid: false, reason: 'URL da imagem inválida.' };
  }

  return { valid: true };
}

// 1. LIST PRODUCTS (Public, filters, pagination)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const q = req.query.q ? String(req.query.q).trim() : '';
    const categorySlug = req.query.categoria ? String(req.query.categoria).trim() : '';
    const condition = req.query.condicao ? String(req.query.condicao).trim().toUpperCase() : '';
    const location = req.query.localizacao ? String(req.query.localizacao).trim() : '';
    const minPrice = req.query.precoMin ? parseInt(req.query.precoMin as string) * 100 : undefined;
    const maxPrice = req.query.precoMax ? parseInt(req.query.precoMax as string) * 100 : undefined;
    const offersDelivery = req.query.entrega === 'true';
    const offersPickup = req.query.retirada === 'true';
    const allowsNegotiation = req.query.negociacao === 'true';

    // Base query conditions: only ACTIVE products
    const conditions: any[] = [eq(products.status, 'ACTIVE')];

    if (q) {
      conditions.push(
        or(
          ilike(products.name, `%${q}%`),
          ilike(products.description, `%${q}%`),
          ilike(products.location, `%${q}%`)
        )
      );
    }

    if (condition && (condition === 'NOVO' || condition === 'USADO')) {
      conditions.push(eq(products.condition, condition));
    }

    if (location) {
      conditions.push(ilike(products.location, `%${location}%`));
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      conditions.push(gte(products.priceCents, minPrice));
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      conditions.push(lte(products.priceCents, maxPrice));
    }

    if (offersDelivery) {
      conditions.push(eq(products.offersDelivery, true));
    }

    if (offersPickup) {
      conditions.push(eq(products.offersPickup, true));
    }

    if (allowsNegotiation) {
      conditions.push(eq(products.allowsNegotiation, true));
    }

    // Category filter
    let targetCategoryId: number | undefined;
    if (categorySlug) {
      const cat = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (cat.length > 0) {
        targetCategoryId = cat[0].id;
        conditions.push(eq(products.categoryId, targetCategoryId));
      }
    }

    const whereClause = and(...conditions);

    // Count total items
    const [{ total }] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    // Fetch items with seller and category
    const items = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        condition: products.condition,
        priceCents: products.priceCents,
        originalPriceCents: products.originalPriceCents,
        stock: products.stock,
        location: products.location,
        offersDelivery: products.offersDelivery,
        offersPickup: products.offersPickup,
        allowsNegotiation: products.allowsNegotiation,
        status: products.status,
        rating: products.rating,
        viewsCount: products.viewsCount,
        imageUrl: products.imageUrl,
        isDemo: products.isDemo,
        createdAt: products.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
        },
        seller: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          location: users.location,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({
      items,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error('List products error:', err);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos. Tente novamente.' });
  }
});

// 2. GET SINGLE PRODUCT (by id or slug)
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const condition = isNumeric
      ? eq(products.id, parseInt(identifier))
      : eq(products.slug, identifier);

    const result = await db
      .select({
        product: products,
        category: categories,
        seller: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          location: users.location,
          phone: users.phone,
          planSlug: users.planSlug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(condition)
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const { product, category, seller } = result[0];

    // Increment views
    await db
      .update(products)
      .set({ viewsCount: product.viewsCount + 1 })
      .where(eq(products.id, product.id));

    // Fetch images
    const extraImages = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(productImages.displayOrder);

    // Fetch store if any
    let storeData = null;
    if (product.storeId) {
      const [s] = await db.select().from(stores).where(eq(stores.id, product.storeId)).limit(1);
      storeData = s || null;
    }

    return res.json({
      ...product,
      category,
      seller,
      store: storeData,
      images: [
        { imageUrl: product.imageUrl, isPrimary: true },
        ...extraImages.map((img) => ({ imageUrl: img.imageUrl, isPrimary: img.isPrimary })),
      ],
    });
  } catch (err) {
    console.error('Get product error:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados do produto.' });
  }
});

// 3. CREATE PRODUCT (Authenticated + Plan limits check + Image validation)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const seller = req.user!;
    const {
      name,
      description,
      categoryId,
      subcategory,
      condition = 'NOVO',
      priceCents,
      originalPriceCents,
      stock = 1,
      location,
      offersDelivery = true,
      offersPickup = true,
      allowsNegotiation = true,
      imageUrl,
      additionalImages = [],
      storeId,
    } = req.body;

    if (!name || !description || !categoryId || priceCents === undefined || !imageUrl) {
      return res.status(400).json({
        error: 'Todos os campos obrigatórios (nome, descrição, categoria, preço e imagem) devem ser preenchidos.',
      });
    }

    // Verify category exists
    const [cat] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!cat) {
      return res.status(400).json({ error: 'Categoria selecionada não existe.' });
    }

    // Strict image match validation (Section 11)
    const imageCheck = validateProductImageMatch(name, cat.name, imageUrl, Number(priceCents));
    if (!imageCheck.valid) {
      return res.status(400).json({ error: imageCheck.reason });
    }

    // Check plan limits (Section 22 & 24)
    const userPlanSlug = seller.planSlug || 'free';
    const [plan] = await db.select().from(plans).where(eq(plans.slug, userPlanSlug)).limit(1);
    const maxActive = plan ? plan.maxActiveListings : 10;

    const [{ activeCount }] = await db
      .select({ activeCount: count() })
      .from(products)
      .where(and(eq(products.sellerId, seller.id), eq(products.status, 'ACTIVE')));

    if (Number(activeCount) >= maxActive) {
      return res.status(403).json({
        error: `Você atingiu o limite de ${maxActive} anúncios ativos do seu plano (${plan?.name || 'FREE'}). Faça upgrade para publicar mais.`,
      });
    }

    // Generate unique slug
    const cleanSlugBase = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${cleanSlugBase}-${Date.now().toString(36)}`;

    const [newProduct] = await db
      .insert(products)
      .values({
        sellerId: seller.id,
        storeId: storeId ? parseInt(storeId) : null,
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId: parseInt(categoryId),
        subcategory: subcategory ? subcategory.trim() : null,
        condition: condition === 'USADO' ? 'USADO' : 'NOVO',
        priceCents: parseInt(priceCents),
        originalPriceCents: originalPriceCents ? parseInt(originalPriceCents) : null,
        stock: Math.max(1, parseInt(stock) || 1),
        location: location ? location.trim() : (seller.location || 'Local'),
        offersDelivery: Boolean(offersDelivery),
        offersPickup: Boolean(offersPickup),
        allowsNegotiation: Boolean(allowsNegotiation),
        status: 'ACTIVE',
        imageUrl: imageUrl.trim(),
        isDemo: false,
      })
      .returning();

    // Additional images
    if (Array.isArray(additionalImages) && additionalImages.length > 0) {
      for (let i = 0; i < additionalImages.length; i++) {
        if (typeof additionalImages[i] === 'string' && additionalImages[i].trim()) {
          await db.insert(productImages).values({
            productId: newProduct.id,
            imageUrl: additionalImages[i].trim(),
            displayOrder: i + 1,
            isPrimary: false,
          });
        }
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      userId: seller.id,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: String(newProduct.id),
      details: JSON.stringify({ name: newProduct.name, priceCents: newProduct.priceCents }),
    });

    return res.status(201).json({
      message: 'Produto publicado com sucesso!',
      product: newProduct,
    });
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Erro ao publicar produto. Tente novamente.' });
  }
});

// 4. ARCHIVE / UPDATE PRODUCT STATUS
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const [prod] = await db.select().from(products).where(eq(products.id, parseInt(id))).limit(1);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (prod.sellerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    const [updated] = await db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.id, prod.id))
      .returning();

    return res.json({ message: 'Status atualizado com sucesso!', product: updated });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

export default router;
