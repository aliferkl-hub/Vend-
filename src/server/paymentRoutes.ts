import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { orders, payments, notifications, auditLogs, users } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';
import {
  getMercadoPagoCredentials,
  getPublicConfig,
  testMercadoPagoConnection,
  saveMercadoPagoCredentials,
  createPixPayment,
  createCheckoutPreference,
  getPaymentFromMercadoPago,
  settlePayment,
} from './mercadopagoService.ts';

const router = Router();

// 1. PUBLIC GATEWAY CONFIG STATUS (Safe, never exposes private tokens)
router.get('/config-status', async (req, res) => {
  try {
    const config = await getPublicConfig();
    return res.json(config);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/mercadopago/public-config', async (req, res) => {
  try {
    const config = await getPublicConfig();
    return res.json(config);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. CREATE PIX FOR ORDER (REAL MERCADO PAGO /v1/payments)
router.post('/mercadopago/order/pix', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId, payer } = req.body;

    const creds = await getMercadoPagoCredentials();
    if (!creds.isConfigured) {
      return res.status(503).json({
        error: 'MERCADO PAGO NÃO CONFIGURADO: O pagamento ainda não pode ser processado. O administrador precisa configurar as credenciais de produção do Mercado Pago.',
        code: 'MP_NOT_CONFIGURED',
      });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'ID do pedido não informado.' });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.buyerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Apenas o comprador do pedido pode efetuar o pagamento.' });
    }

    if (order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ error: `Este pedido já está no status "${order.status}".` });
    }

    // Check if there is an active pending Pix payment with qrCode generated in the last 45 minutes
    const existingPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    const validPendingPix = existingPayments.find(
      (p) =>
        p.paymentMethod === 'PIX' &&
        p.status === 'PENDING' &&
        p.qrCode &&
        Date.now() - new Date(p.createdAt).getTime() < 45 * 60 * 1000
    );

    if (validPendingPix && validPendingPix.qrCode) {
      // Re-use active Pix QR Code
      return res.json({
        success: true,
        paymentId: validPendingPix.id,
        mpPaymentId: validPendingPix.mpPaymentId,
        qrCode: validPendingPix.qrCode,
        qrCodeBase64: validPendingPix.qrCodeBase64,
        ticketUrl: validPendingPix.ticketUrl,
        amount: validPendingPix.amountCents / 100,
        amountFormatted: (validPendingPix.amountCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        status: validPendingPix.status,
        externalReference: validPendingPix.externalReference,
      });
    }

    // Generate new external reference
    const externalRef = `VEND_ORD_${order.id}_${Date.now()}`;
    const payerEmail = payer?.email || user.email;
    const payerNameParts = (payer?.name || user.name || 'Cliente VEND+').split(' ');
    const firstName = payerNameParts[0] || 'Cliente';
    const lastName = payerNameParts.slice(1).join(' ') || 'VEND+';
    const payerCpf = payer?.cpf;

    const pixResult = await createPixPayment({
      amountCents: order.totalGrossCents,
      description: `Pedido VEND+ #${order.orderNumber}`,
      externalReference: externalRef,
      orderId: order.id,
      userId: user.id,
      paymentType: 'ORDER',
      payer: {
        email: payerEmail,
        firstName,
        lastName,
        cpf: payerCpf,
      },
    });

    return res.json({
      ...pixResult,
      amountFormatted: (order.totalGrossCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    });
  } catch (err: any) {
    console.error('[MercadoPago] Erro ao gerar Pix do pedido:', err);
    return res.status(500).json({ error: err.message || 'Erro ao gerar pagamento Pix via Mercado Pago.' });
  }
});

