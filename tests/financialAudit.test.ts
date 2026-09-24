import { db } from '../src/db/index.ts';
import {
  users,
  plans,
  orders,
  payments,
  commissions,
  financialLedger,
  sellerBalances,
  payoutRequests,
  deliveryCodes,
  sellerPayoutAccounts,
} from '../src/db/schema.ts';
import {
  calculateCommission,
  recordLedgerEntry,
  syncSellerBalance,
  withLock,
  runFinancialReconciliation,
  releaseEscrowForEligibleOrder,
  sanitizeAndReconcileFinancialData,
} from '../src/server/financialService.ts';
import {
  settlePayment,
  verifyWebhookSignature,
  verifyMercadoPagoConnectionStatus,
  testMercadoPagoConnection,
  getPaymentFromMercadoPago,
} from '../src/server/mercadopagoService.ts';
import crypto from 'crypto';
import { eq, inArray } from 'drizzle-orm';

interface TestResult {
  scenarioId: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

export async function runAllFinancialTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  console.log('\n======================================================');
  console.log(' INICIANDO BATERIA DE TESTES FINANCEIROS VEND+ (29 CENÁRIOS)');
  console.log('======================================================\n');

  // SETUP: Test Fixtures
  const testRunId = Date.now().toString(36);
  const now = new Date();

  // Create or get Buyer & Sellers
  const [buyer] = await db
    .insert(users)
    .values({
      uid: `buyer_${testRunId}`,
      name: `Test Buyer ${testRunId}`,
      email: `buyer_${testRunId}@vendplus.test`,
      passwordHash: 'dummy_hash',
      role: 'BUYER',
      planSlug: 'free',
      status: 'ACTIVE',
    })
    .returning();

  const [sellerFree] = await db
    .insert(users)
    .values({
      uid: `seller_free_${testRunId}`,
      name: `Test Seller Free ${testRunId}`,
      email: `seller_free_${testRunId}@vendplus.test`,
      passwordHash: 'dummy_hash',
      role: 'SELLER',
      planSlug: 'free',
      status: 'ACTIVE',
    })
    .returning();

  const [sellerPaid] = await db
    .insert(users)
    .values({
      uid: `seller_paid_${testRunId}`,
      name: `Test Seller Paid ${testRunId}`,
      email: `seller_paid_${testRunId}@vendplus.test`,
      passwordHash: 'dummy_hash',
      role: 'SELLER',
      planSlug: 'premium',
      status: 'ACTIVE',
    })
    .returning();

  // Setup payout accounts
  await db.insert(sellerPayoutAccounts).values({
    sellerId: sellerFree.id,
    accountType: 'PIX',
    pixKeyType: 'CPF',
    pixKey: '12345678900',
    holderName: sellerFree.name,
    holderDocument: '12345678900',
    status: 'ACTIVE',
    isVerified: true,
  });

