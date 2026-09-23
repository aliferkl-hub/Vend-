import { db } from '../db/index.ts';
import { appSettings, payments, orders, subscriptions, users, notifications, auditLogs, plans } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
  isConfigured: boolean;
  isProduction: boolean;
  tokenType: 'PRODUCTION' | 'TEST' | 'NONE';
  source: 'DATABASE' | 'ENV' | 'NONE';
}

export interface MPPaymentResult {
  success: boolean;
  paymentId?: number;
  mpPaymentId?: string;
  status?: string;
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  initPoint?: string;
  preferenceId?: string;
  externalReference?: string;
  amount?: number;
  currency?: string;
  error?: string;
  rawResponse?: any;
}

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Derives a deterministic 256-bit encryption key from the server's master secret.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.SQL_ADMIN_PASSWORD || 'vend_master_encryption_key_v1_secure';
  return crypto.scryptSync(secret, 'vend_app_settings_salt_2026', 32);
}

/**
 * Encrypts a sensitive string with AES-256-GCM (Authenticated Encryption).
 * Output format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret with authentication tag validation.
 * Falls back to plaintext only for backward compatibility if not yet encrypted.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('enc:v1:')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      return cipherText;
    }
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedText = parts[4];

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('[MercadoPago Security] Falha ao descriptografar segredo:', err.message);
    return '';
  }
}

/**
 * Retrieves the active Mercado Pago credentials.
 * Priority 1: process.env.MERCADOPAGO_ACCESS_TOKEN (Infrastructure Secret/Environment Variable)
 * Priority 2: PostgreSQL app_settings (AES-256-GCM encrypted at rest)
 */
export async function getMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
  const envAccessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  const envPublicKey = (process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();

  let dbAccessToken = '';
  let dbPublicKey = '';

  try {
    const settingsList = await db.select().from(appSettings);
    const tokenSetting = settingsList.find((s) => s.key === 'MERCADOPAGO_ACCESS_TOKEN');
    const keySetting = settingsList.find((s) => s.key === 'MERCADOPAGO_PUBLIC_KEY');

    if (tokenSetting && tokenSetting.value && tokenSetting.value.trim().length > 0) {
      dbAccessToken = decryptSecret(tokenSetting.value.trim());
    }
    if (keySetting && keySetting.value && keySetting.value.trim().length > 0) {
      dbPublicKey = keySetting.value.trim();
    }
  } catch (err: any) {
    console.warn('[MercadoPago] Aviso ao ler app_settings:', err?.message || err);
  }

  let accessToken = '';
  let publicKey = '';
  let source: 'DATABASE' | 'ENV' | 'NONE' = 'NONE';

  // Rule 8: Prefer infrastructure environment variable / secret when available
  if (envAccessToken) {
    accessToken = envAccessToken;
    publicKey = envPublicKey || dbPublicKey;
    source = 'ENV';
  } else if (dbAccessToken) {
    accessToken = dbAccessToken;
    publicKey = dbPublicKey || envPublicKey;
    source = 'DATABASE';
  }

  const isConfigured = Boolean(accessToken && accessToken.length > 5);
  const isProduction = accessToken.startsWith('APP_USR-');
  const tokenType: 'PRODUCTION' | 'TEST' | 'NONE' = !isConfigured
    ? 'NONE'
    : isProduction
    ? 'PRODUCTION'
    : accessToken.startsWith('TEST-')
    ? 'TEST'
    : 'PRODUCTION';

  return {
    accessToken,
    publicKey,
    isConfigured,
    isProduction,
    tokenType,
    source,
  };
}

/**
 * Gets sanitized public configuration for frontend (never leaks access token!).
 */
export async function getPublicConfig() {
  const creds = await getMercadoPagoCredentials();
  return {
    configured: creds.isConfigured,
    isProduction: creds.isProduction,
    tokenType: creds.tokenType,
    publicKey: creds.publicKey || null,
    environmentLabel: creds.isProduction ? 'Produção Oficial (Real)' : creds.tokenType === 'TEST' ? 'Sandbox / Testes' : 'Não Configurado',
  };
}

