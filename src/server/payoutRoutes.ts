import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import {
  sellerPayoutAccounts,
  payoutRequests,
  financialLedger,
  orders,
  commissions,
  notifications,
  auditLogs,
  users,
} from '../db/schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { AuthRequest, requireAuth, requireMasterOwner } from '../middleware/auth.ts';

const router = Router();

// ==========================================
// 1. GET SELLER PAYOUT ACCOUNT
// ==========================================
router.get('/account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const [account] = await db
      .select()
      .from(sellerPayoutAccounts)
      .where(eq(sellerPayoutAccounts.sellerId, user.id))
      .limit(1);

    return res.json({ account: account || null });
  } catch (err: any) {
    console.error('Error fetching seller payout account:', err);
    return res.status(500).json({ error: 'Erro ao buscar conta de recebimento.' });
  }
});

// ==========================================
// 2. CONFIGURE / UPDATE SELLER PAYOUT ACCOUNT
// ==========================================
router.post('/account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      accountType,
      pixKeyType,
      pixKey,
      bankCode,
      bankName,
      agency,
      accountNumber,
      accountTypeDetail,
      holderName,
      holderDocument,
    } = req.body;

    // Strict validation
    if (!holderName || typeof holderName !== 'string' || holderName.trim().length < 3) {
      return res.status(400).json({ error: 'Nome completo do titular é obrigatório.' });
    }

    const cleanDoc = String(holderDocument || '').replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      return res.status(400).json({ error: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do titular é obrigatório.' });
    }

    const type = accountType === 'BANK_ACCOUNT' ? 'BANK_ACCOUNT' : 'PIX';

    if (type === 'PIX') {
      if (!pixKey || !pixKeyType) {
        return res.status(400).json({ error: 'Chave Pix e tipo de chave são obrigatórios.' });
      }
    } else {
      if (!bankName || !agency || !accountNumber) {
        return res.status(400).json({ error: 'Dados bancários (Banco, Agência e Conta) são obrigatórios.' });
      }
    }

    const [existing] = await db
      .select()
      .from(sellerPayoutAccounts)
      .where(eq(sellerPayoutAccounts.sellerId, user.id))
      .limit(1);

    const now = new Date();
    let accountRecord;

    if (existing) {
      [accountRecord] = await db
        .update(sellerPayoutAccounts)
        .set({
          accountType: type,
          pixKeyType: type === 'PIX' ? pixKeyType : null,
          pixKey: type === 'PIX' ? String(pixKey).trim() : null,
          bankCode: type === 'BANK_ACCOUNT' ? bankCode : null,
          bankName: type === 'BANK_ACCOUNT' ? bankName : null,
          agency: type === 'BANK_ACCOUNT' ? agency : null,
          accountNumber: type === 'BANK_ACCOUNT' ? accountNumber : null,
          accountTypeDetail: type === 'BANK_ACCOUNT' ? accountTypeDetail || 'CORRENTE' : null,
          holderName: holderName.trim(),
          holderDocument: cleanDoc,
          status: 'ACTIVE',
          isVerified: true,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(sellerPayoutAccounts.id, existing.id))
        .returning();
    } else {
      [accountRecord] = await db
        .insert(sellerPayoutAccounts)
        .values({
          sellerId: user.id,
          accountType: type,
          pixKeyType: type === 'PIX' ? pixKeyType : null,
          pixKey: type === 'PIX' ? String(pixKey).trim() : null,
          bankCode: type === 'BANK_ACCOUNT' ? bankCode : null,
          bankName: type === 'BANK_ACCOUNT' ? bankName : null,
          agency: type === 'BANK_ACCOUNT' ? agency : null,
          accountNumber: type === 'BANK_ACCOUNT' ? accountNumber : null,
          accountTypeDetail: type === 'BANK_ACCOUNT' ? accountTypeDetail || 'CORRENTE' : null,
          holderName: holderName.trim(),
          holderDocument: cleanDoc,
          status: 'ACTIVE',
          isVerified: true,
          verifiedAt: now,
        })
        .returning();
    }

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'CONFIGURE_PAYOUT_ACCOUNT',
      entityType: 'SELLER_PAYOUT_ACCOUNT',
      entityId: String(accountRecord.id),
      details: JSON.stringify({
        accountType: type,
        holderName: holderName.trim(),
        holderDocument: cleanDoc.substring(0, 3) + '***',
      }),
    });

    return res.json({
      success: true,
      message: 'Conta de recebimento configurada com sucesso!',
      account: accountRecord,
    });
  } catch (err: any) {
    console.error('Error saving payout account:', err);
    return res.status(500).json({ error: 'Erro ao salvar conta de recebimento.' });
  }
});

