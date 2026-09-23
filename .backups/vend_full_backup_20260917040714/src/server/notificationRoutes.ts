import { Router } from 'express';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// LIST USER NOTIFICATIONS
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return res.json(list);
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ error: 'Erro ao carregar notificações.' });
  }
});

// MARK ALL AS READ
router.patch('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));

    return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (err) {
    console.error('Mark read notifications error:', err);
    return res.status(500).json({ error: 'Erro ao marcar notificações.' });
  }
});

export default router;