/**
 * Tests connection with Mercado Pago API using /users/me endpoint.
 */
export async function testMercadoPagoConnection(overrideToken?: string) {
  const creds = await getMercadoPagoCredentials();
  const token = overrideToken || creds.accessToken;

  if (!token) {
    return {
      connected: false,
      error: 'Token do Mercado Pago não configurado no servidor.',
    };
  }

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        connected: false,
        statusCode: res.status,
        error: errBody.message || `Erro de autenticação Mercado Pago (HTTP ${res.status}).`,
        details: errBody,
      };
    }

    const userData = await res.json();
    return {
      connected: true,
      collectorId: userData.id,
      nickname: userData.nickname,
      email: userData.email,
      siteId: userData.site_id,
      countryId: userData.country_id,
      identificationType: userData.identification?.type,
      identificationNumber: userData.identification?.number ? '***' + String(userData.identification?.number).slice(-4) : undefined,
      userType: userData.user_type,
      isProduction: token.startsWith('APP_USR-'),
      tokenType: token.startsWith('APP_USR-') ? 'PRODUCTION' : token.startsWith('TEST-') ? 'TEST' : 'CUSTOM',
    };
  } catch (err: any) {
    return {
      connected: false,
      error: `Falha de rede ao conectar à API do Mercado Pago: ${err.message}`,
    };
  }
}

/**
 * Updates or stores Mercado Pago credentials in the database (appSettings).
 */
export async function saveMercadoPagoCredentials(accessToken: string, publicKey?: string) {
  const cleanToken = accessToken.trim();
  const cleanKey = (publicKey || '').trim();

  // Test token first
  const testRes = await testMercadoPagoConnection(cleanToken);
  if (!testRes.connected) {
    throw new Error(`Token inválido: ${testRes.error}`);
  }

  // Encrypt the Access Token with AES-256-GCM authenticated encryption before persisting
  const encryptedToken = encryptSecret(cleanToken);

  // Upsert access token
  const [existingToken] = await db.select().from(appSettings).where(eq(appSettings.key, 'MERCADOPAGO_ACCESS_TOKEN')).limit(1);
  if (existingToken) {
    await db.update(appSettings).set({ value: encryptedToken, updatedAt: new Date() }).where(eq(appSettings.id, existingToken.id));
  } else {
    await db.insert(appSettings).values({
      key: 'MERCADOPAGO_ACCESS_TOKEN',
      value: encryptedToken,
      description: 'Mercado Pago Production Access Token (AES-256-GCM Encrypted)',
    });
  }

  // Upsert public key if provided
  if (cleanKey) {
    const [existingKey] = await db.select().from(appSettings).where(eq(appSettings.key, 'MERCADOPAGO_PUBLIC_KEY')).limit(1);
    if (existingKey) {
      await db.update(appSettings).set({ value: cleanKey, updatedAt: new Date() }).where(eq(appSettings.id, existingKey.id));
    } else {
      await db.insert(appSettings).values({
        key: 'MERCADOPAGO_PUBLIC_KEY',
        value: cleanKey,
        description: 'Mercado Pago Public Key for Frontend',
      });
    }
  }

  return testRes;
}

/**
 * Creates a real Pix payment via Mercado Pago API (/v1/payments).
 */
