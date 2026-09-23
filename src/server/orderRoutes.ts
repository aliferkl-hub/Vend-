import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import {
  orders,
  orderItems,
  products,
  services,
  users,
  plans,
  commissions,
  deliveryCodes,
  notifications,
  auditLogs,
  negotiations,
  addresses,
} from '../db/schema.ts';
import { eq, and, or, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// Helper: Generate secure 4-digit delivery code
function generate4DigitCode(): string {
  return crypto.randomInt(1000, 10000).toString();
}

// 1. CREATE ORDER (Checkout calculation strictly on backend)
router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const buyer = req.user!;
    const { items, deliveryType = 'SHIPPING', addressId, acceptedNegotiationId, paymentMethod } = req.body;

    // Strict Enforcement: If user chose PIX or MERCADO_PAGO_CHECKOUT, verify Mercado Pago is configured
    if (paymentMethod === 'PIX' || paymentMethod === 'MERCADO_PAGO_CHECKOUT') {
      const { getMercadoPagoCredentials } = await import('./mercadopagoService.ts');
      const creds = await getMercadoPagoCredentials();
      if (!creds.isConfigured) {
        return res.status(503).json({
          error: 'MERCADO PAGO NÃO CONFIGURADO: O pagamento ainda não pode ser processado. O administrador precisa configurar as credenciais de produção do Mercado Pago.',
          code: 'MP_NOT_CONFIGURED',
        });
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    // Process and validate items from database
    let totalGrossCents = 0;
    let sellerId: number | null = null;
    const validatedItems: Array<{
      productId?: number;
      serviceId?: number;
      itemType: 'PRODUCT' | 'SERVICE';
      title: string;
      unitPriceCents: number;
      quantity: number;
      subtotalCents: number;
      imageUrl: string | null;
    }> = [];

    // If checkout is based on an accepted negotiation
    let negotiationAgreedPriceCents: number | null = null;
    if (acceptedNegotiationId) {
      const [neg] = await db
        .select()
        .from(negotiations)
        .where(
          and(
            eq(negotiations.id, parseInt(acceptedNegotiationId)),
            eq(negotiations.buyerId, buyer.id),
            eq(negotiations.status, 'ACCEPTED')
          )
        )
        .limit(1);

      if (neg && neg.finalAgreedPriceCents) {
        negotiationAgreedPriceCents = neg.finalAgreedPriceCents;
      }
    }

    for (const it of items) {
      const qty = Math.max(1, parseInt(it.quantity) || 1);

      if (it.productId) {
        const [p] = await db.select().from(products).where(eq(products.id, parseInt(it.productId))).limit(1);
        if (!p || p.status !== 'ACTIVE') {
          return res.status(400).json({ error: `Produto ${p ? p.name : ''} não está disponível para compra.` });
        }
        if (p.sellerId === buyer.id) {
          return res.status(400).json({ error: 'Você não pode comprar seu próprio produto.' });
        }
        if (sellerId && sellerId !== p.sellerId) {
          return res.status(400).json({
            error: 'No momento, cada pedido no VEND+ deve conter itens de apenas um vendedor.',
          });
        }
        sellerId = p.sellerId;

        // Use negotiated price if applicable
        const unitPrice = negotiationAgreedPriceCents || p.priceCents;
        const subtotal = unitPrice * qty;
        totalGrossCents += subtotal;

        validatedItems.push({
          productId: p.id,
          itemType: 'PRODUCT',
          title: p.name,
          unitPriceCents: unitPrice,
          quantity: qty,
          subtotalCents: subtotal,
          imageUrl: p.imageUrl,
        });
      } else if (it.serviceId) {
        const [s] = await db.select().from(services).where(eq(services.id, parseInt(it.serviceId))).limit(1);
        if (!s || s.status !== 'ACTIVE') {
          return res.status(400).json({ error: 'Serviço não está disponível.' });
        }
        if (s.providerId === buyer.id) {
          return res.status(400).json({ error: 'Você não pode contratar seu próprio serviço.' });
        }
        sellerId = s.providerId;

        const unitPrice = negotiationAgreedPriceCents || s.priceCents;
        const subtotal = unitPrice * qty;
        totalGrossCents += subtotal;

        validatedItems.push({
          serviceId: s.id,
          itemType: 'SERVICE',
          title: s.name,
          unitPriceCents: unitPrice,
          quantity: qty,
          subtotalCents: subtotal,
          imageUrl: s.imageUrl,
        });
      }
    }

    if (!sellerId) {
      return res.status(400).json({ error: 'Vendedor não identificado.' });
    }

    // Fetch seller's plan to determine commission
    const [sellerUser] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    const sellerPlanSlug = sellerUser?.planSlug || 'free';
    const [plan] = await db.select().from(plans).where(eq(plans.slug, sellerPlanSlug)).limit(1);

    // Commission rules (Section 22 & 23):
    // FREE: 7%, Paid: 4%
    const commissionPercent = plan?.commissionPercent ?? (sellerPlanSlug === 'free' ? 7 : 4);
    const commissionCents = Math.round((totalGrossCents * commissionPercent) / 100);
    const sellerNetCents = totalGrossCents - commissionCents;

    // Shipping fee
    const shippingFeeCents = deliveryType === 'SHIPPING' ? 1490 : 0; // R$ 14,90
    const finalTotalWithShipping = totalGrossCents + shippingFeeCents;

    // Generate random 4-digit code
    const deliveryCode = generate4DigitCode();
    const orderNumber = `VEND-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Create order
    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        buyerId: buyer.id,
        sellerId,
        status: 'AWAITING_PAYMENT',
        totalGrossCents: finalTotalWithShipping,
        commissionCents,
        sellerNetCents,
        shippingFeeCents,
        deliveryType: deliveryType === 'PICKUP' ? 'PICKUP' : 'SHIPPING',
        deliveryAddressId: addressId ? parseInt(addressId) : null,
        deliveryCode,
        deliveryCodeUsed: false,
        deliveryAttempts: 0,
      })
      .returning();

    // Create order items
    for (const item of validatedItems) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId || null,
        serviceId: item.serviceId || null,
        itemType: item.itemType,
        title: item.title,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.subtotalCents,
        imageUrl: item.imageUrl,
      });
    }

    // Record commission record in PostgreSQL
    await db.insert(commissions).values({
      orderId: newOrder.id,
      sellerId,
      grossAmountCents: totalGrossCents,
      commissionPercent,
      commissionCents,
      sellerNetAmountCents: sellerNetCents,
      planNameAtSale: plan?.name || 'FREE',
    });

    // Record delivery code
    await db.insert(deliveryCodes).values({
      orderId: newOrder.id,
      code: deliveryCode,
      used: false,
      attempts: 0,
    });

    // If this was from a negotiation, mark as COMPLETED
    if (acceptedNegotiationId) {
      await db
        .update(negotiations)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(negotiations.id, parseInt(acceptedNegotiationId)));
    }

    // Notifications
    await db.insert(notifications).values({
      userId: sellerId,
      title: 'Novo pedido recebido!',
      message: `Você recebeu um novo pedido #${newOrder.orderNumber}.`,
      type: 'ORDER',
      link: `/pedidos`,
    });

    await db.insert(notifications).values({
      userId: buyer.id,
      title: 'Pedido criado!',
      message: `Seu pedido #${newOrder.orderNumber} foi criado com sucesso.`,
      type: 'ORDER',
      link: `/pedidos`,
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: buyer.id,
      action: 'CREATE_ORDER',
      entityType: 'ORDER',
      entityId: String(newOrder.id),
      details: JSON.stringify({
        orderNumber: newOrder.orderNumber,
        totalGrossCents: newOrder.totalGrossCents,
        commissionCents,
      }),
    });

    return res.status(201).json({
      message: 'Pedido gerado com sucesso!',
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalGrossCents: newOrder.totalGrossCents,
      commissionCents,
      sellerNetCents,
      shippingFeeCents,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Erro ao processar checkout.' });
  }
});

