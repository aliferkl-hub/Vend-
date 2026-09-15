import { Router } from 'express';
import { db } from '../db/index.ts';
import { reviews, orders, users } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// GET REVIEWS FOR A USER OR STORE
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await db
      .select({
        review: reviews,
        reviewer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.targetUserId, parseInt(userId)))
      .orderBy(desc(reviews.createdAt))
      .limit(30);

    return res.json(list);
  } catch (err) {
    console.error('List reviews error:', err);
    return res.status(500).json({ error: 'Erro ao carregar avaliações.' });
  }
});

// CREATE REVIEW (Order must be DELIVERED)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId, targetUserId, rating, comment, reviewType = 'SELLER' } = req.body;

    if (!orderId || !targetUserId || !rating || !comment) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const numRating = parseInt(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'A avaliação deve ser entre 1 e 5 estrelas.' });
    }

    // Verify order is DELIVERED
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        error: 'Não é permitido avaliar antes da conclusão e entrega do pedido.',
      });
    }

    // Prevent duplicate review for same order & reviewer
    const [existing] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.orderId, parseInt(orderId)),
          eq(reviews.reviewerId, user.id),
          eq(reviews.targetUserId, parseInt(targetUserId))
        )
      )
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: 'Você já avaliou este pedido.' });
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        orderId: order.id,
        reviewerId: user.id,
        targetUserId: parseInt(targetUserId),
        rating: numRating,
        comment: comment.trim(),
        reviewType: reviewType === 'DRIVER' ? 'DRIVER' : 'SELLER',
      })
      .returning();

    return res.status(201).json({ message: 'Avaliação enviada com sucesso!', review: newReview });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ error: 'Erro ao enviar avaliação.' });
  }
});

export default router;
