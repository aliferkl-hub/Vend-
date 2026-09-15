import { Router } from 'express';
import { db } from '../db/index.ts';
import { services, categories, users, auditLogs } from '../db/schema.ts';
import { eq, and, or, ilike, desc, count } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// 1. LIST SERVICES
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const q = req.query.q ? String(req.query.q).trim() : '';
    const categorySlug = req.query.categoria ? String(req.query.categoria).trim() : '';
    const location = req.query.localizacao ? String(req.query.localizacao).trim() : '';

    const conditions: any[] = [eq(services.status, 'ACTIVE')];

    if (q) {
      conditions.push(
        or(
          ilike(services.name, `%${q}%`),
          ilike(services.description, `%${q}%`),
          ilike(services.location, `%${q}%`)
        )
      );
    }

    if (location) {
      conditions.push(ilike(services.location, `%${location}%`));
    }

    if (categorySlug) {
      const cat = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (cat.length > 0) {
        conditions.push(eq(services.categoryId, cat[0].id));
      }
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(services)
      .where(whereClause);

    const items = await db
      .select({
        id: services.id,
        name: services.name,
        slug: services.slug,
        description: services.description,
        priceCents: services.priceCents,
        priceType: services.priceType,
        location: services.location,
        offersDelivery: services.offersDelivery,
        allowsNegotiation: services.allowsNegotiation,
        rating: services.rating,
        totalReviews: services.totalReviews,
        status: services.status,
        imageUrl: services.imageUrl,
        isDemo: services.isDemo,
        createdAt: services.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
        },
        provider: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          location: users.location,
          phone: users.phone,
        },
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(users, eq(services.providerId, users.id))
      .where(whereClause)
      .orderBy(desc(services.createdAt))
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
    console.error('List services error:', err);
    return res.status(500).json({ error: 'Não foi possível carregar os serviços.' });
  }
});

// 2. GET SINGLE SERVICE
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const condition = isNumeric
      ? eq(services.id, parseInt(identifier))
      : eq(services.slug, identifier);

    const result = await db
      .select({
        service: services,
        category: categories,
        provider: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          location: users.location,
          phone: users.phone,
          email: users.email,
        },
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(users, eq(services.providerId, users.id))
      .where(condition)
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    return res.json({
      ...result[0].service,
      category: result[0].category,
      provider: result[0].provider,
    });
  } catch (err) {
    console.error('Get service error:', err);
    return res.status(500).json({ error: 'Erro ao carregar detalhes do serviço.' });
  }
});

// 3. CREATE SERVICE
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const provider = req.user!;
    const {
      name,
      description,
      categoryId,
      priceCents,
      priceType = 'STARTING_AT',
      location,
      offersDelivery = false,
      allowsNegotiation = true,
      imageUrl,
    } = req.body;

    if (!name || !description || !categoryId || priceCents === undefined || !imageUrl) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do serviço.' });
    }

    const cleanSlugBase = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${cleanSlugBase}-${Date.now().toString(36)}`;

    const [newService] = await db
      .insert(services)
      .values({
        providerId: provider.id,
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId: parseInt(categoryId),
        priceCents: parseInt(priceCents),
        priceType: priceType === 'FIXED' ? 'FIXED' : 'STARTING_AT',
        location: location ? location.trim() : (provider.location || 'Local'),
        offersDelivery: Boolean(offersDelivery),
        allowsNegotiation: Boolean(allowsNegotiation),
        status: 'ACTIVE',
        imageUrl: imageUrl.trim(),
        isDemo: false,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: provider.id,
      action: 'CREATE_SERVICE',
      entityType: 'SERVICE',
      entityId: String(newService.id),
      details: JSON.stringify({ name: newService.name }),
    });

    return res.status(201).json({
      message: 'Serviço anunciado com sucesso!',
      service: newService,
    });
  } catch (err) {
    console.error('Create service error:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar serviço.' });
  }
});

export default router;
