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
 * Regras Estritas:
 * 1. NUNCA criar saldo para vendedor apenas porque o pedido foi criado, o checkout aberto, o QR Code Pix gerado,
 *    ou o pedido mudou para AWAITING_PAYMENT, READY_FOR_PICKUP ou DELIVERED.
 * 2. O pagamento SOMENTE é considerado recebido se o Mercado Pago confirmou o pagamento (paymentStatus === 'APPROVED' e mpPaymentId válido).
 * 3. ESCROW OBRIGATÓRIO: Saldo líquido permanece em pendingBalanceCents até que o produto seja entregue E o código de 4 dígitos validado (deliveryCodeUsed === true).
 * 4. DELIVERED sozinho NÃO libera saldo: DELIVERED + deliveryCodeUsed === true = CONDIÇÃO ÚNICA PARA DISPONIBILIZAR FUNDOS.
 * 5. Se o pedido for DELIVERED mas deliveryCodeUsed === false, o valor permanece retido em pendingBalanceCents (ou sincronizado para WAITING_CONFIRMATION).
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
      // REGRA OBRIGATÓRIA 1 & 2:
      // O pagamento SOMENTE poderá ser considerado recebido quando o status de pagamento for efetivamente APPROVED
      // e o pedido NÃO estiver em AWAITING_PAYMENT ou CANCELLED.
      const hasRealApprovedPayment =
        ord.paymentStatus === 'APPROVED' &&
        ord.status !== 'AWAITING_PAYMENT' &&
        ord.status !== 'CANCELLED';

      if (!hasRealApprovedPayment) {
        // Pedido não pago pelo comprador: NENHUM saldo, NENHUMA receita
        continue;
      }

      totalGrossSalesCents += ord.totalGrossCents;
      platformRevenueCents += ord.commissionCents;

      // REGRA OBRIGATÓRIA 7, 8 & 9:
      // Condição para liberação de fundos: DELIVERED + código de 4 dígitos validado
      const isDeliveredAndCodeVerified =
        ord.status === 'DELIVERED' && ord.deliveryCodeUsed === true;

      if (!isDeliveredAndCodeVerified) {
        // Ainda não entregue OU entregue mas código de 4 dígitos NÃO foi validado:
        // O valor líquido do vendedor DEVE permanecer retido no ESCROW (pendingBalanceCents)
        if (
          ord.payoutStatus === 'PENDING' ||
          ord.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION' ||
          (ord.status === 'DELIVERED' && !ord.deliveryCodeUsed)
        ) {
          pendingBalanceCents += ord.sellerNetCents;
        }
      } else {
        // Entrega REALMENTE confirmada com código de 4 dígitos validado!
        // O valor transita de PENDENTE para DISPONÍVEL (se não tiver sido sacado ainda)
        if (
          ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' ||
          ord.payoutStatus === 'RELEASED'
        ) {
          availableBalanceCents += ord.sellerNetCents;
        }
      }
    }

    // Payout requests já liquidados
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
 * 4. MOTOR DE RECONCILIAÇÃO E AUDITORIA AUTOMÁTICA (AUDIT ENGINE)
 * Implementa verificação rigorosa para os 8 critérios de conformidade obrigatória:
 * 1. Pedido pago sem payment_id real
 * 2. Saldo de vendedor sem pagamento aprovado correspondente
 * 3. Comissão sem pagamento aprovado
 * 4. Repasse sem saldo disponível correspondente
 * 5. Pagamento aprovado sem lançamento no ledger
 * 6. Lançamento duplicado no ledger
 * 7. Pedido DELIVERED sem código validado
 * 8. Saldo pendente sem pedido correspondente
 */
