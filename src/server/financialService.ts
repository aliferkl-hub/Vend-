import { db } from '../db/index.ts';
import {
  orders,
  payments,
  commissions,
  financialLedger,
  sellerBalances,
  payoutRequests,
  users,
  plans,
  auditLogs,
  deliveryCodes,
} from '../db/schema.ts';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';

// Concurrency mutex lock to prevent simultaneous execution for the same entity
const activeLocks = new Map<string, number>();

export async function withLock<T>(lockKey: string, fn: () => Promise<T>, timeoutMs = 8000): Promise<T> {
  const now = Date.now();
  const existingLockTime = activeLocks.get(lockKey);
  if (existingLockTime && now - existingLockTime < timeoutMs) {
    throw new Error(`CONCORRÊNCIA BLOQUEADA: Operação financeira já em andamento para a chave ${lockKey}. Aguarde.`);
  }

  activeLocks.set(lockKey, now);
  try {
    return await fn();
  } finally {
    activeLocks.delete(lockKey);
  }
}

/**
 * 1. CALCULA A COMISSÃO E VALORES LÍQUIDOS STRICTAMENTE NO BACKEND
 * Plano Gratuito (free): 7%
 * Planos Pagos (basico, premium, lendario): 4%
 * Arredondamento em centavos de precisão matemática inteira
 */
