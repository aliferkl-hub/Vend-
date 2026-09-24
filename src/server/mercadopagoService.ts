import { db } from '../db/index.ts';
import { appSettings, payments, orders, subscriptions, users, notifications, auditLogs, plans, financialLedger, commissions } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';



export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
  isConfigured: boolean;
  isProduction: boolean;
  tokenType: 'PRODUCTION' | 'TEST' | 'NONE';
  source: 'DATABASE' | 'ENV' | 'NONE';
}

export interface MPVerificationStatus {
  status: 'CONECTADO' | 'NÃO CONFIGURADO' | 'ERRO DE AUTENTICAÇÃO' | 'ERRO DE API';
  environmentConfigured: boolean;
  accessTokenConfigured: boolean;
  publicKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookOperational: boolean;
  lastConfirmationReceived: string | null;
  lastPaymentConfirmed: string | null;
  lastError: string | null;
  account?: {
    collectorId?: number | string;
    nickname?: string;
    siteId?: string;
    isProduction?: boolean;
    tokenType?: string;
  };
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
  const envWebhookSecret = (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();

  let dbAccessToken = '';
  let dbPublicKey = '';
  let dbWebhookSecret = '';

  try {
    const settingsList = await db.select().from(appSettings);
    const tokenSetting = settingsList.find((s) => s.key === 'MERCADOPAGO_ACCESS_TOKEN');
    const keySetting = settingsList.find((s) => s.key === 'MERCADOPAGO_PUBLIC_KEY');
    const webhookSetting = settingsList.find((s) => s.key === 'MERCADOPAGO_WEBHOOK_SECRET');

    if (tokenSetting && tokenSetting.value && tokenSetting.value.trim().length > 0) {
      dbAccessToken = decryptSecret(tokenSetting.value.trim());
    }
    if (keySetting && keySetting.value && keySetting.value.trim().length > 0) {
      dbPublicKey = keySetting.value.trim();
    }
    if (webhookSetting && webhookSetting.value && webhookSetting.value.trim().length > 0) {
      dbWebhookSecret = decryptSecret(webhookSetting.value.trim());
    }
  } catch (err: any) {
    console.warn('[MercadoPago] Aviso ao ler app_settings:', err?.message || err);
  }

  let accessToken = '';
  let publicKey = '';
  let webhookSecret = '';
  let source: 'DATABASE' | 'ENV' | 'NONE' = 'NONE';

  // Rule 8: Prefer infrastructure environment variable / secret when available
  if (envAccessToken) {
    accessToken = envAccessToken;
    publicKey = envPublicKey || dbPublicKey;
    webhookSecret = envWebhookSecret || dbWebhookSecret;
    source = 'ENV';
  } else if (dbAccessToken) {
    accessToken = dbAccessToken;
    publicKey = dbPublicKey || envPublicKey;
    webhookSecret = dbWebhookSecret || envWebhookSecret;
    source = 'DATABASE';
  } else {
    publicKey = envPublicKey || dbPublicKey;
    webhookSecret = envWebhookSecret || dbWebhookSecret;
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
    webhookSecret,
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
    hasWebhookSecret: Boolean(creds.webhookSecret),
    integrationStatus: creds.isConfigured
      ? creds.isProduction
        ? 'CONECTADO_PRODUCAO'
        : 'CONECTADO_TESTE'
      : 'MERCADO PAGO — INTEGRAÇÃO PARCIAL/NÃO CONFIGURADA',
    environmentLabel: creds.isProduction
      ? 'Produção Oficial (Real)'
      : creds.tokenType === 'TEST'
      ? 'Sandbox / Testes'
      : 'MERCADO PAGO — INTEGRAÇÃO PARCIAL/NÃO CONFIGURADA',
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
export async function saveMercadoPagoCredentials(accessToken: string, publicKey?: string, webhookSecret?: string) {
  const cleanToken = accessToken.trim();
  const cleanKey = (publicKey || '').trim();
  const cleanSecret = (webhookSecret || '').trim();

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

  // Upsert webhook secret if provided
  if (cleanSecret) {
    const encryptedSecret = encryptSecret(cleanSecret);
    const [existingSecret] = await db.select().from(appSettings).where(eq(appSettings.key, 'MERCADOPAGO_WEBHOOK_SECRET')).limit(1);
    if (existingSecret) {
      await db.update(appSettings).set({ value: encryptedSecret, updatedAt: new Date() }).where(eq(appSettings.id, existingSecret.id));
    } else {
      await db.insert(appSettings).values({
        key: 'MERCADOPAGO_WEBHOOK_SECRET',
        value: encryptedSecret,
        description: 'Mercado Pago Webhook Secret for Signature Validation (AES-256-GCM Encrypted)',
      });
    }
  }

  return testRes;
}

/**
 * Controlled Production Connection Test (Requirements 9 & 10)
 * Returns status: CONECTADO | NÃO CONFIGURADO | ERRO DE AUTENTICAÇÃO | ERRO DE API
 * Never exposes credentials or tokens!
 */
export async function verifyMercadoPagoConnectionStatus(): Promise<MPVerificationStatus> {
  const creds = await getMercadoPagoCredentials();

  let lastConfirmationReceived: string | null = null;
  let lastPaymentConfirmed: string | null = null;
  let lastError: string | null = null;

  try {
    const [latestApprovedPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.status, 'APPROVED'))
      .orderBy(desc(payments.paidAt))
      .limit(1);

    if (latestApprovedPayment && latestApprovedPayment.paidAt) {
      lastConfirmationReceived = new Date(latestApprovedPayment.paidAt).toLocaleString('pt-BR');
      lastPaymentConfirmed = `Pagamento #${latestApprovedPayment.id} (R$ ${(latestApprovedPayment.amountCents / 100).toFixed(2)})`;
    }
  } catch {}

  if (!creds.isConfigured) {
    return {
      status: 'NÃO CONFIGURADO',
      environmentConfigured: false,
      accessTokenConfigured: false,
      publicKeyConfigured: Boolean(creds.publicKey),
      webhookSecretConfigured: Boolean(creds.webhookSecret),
      webhookOperational: true,
      lastConfirmationReceived,
      lastPaymentConfirmed,
      lastError: 'Credenciais de produção do Mercado Pago ainda não foram cadastradas.',
    };
  }

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        status: 'ERRO DE AUTENTICAÇÃO',
        environmentConfigured: true,
        accessTokenConfigured: true,
        publicKeyConfigured: Boolean(creds.publicKey),
        webhookSecretConfigured: Boolean(creds.webhookSecret),
        webhookOperational: true,
        lastConfirmationReceived,
        lastPaymentConfirmed,
        lastError: `Falha de autenticação (HTTP ${res.status}): Token de acesso não autorizado ou expirado.`,
      };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        status: 'ERRO DE API',
        environmentConfigured: true,
        accessTokenConfigured: true,
        publicKeyConfigured: Boolean(creds.publicKey),
        webhookSecretConfigured: Boolean(creds.webhookSecret),
        webhookOperational: true,
        lastConfirmationReceived,
        lastPaymentConfirmed,
        lastError: errBody.message || `Erro da API Mercado Pago (HTTP ${res.status}).`,
      };
    }

    const userData = await res.json();
    return {
      status: 'CONECTADO',
      environmentConfigured: true,
      accessTokenConfigured: true,
      publicKeyConfigured: Boolean(creds.publicKey),
      webhookSecretConfigured: Boolean(creds.webhookSecret),
      webhookOperational: true,
      lastConfirmationReceived,
      lastPaymentConfirmed,
      lastError: null,
      account: {
        collectorId: userData.id,
        nickname: userData.nickname,
        siteId: userData.site_id,
        isProduction: creds.isProduction,
        tokenType: creds.tokenType,
      },
    };
  } catch (err: any) {
    return {
      status: 'ERRO DE API',
      environmentConfigured: true,
      accessTokenConfigured: true,
      publicKeyConfigured: Boolean(creds.publicKey),
      webhookSecretConfigured: Boolean(creds.webhookSecret),
      webhookOperational: true,
      lastConfirmationReceived,
      lastPaymentConfirmed,
      lastError: `Falha de rede ao conectar à API do Mercado Pago: ${err.message}`,
    };
  }
}