export async function runFinancialReconciliation() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const allPayments = await db.select().from(payments);
  const allLedger = await db.select().from(financialLedger);
  const allPayouts = await db.select().from(payoutRequests);
  const allBalances = await db.select().from(sellerBalances);
  const allCommissions = await db.select().from(commissions);

  const anomalies: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    entityId: string;
    details?: any;
  }> = [];

  // Mapeamentos para auditoria O(1)
  const ordersById = new Map<number, typeof orders.$inferSelect>();
  for (const o of allOrders) {
    ordersById.set(o.id, o);
  }

  const approvedPaymentsByOrderId = new Map<number, typeof payments.$inferSelect[]>();
  for (const p of allPayments) {
    if (p.orderId && p.status === 'APPROVED') {
      const list = approvedPaymentsByOrderId.get(p.orderId) || [];
      list.push(p);
      approvedPaymentsByOrderId.set(p.orderId, list);
    }
  }

  const ledgerByOrderId = new Map<number, typeof financialLedger.$inferSelect[]>();
  for (const l of allLedger) {
    const list = ledgerByOrderId.get(l.orderId) || [];
    list.push(l);
    ledgerByOrderId.set(l.orderId, list);
  }

  // 1. AUDITORIA: Pedido pago sem payment_id real
  for (const ord of allOrders) {
    if (ord.paymentStatus === 'APPROVED' || ord.status === 'PAID') {
      const paymentsForOrder = approvedPaymentsByOrderId.get(ord.id) || [];
      const hasRealPayment = Boolean(ord.mpPaymentId) || paymentsForOrder.some((p) => Boolean(p.mpPaymentId));
      if (!hasRealPayment) {
        anomalies.push({
          type: 'PAID_ORDER_WITHOUT_REAL_PAYMENT_ID',
          severity: 'HIGH',
          description: `Pedido #${ord.orderNumber} marcado como pago sem payment_id real do Mercado Pago.`,
          entityId: String(ord.id),
        });
      }
    }
  }

  // 2. AUDITORIA: Saldo de vendedor sem pagamento aprovado correspondente
  const approvedNetBySeller = new Map<number, { pending: number; available: number }>();
  for (const ord of allOrders) {
    const isApproved =
      ord.paymentStatus === 'APPROVED' &&
      ord.status !== 'AWAITING_PAYMENT' &&
      ord.status !== 'CANCELLED' &&
      Boolean(ord.mpPaymentId || ord.paidAt);

    if (isApproved) {
      const curr = approvedNetBySeller.get(ord.sellerId) || { pending: 0, available: 0 };
      if (ord.status === 'DELIVERED' && ord.deliveryCodeUsed) {
        if (ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || ord.payoutStatus === 'RELEASED') {
          curr.available += ord.sellerNetCents;
        }
      } else {
        if (ord.payoutStatus === 'PENDING' || ord.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION') {
          curr.pending += ord.sellerNetCents;
        }
      }
      approvedNetBySeller.set(ord.sellerId, curr);
    }
  }

  for (const bal of allBalances) {
    const expected = approvedNetBySeller.get(bal.sellerId) || { pending: 0, available: 0 };
    if (bal.pendingBalanceCents !== expected.pending) {
      anomalies.push({
        type: 'SELLER_PENDING_BALANCE_MISMATCH',
        severity: 'HIGH',
        description: `Saldo pendente do vendedor #${bal.sellerId} diverge dos pedidos pagos reais (Registrado: ${bal.pendingBalanceCents}, Esperado: ${expected.pending}).`,
        entityId: String(bal.sellerId),
        details: { registeredPending: bal.pendingBalanceCents, expectedPending: expected.pending },
      });
    }
    if (bal.availableBalanceCents !== expected.available) {
      anomalies.push({
        type: 'SELLER_AVAILABLE_BALANCE_MISMATCH',
        severity: 'HIGH',
        description: `Saldo disponível do vendedor #${bal.sellerId} diverge dos pedidos entregues e validados (Registrado: ${bal.availableBalanceCents}, Esperado: ${expected.available}).`,
        entityId: String(bal.sellerId),
        details: { registeredAvailable: bal.availableBalanceCents, expectedAvailable: expected.available },
      });
    }
  }

  // 3. AUDITORIA: Comissão sem pagamento aprovado
  for (const com of allCommissions) {
    const parentOrder = ordersById.get(com.orderId);
    if (parentOrder && (parentOrder.paymentStatus !== 'APPROVED' || parentOrder.status === 'AWAITING_PAYMENT')) {
      if (com.paidAt !== null || com.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || com.payoutStatus === 'PAID') {
        anomalies.push({
          type: 'COMMISSION_WITHOUT_APPROVED_PAYMENT',
          severity: 'HIGH',
          description: `Comissão do pedido #${parentOrder.orderNumber} marcada como realizada sem pagamento aprovado.`,
          entityId: String(com.id),
        });
      }
    }
  }

  // 4. AUDITORIA: Repasse sem saldo disponível correspondente
  for (const payout of allPayouts) {
    const sellerDeliveredOrders = allOrders.filter(
      (o) =>
        o.sellerId === payout.sellerId &&
        o.paymentStatus === 'APPROVED' &&
        o.status === 'DELIVERED' &&
        o.deliveryCodeUsed === true
    );
    const totalDeliveredNet = sellerDeliveredOrders.reduce((sum, o) => sum + o.sellerNetCents, 0);

    // Sum of all requested or completed payouts for this seller
    const allSellerPayouts = allPayouts.filter(
      (p) => p.sellerId === payout.sellerId && (p.status === 'REQUESTED' || p.status === 'PROCESSING' || p.status === 'PAID')
    );
    const totalPayoutsSum = allSellerPayouts.reduce((sum, p) => sum + p.netAmountCents, 0);

    if (totalPayoutsSum > totalDeliveredNet) {
      anomalies.push({
        type: 'PAYOUT_EXCEEDS_AVAILABLE_BALANCE',
        severity: 'HIGH',
        description: `Solicitação de repasse #${payout.requestNumber} excede o valor total líquido entregue e validado do vendedor (Repasses: ${totalPayoutsSum}, Entregue: ${totalDeliveredNet}).`,
        entityId: String(payout.id),
      });
    }
  }

  // 5. AUDITORIA: Pagamento aprovado sem lançamento no ledger
  for (const ord of allOrders) {
    if (ord.paymentStatus === 'APPROVED' && ord.status !== 'AWAITING_PAYMENT' && ord.status !== 'CANCELLED') {
      const ledgers = ledgerByOrderId.get(ord.id) || [];
      const hasHold = ledgers.some((l) => l.entryType === 'ESCROW_HOLD');
      if (!hasHold) {
        anomalies.push({
          type: 'APPROVED_PAYMENT_WITHOUT_LEDGER',
          severity: 'HIGH',
          description: `Pedido #${ord.orderNumber} tem pagamento aprovado mas não possui lançamento ESCROW_HOLD no livro-razão.`,
          entityId: String(ord.id),
        });
      }
    }
  }

  // 6. AUDITORIA: Lançamento duplicado no ledger
  for (const [orderId, entries] of ledgerByOrderId.entries()) {
    const holdCount = entries.filter((e) => e.entryType === 'ESCROW_HOLD').length;
    if (holdCount > 1) {
      anomalies.push({
        type: 'DUPLICATE_LEDGER_ESCROW_HOLD',
        severity: 'HIGH',
        description: `Pedido ID #${orderId} possui ${holdCount} lançamentos ESCROW_HOLD duplicados no livro-razão.`,
        entityId: String(orderId),
      });
    }
    const releaseCount = entries.filter((e) => e.entryType === 'ESCROW_RELEASE').length;
    if (releaseCount > 1) {
      anomalies.push({
        type: 'DUPLICATE_LEDGER_ESCROW_RELEASE',
        severity: 'HIGH',
        description: `Pedido ID #${orderId} possui ${releaseCount} lançamentos ESCROW_RELEASE duplicados no livro-razão.`,
        entityId: String(orderId),
      });
    }
  }

  // 7. AUDITORIA: DELIVERED sem código validado
  for (const ord of allOrders) {
    if (ord.status === 'DELIVERED') {
      if (!ord.deliveryCodeUsed) {
        anomalies.push({
          type: 'DELIVERED_WITHOUT_VALIDATED_CODE',
          severity: 'HIGH',
          description: `Pedido #${ord.orderNumber} está com status DELIVERED mas o código de entrega não foi validado (deliveryCodeUsed === false).`,
          entityId: String(ord.id),
        });
      }
      if (!ord.deliveryConfirmedAt) {
        anomalies.push({
          type: 'DELIVERED_WITHOUT_CONFIRMATION_TIMESTAMP',
          severity: 'MEDIUM',
          description: `Pedido #${ord.orderNumber} entregue sem registro de data/hora de confirmação (deliveryConfirmedAt nulo).`,
          entityId: String(ord.id),
        });
      }
    }
  }

  // 8. AUDITORIA: Saldo pendente sem pedido correspondente
  for (const l of allLedger) {
    if (l.entryType === 'ESCROW_HOLD') {
      const parentOrder = ordersById.get(l.orderId);
      if (!parentOrder) {
        anomalies.push({
          type: 'PENDING_BALANCE_WITHOUT_ORDER',
          severity: 'HIGH',
          description: `Lançamento ESCROW_HOLD #${l.transactionNumber} referencia um pedido inexistente (orderId: ${l.orderId}).`,
          entityId: String(l.id),
        });
      }
    }
  }

  // Métricas agregadas
  let totalGrossCents = 0;
  let totalCommissionsCents = 0;
  let totalPendingEscrowCents = 0;
  let totalAvailableForPayoutCents = 0;
  let totalRequestedPayoutCents = 0;
  let totalPaidOutCents = 0;

  for (const ord of allOrders) {
    const isApproved =
      ord.paymentStatus === 'APPROVED' &&
      ord.status !== 'AWAITING_PAYMENT' &&
      ord.status !== 'CANCELLED' &&
      Boolean(ord.mpPaymentId || ord.paidAt);

    if (!isApproved) continue;

    totalGrossCents += ord.totalGrossCents;
    totalCommissionsCents += ord.commissionCents;

    if (ord.status === 'DELIVERED' && ord.deliveryCodeUsed) {
      if (ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || ord.payoutStatus === 'RELEASED') {
        totalAvailableForPayoutCents += ord.sellerNetCents;
      } else if (ord.payoutStatus === 'REQUESTED') {
        totalRequestedPayoutCents += ord.sellerNetCents;
      } else if (ord.payoutStatus === 'PAID') {
        totalPaidOutCents += ord.sellerNetCents;
      }
    } else {
      if (ord.payoutStatus === 'PENDING' || ord.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION') {
        totalPendingEscrowCents += ord.sellerNetCents;
      }
    }
  }

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

