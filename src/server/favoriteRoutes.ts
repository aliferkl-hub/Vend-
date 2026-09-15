import { Router } from 'express';
import { db } from '../db/index.ts';
import { favorites, products, services, stores } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// LIST FAVORITES
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const favs = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, user.id))
      .orderBy(desc(favorites.createdAt));

    // Enrich with item details
    const enriched = [];
    for (const f of favs) {
      if (f.itemType === 'PRODUCT') {
        const [prod] = await db.select().from(products).where(eq(products.id, f.itemId)).limit(1);
        if (prod) enriched.push({ ...f, item: prod });
      } else if (f.itemType === 'SERVICE') {
        const [serv] = await db.select().from(services).where(eq(services.id, f.itemId)).limit(1);
        if (serv) enriched.push({ ...f, item: serv });
      } else if (f.itemType === 'STORE') {
        const [st] = await db.select().from(stores).where(eq(stores.id, f.itemId)).limit(1);
        if (st) enriched.push({ ...f, item: st });
      }
    }

    return res.json(enriched);
  } catch (err) {
    console.error('List favorites error:', err);
    return res.status(500).json({ error: 'Erro ao carregar favoritos.' });
  }
});

// TOGGLE FAVORITE
router.post('/toggle', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'Tipo e ID do item são obrigatórios.' });
    }

    const [existing] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, user.id),
          eq(favorites.itemType, itemType),
          eq(favorites.itemId, parseInt(itemId))
        )
      )
      .limit(1);

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return res.json({ favorited: false, message: 'Removido dos favoritos.' });
    } else {
      await db.insert(favorites).values({
        userId: user.id,
        itemType,
        itemId: parseInt(itemId),
      });
      return res.json({ favorited: true, message: 'Adicionado aos favoritos!' });
    }
  } catch (err) {
    console.error('Toggle favorite error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar favoritos.' });
  }
});

export default router;
