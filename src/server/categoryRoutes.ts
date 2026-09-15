import { Router } from 'express';
import { db } from '../db/index.ts';
import { categories } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthRequest, requireMasterOwner } from '../middleware/auth.ts';

const router = Router();

// LIST ALL ACTIVE CATEGORIES
router.get('/', async (req, res) => {
  try {
    const list = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.name);
    return res.json(list);
  } catch (err) {
    console.error('List categories error:', err);
    return res.status(500).json({ error: 'Erro ao carregar categorias.' });
  }
});

// CREATE CATEGORY (Master Owner only)
router.post('/', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const { name, icon = 'Tag', description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const [newCat] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug,
        icon,
        description,
        isActive: true,
      })
      .returning();

    return res.status(201).json({ message: 'Categoria criada!', category: newCat });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

export default router;
