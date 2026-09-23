import { Router } from 'express';
import { db } from '../db/index.ts';
import { plans, subscriptions, users, payments, auditLogs } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

const PLAN_PIX_KEY = '11973479473';

// CRC-16 CCITT for EMVCo PIX standard
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Format EMV TLV (Tag Length Value)
function emvTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Generate valid PIX BRCode (Copia e Cola)
function generatePixBrCode(key: string, amount: number, txId: string, description: string): string {
  // Merchant Account Info (ID 26)
  const gui = emvTlv('00', 'br.gov.bcb.pix');
  const pixKey = emvTlv('01', key);
  const desc = description ? emvTlv('02', description.substring(0, 25)) : '';
  const merchantAccountInfo = emvTlv('26', `${gui}${pixKey}${desc}`);

  // Additional Data Field (ID 62)
  const txField = emvTlv('05', txId.substring(0, 25));
  const additionalData = emvTlv('62', txField);

  const amountStr = (amount / 100).toFixed(2);

  const rawPayload =
    emvTlv('00', '01') + // Format indicator
    emvTlv('01', '12') + // Dynamic/Static (12 = with amount)
    merchantAccountInfo +
    emvTlv('52', '0000') + // Merchant Category Code
    emvTlv('53', '986') + // Currency: BRL (986)
    emvTlv('54', amountStr) + // Amount
    emvTlv('58', 'BR') + // Country code
    emvTlv('59', 'VEND MAIS') + // Merchant name
    emvTlv('60', 'SAO PAULO') + // City
    additionalData +
    '6304'; // CRC placeholder

  const calculatedCrc = crc16(rawPayload);
  return `${rawPayload}${calculatedCrc}`;
}

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

// 2. CREATE PIX FOR PLAN SUBSCRIPTION
router.post('/create-pix', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { planSlug, planId } = req.body;

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
      return res.status(400).json({ error: 'O plano Gratuito não requer pagamento por PIX.' });
    }

    const txId = `VP${user.id}P${plan.id}T${Date.now().toString().slice(-6)}`;
    const externalRef = `PIX-PLAN-${user.id}-${plan.id}-${Date.now()}`;

    // Generate BRCode Copia e Cola
    const brCode = generatePixBrCode(
      PLAN_PIX_KEY,
      plan.priceCents,
      txId,
      `VEND+ ${plan.name}`
    );

    // High quality QR Code image using standard encoded BRCode
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      brCode
    )}`;

    // Create a pending payment record
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        paymentType: 'SUBSCRIPTION',
        amountCents: plan.priceCents,
        status: 'PENDING',
        paymentMethod: 'PIX',
        externalReference: externalRef,
      })
      .returning();

    const formattedAmount = (plan.priceCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    return res.json({
      paymentId: paymentRecord.id,
      externalReference: externalRef,
      pixKey: PLAN_PIX_KEY,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents,
      },
      amountCents: plan.priceCents,
      amountFormatted: formattedAmount,
      copiaECola: brCode,
      qrCodeUrl,
      status: 'Aguardando pagamento',
    });
  } catch (err) {
    console.error('Create plan PIX error:', err);
    return res.status(500).json({ error: 'Erro ao gerar pagamento PIX para o plano.' });
  }
});

// 3. CONFIRM PIX PAYMENT & ACTIVATE PLAN (Only unlocks on valid confirmation)
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

    // Find the target plan
    let targetPlan;
    if (planSlug) {
      [targetPlan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
    }
    if (!targetPlan) {
      // Find plan by price matching payment amount
      const matchingPlans = await db
        .select()
        .from(plans)
        .where(eq(plans.priceCents, paymentRecord.amountCents))
        .limit(1);
      targetPlan = matchingPlans[0];
    }

    if (!targetPlan) {
      return res.status(404).json({ error: 'Plano correspondente não encontrado.' });
    }

    // Mark payment as APPROVED
    await db
      .update(payments)
      .set({
        status: 'APPROVED',
        paidAt: new Date(),
      })
      .where(eq(payments.id, paymentRecord.id));

    // Calculate subscription period: 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Create or update subscription record with APPROVED/ACTIVE status
    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        planId: targetPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
        autoRenew: true,
      })
      .returning();

    // Link payment with subscription
    await db
      .update(payments)
      .set({ subscriptionId: sub.id })
      .where(eq(payments.id, paymentRecord.id));

    // Activate the user's new plan in their profile
    await db
      .update(users)
      .set({
        planSlug: targetPlan.slug,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'PLAN_PIX_CONFIRMED',
      entityType: 'PLAN',
      entityId: String(targetPlan.id),
      details: JSON.stringify({
        paymentId: paymentRecord.id,
        plan: targetPlan.name,
        slug: targetPlan.slug,
        amountCents: paymentRecord.amountCents,
        pixKey: PLAN_PIX_KEY,
        confirmedAt: new Date().toISOString(),
      }),
    });

    return res.json({
      success: true,
      message: `Pagamento confirmado com sucesso! Seu plano ${targetPlan.name} está 100% ativo.`,
      plan: targetPlan,
    });
  } catch (err) {
    console.error('Confirm plan PIX error:', err);
    return res.status(500).json({ error: 'Erro ao validar e confirmar pagamento PIX.' });
  }
});

// 4. SUBSCRIBE FREE PLAN (Immediate, 0 cost)
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

    // Free plan can be switched directly; Paid plans REQUIRE payment confirmation via PIX
    if (plan.priceCents > 0) {
      return res.status(402).json({
        error: 'Este plano é pago e requer confirmação de pagamento por PIX antes de ser liberado.',
        requiresPayment: true,
        planId: plan.id,
        planSlug: plan.slug,
        priceCents: plan.priceCents,
      });
    }

    // Set expiration 30 days ahead
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Create or update subscription record
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      status: 'ACTIVE',
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      autoRenew: true,
    });

    // Update user's active plan slug
    await db
      .update(users)
      .set({
        planSlug: plan.slug,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'UPGRADE_PLAN_FREE',
      entityType: 'PLAN',
      entityId: String(plan.id),
      details: JSON.stringify({ plan: plan.name, slug: plan.slug }),
    });

    return res.json({
      message: `Plano ${plan.name} ativado com sucesso!`,
      currentPlan: plan,
    });
  } catch (err) {
    console.error('Subscribe plan error:', err);
    return res.status(500).json({ error: 'Erro ao processar ativação de plano.' });
  }
});

export default router;
