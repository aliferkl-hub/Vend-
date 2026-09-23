import { Router } from 'express';
import { db } from '../db/index.ts';
import { plans, subscriptions, users, payments, auditLogs } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import {
  createPixPayment,
  createCheckoutPreference,
  getPaymentFromMercadoPago,
  settlePayment,
  getMercadoPagoCredentials,
} from './mercadopagoService.ts';

const router = Router();

// 1. LIST PLANS (Public)
router.get('/', async (req, res) => {
  try {
    const list = await db.select().from(plans).where(eq(plans.status, 'ACTIVE')).orderBy(plans.priceCents);
    return res.json(list);
  } catch (err) {
    console.error('List plans error:', err);
    return res.status(500).json({ error: 'Erro ao listar planos.' });
  }
});

// 2. CREATE REAL MERCADO PAGO PIX FOR PLAN SUBSCRIPTION
router.post('/create-pix', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { planSlug, planId, payer } = req.body;

    let plan;
    if (planId) {
      [plan] = await db.select().from(plans).where(eq(plans.id, Number(planId))).limit(1);
    } else if (planSlug) {
      [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
    }

    if (!plan) {
      return res.status(404).json({ error: 'Plano selecionado não encontrado.' });
    }

    if (plan.priceCents === 0) {
      return res.status(400).json({ error: 'O plano Gratuito não requer pagamento.' });
    }

    const creds = await getMercadoPagoCredentials();
    if (!creds.isConfigured) {
      return res.status(503).json({
        error: 'O Mercado Pago ainda precisa ser configurado com o Token de Produção no servidor.',
        configured: false,
      });
    }

    const externalRef = `VEND_PLAN_${user.id}_${plan.id}_${Date.now()}`;
    const payerEmail = payer?.email || user.email;
    const payerNameParts = (payer?.name || user.name || 'Cliente VEND+').split(' ');
    const firstName = payerNameParts[0] || 'Cliente';
    const lastName = payerNameParts.slice(1).join(' ') || 'VEND+';
    const payerCpf = payer?.cpf;

    const pixResult = await createPixPayment({
      amountCents: plan.priceCents,
      description: `Assinatura Plano VEND+ ${plan.name}`,
      externalReference: externalRef,
      userId: user.id,
      paymentType: 'SUBSCRIPTION',
      payer: {
        email: payerEmail,
        firstName,
        lastName,
        cpf: payerCpf,
      },
    });

    const formattedAmount = (plan.priceCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // Provide qrCodeUrl for frontend display:
    // If Mercado Pago returned qrCodeBase64, use real base64 data URI!
    // Also provide standard QR code generator as visual backup of the exact qrCode (copia e cola)
    const qrImage = pixResult.qrCodeBase64
      ? `data:image/png;base64,${pixResult.qrCodeBase64}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
          pixResult.qrCode || ''
        )}`;

    return res.json({
      success: true,
      paymentId: pixResult.paymentId,
      mpPaymentId: pixResult.mpPaymentId,
      externalReference: externalRef,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents,
      },
      amountCents: plan.priceCents,
      amountFormatted: formattedAmount,
      copiaECola: pixResult.qrCode,
      qrCode: pixResult.qrCode,
      qrCodeUrl: qrImage,
      ticketUrl: pixResult.ticketUrl,
      status: 'Aguardando pagamento no Mercado Pago',
    });
  } catch (err: any) {
    console.error('Create plan PIX error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao gerar pagamento PIX para o plano no Mercado Pago.' });
  }
});

// 3. CREATE CHECKOUT PRO PREFERENCE FOR PLAN
router.post('/create-preference', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { planSlug, planId } = req.body;

    let plan;
    if (planId) {
      [plan] = await db.select().from(plans).where(eq(plans.id, Number(planId))).limit(1);
    } else if (planSlug) {
      [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
    }

    if (!plan || plan.priceCents === 0) {
      return res.status(400).json({ error: 'Plano inválido para pagamento.' });
    }

    const creds = await getMercadoPagoCredentials();
    if (!creds.isConfigured) {
      return res.status(503).json({
        error: 'O Mercado Pago ainda precisa ser configurado com o Token de Produção no servidor.',
        configured: false,
      });
    }

    const externalRef = `VEND_PREF_PLAN_${user.id}_${plan.id}_${Date.now()}`;
    const prefResult = await createCheckoutPreference({
      planId: plan.id,
      userId: user.id,
      title: `Assinatura Plano VEND+ ${plan.name}`,
      amountCents: plan.priceCents,
      externalReference: externalRef,
      payerEmail: user.email,
      payerName: user.name,
    });

    return res.json({
      success: true,
      initPoint: prefResult.initPoint,
      preferenceId: prefResult.preferenceId,
      externalReference: externalRef,
      paymentId: prefResult.paymentId,
    });
  } catch (err: any) {
    console.error('Create plan preference error:', err);
    return res.status(500).json({ error: err.message || 'Erro ao criar preferência de pagamento.' });
  }
});

