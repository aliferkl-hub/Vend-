import { pgTable, serial, text, integer, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. USERS
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or internal UUID
  username: text('username').unique(),
  email: text('email').notNull().unique(),
  normalizedEmail: text('normalized_email').unique(),
  passwordHash: text('password_hash'), // For direct email/password auth
  name: text('name').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  location: text('location'), // e.g. "São Paulo, SP"
  role: text('role').notNull().default('USER'), // 'USER' | 'MASTER_OWNER' | 'DELIVERY_DRIVER'
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  planSlug: text('plan_slug').notNull().default('free'), // 'free' | 'basico' | 'premium' | 'lendario'
  emailVerified: boolean('email_verified').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. SESSIONS
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2b. PASSWORD_RESETS
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2c. AUTH_EVENTS (VEND_AUTH_MEMORY)
export const authEvents = pgTable('auth_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  email: text('email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. PROFILES
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  bio: text('bio'),
  documentNumber: text('document_number'), // CPF/CNPJ
  rating: text('rating').default('5.0'),
  totalReviews: integer('total_reviews').default(0).notNull(),
  preferences: text('preferences'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. ADDRESSES
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. PLANS
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // 'free' | 'basico' | 'premium' | 'lendario'
  priceCents: integer('price_cents').notNull(),
  maxActiveListings: integer('max_active_listings').notNull(),
  commissionPercent: integer('commission_percent').notNull(), // 7 for free, 4 for paid
  features: text('features').notNull(), // JSON string array
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. SUBSCRIPTIONS
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: integer('plan_id').references(() => plans.id).notNull(),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  currentPeriodStart: timestamp('current_period_start').defaultNow().notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. STORES
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  description: text('description'),
  category: text('category').notNull().default('Geral'),
  location: text('location').notNull(),
  phone: text('phone'),
  hours: text('hours'), // e.g. "Seg a Sex: 08h - 18h"
  rating: text('rating').default('5.0'),
  offersDelivery: boolean('offers_delivery').default(true).notNull(),
  offersPickup: boolean('offers_pickup').default(true).notNull(),
  followersCount: integer('followers_count').default(0).notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. CATEGORIES
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull().default('Tag'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. PRODUCTS
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  sellerId: integer('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  subcategory: text('subcategory'),
  condition: text('condition').notNull().default('NOVO'), // 'NOVO' | 'USADO'
  priceCents: integer('price_cents').notNull(),
  originalPriceCents: integer('original_price_cents'),
  stock: integer('stock').notNull().default(1),
  location: text('location').notNull(),
  offersDelivery: boolean('offers_delivery').default(true).notNull(),
  offersPickup: boolean('offers_pickup').default(true).notNull(),
  allowsNegotiation: boolean('allows_negotiation').default(true).notNull(),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'PENDING_REVIEW'
  rating: text('rating').default('5.0'),
  viewsCount: integer('views_count').default(0).notNull(),
  imageUrl: text('image_url').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. PRODUCT_IMAGES
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  type: text('type').default('gallery').notNull(), // 'main' | 'gallery' | 'desktop' | 'tablet' | 'mobile'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. SERVICES
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  priceType: text('price_type').notNull().default('STARTING_AT'), // 'FIXED' | 'STARTING_AT'
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  location: text('location').notNull(),
  offersDelivery: boolean('offers_delivery').default(false).notNull(),
  allowsNegotiation: boolean('allows_negotiation').default(true).notNull(),
  rating: text('rating').default('5.0'),
  totalReviews: integer('total_reviews').default(0).notNull(),
  status: text('status').notNull().default('ACTIVE'),
  imageUrl: text('image_url').notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. ORDERS
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  buyerId: integer('buyer_id').references(() => users.id).notNull(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('AWAITING_PAYMENT'),
  // 'AWAITING_PAYMENT' | 'PAID' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'WAITING_CONFIRMATION' | 'DELIVERED' | 'CANCELLED'
  paymentStatus: text('payment_status').default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'
  totalGrossCents: integer('total_gross_cents').notNull(),
  commissionCents: integer('commission_cents').notNull(),
  sellerNetCents: integer('seller_net_cents').notNull(),
  shippingFeeCents: integer('shipping_fee_cents').default(0).notNull(),
  deliveryType: text('delivery_type').notNull().default('SHIPPING'), // 'SHIPPING' | 'PICKUP'
  deliveryAddressId: integer('delivery_address_id').references(() => addresses.id),
  deliveryDriverId: integer('delivery_driver_id').references(() => users.id),
  deliveryCode: text('delivery_code').notNull(), // 4 digits e.g. "4827"
  deliveryCodeUsed: boolean('delivery_code_used').default(false).notNull(),
  deliveryAttempts: integer('delivery_attempts').default(0).notNull(),
  payoutStatus: text('payout_status').default('PENDING_DELIVERY_CONFIRMATION').notNull(), // 'PENDING_DELIVERY_CONFIRMATION' | 'AVAILABLE_FOR_PAYOUT' | 'REQUESTED' | 'PAID' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'
  payoutReleasedAt: timestamp('payout_released_at'),
  payoutRequestedAt: timestamp('payout_requested_at'),
  payoutCompletedAt: timestamp('payout_completed_at'),
  mpPaymentId: text('mp_payment_id'),
  confirmedByUserId: integer('confirmed_by_user_id').references(() => users.id),
  paidAt: timestamp('paid_at'),
  deliveredAt: timestamp('delivered_at'),
  deliveryConfirmedAt: timestamp('delivery_confirmed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. ORDER_ITEMS
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id),
  serviceId: integer('service_id').references(() => services.id),
  itemType: text('item_type').notNull().default('PRODUCT'), // 'PRODUCT' | 'SERVICE'
  title: text('title').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  imageUrl: text('image_url'),
  variations: text('variations'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. NEGOTIATIONS
export const negotiations = pgTable('negotiations', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id),
  serviceId: integer('service_id').references(() => services.id),
  buyerId: integer('buyer_id').references(() => users.id).notNull(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  initialPriceCents: integer('initial_price_cents').notNull(),
  currentOfferCents: integer('current_offer_cents').notNull(),
  lastOfferBy: text('last_offer_by').notNull().default('BUYER'), // 'BUYER' | 'SELLER'
  status: text('status').notNull().default('OPEN'), // 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
  finalAgreedPriceCents: integer('final_agreed_price_cents'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. NEGOTIATION_MESSAGES
export const negotiationMessages = pgTable('negotiation_messages', {
  id: serial('id').primaryKey(),
  negotiationId: integer('negotiation_id').references(() => negotiations.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  offerCents: integer('offer_cents'),
  messageType: text('message_type').notNull().default('MESSAGE'), // 'MESSAGE' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPT' | 'REJECT'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. PAYMENTS
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  userId: integer('user_id').references(() => users.id),
  paymentType: text('payment_type').notNull().default('ORDER'), // 'ORDER' | 'SUBSCRIPTION'
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'CANCELLED' | 'REFUNDED'
  statusDetail: text('status_detail'),
  paymentMethod: text('payment_method').notNull().default('MERCADO_PAGO'),
  currency: text('currency').notNull().default('BRL'),
  externalReference: text('external_reference').notNull().unique(),
  mpPaymentId: text('mp_payment_id'),
  mpStatus: text('mp_status'),
  mpRawResponse: text('mp_raw_response'),
  qrCode: text('qr_code'),
  qrCodeBase64: text('qr_code_base64'),
  ticketUrl: text('ticket_url'),
  idempotencyKey: text('idempotency_key'),
  paidAt: timestamp('paid_at'),
  dateApproved: timestamp('date_approved'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. COMMISSIONS
export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull().unique(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  grossAmountCents: integer('gross_amount_cents').notNull(),
  commissionPercent: integer('commission_percent').notNull(),
  commissionCents: integer('commission_cents').notNull(),
  sellerNetAmountCents: integer('seller_net_amount_cents').notNull(),
  planNameAtSale: text('plan_name_at_sale').notNull(),
  payoutStatus: text('payout_status').default('PENDING').notNull(), // 'PENDING' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'
  payoutReleasedAt: timestamp('payout_released_at'),
  mpPaymentId: text('mp_payment_id'),
  paidAt: timestamp('paid_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. DELIVERY_DRIVERS
export const deliveryDrivers = pgTable('delivery_drivers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  vehicleType: text('vehicle_type').notNull().default('MOTO'), // 'MOTO' | 'CARRO' | 'BICICLETA'
  plate: text('plate'),
  region: text('region').notNull(),
  status: text('status').notNull().default('AVAILABLE'), // 'AVAILABLE' | 'DELIVERING' | 'OFFLINE'
  rating: text('rating').default('5.0'),
  totalDeliveries: integer('total_deliveries').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 19. DELIVERIES
export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull().unique(),
  driverId: integer('driver_id').references(() => deliveryDrivers.id),
  status: text('status').notNull().default('ASSIGNED'), // 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED'
  attemptsCount: integer('attempts_count').default(0).notNull(),
  confirmedAt: timestamp('confirmed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 20. DELIVERY_CODES
export const deliveryCodes = pgTable('delivery_codes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull().unique(),
  code: text('code').notNull(), // 4 digits
  used: boolean('used').default(false).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at'),
});

// 21. DELIVERY_ATTEMPTS
export const deliveryAttempts = pgTable('delivery_attempts', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  driverId: integer('driver_id').references(() => users.id).notNull(),
  attemptedCode: text('attempted_code').notNull(),
  isSuccess: boolean('is_success').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
});

// 22. FAVORITES
export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemType: text('item_type').notNull(), // 'PRODUCT' | 'SERVICE' | 'STORE'
  itemId: integer('item_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. REVIEWS
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  reviewerId: integer('reviewer_id').references(() => users.id).notNull(),
  targetUserId: integer('target_user_id').references(() => users.id).notNull(),
  storeId: integer('store_id').references(() => stores.id),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment').notNull(),
  reviewType: text('review_type').notNull().default('SELLER'), // 'SELLER' | 'DRIVER' | 'BUYER'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. NOTIFICATIONS
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('INFO'), // 'SALE' | 'ORDER' | 'OFFER' | 'DELIVERY' | 'SYSTEM'
  link: text('link'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. AUDIT_LOGS
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. APP_SETTINGS (Master Owner Configurable)
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 27. SELLER_PAYOUT_ACCOUNTS
export const sellerPayoutAccounts = pgTable('seller_payout_accounts', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountType: text('account_type').notNull().default('PIX'), // 'PIX' | 'BANK_ACCOUNT'
  pixKeyType: text('pix_key_type'), // 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'
  pixKey: text('pix_key'),
  bankCode: text('bank_code'),
  bankName: text('bank_name'),
  agency: text('agency'),
  accountNumber: text('account_number'),
  accountTypeDetail: text('account_type_detail'), // 'CORRENTE' | 'POUPANCA'
  holderName: text('holder_name').notNull(),
  holderDocument: text('holder_document').notNull(), // CPF or CNPJ
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'PENDING' | 'INACTIVE'
  isVerified: boolean('is_verified').default(true).notNull(),
  verifiedAt: timestamp('verified_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 28. PAYOUT_REQUESTS
export const payoutRequests = pgTable('payout_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  payoutAccountId: integer('payout_account_id').references(() => sellerPayoutAccounts.id),
  amountCents: integer('amount_cents').notNull(),
  feeCents: integer('fee_cents').default(0).notNull(),
  netAmountCents: integer('net_amount_cents').notNull(),
  status: text('status').notNull().default('REQUESTED'), // 'REQUESTED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED'
  receiptSnapshot: text('receipt_snapshot'), // JSON string of account info
  orderIds: text('order_ids'), // JSON string array of order IDs
  processedByUserId: integer('processed_by_user_id').references(() => users.id),
  paymentProofUrl: text('payment_proof_url'),
  notes: text('notes'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 29. FINANCIAL_LEDGER (TRANSACTION AUDIT & RECONCILIATION)
export const financialLedger = pgTable('financial_ledger', {
  id: serial('id').primaryKey(),
  transactionNumber: text('transaction_number').notNull().unique(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  orderNumber: text('order_number').notNull(),
  paymentId: integer('payment_id').references(() => payments.id),
  buyerId: integer('buyer_id').references(() => users.id).notNull(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  grossAmountCents: integer('gross_amount_cents').notNull(),
  platformFeeCents: integer('platform_fee_cents').notNull(),
  sellerAmountCents: integer('seller_amount_cents').notNull(),
  paymentStatus: text('payment_status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'
  orderStatus: text('order_status').notNull().default('AWAITING_PAYMENT'), // 'AWAITING_PAYMENT' | 'PAID' | 'PREPARING' | 'IN_TRANSIT' | 'WAITING_CONFIRMATION' | 'DELIVERED' | 'CANCELLED'
  payoutStatus: text('payout_status').notNull().default('PENDING_DELIVERY_CONFIRMATION'), // 'PENDING_DELIVERY_CONFIRMATION' | 'AVAILABLE_FOR_PAYOUT' | 'REQUESTED' | 'PAID' | 'CANCELLED' | 'REFUNDED'
  approvedAt: timestamp('approved_at'),
  deliveryConfirmedAt: timestamp('delivery_confirmed_at'),
  payoutRequestedAt: timestamp('payout_requested_at'),
  payoutCompletedAt: timestamp('payout_completed_at'),
  payoutRequestId: integer('payout_request_id').references(() => payoutRequests.id),
  mpPaymentId: text('mp_payment_id'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  addresses: many(addresses),
  stores: many(stores),
  products: many(products),
  services: many(services),
  ordersAsBuyer: many(orders, { relationName: 'buyerOrders' }),
  ordersAsSeller: many(orders, { relationName: 'sellerOrders' }),
  notifications: many(notifications),
  favorites: many(favorites),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, { fields: [products.sellerId], references: [users.id] }),
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  provider: one(users, { fields: [services.providerId], references: [users.id] }),
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id], relationName: 'buyerOrders' }),
  seller: one(users, { fields: [orders.sellerId], references: [users.id], relationName: 'sellerOrders' }),
  items: many(orderItems),
  deliveryAddress: one(addresses, { fields: [orders.deliveryAddressId], references: [addresses.id] }),
  deliveryDriver: one(users, { fields: [orders.deliveryDriverId], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  service: one(services, { fields: [orderItems.serviceId], references: [services.id] }),
}));

export const negotiationsRelations = relations(negotiations, ({ one, many }) => ({
  buyer: one(users, { fields: [negotiations.buyerId], references: [users.id] }),
  seller: one(users, { fields: [negotiations.sellerId], references: [users.id] }),
  product: one(products, { fields: [negotiations.productId], references: [products.id] }),
  service: one(services, { fields: [negotiations.serviceId], references: [services.id] }),
  messages: many(negotiationMessages),
}));