// 3. CREATE CHECKOUT PRO PREFERENCE (Alternative card/multi-payment flow)
router.post('/create-preference/:orderId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { orderId } = req.params;

    const creds = await getMercadoPagoCredentials();
    if (!creds.isConfigured) {
      return res.status(503).json({
        error: 'MERCADO PAGO NÃO CONFIGURADO: O pagamento ainda não pode ser processado. O administrador precisa configurar as credenciais de produção do Mercado Pago.',
        code: 'MP_NOT_CONFIGURED',
      });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    if (order.buyerId !== user.id && user.role !== 'MASTER_OWNER') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    const externalRef = `VEND_PREF_${order.id}_${Date.now()}`;

    const prefResult = await createCheckoutPreference({
      orderId: order.id,
      userId: user.id,
      title: `Pedido VEND+ #${order.orderNumber}`,
      amountCents: order.totalGrossCents,
      externalReference: externalRef,
      payerEmail: user.email,
      payerName: user.name,
    });

    return res.json({
      configured: true,
      initPoint: prefResult.initPoint,
      preferenceId: prefResult.preferenceId,
      externalReference: externalRef,
      paymentId: prefResult.paymentId,
    });
  } catch (err: any) {
    console.error('[MercadoPago] Create preference error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao criar preferência de pagamento.' });
  }
});

// 4. REAL-TIME PAYMENT STATUS POLLING & AUTO-SETTLEMENT
router.get('/status/:paymentId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { paymentId } = req.params;
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(paymentId)))
      .limit(1);

    if (!paymentRecord) {
      return res.status(404).json({ error: 'Registro de pagamento não encontrado.' });
    }

    // If already approved, return immediately
    if (paymentRecord.status === 'APPROVED') {
      return res.json({
        paymentId: paymentRecord.id,
        status: 'APPROVED',
        approved: true,
        paidAt: paymentRecord.paidAt,
        mpPaymentId: paymentRecord.mpPaymentId,
      });
    }

    // If PENDING and has mpPaymentId, check directly with Mercado Pago in real-time
    if (paymentRecord.mpPaymentId) {
      const mpData = await getPaymentFromMercadoPago(paymentRecord.mpPaymentId);
      if (mpData && mpData.status) {
        const settleResult = await settlePayment(paymentRecord, mpData);
        return res.json({
          paymentId: paymentRecord.id,
          status: settleResult.status,
          approved: settleResult.status === 'APPROVED',
          statusDetail: mpData.status_detail,
          paidAt: mpData.date_approved,
          mpPaymentId: String(mpData.id),
        });
      }
    }

    return res.json({
      paymentId: paymentRecord.id,
      status: paymentRecord.status,
      approved: paymentRecord.status === 'APPROVED',
      statusDetail: paymentRecord.statusDetail,
    });
  } catch (err: any) {
    console.error('[MercadoPago] Error checking status:', err);
    return res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
  }
});

// 5. GET PAYMENT STATUS BY ORDER ID
router.get('/order/:orderId/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (order.status === 'PAID' || order.status === 'DELIVERED') {
      return res.json({
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: 'APPROVED',
        approved: true,
        paidAt: order.paidAt,
      });
    }

    // Find latest payment for this order
    const [latestPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (!latestPayment) {
      return res.json({
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: 'PENDING',
        approved: false,
      });
    }

    if (latestPayment.status === 'APPROVED') {
      return res.json({
        orderId: order.id,
        orderStatus: 'PAID',
        paymentStatus: 'APPROVED',
        approved: true,
        paidAt: latestPayment.paidAt,
      });
    }

    // Poll live from MP if pending
    if (latestPayment.mpPaymentId) {
      const mpData = await getPaymentFromMercadoPago(latestPayment.mpPaymentId);
      if (mpData && mpData.status) {
        const settleResult = await settlePayment(latestPayment, mpData);
        return res.json({
          orderId: order.id,
          orderStatus: settleResult.status === 'APPROVED' ? 'PAID' : order.status,
          paymentStatus: settleResult.status,
          approved: settleResult.status === 'APPROVED',
          paidAt: mpData.date_approved,
        });
      }
    }

    return res.json({
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: latestPayment.status,
      approved: latestPayment.status === 'APPROVED',
    });
  } catch (err: any) {
    console.error('[MercadoPago] Error checking order status:', err);
    return res.status(500).json({ error: 'Erro ao consultar status do pedido.' });
  }
});