export async function createPixPayment(params: {
  amountCents: number;
  description: string;
  externalReference: string;
  orderId?: number;
  subscriptionId?: number;
  userId: number;
  paymentType: 'ORDER' | 'SUBSCRIPTION';
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
    cpf?: string;
  };
}): Promise<MPPaymentResult> {
  const creds = await getMercadoPagoCredentials();
  if (!creds.isConfigured) {
    throw new Error('Mercado Pago não configurado. Por favor configure o token de acesso de produção.');
  }

  const transactionAmount = Number((params.amountCents / 100).toFixed(2));
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const notificationUrl = `${appUrl}/api/payments/mercadopago/webhook`;
  const idempotencyKey = crypto.randomUUID();

  // Clean and prepare CPF if provided
  const cleanCpf = params.payer.cpf ? params.payer.cpf.replace(/\D/g, '') : '';
  const firstName = params.payer.firstName || 'Cliente';
  const lastName = params.payer.lastName || 'VEND+';

  const mpPayload: any = {
    transaction_amount: transactionAmount,
    description: params.description.substring(0, 100),
    payment_method_id: 'pix',
    payer: {
      email: params.payer.email,
      first_name: firstName,
      last_name: lastName,
      ...(cleanCpf.length === 11 ? { identification: { type: 'CPF', number: cleanCpf } } : {}),
    },
    external_reference: params.externalReference,
    notification_url: notificationUrl,
    date_of_expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiration
    metadata: {
      order_id: params.orderId || null,
      user_id: params.userId,
      payment_type: params.paymentType,
      platform: 'VEND+',
    },
  };

  console.log(`[MercadoPago] Criando Pix Real de R$ ${transactionAmount} (Ref: ${params.externalReference})...`);

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(mpPayload),
  });

  const mpData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[MercadoPago] Erro ao criar pagamento Pix:', response.status, mpData);
    const errorMessage =
      mpData.message ||
      (mpData.cause && mpData.cause[0] && mpData.cause[0].description) ||
      'Falha na comunicação com a API do Mercado Pago.';
    throw new Error(errorMessage);
  }

  const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
  const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
  const ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url;

  if (!qrCode) {
    console.warn('[MercadoPago] Retorno do Pix sem qr_code no transaction_data:', mpData);
  }

  // Insert or update payment record in database
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      orderId: params.orderId || null,
      subscriptionId: params.subscriptionId || null,
      userId: params.userId,
      paymentType: params.paymentType,
      amountCents: params.amountCents,
      status: mpData.status === 'approved' ? 'APPROVED' : 'PENDING',
      statusDetail: mpData.status_detail || 'pending_waiting_transfer',
      paymentMethod: 'PIX',
      currency: 'BRL',
      externalReference: params.externalReference,
      mpPaymentId: String(mpData.id),
      mpStatus: mpData.status,
      mpRawResponse: JSON.stringify(mpData),
      qrCode: qrCode || null,
      qrCodeBase64: qrCodeBase64 || null,
      ticketUrl: ticketUrl || null,
      idempotencyKey,
      paidAt: mpData.status === 'approved' ? new Date() : null,
      dateApproved: mpData.date_approved ? new Date(mpData.date_approved) : null,
    })
    .returning();

  return {
    success: true,
    paymentId: paymentRecord.id,
    mpPaymentId: String(mpData.id),
    status: mpData.status,
    statusDetail: mpData.status_detail,
    qrCode,
    qrCodeBase64,
    ticketUrl,
    externalReference: params.externalReference,
    amount: transactionAmount,
    currency: 'BRL',
    rawResponse: mpData,
  };
}

/**
 * Creates a Checkout Preference for Mercado Pago Checkout Pro (Pix, Card, Boleto).
 */