/**
 * 5. SANITIZAÇÃO E RECONCILIAÇÃO AUTOMÁTICA DE DADOS FINANCEIROS
 * Corrige inconsistências de acordo com a Regra Obrigatória 10:
 * - Se o pedido estiver DELIVERED mas deliveryCodeUsed === false, sincroniza o status para WAITING_CONFIRMATION
 * - Se o pedido for AWAITING_PAYMENT, assegura que não há liberação de fundos
 * - Sincroniza o saldo de todos os vendedores reais
 */
export async function sanitizeAndReconcileFinancialData() {
  const allOrders = await db.select().from(orders);

  for (const ord of allOrders) {
    // Inconsistência 1: DELIVERED sem código validado
    if (ord.status === 'DELIVERED' && !ord.deliveryCodeUsed) {
      console.warn(`[Reconciliação] Corrigindo pedido #${ord.orderNumber}: marcado como DELIVERED sem código validado. Revertendo para WAITING_CONFIRMATION.`);
      await db
        .update(orders)
        .set({
          status: 'WAITING_CONFIRMATION',
          payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, ord.id));
    }

    // Inconsistência 2: Pedido não pago com status financeiro indevido
    if (ord.paymentStatus !== 'APPROVED' || ord.status === 'AWAITING_PAYMENT') {
      if (ord.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || ord.payoutStatus === 'RELEASED') {
        console.warn(`[Reconciliação] Corrigindo pedido #${ord.orderNumber}: payoutStatus era indevidamente ${ord.payoutStatus} para pedido não pago.`);
        await db
          .update(orders)
          .set({
            payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, ord.id));
      }
    }
  }

  // Recalcula saldos de todos os vendedores
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    if (u.role === 'SELLER' || u.role === 'USER') {
      await syncSellerBalance(u.id);
    }
  }
}

