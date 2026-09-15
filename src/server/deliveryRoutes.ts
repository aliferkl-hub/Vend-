import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  orders,
  deliveryCodes,
  deliveryAttempts,
  deliveries,
  deliveryDrivers,
  users,
  notifications,
  auditLogs,
  addresses,
  orderItems,
} from '../db/schema.ts';
import { eq, and, or, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireDriver } from '../middleware/auth.ts';

const router = Router();

const MAX_DELIVERY_ATTEMPTS = 3;

// 1. DRIVER DASHBOARD / LIST ASSIGNED DELIVERIES
router.get('/my-deliveries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;

    // Find driver record
    const [driver] = await db
      .select()
      .from(deliveryDrivers)
      .where(eq(deliveryDrivers.userId, user.id))
      .limit(1);

    // List deliveries assigned to this driver (or available if driver is active)
    const list = await db
      .select({
        order: orders,
        buyer: { id: users.id, name: users.name, phone: users.phone },
        seller: { id: users.id, name: users.name, phone: users.phone },
        address: addresses,
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .leftJoin(addresses, eq(orders.deliveryAddressId, addresses.id))
      .where(
        or(
          eq(orders.deliveryDriverId, user.id),
          and(eq(orders.status, 'READY_FOR_PICKUP'), eq(orders.deliveryType, 'SHIPPING'))
        )
      )
      .orderBy(desc(orders.createdAt));

    // Security check: NEVER reveal deliveryCode to driver
    const sanitizedList = list.map((item) => ({
      ...item.order,
      deliveryCode: '••••', // Masked! Driver must ask buyer on delivery
      buyer: item.buyer,
      seller: item.seller,
      address: item.address,
    }));

    return res.json({
      driver: driver || null,
      deliveries: sanitizedList,
    });
  } catch (err) {
    console.error('List driver deliveries error:', err);
    return res.status(500).json({ error: 'Erro ao carregar entregas.' });
  }
});

// 2. ACCEPT / ASSIGN DELIVERY TO DRIVER
router.post('/accept/:orderId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId } = req.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    if (order.deliveryDriverId && order.deliveryDriverId !== user.id) {
      return res.status(400).json({ error: 'Este pedido já foi atribuído a outro entregador.' });
    }

    // Ensure driver profile exists
    let [driver] = await db
      .select()
      .from(deliveryDrivers)
      .where(eq(deliveryDrivers.userId, user.id))
      .limit(1);

    if (!driver) {
      const [created] = await db
        .insert(deliveryDrivers)
        .values({
          userId: user.id,
          region: user.location || 'Local',
          status: 'DELIVERING',
        })
        .returning();
      driver = created;
    }

    await db
      .update(orders)
      .set({
        deliveryDriverId: user.id,
        status: 'OUT_FOR_DELIVERY',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Notify buyer
    await db.insert(notifications).values({
      userId: order.buyerId,
      title: 'Seu pedido saiu para entrega!',
      message: `${user.name} está a caminho. Tenha seu código de 4 dígitos em mãos para confirmar o recebimento.`,
      type: 'DELIVERY',
      link: `/pedidos`,
    });

    return res.json({ message: 'Entrega aceita! Pedido em rota.' });
  } catch (err) {
    console.error('Accept delivery error:', err);
    return res.status(500).json({ error: 'Erro ao aceitar entrega.' });
  }
});