// ==========================================
// 3. GET SELLER WALLET / SALDO VEND+
// ==========================================
router.get('/wallet', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // 1. Fetch payout account
    const [payoutAccount] = await db
      .select()
      .from(sellerPayoutAccounts)
      .where(eq(sellerPayoutAccounts.sellerId, user.id))
      .limit(1);

    // 2. Fetch all orders for this seller
    const sellerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.sellerId, user.id))
      .orderBy(desc(orders.createdAt));

    let pendingBalanceCents = 0;
    let availableBalanceCents = 0;
    let totalCommissionsCents = 0;
    let totalGrossSalesCents = 0;

    for (const order of sellerOrders) {
      // Must have approved payment
      const isPaid = order.paymentStatus === 'APPROVED' || order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED';
      if (!isPaid) continue;

      totalGrossSalesCents += order.totalGrossCents;
      totalCommissionsCents += order.commissionCents;

      // Pending delivery confirmation: order paid, but NOT delivered yet
      if (order.status !== 'DELIVERED') {
        if (order.payoutStatus === 'PENDING' || order.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION') {
          pendingBalanceCents += order.sellerNetCents;
        }
      } else {
        // Delivered: check payout state
        if (order.payoutStatus === 'RELEASED' || order.payoutStatus === 'AVAILABLE_FOR_PAYOUT') {
          availableBalanceCents += order.sellerNetCents;
        }
      }
    }

    // 3. Fetch payout requests
    const requests = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.sellerId, user.id))
      .orderBy(desc(payoutRequests.requestedAt));

    let totalPaidOutCents = 0;
    let pendingPayoutsCount = 0;
    let completedPayoutsCount = 0;

    for (const r of requests) {
      if (r.status === 'PAID') {
        totalPaidOutCents += r.netAmountCents;
        completedPayoutsCount++;
      } else if (r.status === 'REQUESTED' || r.status === 'PROCESSING') {
        pendingPayoutsCount++;
      }
    }

    // 4. Fetch recent financial transactions
    const ledgerEntries = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.sellerId, user.id))
      .orderBy(desc(financialLedger.createdAt))
      .limit(30);

    return res.json({
      pendingBalanceCents,
      availableBalanceCents,
      totalPaidOutCents,
      totalCommissionsCents,
      totalGrossSalesCents,
      pendingPayoutsCount,
      completedPayoutsCount,
      payoutAccount: payoutAccount || null,
      payoutRequests: requests,
      recentTransactions: ledgerEntries,
    });
  } catch (err: any) {
    console.error('Error fetching seller wallet:', err);
    return res.status(500).json({ error: 'Erro ao carregar carteira do vendedor.' });
  }
});