// 2. LIST MY ORDERS (Buyer or Seller)
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const type = req.query.tipo === 'vendas' ? 'SELLER' : 'BUYER';

    const condition =
      type === 'SELLER' ? eq(orders.sellerId, user.id) : eq(orders.buyerId, user.id);

    const userOrders = await db
      .select({
        order: orders,
        buyer: { id: users.id, name: users.name, email: users.email },
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(condition)
      .orderBy(desc(orders.createdAt));

    // Fetch items for each order
    const result = [];
    for (const o of userOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.order.id));
      
      // SECURITY (Section 27 & 35):
      // Only the buyer can see the delivery code (or Master Owner).
      // Driver and seller CANNOT see it directly before delivery confirmation.
      const safeOrder = { ...o.order };
      if (user.id !== o.order.buyerId && user.role !== 'MASTER_OWNER') {
        safeOrder.deliveryCode = '••••';
      }

      result.push({
        ...safeOrder,
        buyer: o.buyer,
        items,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('List orders error:', err);
    return res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
});

// 3. GET ORDER DETAILS (Protected)
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const [order] = await db
      .select({
        order: orders,
        buyer: { id: users.id, name: users.name, email: users.email, phone: users.phone },
        seller: { id: users.id, name: users.name, email: users.email, phone: users.phone },
      })
      .from(orders)
      .leftJoin(users, eq(orders.buyerId, users.id))
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    // Permission check
    if (
      order.order.buyerId !== user.id &&
      order.order.sellerId !== user.id &&
      order.order.deliveryDriverId !== user.id &&
      user.role !== 'MASTER_OWNER'
    ) {
      return res.status(403).json({ error: 'Acesso não autorizado a este pedido.' });
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.order.id));

    let address = null;
    if (order.order.deliveryAddressId) {
      const [addr] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.order.deliveryAddressId))
        .limit(1);
      address = addr || null;
    }

    // Delivery code mask: Only Buyer sees real code
    const safeOrder = { ...order.order };
    if (user.id !== order.order.buyerId && user.role !== 'MASTER_OWNER') {
      safeOrder.deliveryCode = '••••';
    }

    return res.json({
      ...safeOrder,
      buyer: order.buyer,
      seller: order.seller,
      items,
      address,
    });
  } catch (err) {
    console.error('Get order error:', err);
    return res.status(500).json({ error: 'Erro ao obter pedido.' });
  }
});

// 4. UPDATE ORDER STATUS (Seller preparing/ready/etc)
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(id))).limit(1);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    // Only seller or admin can change status (except delivered which requires 4-digit code)
    if (order.sellerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    // Critical security: Cannot mark as DELIVERED directly without 4-digit code
    if (status === 'DELIVERED') {
      return res.status(400).json({
        error: 'Pedidos com entrega não podem ser marcados como ENTREGUE diretamente. É obrigatório validar o código de 4 dígitos do comprador.',
      });
    }

    const allowed = ['PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Transição de status não permitida.' });
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    await db.insert(notifications).values({
      userId: order.buyerId,
      title: 'Atualização no seu pedido',
      message: `Seu pedido #${order.orderNumber} agora está: ${status}`,
      type: 'ORDER',
      link: `/pedidos`,
    });

    return res.json({ message: 'Status atualizado com sucesso!', order: updated });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

export default router;
