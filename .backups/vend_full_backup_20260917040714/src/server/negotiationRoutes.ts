import { Router } from 'express';
import { db } from '../db/index.ts';
import { negotiations, negotiationMessages, products, services, users, notifications, auditLogs } from '../db/schema.ts';
import { eq, and, or, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// 1. LIST MY NEGOTIATIONS (both as buyer and seller)
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const list = await db
      .select({
        negotiation: negotiations,
        product: products,
        service: services,
        buyer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
      })
      .from(negotiations)
      .leftJoin(products, eq(negotiations.productId, products.id))
      .leftJoin(services, eq(negotiations.serviceId, services.id))
      .leftJoin(users, eq(negotiations.buyerId, users.id))
      .where(or(eq(negotiations.buyerId, user.id), eq(negotiations.sellerId, user.id)))
      .orderBy(desc(negotiations.updatedAt));

    return res.json(list);
  } catch (err) {
    console.error('List negotiations error:', err);
    return res.status(500).json({ error: 'Erro ao carregar negociações.' });
  }
});

// 2. GET NEGOTIATION DETAILS + MESSAGES
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const [neg] = await db
      .select({
        negotiation: negotiations,
        product: products,
        service: services,
        buyer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
      })
      .from(negotiations)
      .leftJoin(products, eq(negotiations.productId, products.id))
      .leftJoin(services, eq(negotiations.serviceId, services.id))
      .leftJoin(users, eq(negotiations.buyerId, users.id))
      .where(eq(negotiations.id, parseInt(id)))
      .limit(1);

    if (!neg) {
      return res.status(404).json({ error: 'Negociação não encontrada.' });
    }

    if (neg.negotiation.buyerId !== user.id && neg.negotiation.sellerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Acesso não autorizado a esta negociação.' });
    }

    const messages = await db
      .select({
        id: negotiationMessages.id,
        senderId: negotiationMessages.senderId,
        message: negotiationMessages.message,
        offerCents: negotiationMessages.offerCents,
        messageType: negotiationMessages.messageType,
        createdAt: negotiationMessages.createdAt,
        sender: { id: users.id, name: users.name },
      })
      .from(negotiationMessages)
      .leftJoin(users, eq(negotiationMessages.senderId, users.id))
      .where(eq(negotiationMessages.negotiationId, neg.negotiation.id))
      .orderBy(negotiationMessages.createdAt);

    return res.json({
      ...neg.negotiation,
      product: neg.product,
      service: neg.service,
      buyer: neg.buyer,
      messages,
    });
  } catch (err) {
    console.error('Get negotiation error:', err);
    return res.status(500).json({ error: 'Erro ao carregar detalhes da negociação.' });
  }
});

// 3. START NEGOTIATION (Buyer starts offer)
router.post('/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buyer = req.user!;
    const { productId, serviceId, offerCents, message } = req.body;

    if ((!productId && !serviceId) || !offerCents || offerCents <= 0) {
      return res.status(400).json({ error: 'Item e valor da oferta são obrigatórios.' });
    }

    let sellerId: number;
    let initialPriceCents: number;

    if (productId) {
      const [p] = await db.select().from(products).where(eq(products.id, parseInt(productId))).limit(1);
      if (!p) return res.status(404).json({ error: 'Produto não encontrado.' });
      if (p.sellerId === buyer.id) return res.status(400).json({ error: 'Você não pode negociar seu próprio produto.' });
      if (!p.allowsNegotiation) return res.status(400).json({ error: 'Este produto não aceita negociação.' });
      sellerId = p.sellerId;
      initialPriceCents = p.priceCents;
    } else {
      const [s] = await db.select().from(services).where(eq(services.id, parseInt(serviceId))).limit(1);
      if (!s) return res.status(404).json({ error: 'Serviço não encontrado.' });
      if (s.providerId === buyer.id) return res.status(400).json({ error: 'Você não pode negociar seu próprio serviço.' });
      if (!s.allowsNegotiation) return res.status(400).json({ error: 'Este serviço não aceita negociação.' });
      sellerId = s.providerId;
      initialPriceCents = s.priceCents;
    }

    // Check if open negotiation already exists between buyer and seller for this item
    const existing = await db
      .select()
      .from(negotiations)
      .where(
        and(
          productId ? eq(negotiations.productId, parseInt(productId)) : eq(negotiations.serviceId, parseInt(serviceId)),
          eq(negotiations.buyerId, buyer.id),
          eq(negotiations.status, 'OPEN')
        )
      )
      .limit(1);

    let negId: number;

    if (existing.length > 0) {
      negId = existing[0].id;
      await db
        .update(negotiations)
        .set({
          currentOfferCents: parseInt(offerCents),
          lastOfferBy: 'BUYER',
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, negId));
    } else {
      const [created] = await db
        .insert(negotiations)
        .values({
          productId: productId ? parseInt(productId) : null,
          serviceId: serviceId ? parseInt(serviceId) : null,
          buyerId: buyer.id,
          sellerId,
          initialPriceCents,
          currentOfferCents: parseInt(offerCents),
          lastOfferBy: 'BUYER',
          status: 'OPEN',
        })
        .returning();
      negId = created.id;
    }

    // Add message
    await db.insert(negotiationMessages).values({
      negotiationId: negId,
      senderId: buyer.id,
      message: message ? message.trim() : `Oferta enviada: R$ ${(parseInt(offerCents) / 100).toFixed(2).replace('.', ',')}`,
      offerCents: parseInt(offerCents),
      messageType: 'OFFER',
    });

    // Notify seller
    await db.insert(notifications).values({
      userId: sellerId,
      title: 'Nova proposta de negociação',
      message: `${buyer.name} enviou uma proposta de R$ ${(parseInt(offerCents) / 100).toFixed(2).replace('.', ',')}`,
      type: 'OFFER',
      link: `/minhas-negociacoes`,
    });

    return res.status(201).json({
      message: 'Proposta enviada ao vendedor!',
      negotiationId: negId,
    });
  } catch (err) {
    console.error('Start negotiation error:', err);
    return res.status(500).json({ error: 'Erro ao iniciar negociação.' });
  }
});