export async function createCheckoutPreference(params: {
  orderId?: number;
  planId?: number;
  userId: number;
  title: string;
  amountCents: number;
  externalReference: string;
  payerEmail: string;
  payerName?: string;
}): Promise<MPPaymentResult> {
  const creds = await getMercadoPagoCredentials();
  if (!creds.isConfigured) {
    throw new Error('Mercado Pago não configurado.');
  }

  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const transactionAmount = Number((params.amountCents / 100).toFixed(2));
  const successUrl = params.orderId
    ? `${appUrl}/pedidos?payment_status=success&order_id=${params.orderId}`
    : `${appUrl}/planos?payment_status=success`;
  const failureUrl = params.orderId
    ? `${appUrl}/pedidos?payment_status=failure&order_id=${params.orderId}`
    : `${appUrl}/planos?payment_status=failure`;
  const pendingUrl = params.orderId
    ? `${appUrl}/pedidos?payment_status=pending&order_id=${params.orderId}`
    : `${appUrl}/planos?payment_status=pending`;

  const preferencePayload: any = {
    items: [
      {
        title: params.title.substring(0, 100),
        quantity: 1,
        currency_id: 'BRL',
        unit_price: transactionAmount,
      },
    ],
    payer: {
      email: params.payerEmail,
      name: params.payerName || 'Cliente VEND+',
    },
    external_reference: params.externalReference,
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return: 'approved',
    notification_url: `${appUrl}/api/payments/mercadopago/webhook`,
    statement_descriptor: 'VEND+ MARKET',
    metadata: {
      order_id: params.orderId || null,
      plan_id: params.planId || null,
      user_id: params.userId,
    },
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferencePayload),
  });

  const prefData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[MercadoPago] Erro ao criar preferência:', response.status, prefData);
    throw new Error(prefData.message || 'Falha ao criar preferência de checkout no Mercado Pago.');
  }

  // Record pending payment in database
  const [paymentRecord] = await db
    .insert(payments)
    .values({
      orderId: params.orderId || null,
      subscriptionId: null,
      userId: params.userId,
      paymentType: params.orderId ? 'ORDER' : 'SUBSCRIPTION',
      amountCents: params.amountCents,
      status: 'PENDING',
      paymentMethod: 'MERCADO_PAGO_PREFERENCE',
      currency: 'BRL',
      externalReference: params.externalReference,
      mpRawResponse: JSON.stringify(prefData),
    })
    .returning();

  return {
    success: true,
    paymentId: paymentRecord.id,
    preferenceId: prefData.id,
    initPoint: prefData.init_point,
    ticketUrl: prefData.init_point,
    externalReference: params.externalReference,
    amount: transactionAmount,
    currency: 'BRL',
  };
}

/**
 * Fetches updated payment information directly from Mercado Pago API.
 */
export async function getPaymentFromMercadoPago(mpPaymentId: string | number) {
  const creds = await getMercadoPagoCredentials();
  if (!creds.isConfigured) return null;

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[MercadoPago] Consulta de pagamento ${mpPaymentId} retornou HTTP ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err: any) {
    console.error(`[MercadoPago] Falha de conexão ao consultar pagamento ${mpPaymentId}:`, err.message);
    return null;
  }
}

/**
 * CENTRALIZED SETTLEMENT LOGIC
 * Idempotent: checks status before executing updates.
 * Updates order/subscription ONLY when status === 'approved'.
 */