// ==========================================
// 4. SELLER REQUESTS PAYOUT OF AVAILABLE FUNDS
// ==========================================
router.post('/request', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    // 1. Verify configured payout account
    const [account] = await db
      .select()
      .from(sellerPayoutAccounts)
      .where(eq(sellerPayoutAccounts.sellerId, user.id))
      .limit(1);

    if (!account || account.status !== 'ACTIVE') {
      return res.status(400).json({
        error: 'Você precisa configurar uma conta de recebimento (Chave Pix ou Conta Bancária) antes de solicitar o repasse.',
      });
    }

    // 2. Find eligible delivered orders with available payout
    const eligibleOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.sellerId, user.id),
          eq(orders.status, 'DELIVERED'),
          sql`${orders.payoutStatus} IN ('RELEASED', 'AVAILABLE_FOR_PAYOUT')`
        )
      );

    if (eligibleOrders.length === 0) {
      return res.status(400).json({
        error: 'Nenhum valor disponível para repasse no momento. O saldo só fica disponível após o comprador confirmar a entrega com o código de 4 dígitos.',
      });
    }

    const totalAvailableCents = eligibleOrders.reduce((sum, o) => sum + o.sellerNetCents, 0);
    if (totalAvailableCents <= 0) {
      return res.status(400).json({ error: 'Valor disponível para repasse é zero.' });
    }

    const orderIds = eligibleOrders.map((o) => o.id);
    const requestNumber = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date();

    // Account snapshot
    const receiptSnapshot = JSON.stringify({
      accountType: account.accountType,
      pixKeyType: account.pixKeyType,
      pixKey: account.pixKey,
      bankName: account.bankName,
      agency: account.agency,
      accountNumber: account.accountNumber,
      holderName: account.holderName,
      holderDocument: account.holderDocument,
    });

    // Create payout request
    const [payoutRequest] = await db
      .insert(payoutRequests)
      .values({
        requestNumber,
        sellerId: user.id,
        payoutAccountId: account.id,
        amountCents: totalAvailableCents,
        feeCents: 0,
        netAmountCents: totalAvailableCents,
        status: 'REQUESTED',
        receiptSnapshot,
        orderIds: JSON.stringify(orderIds),
        requestedAt: now,
      })
      .returning();

    // Atomically transition orders to REQUESTED
    await db
      .update(orders)
      .set({
        payoutStatus: 'REQUESTED',
        payoutRequestedAt: now,
        updatedAt: now,
      })
      .where(inArray(orders.id, orderIds));

    // Update financial ledger
    await db
      .update(financialLedger)
      .set({
        payoutStatus: 'REQUESTED',
        payoutRequestedAt: now,
        payoutRequestId: payoutRequest.id,
        updatedAt: now,
      })
      .where(inArray(financialLedger.orderId, orderIds));

    // Notify seller
    await db.insert(notifications).values({
      userId: user.id,
      title: 'Solicitação de Repasse Criada',
      message: `Sua solicitação de repasse ${requestNumber} de ${(totalAvailableCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} foi registrada e enviada para processamento.`,
      type: 'SYSTEM',
      link: '/painel/vendedor',
    });

    // Notify Master Owners
    const owners = await db.select().from(users).where(eq(users.role, 'MASTER_OWNER'));
    for (const owner of owners) {
      await db.insert(notifications).values({
        userId: owner.id,
        title: 'Nova Solicitação de Repasse',
        message: `Vendedor ${user.name} solicitou repasse de ${(totalAvailableCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${requestNumber}).`,
        type: 'SYSTEM',
        link: '/admin',
      });
    }

    return res.json({
      success: true,
      message: 'Solicitação de repasse registrada com sucesso!',
      payoutRequest,
    });
  } catch (err: any) {
    console.error('Error creating payout request:', err);
    return res.status(500).json({ error: 'Erro ao solicitar repasse.' });
  }
});