// 4. RESPOND TO NEGOTIATION (Counter-offer, Accept, Reject)
router.post('/:id/respond', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { action, counterOfferCents, message } = req.body; // action: 'ACCEPT' | 'REJECT' | 'COUNTER_OFFER'

    const [neg] = await db.select().from(negotiations).where(eq(negotiations.id, parseInt(id))).limit(1);
    if (!neg) return res.status(404).json({ error: 'Negociação não encontrada.' });

    if (neg.buyerId !== user.id && neg.sellerId !== user.id) {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    if (neg.status !== 'OPEN') {
      return res.status(400).json({ error: 'Esta negociação já foi finalizada.' });
    }

    const isBuyer = neg.buyerId === user.id;
    const targetUserId = isBuyer ? neg.sellerId : neg.buyerId;

    if (action === 'ACCEPT') {
      await db
        .update(negotiations)
        .set({
          status: 'ACCEPTED',
          finalAgreedPriceCents: neg.currentOfferCents,
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, neg.id));

      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || `Oferta aceita no valor de R$ ${(neg.currentOfferCents / 100).toFixed(2).replace('.', ',')}!`,
        offerCents: neg.currentOfferCents,
        messageType: 'ACCEPT',
      });

      await db.insert(notifications).values({
        userId: targetUserId,
        title: 'Oferta Aceita!',
        message: `${user.name} aceitou a oferta de R$ ${(neg.currentOfferCents / 100).toFixed(2).replace('.', ',')}. Finalize sua compra!`,
        type: 'OFFER',
        link: `/minhas-negociacoes`,
      });

      return res.json({ message: 'Oferta aceita com sucesso!', finalPriceCents: neg.currentOfferCents });
    } else if (action === 'REJECT') {
      await db
        .update(negotiations)
        .set({
          status: 'REJECTED',
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, neg.id));

      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || 'Oferta recusada.',
        messageType: 'REJECT',
      });

      await db.insert(notifications).values({
        userId: targetUserId,
        title: 'Oferta Recusada',
        message: `${user.name} recusou a proposta.`,
        type: 'OFFER',
        link: `/minhas-negociacoes`,
      });

      return res.json({ message: 'Oferta recusada.' });
    } else if (action === 'COUNTER_OFFER') {
      if (!counterOfferCents || counterOfferCents <= 0) {
        return res.status(400).json({ error: 'Valor da contraproposta é obrigatório.' });
      }

      await db
        .update(negotiations)
        .set({
          currentOfferCents: parseInt(counterOfferCents),
          lastOfferBy: isBuyer ? 'BUYER' : 'SELLER',
          updatedAt: new Date(),
        })
        .where(eq(negotiations.id, neg.id));

      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || `Contraproposta: R$ ${(parseInt(counterOfferCents) / 100).toFixed(2).replace('.', ',')}`,
        offerCents: parseInt(counterOfferCents),
        messageType: 'COUNTER_OFFER',
      });

      await db.insert(notifications).values({
        userId: targetUserId,
        title: 'Nova Contraproposta',
        message: `${user.name} fez uma contraproposta de R$ ${(parseInt(counterOfferCents) / 100).toFixed(2).replace('.', ',')}`,
        type: 'OFFER',
        link: `/minhas-negociacoes`,
      });

      return res.json({ message: 'Contraproposta enviada!' });
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (err) {
    console.error('Respond negotiation error:', err);
    return res.status(500).json({ error: 'Erro ao responder negociação.' });
  }
});

export default router;