// 3. VALIDATE 4-DIGIT DELIVERY CODE (CRITICAL SECURITY)
router.post('/confirm-code', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId, code } = req.body;

    if (!orderId || !code) {
      return res.status(400).json({ error: 'Pedido e código de 4 dígitos são obrigatórios.' });
    }

    const cleanCode = String(code).trim();
    if (cleanCode.length !== 4) {
      return res.status(400).json({ error: 'O código de entrega deve conter exatamente 4 dígitos.' });
    }

    // Fetch order
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // Authorization: Only assigned driver or seller or admin can submit the validation
    if (
      order.deliveryDriverId !== user.id &&
      order.sellerId !== user.id &&
      user.role !== 'MASTER_OWNER'
    ) {
      return res.status(403).json({ error: 'Você não tem permissão para confirmar a entrega deste pedido.' });
    }

    // Check if already delivered
    if (order.status === 'DELIVERED' || order.deliveryCodeUsed) {
      return res.status(400).json({ error: 'NEGADO: Este código já foi utilizado e a entrega já está confirmada.' });
    }

    // Fetch code from delivery_codes table
    const [codeRecord] = await db
      .select()
      .from(deliveryCodes)
      .where(eq(deliveryCodes.orderId, order.id))
      .limit(1);

    if (!codeRecord) {
      return res.status(500).json({ error: 'Registro do código de entrega não localizado no sistema.' });
    }

    if (codeRecord.used) {
      return res.status(400).json({ error: 'NEGADO: Código já utilizado anteriormente.' });
    }

    // Check max attempts
    if (codeRecord.attempts >= MAX_DELIVERY_ATTEMPTS) {
      return res.status(403).json({
        error: `NEGADO: Limite máximo de ${MAX_DELIVERY_ATTEMPTS} tentativas incorretas atingido. Por segurança, contate o suporte VEND+.`,
      });
    }

    const isMatch = codeRecord.code === cleanCode;

    // Log attempt in audit and delivery_attempts
    await db.insert(deliveryAttempts).values({
      orderId: order.id,
      driverId: user.id,
      attemptedCode: isMatch ? '****' : cleanCode,
      isSuccess: isMatch,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!isMatch) {
      const newAttempts = codeRecord.attempts + 1;
      await db
        .update(deliveryCodes)
        .set({ attempts: newAttempts })
        .where(eq(deliveryCodes.id, codeRecord.id));

      await db
        .update(orders)
        .set({ deliveryAttempts: newAttempts })
        .where(eq(orders.id, order.id));

      const remaining = MAX_DELIVERY_ATTEMPTS - newAttempts;
      return res.status(400).json({
        error: `NEGADO: Código incorreto. Tentativas restantes: ${remaining}.`,
        remainingAttempts: remaining,
      });
    }

    // SUCCESS: Code matches!
    const now = new Date();

    // Mark delivery code as used
    await db
      .update(deliveryCodes)
      .set({
        used: true,
        usedAt: now,
      })
      .where(eq(deliveryCodes.id, codeRecord.id));

    // Update order to DELIVERED
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: 'DELIVERED',
        deliveryCodeUsed: true,
        deliveredAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning();

    // Update driver total deliveries count
    await db
      .update(deliveryDrivers)
      .set({
        totalDeliveries: (await db.select().from(deliveryDrivers).where(eq(deliveryDrivers.userId, user.id)))[0]?.totalDeliveries + 1 || 1,
        status: 'AVAILABLE',
        updatedAt: now,
      })
      .where(eq(deliveryDrivers.userId, user.id));

    // Notify buyer
    await db.insert(notifications).values({
      userId: order.buyerId,
      title: 'Entrega confirmada com sucesso!',
      message: `Seu pedido #${order.orderNumber} foi entregue. Avalie o vendedor e o entregador!`,
      type: 'DELIVERY',
      link: `/pedidos`,
    });

    // Notify seller
    await db.insert(notifications).values({
      userId: order.sellerId,
      title: 'Pedido entregue!',
      message: `O pedido #${order.orderNumber} foi entregue com sucesso e o valor foi liberado.`,
      type: 'SALE',
      link: `/pedidos`,
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'DELIVERY_CONFIRMED',
      entityType: 'ORDER',
      entityId: String(order.id),
      details: JSON.stringify({
        confirmedBy: user.id,
        orderNumber: order.orderNumber,
        timestamp: now.toISOString(),
      }),
    });

    return res.json({
      success: true,
      message: 'ENTREGA CONFIRMADA COM SUCESSO! Código validado pelo backend.',
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Delivery code validation error:', err);
    return res.status(500).json({ error: 'Erro ao validar código de entrega.' });
  }
});

export default router;