// 4. CHECK STATUS & CONFIRM PLAN (NEVER ACTIVATES WITHOUT REAL MERCADO PAGO CONFIRMATION!)
router.post('/confirm-pix', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { paymentId, planSlug } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Identificador de pagamento não fornecido.' });
    }

    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, Number(paymentId)), eq(payments.paymentType, 'SUBSCRIPTION')))
      .limit(1);

    if (!paymentRecord) {
      return res.status(404).json({ error: 'Registro de pagamento não localizado.' });
    }

    // If already approved, return success
    if (paymentRecord.status === 'APPROVED') {
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      return res.json({
        success: true,
        approved: true,
        status: 'APPROVED',
        message: 'Pagamento confirmado! Seu plano está 100% ativo.',
        userPlanSlug: updatedUser?.planSlug,
      });
    }

    // Actively query Mercado Pago API to check if user paid
    if (paymentRecord.mpPaymentId) {
      const mpData = await getPaymentFromMercadoPago(paymentRecord.mpPaymentId);
      if (mpData && mpData.status) {
        const settlement = await settlePayment(paymentRecord, mpData);

        if (settlement.status === 'APPROVED') {
          const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
          return res.json({
            success: true,
            approved: true,
            status: 'APPROVED',
            message: 'Pagamento identificado e aprovado pelo Mercado Pago! Seu plano foi ativado.',
            userPlanSlug: updatedUser?.planSlug,
          });
        } else {
          return res.json({
            success: false,
            approved: false,
            status: settlement.status,
            statusDetail: mpData.status_detail,
            message:
              settlement.status === 'CANCELLED'
                ? 'Este pagamento foi cancelado ou expirou no Mercado Pago.'
                : 'Ainda aguardando a confirmação do pagamento pelo Mercado Pago. Conclua a transferência no app do seu banco e aguarde alguns segundos.',
          });
        }
      }
    }

    return res.json({
      success: false,
      approved: false,
      status: paymentRecord.status,
      message: 'Ainda aguardando a confirmação do pagamento pelo banco.',
    });
  } catch (err: any) {
    console.error('Check plan PIX error:', err);
    return res.status(500).json({ error: 'Erro ao validar status do pagamento no Mercado Pago.' });
  }
});

// 5. SUBSCRIBE FREE PLAN (Immediate, 0 cost)
router.post('/subscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { planSlug } = req.body;

    if (!planSlug) {
      return res.status(400).json({ error: 'Plano não informado.' });
    }

    const [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
    if (!plan) {
      return res.status(404).json({ error: 'Plano selecionado não existe.' });
    }

    // Free plan can be switched directly; Paid plans REQUIRE real payment confirmation via Mercado Pago
    if (plan.priceCents > 0) {
      return res.status(402).json({
        error: 'Este plano é pago e requer confirmação de pagamento pelo Mercado Pago antes de ser liberado.',
        requiresPayment: true,
        planId: plan.id,
        planSlug: plan.slug,
        priceCents: plan.priceCents,
      });
    }

    // Free plan: downgrade or reset
    await db
      .update(users)
      .set({
        planSlug: 'free',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'PLAN_SUBSCRIBE_FREE',
      entityType: 'PLAN',
      entityId: String(plan.id),
      details: JSON.stringify({ plan: plan.name, slug: plan.slug }),
    });

    return res.json({
      success: true,
      message: `Você agora está no plano ${plan.name}.`,
      planSlug: plan.slug,
    });
  } catch (err) {
    console.error('Subscribe plan error:', err);
    return res.status(500).json({ error: 'Erro ao assinar plano.' });
  }
});

// 6. GET USER CURRENT SUBSCRIPTION
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const [sub] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        autoRenew: subscriptions.autoRenew,
        plan: {
          id: plans.id,
          name: plans.name,
          slug: plans.slug,
          priceCents: plans.priceCents,
          commissionPercent: plans.commissionPercent,
          maxActiveListings: plans.maxActiveListings,
          features: plans.features,
        },
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'ACTIVE')))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const [userRecord] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const [activePlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, userRecord?.planSlug || 'free'))
      .limit(1);

    return res.json({
      subscription: sub || null,
      currentPlan: activePlan || null,
      planSlug: userRecord?.planSlug || 'free',
    });
  } catch (err) {
    console.error('Get subscription error:', err);
    return res.status(500).json({ error: 'Erro ao obter dados de assinatura.' });
  }
});

export default router;