/**
 * Validates Mercado Pago Webhook HMAC-SHA256 signature (Official spec).
 * Header: x-signature: ts=[timestamp],v1=[hash]
 * Header: x-request-id: [uuid]
 * Query dataId / id: [paymentId]
 */
export function verifyWebhookSignature(params: {
  xSignature?: string | string[];
  xRequestId?: string | string[];
  dataId?: string | number | null;
  secret: string;
}): { valid: boolean; reason: string } {
  if (!params.secret) {
    return { valid: true, reason: 'SECRET_NOT_CONFIGURED' };
  }

  const sigHeader = Array.isArray(params.xSignature) ? params.xSignature[0] : params.xSignature;
  const reqId = Array.isArray(params.xRequestId) ? params.xRequestId[0] : params.xRequestId;

  if (!sigHeader) {
    return { valid: false, reason: 'MISSING_X_SIGNATURE' };
  }

  const parts: Record<string, string> = {};
  sigHeader.split(',').forEach((part) => {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (k && v) parts[k] = v;
  });

  const ts = parts.ts;
  const hashV1 = parts.v1;

  if (!ts || !hashV1) {
    return { valid: false, reason: 'INVALID_SIGNATURE_FORMAT' };
  }

  const manifest = `id:${params.dataId || ''};request-id:${reqId || ''};ts:${ts};`;
  const computedHash = crypto.createHmac('sha256', params.secret).update(manifest).digest('hex');

  try {
    const bufComputed = Buffer.from(computedHash, 'hex');
    const bufReceived = Buffer.from(hashV1, 'hex');

    if (bufComputed.length !== bufReceived.length) {
      return { valid: false, reason: 'HASH_MISMATCH' };
    }

    const isValid = crypto.timingSafeEqual(bufComputed, bufReceived);
    return {
      valid: isValid,
      reason: isValid ? 'VALID' : 'HASH_MISMATCH',
    };
  } catch {
    return { valid: false, reason: 'HASH_COMPARISON_ERROR' };
  }
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
  const { withLock, recordLedgerEntry, syncSellerBalance } = await import('./financialService.ts');

  return await withLock(`settle_payment_${dbPayment.id}`, async () => {
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

    // IF CANCELLED OR REFUNDED: Protect against fraudulent payouts
    if ((newDbStatus === 'CANCELLED' || newDbStatus === 'REFUNDED') && dbPayment.orderId) {
      console.log(`[MercadoPago] Pagamento #${dbPayment.id} ${newDbStatus}! Bloqueando repasse e cancelando pedido #${dbPayment.orderId}...`);
      await db
        .update(orders)
        .set({
          paymentStatus: newDbStatus,
          payoutStatus: 'CANCELLED',
          status: 'CANCELLED',
          updatedAt: now,
        })
        .where(eq(orders.id, dbPayment.orderId));

      await db
        .update(financialLedger)
        .set({
          paymentStatus: newDbStatus,
          orderStatus: 'CANCELLED',
          payoutStatus: 'CANCELLED',
          cancellationReason: mpStatusDetail || `Pagamento ${newDbStatus} no Mercado Pago`,
          updatedAt: now,
        })
        .where(eq(financialLedger.orderId, dbPayment.orderId));

      const [cancelledOrder] = await db.select().from(orders).where(eq(orders.id, dbPayment.orderId)).limit(1);
      if (cancelledOrder) {
        await syncSellerBalance(cancelledOrder.sellerId);
      }
    }

    // IF APPROVED: Grant benefits / Update order or subscription
    if (newDbStatus === 'APPROVED') {
      console.log(`[MercadoPago] Pagamento #${dbPayment.id} APROVADO! Liquidando transação...`);

      // 1. ORDER SETTLEMENT
      if (dbPayment.orderId) {
        const [order] = await db.select().from(orders).where(eq(orders.id, dbPayment.orderId)).limit(1);
        if (order && (order.status === 'AWAITING_PAYMENT' || order.paymentStatus !== 'APPROVED')) {
          await db
            .update(orders)
            .set({
              status: 'PAID',
              paymentStatus: 'APPROVED',
              paidAt: now,
              mpPaymentId: String(mpData.id),
              payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
              updatedAt: now,
            })
            .where(eq(orders.id, order.id));

          await db
            .update(commissions)
            .set({
              paidAt: now,
              mpPaymentId: String(mpData.id),
              payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
            })
            .where(eq(commissions.orderId, order.id));

          // Check if ESCROW_HOLD already exists in financialLedger to prevent duplicate entry
          const existingHold = await db
            .select()
            .from(financialLedger)
            .where(
              and(
                eq(financialLedger.orderId, order.id),
                eq(financialLedger.entryType, 'ESCROW_HOLD')
              )
            )
            .limit(1);

          if (existingHold.length === 0) {
            await recordLedgerEntry({
              orderId: order.id,
              orderNumber: order.orderNumber,
              sellerId: order.sellerId,
              buyerId: order.buyerId,
              entryType: 'ESCROW_HOLD',
              grossAmountCents: order.totalGrossCents,
              platformFeeCents: order.commissionCents,
              sellerAmountCents: order.sellerNetCents,
              paymentStatus: 'APPROVED',
              orderStatus: 'PAID',
              payoutStatus: 'PENDING_DELIVERY_CONFIRMATION',
              status: 'HELD',
              paymentId: dbPayment.id,
              mpPaymentId: String(mpData.id),
              referenceId: dbPayment.externalReference || String(dbPayment.id),
              metadata: {
                paymentId: dbPayment.id,
                orderId: order.id,
                externalReference: dbPayment.externalReference,
                mpPaymentId: String(mpData.id),
                mpStatus: mpData.status,
                mpStatusDetail: mpData.status_detail,
                amount: mpData.transaction_amount,
              },
            });
          }

          // Sync seller balances atomically: funds enter pendingBalanceCents, availableBalanceCents = 0
          await syncSellerBalance(order.sellerId);

          // Notifications
          await db.insert(notifications).values({
            userId: order.buyerId,
            title: 'Pagamento confirmado!',
            message: `Seu pagamento via Mercado Pago para o pedido #${order.orderNumber} foi confirmado com sucesso!`,
            type: 'ORDER',
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

      // 2. SUBSCRIPTION SETTLEMENT
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
  });
}