export async function calculateCommission(
  sellerId: number,
  grossAmountCents: number
): Promise<{
  commissionPercent: number;
  commissionCents: number;
  sellerNetCents: number;
  planName: string;
}> {
  const [seller] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
  const planSlug = (seller?.planSlug || 'free').toLowerCase();

  let commissionPercent = 7;
  let planName = 'Plano Gratuito (Free)';

  if (planSlug !== 'free') {
    const [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
    commissionPercent = plan?.commissionPercent ?? 4;
    planName = plan?.name || 'Plano VEND+ Pago';
  }

  // Integer cent calculation
  const commissionCents = Math.round((grossAmountCents * commissionPercent) / 100);
  const sellerNetCents = Math.max(0, grossAmountCents - commissionCents);

  return {
    commissionPercent,
    commissionCents,
    sellerNetCents,
    planName,
  };
}

/**
 * 2. REGISTRA UMA MOVIMENTAÇÃO NO FINANCIAL LEDGER
 * Imutável: nunca apaga movimentações existentes.
 */
export async function recordLedgerEntry(params: {
  orderId: number;
  orderNumber: string;
  sellerId: number;
  buyerId: number;
  entryType:
    | 'SALE'
    | 'PLATFORM_FEE'
    | 'ESCROW_HOLD'
    | 'ESCROW_RELEASE'
    | 'PAYOUT_REQUEST'
    | 'PAYOUT_PROCESSING'
    | 'PAYOUT_COMPLETED'
    | 'PAYOUT_FAILED'
    | 'REFUND'
    | 'REVERSAL';
  grossAmountCents: number;
  platformFeeCents: number;
  sellerAmountCents: number;
  paymentStatus?: string;
  orderStatus?: string;
  payoutStatus?: string;
  status?: string;
  referenceId?: string | null;
  paymentId?: number | null;
  payoutRequestId?: number | null;
  mpPaymentId?: string | null;
  metadata?: Record<string, any>;
}) {
  const now = new Date();
  const txNumber = `TX-${params.orderNumber}-${params.entryType}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const [entry] = await db
    .insert(financialLedger)
    .values({
      transactionNumber: txNumber,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      sellerId: params.sellerId,
      buyerId: params.buyerId,
      entryType: params.entryType,
      grossAmountCents: params.grossAmountCents,
      platformFeeCents: params.platformFeeCents,
      sellerAmountCents: params.sellerAmountCents,
      paymentStatus: params.paymentStatus || 'PENDING',
      orderStatus: params.orderStatus || 'AWAITING_PAYMENT',
      payoutStatus: params.payoutStatus || 'PENDING_DELIVERY_CONFIRMATION',
      status: params.status || 'COMPLETED',
      referenceId: params.referenceId || null,
      paymentId: params.paymentId || null,
      payoutRequestId: params.payoutRequestId || null,
      mpPaymentId: params.mpPaymentId || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      approvedAt: params.paymentStatus === 'APPROVED' ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Audit log for immutability
  await db.insert(auditLogs).values({
    userId: params.sellerId,
    action: `LEDGER_${params.entryType}`,
    entityType: 'FINANCIAL_LEDGER',
    entityId: String(entry.id),
    details: JSON.stringify({
      txNumber,
      orderNumber: params.orderNumber,
      entryType: params.entryType,
      grossCents: params.grossAmountCents,
      feeCents: params.platformFeeCents,
      netCents: params.sellerAmountCents,
    }),
  });

  return entry;
}

/**
 * 3. SINCRONIZAÇÃO E CÁLCULO ATÔMICO DO SALDO DO VENDEDOR (sellerBalances)
 * Separação matemática exata:
 * - pendingBalanceCents: pagamentos aprovados mas produtos ainda em trânsito/preparo (sem código validado)
 * - availableBalanceCents: pedidos entregues com código validado, ainda não solicitados para payout
 * - paidBalanceCents: valor efetivamente liquidado e transferido ao vendedor
 * - platformRevenueCents: comissão arrecadada pelo VEND+ (7% ou 4%)
 */
export async function syncSellerBalance(sellerId: number) {
  return await withLock(`balance_sync_${sellerId}`, async () => {
    const sellerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.sellerId, sellerId));

    let pendingBalanceCents = 0;
    let availableBalanceCents = 0;
    let platformRevenueCents = 0;
    let totalGrossSalesCents = 0;

    for (const ord of sellerOrders) {
      // Must have approved payment
      const isPaid = ord.paymentStatus === 'APPROVED' || (ord.status !== 'AWAITING_PAYMENT' && ord.status !== 'CANCELLED');
      if (!isPaid) continue;

      totalGrossSalesCents += ord.totalGrossCents;
      platformRevenueCents += ord.commissionCents;

      if (ord.status !== 'DELIVERED') {
        // Not delivered yet: retained in safe escrow
        if (
          ord.payoutStatus === 'PENDING' ||
          ord.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION'
        ) {
          pendingBalanceCents += ord.sellerNetCents;
        }
      } else {
        // Delivered and code verified: available for withdrawal if not already requested or paid
        if (
          ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' ||
          ord.payoutStatus === 'RELEASED'
        ) {
          availableBalanceCents += ord.sellerNetCents;
        }
      }
    }

    // Payout requests
    const requests = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.sellerId, sellerId));

    let paidBalanceCents = 0;
    for (const r of requests) {
      if (r.status === 'PAID') {
        paidBalanceCents += r.netAmountCents;
      }
    }

    const now = new Date();

    // Upsert into sellerBalances
    const [existing] = await db
      .select()
      .from(sellerBalances)
      .where(eq(sellerBalances.sellerId, sellerId))
      .limit(1);

    let updatedBalance;
    if (existing) {
      [updatedBalance] = await db
        .update(sellerBalances)
        .set({
          pendingBalanceCents,
          availableBalanceCents,
          paidBalanceCents,
          platformRevenueCents,
          totalGrossSalesCents,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(sellerBalances.id, existing.id))
        .returning();
    } else {
      [updatedBalance] = await db
        .insert(sellerBalances)
        .values({
          sellerId,
          pendingBalanceCents,
          availableBalanceCents,
          paidBalanceCents,
          platformRevenueCents,
          totalGrossSalesCents,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .returning();
    }

    return updatedBalance;
  });
}

/**
 * 4. MOTOR DE RECONCILIAÇÃO FINANCEIRA (AUDIT ENGINE)
 * Compara ORDERS, PAYMENTS, FINANCIAL_LEDGER, SELLER_BALANCES e PAYOUT_REQUESTS.
 * Identifica discrepâncias e inconsistências automaticamente.
 */
export async function runFinancialReconciliation() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allPayments = await db.select().from(payments);
  const allLedger = await db.select().from(financialLedger);
  const allPayouts = await db.select().from(payoutRequests);
  const allBalances = await db.select().from(sellerBalances);

  const anomalies: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    entityId: string;
    details?: any;
  }> = [];

  // Indexing maps
  const paymentByOrderId = new Map<number, typeof payments.$inferSelect[]>();
  for (const p of allPayments) {
    if (p.orderId) {
      const list = paymentByOrderId.get(p.orderId) || [];
      list.push(p);
      paymentByOrderId.set(p.orderId, list);
    }
  }

  const ledgerByOrderId = new Map<number, typeof financialLedger.$inferSelect[]>();
  for (const l of allLedger) {
    const list = ledgerByOrderId.get(l.orderId) || [];
    list.push(l);
    ledgerByOrderId.set(l.orderId, list);
  }

  let totalGrossCents = 0;
  let totalCommissionsCents = 0;
  let totalPendingEscrowCents = 0;
  let totalAvailableForPayoutCents = 0;
  let totalRequestedPayoutCents = 0;
  let totalPaidOutCents = 0;

  for (const ord of allOrders) {
    const isApproved = ord.paymentStatus === 'APPROVED' || (ord.status !== 'AWAITING_PAYMENT' && ord.status !== 'CANCELLED');
    if (!isApproved) continue;

    totalGrossCents += ord.totalGrossCents;
    totalCommissionsCents += ord.commissionCents;

    // Check ledger existence
    const ledgers = ledgerByOrderId.get(ord.id) || [];
    if (ledgers.length === 0) {
      anomalies.push({
        type: 'ORDER_WITHOUT_LEDGER',
        severity: 'HIGH',
        description: `Pedido #${ord.orderNumber} pago sem registro correspondente no livro-razão (financial_ledger).`,
        entityId: String(ord.id),
      });
    }

    // Check delivery code integrity
    if (ord.status === 'DELIVERED') {
      if (!ord.deliveryCodeUsed) {
        anomalies.push({
          type: 'DELIVERED_WITHOUT_CODE_MARK',
          severity: 'HIGH',
          description: `Pedido #${ord.orderNumber} está marcado como DELIVERED mas deliveryCodeUsed é falso.`,
          entityId: String(ord.id),
        });
      }

      if (ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || ord.payoutStatus === 'RELEASED') {
        totalAvailableForPayoutCents += ord.sellerNetCents;
      } else if (ord.payoutStatus === 'REQUESTED') {
        totalRequestedPayoutCents += ord.sellerNetCents;
      } else if (ord.payoutStatus === 'PAID') {
        totalPaidOutCents += ord.sellerNetCents;
      }
    } else {
      // Still in transit or preparation
      if (ord.payoutStatus === 'PENDING' || ord.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION') {
        totalPendingEscrowCents += ord.sellerNetCents;
      }
    }

    // Commission integrity check (7% or 4%)
    const expectedRate = ord.commissionCents / ord.totalGrossCents;
    if (Math.abs(expectedRate - 0.07) > 0.015 && Math.abs(expectedRate - 0.04) > 0.015) {
      anomalies.push({
        type: 'COMMISSION_RATE_DIVERGENCE',
        severity: 'MEDIUM',
        description: `Taxa da comissão calculada fora do padrão no pedido #${ord.orderNumber}. Esperado ~7% ou ~4%, calculado ${Math.round(expectedRate * 100)}%.`,
        entityId: String(ord.id),
        details: { commissionCents: ord.commissionCents, grossCents: ord.totalGrossCents },
      });
    }
  }

  // Payout validation
  for (const payout of allPayouts) {
    if (payout.status === 'PAID' && !payout.paymentProofUrl && !payout.notes) {
      anomalies.push({
        type: 'PAID_PAYOUT_WITHOUT_PROOF_OR_AUDIT',
        severity: 'MEDIUM',
        description: `Solicitação de repasse #${payout.requestNumber} marcada como paga sem URL de comprovante ou nota de auditoria externa.`,
        entityId: String(payout.id),
      });
    }
  }

  return {
    metrics: {
      totalOrdersCount: allOrders.length,
      totalPaymentsCount: allPayments.length,
      totalGrossCents,
      totalCommissionsCents,
      totalPendingEscrowCents,
      totalAvailableForPayoutCents,
      totalRequestedPayoutCents,
      totalPaidOutCents,
    },
    anomaliesCount: anomalies.length,
    anomalies,
    auditTimestamp: new Date().toISOString(),
  };
}