// ==========================================
// 5. MASTER OWNER: RECONCILIATION & PAYOUT APPROVAL
// ==========================================
router.get('/admin/overview', requireMasterOwner, async (_req: AuthRequest, res: Response) => {
  try {
    // 1. Total statistics
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const allRequests = await db.select().from(payoutRequests).orderBy(desc(payoutRequests.requestedAt));
    const ledger = await db.select().from(financialLedger).orderBy(desc(financialLedger.createdAt)).limit(100);

    let totalGrossCents = 0;
    let totalPlatformCommissionsCents = 0;
    let pendingDeliveryCents = 0; // orders paid, not delivered
    let availableForPayoutCents = 0; // orders delivered, payout not requested
    let requestedPayoutCents = 0; // payout requested, pending payment
    let completedPayoutsCents = 0; // payouts paid
    let refundedOrdersCount = 0;

    for (const order of allOrders) {
      if (order.status === 'CANCELLED' || order.paymentStatus === 'CANCELLED' || order.paymentStatus === 'REFUNDED') {
        refundedOrdersCount++;
        continue;
      }

      if (order.paymentStatus === 'APPROVED' || (order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED')) {
        totalGrossCents += order.totalGrossCents;
        totalPlatformCommissionsCents += order.commissionCents;

        if (order.status !== 'DELIVERED') {
          pendingDeliveryCents += order.sellerNetCents;
        } else {
          if (order.payoutStatus === 'RELEASED' || order.payoutStatus === 'AVAILABLE_FOR_PAYOUT') {
            availableForPayoutCents += order.sellerNetCents;
          } else if (order.payoutStatus === 'REQUESTED') {
            requestedPayoutCents += order.sellerNetCents;
          }
        }
      }
    }

    for (const r of allRequests) {
      if (r.status === 'PAID') {
        completedPayoutsCents += r.netAmountCents;
      }
    }

    return res.json({
      metrics: {
        totalOrdersCount: allOrders.length,
        totalPaymentsCount: allPayments.length,
        totalGrossCents,
        totalPlatformCommissionsCents,
        pendingDeliveryCents,
        availableForPayoutCents,
        requestedPayoutCents,
        completedPayoutsCents,
        refundedOrdersCount,
      },
      payoutRequests: allRequests,
      recentLedger: ledger,
    });
  } catch (err: any) {
    console.error('Error fetching admin financial overview:', err);
    return res.status(500).json({ error: 'Erro ao carregar conciliação financeira do Master Owner.' });
  }
});

// Process/Complete Payout by Master Owner
router.post('/admin/payouts/:id/complete', requireMasterOwner, async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user!;
    const requestId = parseInt(req.params.id);
    const { paymentProofUrl, notes } = req.body;

    const [request] = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, requestId))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Solicitação de repasse não encontrada.' });
    }

    if (request.status === 'PAID') {
      return res.status(400).json({ error: 'Esta solicitação já foi marcada como Paga.' });
    }

    const now = new Date();

    // 1. Update payout request
    const [updatedRequest] = await db
      .update(payoutRequests)
      .set({
        status: 'PAID',
        processedByUserId: admin.id,
        paymentProofUrl: paymentProofUrl || null,
        notes: notes || null,
        processedAt: now,
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(payoutRequests.id, requestId))
      .returning();

    // 2. Update linked orders
    let orderIds: number[] = [];
    try {
      if (request.orderIds) {
        orderIds = JSON.parse(request.orderIds);
      }
    } catch {}

    if (orderIds.length > 0) {
      await db
        .update(orders)
        .set({
          payoutStatus: 'PAID',
          payoutCompletedAt: now,
          updatedAt: now,
        })
        .where(inArray(orders.id, orderIds));

      await db
        .update(financialLedger)
        .set({
          payoutStatus: 'PAID',
          payoutCompletedAt: now,
          updatedAt: now,
        })
        .where(inArray(financialLedger.orderId, orderIds));
    }

    // 3. Notify seller
    await db.insert(notifications).values({
      userId: request.sellerId,
      title: 'Repasse VEND+ Concluído!',
      message: `Seu repasse ${request.requestNumber} no valor de ${(request.netAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} foi realizado com sucesso para sua conta!`,
      type: 'SYSTEM',
      link: '/painel/vendedor',
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: admin.id,
      action: 'COMPLETE_PAYOUT_REQUEST',
      entityType: 'PAYOUT_REQUEST',
      entityId: String(request.id),
      details: JSON.stringify({
        requestNumber: request.requestNumber,
        sellerId: request.sellerId,
        amountCents: request.netAmountCents,
        proof: paymentProofUrl,
      }),
    });

    return res.json({
      success: true,
      message: 'Repasse concluído e registrado com sucesso!',
      payoutRequest: updatedRequest,
    });
  } catch (err: any) {
    console.error('Error completing payout:', err);
    return res.status(500).json({ error: 'Erro ao processar repasse.' });
  }
});

export default router;
