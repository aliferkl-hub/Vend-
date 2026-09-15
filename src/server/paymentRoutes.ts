import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { orders, payments, notifications, auditLogs } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// Check if Mercado Pago credentials are configured
function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_ACCESS_TOKEN.trim().length > 0);
}

// 1. GET PAYMENT STATUS / PREFERENCE CREATION
router.post('/create-preference/:orderId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId } = req.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    if (order.buyerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({
        configured: false,
        error:
          'A integração com o Mercado Pago ainda precisa ser configurada com as chaves reais (MERCADOPAGO_ACCESS_TOKEN) nas variáveis de ambiente.',
        message:
          'Por favor, insira o token de acesso do Mercado Pago (Sandbox ou Produção) nas configurações para processar pagamentos reais via PIX, Cartão e Boleto.',
      });
    }

    // Call Mercado Pago API with real token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const externalRef = `vend_${order.id}_${Date.now()}`;

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Pedido VEND+ #${order.orderNumber}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: order.totalGrossCents / 100,
          },
        ],
        external_reference: externalRef,
        back_urls: {
          success: `${process.env.APP_URL || 'http://localhost:3000'}/pedidos?status=success`,
          failure: `${process.env.APP_URL || 'http://localhost:3000'}/pedidos?status=failure`,
          pending: `${process.env.APP_URL || 'http://localhost:3000'}/pedidos?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/webhook`,
      }),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error('Mercado Pago API error:', errText);
      return res.status(500).json({ error: 'Falha na comunicação com a API do Mercado Pago.' });
    }

    const mpData = await mpResponse.json();

    // Register pending payment record
    await db.insert(payments).values({
      orderId: order.id,
      paymentType: 'ORDER',
      amountCents: order.totalGrossCents,
      status: 'PENDING',
      paymentMethod: 'MERCADO_PAGO',
      externalReference: externalRef,
      mpRawResponse: JSON.stringify(mpData),
    });

    return res.json({
      configured: true,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      preferenceId: mpData.id,
      externalReference: externalRef,
    });
  } catch (err) {
    console.error('Create preference error:', err);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
  }
});

// 2. MERCADO PAGO WEBHOOK (Idempotent & Secure)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { action, type, data } = req.body;
    const paymentId = data?.id || req.query['data.id'] || req.query.id;

    if (!paymentId) {
      return res.status(200).send('Event received without payment ID');
    }

    if (!isMercadoPagoConfigured()) {
      return res.status(200).send('Mercado Pago not configured');
    }

    // Verify payment details directly with Mercado Pago API
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const verifyRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    if (!verifyRes.ok) {
      return res.status(200).send('Payment not found on MP');
    }

    const paymentInfo = await verifyRes.json();
    const externalRef = paymentInfo.external_reference;
    const mpStatus = paymentInfo.status; // 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded'

    if (!externalRef) {
      return res.status(200).send('No external reference');
    }

    // Check payment record in DB
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.externalReference, externalRef))
      .limit(1);

    if (!existingPayment) {
      return res.status(200).send('Payment record not found');
    }

    // Idempotency: If already approved, do not process twice
    if (existingPayment.status === 'APPROVED' && mpStatus === 'approved') {
      return res.status(200).send('Already processed (idempotent)');
    }

    // Map status
    let dbStatus = 'PENDING';
    if (mpStatus === 'approved') dbStatus = 'APPROVED';
    else if (mpStatus === 'rejected' || mpStatus === 'cancelled') dbStatus = 'CANCELLED';
    else if (mpStatus === 'refunded') dbStatus = 'REFUNDED';

    const now = new Date();

    // Update payment record
    await db
      .update(payments)
      .set({
        status: dbStatus,
        mpPaymentId: String(paymentId),
        mpStatus,
        mpRawResponse: JSON.stringify(paymentInfo),
        paidAt: dbStatus === 'APPROVED' ? now : null,
      })
      .where(eq(payments.id, existingPayment.id));

    // If payment approved, update order status
    if (dbStatus === 'APPROVED' && existingPayment.orderId) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, existingPayment.orderId))
        .limit(1);

      if (order && order.status === 'AWAITING_PAYMENT') {
        await db
          .update(orders)
          .set({
            status: 'PAID',
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        // Notify buyer & seller
        await db.insert(notifications).values({
          userId: order.buyerId,
          title: 'Pagamento aprovado!',
          message: `Seu pagamento para o pedido #${order.orderNumber} foi confirmado com sucesso.`,
          type: 'ORDER',
          link: `/pedidos`,
        });

        await db.insert(notifications).values({
          userId: order.sellerId,
          title: 'Pagamento recebido!',
          message: `O pagamento do pedido #${order.orderNumber} foi aprovado. Prepare o pedido para envio.`,
          type: 'SALE',
          link: `/pedidos`,
        });

        // Audit log
        await db.insert(auditLogs).values({
          userId: order.buyerId,
          action: 'PAYMENT_APPROVED',
          entityType: 'PAYMENT',
          entityId: String(existingPayment.id),
          details: JSON.stringify({ mpPaymentId: paymentId, orderId: order.id, amount: paymentInfo.transaction_amount }),
        });
      }
    }

    return res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Mercado Pago Webhook error:', err);
    return res.status(200).send('Webhook error handled');
  }
});

// 3. GET INTEGRATION STATUS (Public/Buyer check)
router.get('/config-status', (req, res) => {
  return res.json({
    configured: isMercadoPagoConfigured(),
    environment: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-') ? 'Sandbox / Testes' : 'Produção',
  });
});

export default router;