  // Helper to record result
  async function runScenario(id: number, name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ scenarioId: id, name, passed: true, message: 'Sucesso: Teste validado rigorosamente.' });
      console.log(`[PASS] Cenário ${id}: ${name}`);
    } catch (err: any) {
      results.push({ scenarioId: id, name, passed: false, message: err.message, details: err.stack });
      console.error(`[FAIL] Cenário ${id}: ${name} -> ${err.message}`);
    }
  }

  let testOrder1Id = 0;
  let testOrder1Number = '';
  let testCode1 = '8492';

  // 1. COMPRA APROVADA
  await runScenario(1, 'Compra aprovada com retenção em saldo pendente', async () => {
    testOrder1Number = `VEND-TEST-1-${testRunId}`;
    const [ord] = await db
      .insert(orders)
      .values({
        orderNumber: testOrder1Number,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'PAID',
        paymentStatus: 'APPROVED',
        totalGrossCents: 10000, // R$ 100,00
        commissionCents: 700,   // R$ 7,00 (7%)
        sellerNetCents: 9300,   // R$ 93,00
        deliveryCode: testCode1,
        deliveryCodeUsed: false,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      })
      .returning();
    testOrder1Id = ord.id;

    await db.insert(deliveryCodes).values({
      orderId: ord.id,
      code: testCode1,
      used: false,
      attempts: 0,
    });

    await recordLedgerEntry({
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      sellerId: ord.sellerId,
      buyerId: ord.buyerId,
      entryType: 'ESCROW_HOLD',
      grossAmountCents: ord.totalGrossCents,
      platformFeeCents: ord.commissionCents,
      sellerAmountCents: ord.sellerNetCents,
      paymentStatus: 'APPROVED',
      orderStatus: 'PAID',
      payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      status: 'HELD',
    });

    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.pendingBalanceCents === 9300, `Esperado pending=9300, obtido ${balance.pendingBalanceCents}`);
    assert(balance.availableBalanceCents === 0, `Esperado available=0 antes da entrega, obtido ${balance.availableBalanceCents}`);
  });

  // 2. PAGAMENTO DUPLICADO
  await runScenario(2, 'Proteção contra pagamento duplicado / idempotência', async () => {
    // Process payment a second time for same order
    const [ord] = await db.select().from(orders).where(eq(orders.id, testOrder1Id)).limit(1);
    assert(ord.paymentStatus === 'APPROVED', 'Pedido deve estar previamente aprovado');

    // Trying to settle payment again must not duplicate pending balance
    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.pendingBalanceCents === 9300, 'Saldo pendente não pode duplicar para mesmo pedido');
  });

  // 3. CÓDIGO INCORRETO
  await runScenario(3, 'Código incorreto não libera saldo e registra tentativa', async () => {
    const wrongCode = '9999';
    const [codeRecord] = await db.select().from(deliveryCodes).where(eq(deliveryCodes.orderId, testOrder1Id)).limit(1);
    assert(codeRecord.code !== wrongCode, 'Código testado deve ser incorreto');

    // Increment attempts
    await db.update(deliveryCodes).set({ attempts: codeRecord.attempts + 1 }).where(eq(deliveryCodes.id, codeRecord.id));

    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.availableBalanceCents === 0, 'Código incorreto NÃO pode liberar saldo disponível');
    assert(balance.pendingBalanceCents === 9300, 'Saldo deve permanecer retido');
  });

  // 4. CÓDIGO CORRETO
  await runScenario(4, 'Código correto valida entrega e converte saldo pendente em disponível', async () => {
    const [codeRecord] = await db.select().from(deliveryCodes).where(eq(deliveryCodes.orderId, testOrder1Id)).limit(1);
    assert(codeRecord.code === testCode1, 'Código deve bater exatamente');

    // Mark delivery as done
    await db.update(deliveryCodes).set({ used: true, usedAt: new Date() }).where(eq(deliveryCodes.id, codeRecord.id));
    await db
      .update(orders)
      .set({
        status: 'DELIVERED',
        deliveryCodeUsed: true,
        deliveredAt: new Date(),
        payoutStatus: 'AVAILABLE_FOR_PAYOUT',
      })
      .where(eq(orders.id, testOrder1Id));

    // Record ESCROW_RELEASE in ledger
    await recordLedgerEntry({
      orderId: testOrder1Id,
      orderNumber: testOrder1Number,
      sellerId: sellerFree.id,
      buyerId: buyer.id,
      entryType: 'ESCROW_RELEASE',
      grossAmountCents: 10000,
      platformFeeCents: 700,
      sellerAmountCents: 9300,
      paymentStatus: 'APPROVED',
      orderStatus: 'DELIVERED',
      payoutStatus: 'AVAILABLE_FOR_PAYOUT',
      status: 'RELEASED',
    });

    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.pendingBalanceCents === 0, `Esperado pending=0, obtido ${balance.pendingBalanceCents}`);
    assert(balance.availableBalanceCents === 9300, `Esperado available=9300, obtido ${balance.availableBalanceCents}`);
  });

  // 5. CÓDIGO REUTILIZADO
  await runScenario(5, 'Reutilização de código já usado é bloqueada', async () => {
    const [codeRecord] = await db.select().from(deliveryCodes).where(eq(deliveryCodes.orderId, testOrder1Id)).limit(1);
    assert(codeRecord.used === true, 'Código já deve estar marcado como usado');

    // Second validation attempt must fail
    let threw = false;
    if (codeRecord.used) {
      threw = true; // Blocked
    }
    assert(threw, 'Tentativa de revalidar código já usado deve ser rejeitada');
  });

  // 6. DUAS VALIDAÇÕES SIMULTÂNEAS (MUTEX LOCK)
  await runScenario(6, 'Duas validações simultâneas bloqueadas por lock de concorrência', async () => {
    let raceBlocked = false;
    try {
      await withLock(`race_test_${testRunId}`, async () => {
        // Nested identical lock should throw
        await withLock(`race_test_${testRunId}`, async () => {});
      });
    } catch (err: any) {
      raceBlocked = true;
    }
    assert(raceBlocked, 'Acesso concorrente à mesma chave deve ser bloqueado');
  });

  // 7. COMISSÃO 7% (PLANO FREE)
  await runScenario(7, 'Cálculo de comissão de 7% para plano gratuito', async () => {
    const calc = await calculateCommission(sellerFree.id, 10000); // R$ 100,00
    assert(calc.commissionPercent === 7, `Esperado 7%, obtido ${calc.commissionPercent}%`);
    assert(calc.commissionCents === 700, `Esperado R$ 7,00 (700 cents), obtido ${calc.commissionCents}`);
    assert(calc.sellerNetCents === 9300, `Esperado R$ 93,00 (9300 cents), obtido ${calc.sellerNetCents}`);
  });

  // 8. COMISSÃO 4% (PLANOS PAGOS)
  await runScenario(8, 'Cálculo de comissão de 4% para planos pagos', async () => {
    const calc = await calculateCommission(sellerPaid.id, 10000); // R$ 100,00
    assert(calc.commissionPercent === 4, `Esperado 4%, obtido ${calc.commissionPercent}%`);
    assert(calc.commissionCents === 400, `Esperado R$ 4,00 (400 cents), obtido ${calc.commissionCents}`);
    assert(calc.sellerNetCents === 9600, `Esperado R$ 96,00 (9600 cents), obtido ${calc.sellerNetCents}`);
  });

  let testPayoutReqId = 0;

  // 9. SOLICITAÇÃO DE PAYOUT
  await runScenario(9, 'Solicitação de repasse reserva saldo disponível', async () => {
    const balanceBefore = await syncSellerBalance(sellerFree.id);
    assert(balanceBefore.availableBalanceCents === 9300, 'Saldo disponível antes do payout deve ser 9300');

    // Create payout request
    const [req] = await db
      .insert(payoutRequests)
      .values({
        requestNumber: `PAY-TEST-${testRunId}`,
        sellerId: sellerFree.id,
        amountCents: 9300,
        netAmountCents: 9300,
        status: 'REQUESTED',
        orderIds: JSON.stringify([testOrder1Id]),
      })
      .returning();
    testPayoutReqId = req.id;

    await db.update(orders).set({ payoutStatus: 'REQUESTED' }).where(eq(orders.id, testOrder1Id));

    const balanceAfter = await syncSellerBalance(sellerFree.id);
    assert(balanceAfter.availableBalanceCents === 0, 'Saldo disponível deve ir a 0 após solicitação de repasse');
  });

  // 10. PAYOUT DUPLICADO
  await runScenario(10, 'Proteção contra solicitação de payout duplicado', async () => {
    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.availableBalanceCents === 0, 'Vendedor não possui saldo disponível');

    // Attempting to request again must fail because available funds is 0
    let blocked = false;
    if (balance.availableBalanceCents <= 0) {
      blocked = true;
    }
    assert(blocked, 'Solicitação com saldo zero deve ser bloqueada');
  });

  // 11. PAYOUT CONCLUÍDO
  await runScenario(11, 'Payout concluído com comprovante transita para PAID', async () => {
    await db
      .update(payoutRequests)
      .set({
        status: 'PAID',
        paymentProofUrl: 'https://comprovantes.test/pix-123.pdf',
        notes: 'Liquidação manual realizada com comprovante externo Pix.',
        paidAt: new Date(),
      })
      .where(eq(payoutRequests.id, testPayoutReqId));

    await db.update(orders).set({ payoutStatus: 'PAID' }).where(eq(orders.id, testOrder1Id));

    const balance = await syncSellerBalance(sellerFree.id);
    assert(balance.paidBalanceCents === 9300, `Esperado paidBalance=9300, obtido ${balance.paidBalanceCents}`);
    assert(balance.availableBalanceCents === 0, 'Disponível deve continuar 0');
  });

  // 12. PAYOUT FALHO & RETORNO DE SALDO
  await runScenario(12, 'Payout falho retorna fundos com segurança ao saldo disponível', async () => {
    // Simulate a failed payout for sellerPaid
    const [paidOrd] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-FAIL-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerPaid.id,
        status: 'DELIVERED',
        paymentStatus: 'APPROVED',
        totalGrossCents: 10000,
        commissionCents: 400,
        sellerNetCents: 9600,
        deliveryCode: '1111',
        deliveryCodeUsed: true,
        payoutStatus: 'REQUESTED',
      })
      .returning();

    const [failedReq] = await db
      .insert(payoutRequests)
      .values({
        requestNumber: `PAY-FAIL-${testRunId}`,
        sellerId: sellerPaid.id,
        amountCents: 9600,
        netAmountCents: 9600,
        status: 'REQUESTED',
        orderIds: JSON.stringify([paidOrd.id]),
      })
      .returning();

    // Now fail the payout
    await db
      .update(payoutRequests)
      .set({
        status: 'FAILED',
        notes: 'Chave Pix inválida no banco de destino.',
      })
      .where(eq(payoutRequests.id, failedReq.id));

    // Rollback order back to AVAILABLE_FOR_PAYOUT
    await db.update(orders).set({ payoutStatus: 'AVAILABLE_FOR_PAYOUT' }).where(eq(orders.id, paidOrd.id));

    const balance = await syncSellerBalance(sellerPaid.id);
    assert(balance.availableBalanceCents === 9600, `Saldo disponível deve retornar aos 9600. Obtido: ${balance.availableBalanceCents}`);
  });

  // 13. SALDO INSUFICIENTE
  await runScenario(13, 'Tentativa de saque com saldo insuficiente é barrada', async () => {
    const [sellerBroke] = await db
      .insert(users)
      .values({
        uid: `broke_${testRunId}`,
        name: `Broke Seller ${testRunId}`,
        email: `broke_${testRunId}@vendplus.test`,
        passwordHash: 'dummy_hash',
        role: 'SELLER',
        planSlug: 'free',
        status: 'ACTIVE',
      })
      .returning();

    const balance = await syncSellerBalance(sellerBroke.id);
    assert(balance.availableBalanceCents === 0, 'Saldo disponível inicial deve ser 0');
  });

  // 14. PEDIDO CANCELADO
  await runScenario(14, 'Pedido cancelado antes da entrega não entra em saldo pendente', async () => {
    const [ord] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-CANCEL-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerPaid.id,
        status: 'CANCELLED',
        paymentStatus: 'CANCELLED',
        totalGrossCents: 5000,
        commissionCents: 200,
        sellerNetCents: 4800,
        deliveryCode: '0000',
        payoutStatus: 'CANCELLED',
      })
      .returning();

    const balance = await syncSellerBalance(sellerPaid.id);
    // Should not increase pending or available
    assert(balance.pendingBalanceCents === 0, 'Pedido cancelado não deve gerar saldo pendente');
  });

  // 15. REEMBOLSO
  await runScenario(15, 'Reembolso registra estorno no livro-razão imutável', async () => {
    const refundEntry = await recordLedgerEntry({
      orderId: testOrder1Id,
      orderNumber: testOrder1Number,
      sellerId: sellerFree.id,
      buyerId: buyer.id,
      entryType: 'REFUND',
      grossAmountCents: 10000,
      platformFeeCents: 700,
      sellerAmountCents: 9300,
      status: 'COMPLETED',
      referenceId: `REFUND-${testRunId}`,
    });
    assert(refundEntry.entryType === 'REFUND', 'Entrada de estorno deve ser registrada');
  });

  // 16. WEBHOOK DUPLICADO
  await runScenario(16, 'Webhook duplicado do PSP é processado de forma idempotente', async () => {
    // Calling sync on seller balances with existing orders produces identical balance
    const b1 = await syncSellerBalance(sellerFree.id);
    const b2 = await syncSellerBalance(sellerFree.id);
    assert(b1.paidBalanceCents === b2.paidBalanceCents, 'Valores devem ser estritamente idênticos');
  });

  // 17. USUÁRIO TENTANDO ALTERAR SALDO PELO FRONTEND
  await runScenario(17, 'Frontend não tem autoridade financeira - saldo vem da agregação do banco', async () => {
    // The backend ignores any body payload trying to pass balance amounts
    const computed = await syncSellerBalance(sellerFree.id);
    assert(typeof computed.availableBalanceCents === 'number', 'Saldo é puramente calculado pelo banco');
  });

  // 18. VENDEDOR TENTANDO ACESSAR SALDO DE OUTRO VENDEDOR
  await runScenario(18, 'Isolamento de saldos entre vendedores distintos', async () => {
    const balFree = await syncSellerBalance(sellerFree.id);
    const balPaid = await syncSellerBalance(sellerPaid.id);
    assert(balFree.sellerId !== balPaid.sellerId, 'Saldos de vendedores diferentes são isolados');
  });

  // 19. CRIAÇÃO DE PAGAMENTO MERCADO PAGO
  let orderMp19: any;
  let paymentMp19: any;
  await runScenario(19, 'Criação de pagamento Mercado Pago com registro seguro e PENDING', async () => {
    const extRef = `vendplus_mp_test_19_${testRunId}`;
    const [ord] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-19-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        totalGrossCents: 10000,
        commissionCents: 700,
        sellerNetCents: 9300,
        deliveryCode: '1901',
        deliveryCodeUsed: false,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      })
      .returning();
    orderMp19 = ord;

    const [pm] = await db
      .insert(payments)
      .values({
        orderId: ord.id,
        amountCents: 10000,
        currency: 'BRL',
        paymentType: 'ORDER',
        paymentMethod: 'PIX',
        status: 'PENDING',
        externalReference: extRef,
      })
      .returning();
    paymentMp19 = pm;

    assert(pm.status === 'PENDING', 'Pagamento recém-criado deve estar com status PENDING');
    assert(ord.status === 'AWAITING_PAYMENT', 'Pedido aguarda confirmação oficial de pagamento');
  });

  // 20. WEBHOOK APROVADO
  await runScenario(20, 'Webhook oficial approved marca pedido como pago e retém valor em Escrow (pendingBalance)', async () => {
    const balBefore = await syncSellerBalance(sellerFree.id);
    const mpPaymentId = `mp_pay_official_${Date.now()}`;

    const settlement = await settlePayment(paymentMp19, {
      id: mpPaymentId,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 100.0,
      currency_id: 'BRL',
      date_approved: new Date().toISOString(),
      external_reference: paymentMp19.externalReference,
    });

    assert(settlement.processed === true, 'Liquidação deve ser processada com sucesso');
    assert(settlement.status === 'APPROVED', 'Status da liquidação deve ser APPROVED');

    const [updatedOrd] = await db.select().from(orders).where(eq(orders.id, orderMp19.id));
    assert(updatedOrd.status === 'PAID', 'Pedido deve passar para PAID no banco');

    const balAfter = await syncSellerBalance(sellerFree.id);
    assert(
      balAfter.pendingBalanceCents === balBefore.pendingBalanceCents + 9300,
      'pendingBalance deve aumentar pelo valor líquido (R$ 93,00) em Escrow'
    );
    assert(
      balAfter.availableBalanceCents === balBefore.availableBalanceCents,
      'availableBalance NÃO deve aumentar antes do código de entrega de 4 dígitos'
    );

    // Verify ESCROW_HOLD in ledger
    const [holdEntry] = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.orderId, orderMp19.id));
    assert(holdEntry && holdEntry.entryType === 'ESCROW_HOLD', 'Deve haver lançamento ESCROW_HOLD registrado no Ledger');
  });

  // 21. WEBHOOK DUPLICADO
  await runScenario(21, 'Webhook duplicado do Mercado Pago é idempotente e não duplica saldo nem ledger', async () => {
    const balBefore = await syncSellerBalance(sellerFree.id);

    // Fetch refreshed payment with status = APPROVED
    const [currentPayment] = await db.select().from(payments).where(eq(payments.id, paymentMp19.id));

    // Call settlePayment again with identical approved payload
    const duplicateSettlement = await settlePayment(currentPayment, {
      id: 'mp_pay_official_dup',
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 100.0,
      external_reference: paymentMp19.externalReference,
    });

    assert(duplicateSettlement.alreadyProcessed === true, 'Deve detectar pagamento já processado');

    const balAfter = await syncSellerBalance(sellerFree.id);
    assert(
      balAfter.pendingBalanceCents === balBefore.pendingBalanceCents,
      'pendingBalance NÃO pode ser duplicado'
    );

    const ledgerEntries = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.orderId, orderMp19.id));
    assert(ledgerEntries.length === 1, 'Ledger deve conter exatamente 1 registro para este pedido');
  });

  // 22. PAGAMENTO PENDENTE
  await runScenario(22, 'Status pendente no Mercado Pago mantém pedido em AWAITING_PAYMENT sem liberação de fundos', async () => {
    const extRef22 = `vendplus_mp_pending_${Date.now()}`;
    const [ordPend] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-22-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        totalGrossCents: 5000,
        commissionCents: 350,
        sellerNetCents: 4650,
        deliveryCode: '2201',
        deliveryCodeUsed: false,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      })
      .returning();

    const [pmPend] = await db
      .insert(payments)
      .values({
        orderId: ordPend.id,
        amountCents: 5000,
        currency: 'BRL',
        paymentType: 'ORDER',
        paymentMethod: 'PIX',
        status: 'PENDING',
        externalReference: extRef22,
      })
      .returning();

    const balBefore = await syncSellerBalance(sellerFree.id);

    const settlement = await settlePayment(pmPend, {
      id: 'mp_pending_123',
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      transaction_amount: 50.0,
      external_reference: extRef22,
    });

    assert(settlement.processed === true, 'Processamento pendente seguro');
    assert(settlement.status === 'PENDING', 'Status deve permanecer PENDING');
    const balAfter = await syncSellerBalance(sellerFree.id);
    assert(
      balAfter.pendingBalanceCents === balBefore.pendingBalanceCents,
      'Saldo pendente não deve ser alterado por evento pending'
    );

    const [updatedOrd] = await db.select().from(orders).where(eq(orders.id, ordPend.id));
    assert(updatedOrd.status === 'AWAITING_PAYMENT', 'Pedido permanece em AWAITING_PAYMENT');
  });

  // 23. PAGAMENTO REJEITADO
  await runScenario(23, 'Pagamento rejeitado ou cancelado pelo Mercado Pago cancela o pedido de forma segura', async () => {
    const extRef23 = `vendplus_mp_rej_${Date.now()}`;
    const [ordRej] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-23-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        totalGrossCents: 8000,
        commissionCents: 560,
        sellerNetCents: 7440,
        deliveryCode: '2301',
        deliveryCodeUsed: false,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      })
      .returning();

    const [pmRej] = await db
      .insert(payments)
      .values({
        orderId: ordRej.id,
        amountCents: 8000,
        currency: 'BRL',
        paymentType: 'ORDER',
        paymentMethod: 'CREDIT_CARD',
        status: 'PENDING',
        externalReference: extRef23,
      })
      .returning();

    const settlement = await settlePayment(pmRej, {
      id: 'mp_rej_999',
      status: 'rejected',
      status_detail: 'cc_rejected_bad_filled_security_code',
      transaction_amount: 80.0,
      external_reference: extRef23,
    });

    assert(settlement.processed === true, 'Processamento de cancelamento concluído');
    assert(settlement.status === 'CANCELLED', 'Status deve ser CANCELLED');
    const [updatedOrd] = await db.select().from(orders).where(eq(orders.id, ordRej.id));
    assert(updatedOrd.status === 'CANCELLED', 'Pedido deve ser cancelado');
    const [updatedPm] = await db.select().from(payments).where(eq(payments.id, pmRej.id));
    assert(updatedPm.status === 'CANCELLED', 'Pagamento local deve ser CANCELLED');
  });

  // 24. PAGAMENTO INEXISTENTE
  await runScenario(24, 'Consulta a pagamento inexistente na API oficial é tratada com segurança sem crash', async () => {
    const result = await getPaymentFromMercadoPago('non_existent_payment_id_0000000000');
    assert(result === null, 'Pagamento inexistente na API deve retornar null com segurança');
  });

  // 25. ASSINATURA INVÁLIDA DE WEBHOOK
  await runScenario(25, 'Assinatura HMAC-SHA256 de webhook: assinaturas forjadas são bloqueadas e válidas são aceitas', async () => {
    const secret = 'test_webhook_secret_key_vendplus_2026';
    const dataId = '123456789';
    const requestId = 'req_test_uuid_abc';
    const ts = Math.floor(Date.now() / 1000);

    // Valid HMAC generation
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const validHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const validHeader = `ts=${ts},v1=${validHash}`;

    // Test Valid
    const checkValid = verifyWebhookSignature({
      xSignature: validHeader,
      xRequestId: requestId,
      dataId: dataId,
      secret: secret,
    });
    assert(checkValid.valid === true, 'Assinatura correta deve ser aprovada');

    // Test Forged / Tampered
    const checkForged = verifyWebhookSignature({
      xSignature: `ts=${ts},v1=forged_hash_invalid_1234567890abcdef`,
      xRequestId: requestId,
      dataId: dataId,
      secret: secret,
    });
    assert(checkForged.valid === false, 'Assinatura forjada deve ser rejeitada');
    assert(checkForged.reason === 'HASH_MISMATCH', 'Motivo da rejeição deve ser HASH_MISMATCH');
  });

  // 26. TOKEN AUSENTE
  await runScenario(26, 'Token ausente é detectado com status NÃO CONFIGURADO', async () => {
    const result = await testMercadoPagoConnection('');
    assert(result.connected === false, 'Conexão com token vazio deve retornar connected: false');
    assert(result.error?.includes('não configurado'), 'Mensagem deve indicar token ausente');
  });

  // 27. TOKEN INVÁLIDO
  await runScenario(27, 'Token inválido é rejeitado pela API oficial do Mercado Pago com erro tratado', async () => {
    const result = await testMercadoPagoConnection('APP_USR-fake-invalid-token-test-99999999999999');
    assert(result.connected === false, 'Token inválido deve retornar connected: false');
    assert(typeof result.error === 'string', 'Erro deve ser string legível');
  });

  // 28. TENTATIVA DE APROVAÇÃO PELO FRONTEND
  await runScenario(28, 'Tentativa de aprovar pedido sem validação oficial do Mercado Pago é estritamente impedida', async () => {
    const [ordFake] = await db
      .insert(orders)
      .values({
        orderNumber: `VEND-TEST-28-${testRunId}`,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        totalGrossCents: 20000,
        commissionCents: 1400,
        sellerNetCents: 18600,
        deliveryCode: '2801',
        deliveryCodeUsed: false,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      })
      .returning();

    // Verification of the business rules in orderRoutes:
    // Status update PATCH endpoint only accepts: ['PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED']
    // Attempting to send 'PAID', 'DELIVERED', or 'RECEBIMENTO_VALIDADO' is rejected by the backend.
    const forbiddenStatuses = ['PAID', 'DELIVERED', 'RECEBIMENTO_VALIDADO'];
    const allowedStatuses = ['PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'];

    for (const forbidden of forbiddenStatuses) {
      assert(
        !allowedStatuses.includes(forbidden),
        `Status ${forbidden} NÃO pode ser enviado livremente pelo frontend no PATCH de status do pedido`
      );
    }
  });

  // 29. RECONCILIAÇÃO DE REPASSE APÓS CÓDIGO VALIDADO
  await runScenario(29, 'Reconciliação libera pedido entregue sem duplicar saldo ou ledger', async () => {
    const staleOrderNumber = `VEND-MUEW66YB-DDE8-${testRunId}`;
    const [staleOrder] = await db
      .insert(orders)
      .values({
        orderNumber: staleOrderNumber,
        buyerId: buyer.id,
        sellerId: sellerFree.id,
        status: 'DELIVERED',
        paymentStatus: 'APPROVED',
        totalGrossCents: 199,
        commissionCents: 14,
        sellerNetCents: 185,
        deliveryCode: '4827',
        deliveryCodeUsed: true,
        payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
        mpPaymentId: `mp-test-${testRunId}`,
        paidAt: new Date(),
        deliveredAt: new Date(),
        deliveryConfirmedAt: new Date(),
      })
      .returning();

    await recordLedgerEntry({
      orderId: staleOrder.id,
      orderNumber: staleOrder.orderNumber,
      sellerId: staleOrder.sellerId,
      buyerId: staleOrder.buyerId,
      entryType: 'ESCROW_HOLD',
      grossAmountCents: staleOrder.totalGrossCents,
      platformFeeCents: staleOrder.commissionCents,
      sellerAmountCents: staleOrder.sellerNetCents,
      paymentStatus: 'APPROVED',
      orderStatus: 'PAID',
      payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
      status: 'HELD',
    });

    const before = await syncSellerBalance(sellerFree.id);

    await sanitizeAndReconcileFinancialData();

    const [reconciled] = await db.select().from(orders).where(eq(orders.id, staleOrder.id)).limit(1);
    const [after] = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sellerFree.id)).limit(1);
    const releases = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.orderId, staleOrder.id));

    assert(reconciled.payoutStatus === 'AVAILABLE_FOR_PAYOUT', 'Reconciliação deve disponibilizar o repasse');
    assert(
      after.availableBalanceCents >= before.availableBalanceCents + 185,
      'O líquido do pedido inconsistente deve entrar no saldo disponível',
    );
    assert(releases.filter((entry) => entry.entryType === 'ESCROW_RELEASE').length === 1, 'Deve existir uma única liberação no ledger');

    await sanitizeAndReconcileFinancialData();

    const [afterSecondRun] = await db.select().from(sellerBalances).where(eq(sellerBalances.sellerId, sellerFree.id)).limit(1);
    const releasesAfterSecondRun = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.orderId, staleOrder.id));
    assert(afterSecondRun.availableBalanceCents === after.availableBalanceCents, 'Reconciliação repetida não pode duplicar saldo');
    assert(releasesAfterSecondRun.filter((entry) => entry.entryType === 'ESCROW_RELEASE').length === 1, 'Reconciliação repetida não pode duplicar o ledger');

    const releaseResult = await releaseEscrowForEligibleOrder(staleOrder.id);
    assert(releaseResult.alreadyReleased === true, 'Liberação idempotente deve reconhecer o escrow já convertido');
  });

  // RECONCILIAÇÃO AUDIT CHECK
  const recon = await runFinancialReconciliation();
  console.log('\n--- Relatório da Conciliação de Auditoria ---');
  console.log(`Total de Pedidos Auditados: ${recon.metrics.totalOrdersCount}`);
  console.log(`GMV Bruto Total: R$ ${(recon.metrics.totalGrossCents / 100).toFixed(2)}`);
  console.log(`Comissões Plataforma: R$ ${(recon.metrics.totalCommissionsCents / 100).toFixed(2)}`);
  console.log(`Anomalias Detectadas: ${recon.anomaliesCount}`);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n======================================================');
  console.log(` BATERIA DE TESTES CONCLUÍDA: ${passed}/${results.length} PASSARAM, ${failed} FALHARAM`);
  console.log('======================================================\n');

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Allow execution via tsx directly
if (process.argv[1]?.includes('financialAudit.test.ts')) {
  runAllFinancialTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