// 6. MERCADO PAGO WEBHOOK (Idempotent, Production-Ready)
// Supports both /webhook and /mercadopago/webhook
const handleWebhook = async (req: Request, res: Response) => {
  try {
    const query = req.query;
    const body = req.body || {};

    // Mercado Pago sends payment notifications in different formats:
    // Webhook V1/V2: { type: 'payment', data: { id: '...' }, action: 'payment.updated' }
    // IPN: query params ?topic=payment&id=... or ?type=payment&data.id=...
    const paymentId =
      body.data?.id ||
      body.id ||
      query['data.id'] ||
      query.id ||
      (query.topic === 'payment' ? query.id : null);

    const eventType = body.type || query.type || query.topic || body.action;

    console.log(`[MercadoPago Webhook] Evento recebido: type=${eventType}, id=${paymentId}`);

    if (!paymentId) {
      // Not a payment event or test ping (e.g. subscription_preapproval or ping)
      return res.status(200).send('Webhook acknowledged (no payment id)');
    }

    // Fetch live payment details from Mercado Pago API using Access Token
    const mpData = await getPaymentFromMercadoPago(paymentId);
    if (!mpData) {
      console.warn(`[MercadoPago Webhook] Pagamento #${paymentId} não retornado pela API.`);
      return res.status(200).send('Payment not found on MP');
    }

    const externalRef = mpData.external_reference;
    console.log(
      `[MercadoPago Webhook] Pagamento #${paymentId}: status=${mpData.status}, detail=${mpData.status_detail}, external_ref=${externalRef}`
    );

    // Locate payment record in database by external reference or mp_payment_id
    let paymentRecord: typeof payments.$inferSelect | undefined;

    if (externalRef) {
      const [byRef] = await db.select().from(payments).where(eq(payments.externalReference, externalRef)).limit(1);
      paymentRecord = byRef;
    }

    if (!paymentRecord) {
      const [byMpId] = await db.select().from(payments).where(eq(payments.mpPaymentId, String(paymentId))).limit(1);
      paymentRecord = byMpId;
    }

    if (!paymentRecord) {
      console.warn(`[MercadoPago Webhook] Registro de pagamento local não encontrado para ref: ${externalRef}`);
      return res.status(200).send('Local payment record not found');
    }

    // Centralized idempotent settlement
    const settlement = await settlePayment(paymentRecord, mpData);
    console.log(`[MercadoPago Webhook] Liquidação concluída:`, settlement);

    return res.status(200).send('Webhook processed successfully');
  } catch (err: any) {
    console.error('[MercadoPago Webhook] Erro ao processar webhook:', err);
    // Always return HTTP 200 to prevent Mercado Pago from retrying uncontrollably on unrecoverable logic errors
    return res.status(200).send('Webhook processed with handled error');
  }
};

router.post('/webhook', handleWebhook);
router.post('/mercadopago/webhook', handleWebhook);
router.get('/mercadopago/webhook', (req, res) => res.status(200).send('Mercado Pago Webhook Endpoint Active'));

// 7. MERCADO PAGO HEALTH DIAGNOSTIC (Master Owner only)
router.get('/mercadopago/health', requireMasterOwner, async (req: AuthRequest, res) => {
  try {
    const creds = await getMercadoPagoCredentials();
    const testResult = await testMercadoPagoConnection();

    // Query recent payment statistics
    const recentPayments = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(10);
    const approvedCount = recentPayments.filter((p) => p.status === 'APPROVED').length;
    const pendingCount = recentPayments.filter((p) => p.status === 'PENDING').length;

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const webhookUrl = `${appUrl}/api/payments/mercadopago/webhook`;

    return res.json({
      status: testResult.connected ? 'HEALTHY' : 'WARNING',
      configured: creds.isConfigured,
      tokenType: creds.tokenType,
      isProduction: creds.isProduction,
      source: creds.source,
      hasPublicKey: Boolean(creds.publicKey),
      apiConnection: testResult,
      webhook: {
        configuredUrl: webhookUrl,
        status: 'ACTIVE',
      },
      pixCapability: {
        supported: true,
        instantSettlement: true,
      },
      stats: {
        totalRecent: recentPayments.length,
        approvedRecent: approvedCount,
        pendingRecent: pendingCount,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        externalReference: p.externalReference,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        amountCents: p.amountCents,
        status: p.status,
        mpPaymentId: p.mpPaymentId,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[MercadoPago Health] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