export async function settlePayment(
  dbPayment: typeof payments.$inferSelect,
  mpData: any
): Promise<{ processed: boolean; status: string; alreadyProcessed?: boolean }> {
  const mpStatus = mpData.status; // 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded'
  const mpStatusDetail = mpData.status_detail || '';
  const now = new Date();

  // IDEMPOTENCY CHECK: If payment is already approved, do not double-process
  if (dbPayment.status === 'APPROVED') {
    return {
      processed: true,
      status: 'APPROVED',
      alreadyProcessed: true,
    };
  }

  let newDbStatus = dbPayment.status;
  if (mpStatus === 'approved') {
    newDbStatus = 'APPROVED';
  } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
    newDbStatus = 'CANCELLED';
  } else if (mpStatus === 'refunded') {
    newDbStatus = 'REFUNDED';
  }

  // Update payment record in database
  await db
    .update(payments)
    .set({
      status: newDbStatus,
      statusDetail: mpStatusDetail,
      mpPaymentId: String(mpData.id),
      mpStatus,
      mpRawResponse: JSON.stringify(mpData),
      paidAt: newDbStatus === 'APPROVED' ? now : dbPayment.paidAt,
      dateApproved: mpData.date_approved ? new Date(mpData.date_approved) : (newDbStatus === 'APPROVED' ? now : null),
      updatedAt: now,
    })
    .where(eq(payments.id, dbPayment.id));

  // IF APPROVED: Grant benefits / Update order or subscription
  if (newDbStatus === 'APPROVED') {
    console.log(`[MercadoPago] Pagamento #${dbPayment.id} APROVADO! Liquidando transação...`);

    // 1. ORDER SETTLEMENT
    if (dbPayment.orderId) {
      const [order] = await db.select().from(orders).where(eq(orders.id, dbPayment.orderId)).limit(1);
      if (order && order.status === 'AWAITING_PAYMENT') {
        await db
          .update(orders)
          .set({
            status: 'PAID',
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        // Notifications
        await db.insert(notifications).values({
          userId: order.buyerId,
          title: 'Pagamento confirmado!',
          message: `Seu pagamento via Mercado Pago para o pedido #${order.orderNumber} foi confirmado com sucesso!`,
          type: 'ORDER',
          link: `/pedidos`,
        });

        await db.insert(notifications).values({
          userId: order.sellerId,
          title: 'Pagamento recebido no Mercado Pago!',
          message: `O pedido #${order.orderNumber} teve o pagamento aprovado. Prepare o produto para entrega.`,
          type: 'SALE',
          link: `/pedidos`,
        });

        // Audit Log
        await db.insert(auditLogs).values({
          userId: order.buyerId,
          action: 'ORDER_PAYMENT_APPROVED_MP',
          entityType: 'ORDER',
          entityId: String(order.id),
          details: JSON.stringify({
            paymentId: dbPayment.id,
            mpPaymentId: mpData.id,
            amount: mpData.transaction_amount,
            method: mpData.payment_method_id,
          }),
        });
      }
    }

    // 2. PLAN / SUBSCRIPTION SETTLEMENT
    if (dbPayment.paymentType === 'SUBSCRIPTION' && dbPayment.userId) {
      const targetUserId = dbPayment.userId;

      // Find plan from price or metadata
      let targetPlan: any = null;
      if (mpData.metadata?.plan_slug) {
        [targetPlan] = await db.select().from(plans).where(eq(plans.slug, mpData.metadata.plan_slug)).limit(1);
      }
      if (!targetPlan && mpData.metadata?.plan_id) {
        [targetPlan] = await db.select().from(plans).where(eq(plans.id, Number(mpData.metadata.plan_id))).limit(1);
      }
      if (!targetPlan) {
        const matchingPlans = await db.select().from(plans).where(eq(plans.priceCents, dbPayment.amountCents)).limit(1);
        targetPlan = matchingPlans[0];
      }

      if (targetPlan) {
        const startDate = now;
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30);

        // Insert subscription record
        const [sub] = await db
          .insert(subscriptions)
          .values({
            userId: targetUserId,
            planId: targetPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            autoRenew: true,
          })
          .returning();

        // Update payment with subscriptionId
        await db.update(payments).set({ subscriptionId: sub.id }).where(eq(payments.id, dbPayment.id));

        // Activate plan in user profile
        await db
          .update(users)
          .set({
            planSlug: targetPlan.slug,
            updatedAt: now,
          })
          .where(eq(users.id, targetUserId));

        // Notification
        await db.insert(notifications).values({
          userId: targetUserId,
          title: `Plano ${targetPlan.name} Ativado!`,
          message: `Seu pagamento foi confirmado pelo Mercado Pago e o plano ${targetPlan.name} já está ativo na sua conta. Aproveite todas as vantagens!`,
          type: 'SYSTEM',
          link: `/planos`,
        });

        // Audit Log
        await db.insert(auditLogs).values({
          userId: targetUserId,
          action: 'PLAN_SUBSCRIPTION_ACTIVATED_MP',
          entityType: 'PLAN',
          entityId: String(targetPlan.id),
          details: JSON.stringify({
            paymentId: dbPayment.id,
            mpPaymentId: mpData.id,
            planName: targetPlan.name,
            amount: mpData.transaction_amount,
          }),
        });

        console.log(`[MercadoPago] Plano ${targetPlan.name} ativado com sucesso para usuário #${targetUserId}.`);
      }
    }
  }

  return {
    processed: true,
    status: newDbStatus,
  };
}
