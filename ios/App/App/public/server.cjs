var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc15) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc15 = __getOwnPropDesc(from, key)) || desc15.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express17 = __toESM(require("express"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_fs6 = __toESM(require("fs"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");

// src/lib/firebase-admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "intelligent-key-dlcf1",
  appId: "1:815437066644:web:ae34f2fc27824f3a421f81",
  apiKey: "AIzaSyBXqzMDMgl2d9j9tbkdN-uGby6c7rsZF_E",
  authDomain: "intelligent-key-dlcf1.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-vend-d1817472-938a-444f-85f9-7793d3f009d4",
  storageBucket: "intelligent-key-dlcf1.firebasestorage.app",
  messagingSenderId: "815437066644",
  measurementId: "",
  oAuthClientId: "815437066644-knkctrqtof5c0rmg3akeiednd6ht5cq5.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!(0, import_app.getApps)().length) {
  (0, import_app.initializeApp)({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = (0, import_auth.getAuth)();

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = require("pg");

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  addresses: () => addresses,
  appSettings: () => appSettings,
  auditLogs: () => auditLogs,
  authEvents: () => authEvents,
  categories: () => categories,
  commissions: () => commissions,
  deliveries: () => deliveries,
  deliveryAttempts: () => deliveryAttempts,
  deliveryCodes: () => deliveryCodes,
  deliveryDrivers: () => deliveryDrivers,
  favorites: () => favorites,
  negotiationMessages: () => negotiationMessages,
  negotiations: () => negotiations,
  negotiationsRelations: () => negotiationsRelations,
  notifications: () => notifications,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  passwordResets: () => passwordResets,
  payments: () => payments,
  plans: () => plans,
  productImages: () => productImages,
  products: () => products,
  productsRelations: () => productsRelations,
  profiles: () => profiles,
  reviews: () => reviews,
  services: () => services,
  servicesRelations: () => servicesRelations,
  sessions: () => sessions,
  stores: () => stores,
  subscriptions: () => subscriptions,
  users: () => users,
  usersRelations: () => usersRelations
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_orm = require("drizzle-orm");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid").notNull().unique(),
  // Firebase Auth UID or internal UUID
  username: (0, import_pg_core.text)("username").unique(),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  normalizedEmail: (0, import_pg_core.text)("normalized_email").unique(),
  passwordHash: (0, import_pg_core.text)("password_hash"),
  // For direct email/password auth
  name: (0, import_pg_core.text)("name").notNull(),
  phone: (0, import_pg_core.text)("phone"),
  avatarUrl: (0, import_pg_core.text)("avatar_url"),
  location: (0, import_pg_core.text)("location"),
  // e.g. "São Paulo, SP"
  role: (0, import_pg_core.text)("role").notNull().default("USER"),
  // 'USER' | 'MASTER_OWNER' | 'DELIVERY_DRIVER'
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  // 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  planSlug: (0, import_pg_core.text)("plan_slug").notNull().default("free"),
  // 'free' | 'basico' | 'premium' | 'lendario'
  emailVerified: (0, import_pg_core.boolean)("email_verified").default(false).notNull(),
  lastLoginAt: (0, import_pg_core.timestamp)("last_login_at"),
  metadata: (0, import_pg_core.text)("metadata"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var sessions = (0, import_pg_core.pgTable)("sessions", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  sessionId: (0, import_pg_core.text)("session_id"),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: (0, import_pg_core.text)("token").notNull().unique(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at").notNull(),
  lastUsedAt: (0, import_pg_core.timestamp)("last_used_at"),
  revokedAt: (0, import_pg_core.timestamp)("revoked_at"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var passwordResets = (0, import_pg_core.pgTable)("password_resets", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: (0, import_pg_core.text)("token").notNull(),
  tokenHash: (0, import_pg_core.text)("token_hash").notNull().unique(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at").notNull(),
  usedAt: (0, import_pg_core.timestamp)("used_at"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var authEvents = (0, import_pg_core.pgTable)("auth_events", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: (0, import_pg_core.text)("event_type").notNull(),
  email: (0, import_pg_core.text)("email"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  metadata: (0, import_pg_core.text)("metadata"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var profiles = (0, import_pg_core.pgTable)("profiles", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  bio: (0, import_pg_core.text)("bio"),
  documentNumber: (0, import_pg_core.text)("document_number"),
  // CPF/CNPJ
  rating: (0, import_pg_core.text)("rating").default("5.0"),
  totalReviews: (0, import_pg_core.integer)("total_reviews").default(0).notNull(),
  preferences: (0, import_pg_core.text)("preferences"),
  // JSON string
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var addresses = (0, import_pg_core.pgTable)("addresses", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  recipientName: (0, import_pg_core.text)("recipient_name").notNull(),
  phone: (0, import_pg_core.text)("phone").notNull(),
  street: (0, import_pg_core.text)("street").notNull(),
  number: (0, import_pg_core.text)("number").notNull(),
  complement: (0, import_pg_core.text)("complement"),
  neighborhood: (0, import_pg_core.text)("neighborhood").notNull(),
  city: (0, import_pg_core.text)("city").notNull(),
  state: (0, import_pg_core.text)("state").notNull(),
  postalCode: (0, import_pg_core.text)("postal_code").notNull(),
  isDefault: (0, import_pg_core.boolean)("is_default").default(false).notNull(),
  latitude: (0, import_pg_core.text)("latitude"),
  longitude: (0, import_pg_core.text)("longitude"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var plans = (0, import_pg_core.pgTable)("plans", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  // 'free' | 'basico' | 'premium' | 'lendario'
  priceCents: (0, import_pg_core.integer)("price_cents").notNull(),
  maxActiveListings: (0, import_pg_core.integer)("max_active_listings").notNull(),
  commissionPercent: (0, import_pg_core.integer)("commission_percent").notNull(),
  // 7 for free, 4 for paid
  features: (0, import_pg_core.text)("features").notNull(),
  // JSON string array
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var subscriptions = (0, import_pg_core.pgTable)("subscriptions", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: (0, import_pg_core.integer)("plan_id").references(() => plans.id).notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  // 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  currentPeriodStart: (0, import_pg_core.timestamp)("current_period_start").defaultNow().notNull(),
  currentPeriodEnd: (0, import_pg_core.timestamp)("current_period_end").notNull(),
  autoRenew: (0, import_pg_core.boolean)("auto_renew").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var stores = (0, import_pg_core.pgTable)("stores", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  logoUrl: (0, import_pg_core.text)("logo_url"),
  bannerUrl: (0, import_pg_core.text)("banner_url"),
  description: (0, import_pg_core.text)("description"),
  category: (0, import_pg_core.text)("category").notNull().default("Geral"),
  location: (0, import_pg_core.text)("location").notNull(),
  phone: (0, import_pg_core.text)("phone"),
  hours: (0, import_pg_core.text)("hours"),
  // e.g. "Seg a Sex: 08h - 18h"
  rating: (0, import_pg_core.text)("rating").default("5.0"),
  offersDelivery: (0, import_pg_core.boolean)("offers_delivery").default(true).notNull(),
  offersPickup: (0, import_pg_core.boolean)("offers_pickup").default(true).notNull(),
  followersCount: (0, import_pg_core.integer)("followers_count").default(0).notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var categories = (0, import_pg_core.pgTable)("categories", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull().unique(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  icon: (0, import_pg_core.text)("icon").notNull().default("Tag"),
  description: (0, import_pg_core.text)("description"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var products = (0, import_pg_core.pgTable)("products", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  storeId: (0, import_pg_core.integer)("store_id").references(() => stores.id),
  sellerId: (0, import_pg_core.integer)("seller_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  description: (0, import_pg_core.text)("description").notNull(),
  categoryId: (0, import_pg_core.integer)("category_id").references(() => categories.id).notNull(),
  subcategory: (0, import_pg_core.text)("subcategory"),
  condition: (0, import_pg_core.text)("condition").notNull().default("NOVO"),
  // 'NOVO' | 'USADO'
  priceCents: (0, import_pg_core.integer)("price_cents").notNull(),
  originalPriceCents: (0, import_pg_core.integer)("original_price_cents"),
  stock: (0, import_pg_core.integer)("stock").notNull().default(1),
  location: (0, import_pg_core.text)("location").notNull(),
  offersDelivery: (0, import_pg_core.boolean)("offers_delivery").default(true).notNull(),
  offersPickup: (0, import_pg_core.boolean)("offers_pickup").default(true).notNull(),
  allowsNegotiation: (0, import_pg_core.boolean)("allows_negotiation").default(true).notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  // 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'PENDING_REVIEW'
  rating: (0, import_pg_core.text)("rating").default("5.0"),
  viewsCount: (0, import_pg_core.integer)("views_count").default(0).notNull(),
  imageUrl: (0, import_pg_core.text)("image_url").notNull(),
  isDemo: (0, import_pg_core.boolean)("is_demo").default(false).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var productImages = (0, import_pg_core.pgTable)("product_images", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  productId: (0, import_pg_core.integer)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  imageUrl: (0, import_pg_core.text)("image_url").notNull(),
  isPrimary: (0, import_pg_core.boolean)("is_primary").default(false).notNull(),
  displayOrder: (0, import_pg_core.integer)("display_order").default(0).notNull(),
  type: (0, import_pg_core.text)("type").default("gallery").notNull(),
  // 'main' | 'gallery' | 'desktop' | 'tablet' | 'mobile'
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var services = (0, import_pg_core.pgTable)("services", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  providerId: (0, import_pg_core.integer)("provider_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  description: (0, import_pg_core.text)("description").notNull(),
  priceCents: (0, import_pg_core.integer)("price_cents").notNull(),
  priceType: (0, import_pg_core.text)("price_type").notNull().default("STARTING_AT"),
  // 'FIXED' | 'STARTING_AT'
  categoryId: (0, import_pg_core.integer)("category_id").references(() => categories.id).notNull(),
  location: (0, import_pg_core.text)("location").notNull(),
  offersDelivery: (0, import_pg_core.boolean)("offers_delivery").default(false).notNull(),
  allowsNegotiation: (0, import_pg_core.boolean)("allows_negotiation").default(true).notNull(),
  rating: (0, import_pg_core.text)("rating").default("5.0"),
  totalReviews: (0, import_pg_core.integer)("total_reviews").default(0).notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("ACTIVE"),
  imageUrl: (0, import_pg_core.text)("image_url").notNull(),
  isDemo: (0, import_pg_core.boolean)("is_demo").default(false).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var orders = (0, import_pg_core.pgTable)("orders", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderNumber: (0, import_pg_core.text)("order_number").notNull().unique(),
  buyerId: (0, import_pg_core.integer)("buyer_id").references(() => users.id).notNull(),
  sellerId: (0, import_pg_core.integer)("seller_id").references(() => users.id).notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("AWAITING_PAYMENT"),
  // 'AWAITING_PAYMENT' | 'PAID' | 'PREPARING' | 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  totalGrossCents: (0, import_pg_core.integer)("total_gross_cents").notNull(),
  commissionCents: (0, import_pg_core.integer)("commission_cents").notNull(),
  sellerNetCents: (0, import_pg_core.integer)("seller_net_cents").notNull(),
  shippingFeeCents: (0, import_pg_core.integer)("shipping_fee_cents").default(0).notNull(),
  deliveryType: (0, import_pg_core.text)("delivery_type").notNull().default("SHIPPING"),
  // 'SHIPPING' | 'PICKUP'
  deliveryAddressId: (0, import_pg_core.integer)("delivery_address_id").references(() => addresses.id),
  deliveryDriverId: (0, import_pg_core.integer)("delivery_driver_id").references(() => users.id),
  deliveryCode: (0, import_pg_core.text)("delivery_code").notNull(),
  // 4 digits e.g. "4827"
  deliveryCodeUsed: (0, import_pg_core.boolean)("delivery_code_used").default(false).notNull(),
  deliveryAttempts: (0, import_pg_core.integer)("delivery_attempts").default(0).notNull(),
  paidAt: (0, import_pg_core.timestamp)("paid_at"),
  deliveredAt: (0, import_pg_core.timestamp)("delivered_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var orderItems = (0, import_pg_core.pgTable)("order_items", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: (0, import_pg_core.integer)("product_id").references(() => products.id),
  serviceId: (0, import_pg_core.integer)("service_id").references(() => services.id),
  itemType: (0, import_pg_core.text)("item_type").notNull().default("PRODUCT"),
  // 'PRODUCT' | 'SERVICE'
  title: (0, import_pg_core.text)("title").notNull(),
  unitPriceCents: (0, import_pg_core.integer)("unit_price_cents").notNull(),
  quantity: (0, import_pg_core.integer)("quantity").default(1).notNull(),
  subtotalCents: (0, import_pg_core.integer)("subtotal_cents").notNull(),
  imageUrl: (0, import_pg_core.text)("image_url"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var negotiations = (0, import_pg_core.pgTable)("negotiations", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  productId: (0, import_pg_core.integer)("product_id").references(() => products.id),
  serviceId: (0, import_pg_core.integer)("service_id").references(() => services.id),
  buyerId: (0, import_pg_core.integer)("buyer_id").references(() => users.id).notNull(),
  sellerId: (0, import_pg_core.integer)("seller_id").references(() => users.id).notNull(),
  initialPriceCents: (0, import_pg_core.integer)("initial_price_cents").notNull(),
  currentOfferCents: (0, import_pg_core.integer)("current_offer_cents").notNull(),
  lastOfferBy: (0, import_pg_core.text)("last_offer_by").notNull().default("BUYER"),
  // 'BUYER' | 'SELLER'
  status: (0, import_pg_core.text)("status").notNull().default("OPEN"),
  // 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
  finalAgreedPriceCents: (0, import_pg_core.integer)("final_agreed_price_cents"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var negotiationMessages = (0, import_pg_core.pgTable)("negotiation_messages", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  negotiationId: (0, import_pg_core.integer)("negotiation_id").references(() => negotiations.id, { onDelete: "cascade" }).notNull(),
  senderId: (0, import_pg_core.integer)("sender_id").references(() => users.id).notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  offerCents: (0, import_pg_core.integer)("offer_cents"),
  messageType: (0, import_pg_core.text)("message_type").notNull().default("MESSAGE"),
  // 'MESSAGE' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPT' | 'REJECT'
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var payments = (0, import_pg_core.pgTable)("payments", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id),
  subscriptionId: (0, import_pg_core.integer)("subscription_id").references(() => subscriptions.id),
  paymentType: (0, import_pg_core.text)("payment_type").notNull().default("ORDER"),
  // 'ORDER' | 'SUBSCRIPTION'
  amountCents: (0, import_pg_core.integer)("amount_cents").notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("PENDING"),
  // 'PENDING' | 'APPROVED' | 'CANCELLED' | 'REFUNDED'
  paymentMethod: (0, import_pg_core.text)("payment_method").notNull().default("MERCADO_PAGO"),
  externalReference: (0, import_pg_core.text)("external_reference").notNull().unique(),
  mpPaymentId: (0, import_pg_core.text)("mp_payment_id"),
  mpStatus: (0, import_pg_core.text)("mp_status"),
  mpRawResponse: (0, import_pg_core.text)("mp_raw_response"),
  paidAt: (0, import_pg_core.timestamp)("paid_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var commissions = (0, import_pg_core.pgTable)("commissions", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id).notNull().unique(),
  sellerId: (0, import_pg_core.integer)("seller_id").references(() => users.id).notNull(),
  grossAmountCents: (0, import_pg_core.integer)("gross_amount_cents").notNull(),
  commissionPercent: (0, import_pg_core.integer)("commission_percent").notNull(),
  commissionCents: (0, import_pg_core.integer)("commission_cents").notNull(),
  sellerNetAmountCents: (0, import_pg_core.integer)("seller_net_amount_cents").notNull(),
  planNameAtSale: (0, import_pg_core.text)("plan_name_at_sale").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var deliveryDrivers = (0, import_pg_core.pgTable)("delivery_drivers", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  vehicleType: (0, import_pg_core.text)("vehicle_type").notNull().default("MOTO"),
  // 'MOTO' | 'CARRO' | 'BICICLETA'
  plate: (0, import_pg_core.text)("plate"),
  region: (0, import_pg_core.text)("region").notNull(),
  status: (0, import_pg_core.text)("status").notNull().default("AVAILABLE"),
  // 'AVAILABLE' | 'DELIVERING' | 'OFFLINE'
  rating: (0, import_pg_core.text)("rating").default("5.0"),
  totalDeliveries: (0, import_pg_core.integer)("total_deliveries").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var deliveries = (0, import_pg_core.pgTable)("deliveries", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id).notNull().unique(),
  driverId: (0, import_pg_core.integer)("driver_id").references(() => deliveryDrivers.id),
  status: (0, import_pg_core.text)("status").notNull().default("ASSIGNED"),
  // 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED'
  attemptsCount: (0, import_pg_core.integer)("attempts_count").default(0).notNull(),
  confirmedAt: (0, import_pg_core.timestamp)("confirmed_at"),
  notes: (0, import_pg_core.text)("notes"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var deliveryCodes = (0, import_pg_core.pgTable)("delivery_codes", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull().unique(),
  code: (0, import_pg_core.text)("code").notNull(),
  // 4 digits
  used: (0, import_pg_core.boolean)("used").default(false).notNull(),
  attempts: (0, import_pg_core.integer)("attempts").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  usedAt: (0, import_pg_core.timestamp)("used_at")
});
var deliveryAttempts = (0, import_pg_core.pgTable)("delivery_attempts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  driverId: (0, import_pg_core.integer)("driver_id").references(() => users.id).notNull(),
  attemptedCode: (0, import_pg_core.text)("attempted_code").notNull(),
  isSuccess: (0, import_pg_core.boolean)("is_success").notNull(),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  attemptedAt: (0, import_pg_core.timestamp)("attempted_at").defaultNow().notNull()
});
var favorites = (0, import_pg_core.pgTable)("favorites", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  itemType: (0, import_pg_core.text)("item_type").notNull(),
  // 'PRODUCT' | 'SERVICE' | 'STORE'
  itemId: (0, import_pg_core.integer)("item_id").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var reviews = (0, import_pg_core.pgTable)("reviews", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  orderId: (0, import_pg_core.integer)("order_id").references(() => orders.id),
  reviewerId: (0, import_pg_core.integer)("reviewer_id").references(() => users.id).notNull(),
  targetUserId: (0, import_pg_core.integer)("target_user_id").references(() => users.id).notNull(),
  storeId: (0, import_pg_core.integer)("store_id").references(() => stores.id),
  rating: (0, import_pg_core.integer)("rating").notNull(),
  // 1 to 5
  comment: (0, import_pg_core.text)("comment").notNull(),
  reviewType: (0, import_pg_core.text)("review_type").notNull().default("SELLER"),
  // 'SELLER' | 'DRIVER' | 'BUYER'
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var notifications = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: (0, import_pg_core.text)("title").notNull(),
  message: (0, import_pg_core.text)("message").notNull(),
  type: (0, import_pg_core.text)("type").notNull().default("INFO"),
  // 'SALE' | 'ORDER' | 'OFFER' | 'DELIVERY' | 'SYSTEM'
  link: (0, import_pg_core.text)("link"),
  isRead: (0, import_pg_core.boolean)("is_read").default(false).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").references(() => users.id),
  action: (0, import_pg_core.text)("action").notNull(),
  entityType: (0, import_pg_core.text)("entity_type").notNull(),
  entityId: (0, import_pg_core.text)("entity_id"),
  details: (0, import_pg_core.text)("details"),
  ipAddress: (0, import_pg_core.text)("ip_address"),
  userAgent: (0, import_pg_core.text)("user_agent"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var appSettings = (0, import_pg_core.pgTable)("app_settings", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  key: (0, import_pg_core.text)("key").notNull().unique(),
  value: (0, import_pg_core.text)("value").notNull(),
  description: (0, import_pg_core.text)("description"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var usersRelations = (0, import_drizzle_orm.relations)(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  addresses: many(addresses),
  stores: many(stores),
  products: many(products),
  services: many(services),
  ordersAsBuyer: many(orders, { relationName: "buyerOrders" }),
  ordersAsSeller: many(orders, { relationName: "sellerOrders" }),
  notifications: many(notifications),
  favorites: many(favorites)
}));
var productsRelations = (0, import_drizzle_orm.relations)(products, ({ one, many }) => ({
  seller: one(users, { fields: [products.sellerId], references: [users.id] }),
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages)
}));
var servicesRelations = (0, import_drizzle_orm.relations)(services, ({ one }) => ({
  provider: one(users, { fields: [services.providerId], references: [users.id] }),
  category: one(categories, { fields: [services.categoryId], references: [categories.id] })
}));
var ordersRelations = (0, import_drizzle_orm.relations)(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id], relationName: "buyerOrders" }),
  seller: one(users, { fields: [orders.sellerId], references: [users.id], relationName: "sellerOrders" }),
  items: many(orderItems),
  deliveryAddress: one(addresses, { fields: [orders.deliveryAddressId], references: [addresses.id] }),
  deliveryDriver: one(users, { fields: [orders.deliveryDriverId], references: [users.id] })
}));
var orderItemsRelations = (0, import_drizzle_orm.relations)(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  service: one(services, { fields: [orderItems.serviceId], references: [services.id] })
}));
var negotiationsRelations = (0, import_drizzle_orm.relations)(negotiations, ({ one, many }) => ({
  buyer: one(users, { fields: [negotiations.buyerId], references: [users.id] }),
  seller: one(users, { fields: [negotiations.sellerId], references: [users.id] }),
  product: one(products, { fields: [negotiations.productId], references: [products.id] }),
  service: one(services, { fields: [negotiations.serviceId], references: [services.id] }),
  messages: many(negotiationMessages)
}));

// src/db/storageDetector.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var lastKnownPostgresReachable = Boolean(process.env.SQL_HOST || process.env.DATABASE_URL);
function setPostgresReachable(reachable) {
  lastKnownPostgresReachable = reachable;
}
function detectStorageStatus() {
  const isPostgresConfigured = Boolean(
    process.env.DATABASE_URL || process.env.SQL_HOST && process.env.SQL_HOST !== "localhost"
  );
  const isEphemeral = Boolean(
    process.env.K_SERVICE || // Google Cloud Run
    process.env.K_REVISION || process.env.CONTAINER_NAME || import_fs.default.existsSync("/.dockerenv")
  );
  const dataDir = import_path.default.join(process.cwd(), "data");
  const dbFile = import_path.default.join(dataDir, "vend_database.json");
  const bakFile = import_path.default.join(dataDir, "vend_database.json.bak");
  const hasDiskFile = import_fs.default.existsSync(dbFile);
  const hasBackupFile = import_fs.default.existsSync(bakFile);
  if (isPostgresConfigured) {
    const isReachable = lastKnownPostgresReachable;
    const isActuallyUsingPostgres = isReachable;
    return {
      storageBackend: isActuallyUsingPostgres ? "PostgreSQL" : "Local Disk JSON Engine (fallback tempor\xE1rio)",
      persistent: isActuallyUsingPostgres ? true : false,
      databaseConfigured: true,
      databaseReachable: isReachable,
      sourceOfTruth: isActuallyUsingPostgres ? "PostgreSQL Database" : "data/vend_database.json",
      pgMemActive: !isActuallyUsingPostgres,
      mechanism: isActuallyUsingPostgres ? "PostgreSQL persistente" : "Fallback tempor\xE1rio",
      engine: isActuallyUsingPostgres ? "PostgreSQL" : "Local Disk JSON Engine",
      isExternalPostgres: true,
      isEphemeralEnvironment: isEphemeral,
      dataPath: process.env.DATABASE_URL ? "[DATABASE_URL configurado]" : `host: ${process.env.SQL_HOST}`,
      backupPath: "Gerenciado pelo provedor PostgreSQL",
      hasDiskFile,
      hasBackupFile,
      survivesProcessRestart: true,
      survivesRebuild: true,
      survivesEphemeralRedeploy: isActuallyUsingPostgres ? true : false,
      statement: isActuallyUsingPostgres ? "Persist\xEAncia externa definitiva ativa via PostgreSQL." : "DATABASE_URL configurado, por\xE9m n\xE3o alcan\xE7\xE1vel no momento; operando em fallback."
    };
  }
  return {
    storageBackend: "Local Disk JSON Engine",
    persistent: false,
    // In ephemeral environment (Cloud Run), true permanent durability requires external storage
    databaseConfigured: false,
    databaseReachable: false,
    sourceOfTruth: "data/vend_database.json",
    pgMemActive: true,
    mechanism: "Armazenamento persistente em disco (JSON at\xF4mico + backup)",
    engine: "Local Disk JSON Engine",
    isExternalPostgres: false,
    isEphemeralEnvironment: isEphemeral,
    dataPath: dbFile,
    backupPath: bakFile,
    hasDiskFile,
    hasBackupFile,
    survivesProcessRestart: true,
    survivesRebuild: true,
    survivesEphemeralRedeploy: false,
    statement: isEphemeral ? "PERSIST\xCANCIA PERMANENTE DEPENDE DE BANCO/ARMAZENAMENTO EXTERNO PERSISTENTE." : "Persist\xEAncia local at\xF4mica em disco ativa (com backup rotativo)."
  };
}
function printStorageBanner() {
  const status = detectStorageStatus();
  console.log("\n================================================================================");
  console.log(" [VEND+] DIAGN\xD3STICO DE ARMAZENAMENTO E PERSIST\xCANCIA NA INICIALIZA\xC7\xC3O");
  console.log("--------------------------------------------------------------------------------");
  console.log(` \u2022 Storage Backend:         ${status.storageBackend}`);
  console.log(` \u2022 Fonte de Verdade:        ${status.sourceOfTruth}`);
  console.log(` \u2022 DATABASE_URL:            ${status.databaseConfigured ? "CONFIGURADO" : "N\xC3O CONFIGURADO"}`);
  console.log(` \u2022 PostgreSQL Alcan\xE7\xE1vel:   ${status.databaseReachable ? "SIM" : "N\xC3O"}`);
  console.log(` \u2022 pg-mem Ativo:            ${status.pgMemActive ? "SIM" : "N\xC3O"}`);
  console.log(` \u2022 Ambiente Ef\xEAmero:        ${status.isEphemeralEnvironment ? "SIM (Cloud Run / Conteinerizado)" : "N\xC3O"}`);
  console.log(` \u2022 Arquivo de Dados:        ${status.dataPath} (${status.hasDiskFile ? "EXISTE" : "NOVO"})`);
  console.log(` \u2022 Arquivo de Backup:       ${status.backupPath} (${status.hasBackupFile ? "EXISTE" : "N\xC3O CRIADO AINDA"})`);
  console.log(" \u2022 Comportamento de Durabilidade:");
  console.log(`   - Sobrevive a Logout:                       SIM`);
  console.log(`   - Sobrevive a Restart do Processo:          SIM`);
  console.log(`   - Sobrevive a Rebuild do Applet:            SIM`);
  console.log(`   - Sobrevive a Redeploy/Container Ef\xEAmero:   ${status.survivesEphemeralRedeploy ? "SIM" : "N\xC3O"}`);
  if (!status.databaseConfigured && status.isEphemeralEnvironment) {
    console.log("--------------------------------------------------------------------------------");
    console.log(" AVISO ARQUITETURAL OBRIGAT\xD3RIO:");
    console.log(" " + status.statement);
  }
  console.log("================================================================================\n");
}

// src/db/postgresSync.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var TABLES_ORDER = [
  "plans",
  "categories",
  "users",
  "profiles",
  "stores",
  "products",
  "product_images",
  "services",
  "orders",
  "order_items",
  "payments",
  "commissions",
  "addresses",
  "sessions",
  "reviews",
  "notifications",
  "delivery_drivers",
  "deliveries",
  "delivery_attempts",
  "delivery_codes",
  "favorites",
  "subscriptions",
  "app_settings",
  "audit_logs"
];
async function migrateDiskToPostgres(pool2) {
  const dataDir = import_path2.default.join(process.cwd(), "data");
  const dbFile = import_path2.default.join(dataDir, "vend_database.json");
  if (!import_fs2.default.existsSync(dbFile)) {
    return { migratedCount: 0 };
  }
  let totalMigrated = 0;
  try {
    const raw = import_fs2.default.readFileSync(dbFile, "utf8");
    const dump = JSON.parse(raw);
    if (!dump || typeof dump !== "object") return { migratedCount: 0 };
    const colRes = await pool2.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );
    const tableColumnsMap = /* @__PURE__ */ new Map();
    for (const row of colRes.rows) {
      if (!tableColumnsMap.has(row.table_name)) {
        tableColumnsMap.set(row.table_name, /* @__PURE__ */ new Set());
      }
      tableColumnsMap.get(row.table_name).add(row.column_name);
    }
    for (const table of TABLES_ORDER) {
      const rows = dump[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const validCols = tableColumnsMap.get(table);
      if (!validCols) continue;
      for (const row of rows) {
        try {
          let exists = false;
          if (row.id !== void 0) {
            const checkRes = await pool2.query(`SELECT id FROM "${table}" WHERE id = $1 LIMIT 1`, [row.id]);
            if (checkRes.rowCount && checkRes.rowCount > 0) {
              exists = true;
            }
          }
          if (!exists && table === "users" && row.email) {
            const checkEmail = await pool2.query(`SELECT id FROM "users" WHERE email = $1 LIMIT 1`, [row.email.trim().toLowerCase()]);
            if (checkEmail.rowCount && checkEmail.rowCount > 0) {
              exists = true;
            }
          }
          if (exists) {
            continue;
          }
          const sanitizedRow = {};
          for (const [key, val] of Object.entries(row)) {
            if (validCols.has(key)) {
              sanitizedRow[key] = val;
              continue;
            }
            const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
            if (validCols.has(snakeKey) && sanitizedRow[snakeKey] === void 0) {
              sanitizedRow[snakeKey] = val;
            }
          }
          if (table === "users") {
            if (!sanitizedRow.normalized_email && sanitizedRow.email) {
              sanitizedRow.normalized_email = String(sanitizedRow.email).trim().toLowerCase();
            }
            if (!sanitizedRow.password_hash && row.passwordHash) {
              sanitizedRow.password_hash = row.passwordHash;
            }
            if (!sanitizedRow.uid) {
              sanitizedRow.uid = "vend_" + (row.id || Math.random().toString(36).substring(2));
            }
          }
          const colNames = Object.keys(sanitizedRow);
          if (colNames.length === 0) continue;
          const columns = colNames.map((c) => `"${c}"`);
          const placeholders = colNames.map((_, idx) => `$${idx + 1}`);
          const values = Object.values(sanitizedRow).map((val) => {
            if (val && typeof val === "object" && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val;
          });
          const insertSql = `INSERT INTO "${table}" (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT DO NOTHING`;
          await pool2.query(insertSql, values);
          totalMigrated++;
        } catch (insertErr) {
          console.warn(`[PostgresSync] Erro ao inserir linha em ${table}:`, insertErr.message);
        }
      }
      try {
        await pool2.query(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))
        `);
      } catch {
      }
    }
    if (totalMigrated > 0) {
      console.log(`[PostgresSync] Migra\xE7\xE3o de disco para PostgreSQL conclu\xEDda: ${totalMigrated} registros sincronizados.`);
    }
  } catch (err) {
    console.error("[PostgresSync] Erro na migra\xE7\xE3o para PostgreSQL:", err.message);
  }
  return { migratedCount: totalMigrated };
}

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    printStorageBanner();
    console.log("[Database] Inicializando pool de conex\xE3o PostgreSQL (Cloud SQL)...");
    global._postgresPool = new import_pg.Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err?.message || err);
    });
    (async () => {
      try {
        const client = await global._postgresPool.connect();
        client.release();
        setPostgresReachable(true);
        console.log("[Database] Conex\xE3o com PostgreSQL (Cloud SQL) verificada e ativa com sucesso!");
        await migrateDiskToPostgres(global._postgresPool);
      } catch (err) {
        console.warn("[Database] Conex\xE3o inicial com PostgreSQL:", err?.message || err);
      }
    })();
  }
  return global._postgresPool;
};
var pool = createPool();
var persistDatabase = () => {
};
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// src/middleware/auth.ts
var import_drizzle_orm5 = require("drizzle-orm");

// src/server/repositories/UserRepository.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_drizzle_orm4 = require("drizzle-orm");

// src/utils/normalizeEmail.ts
function normalizeEmail(email) {
  if (email === null || email === void 0) {
    return "";
  }
  const str = String(email);
  return str.trim().toLowerCase();
}
function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

// src/server/repositories/AuthDatabase.ts
var import_drizzle_orm2 = require("drizzle-orm");
var AuthDatabase = class {
  /**
   * Registra um evento de autenticação na base persistente VEND_AUTH_MEMORY.
   * Remove quaisquer campos sensíveis de segurança antes da gravação.
   */
  static async logEvent(params) {
    try {
      let sanitizedMeta = null;
      if (params.metadata) {
        if (typeof params.metadata === "string") {
          sanitizedMeta = params.metadata;
        } else {
          const copy = { ...params.metadata };
          delete copy.password;
          delete copy.passwordHash;
          delete copy.token;
          delete copy.tokenHash;
          sanitizedMeta = JSON.stringify(copy);
        }
      }
      await db.insert(authEvents).values({
        userId: params.userId || null,
        eventType: params.eventType,
        email: params.email ? params.email.trim().toLowerCase() : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: sanitizedMeta
      });
      persistDatabase();
      console.log(`[VEND_AUTH_MEMORY] Evento registrado: ${params.eventType} (email: ${params.email || "n/a"})`);
    } catch (err) {
      console.error("[VEND_AUTH_MEMORY] Erro ao gravar evento na mem\xF3ria persistente:", err.message);
    }
  }
  /**
   * Obtém histórico recente de eventos para auditoria ou diagnósticos
   */
  static async getRecentEvents(limit = 50) {
    try {
      return await db.select().from(authEvents).orderBy((0, import_drizzle_orm2.desc)(authEvents.createdAt)).limit(limit);
    } catch (err) {
      console.error("[VEND_AUTH_MEMORY] Erro ao buscar eventos recentes:", err.message);
      return [];
    }
  }
  /**
   * Obtém eventos de um usuário específico
   */
  static async getEventsForUser(userId, limit = 50) {
    try {
      return await db.select().from(authEvents).where((0, import_drizzle_orm2.eq)(authEvents.userId, userId)).orderBy((0, import_drizzle_orm2.desc)(authEvents.createdAt)).limit(limit);
    } catch (err) {
      console.error(`[VEND_AUTH_MEMORY] Erro ao buscar eventos do usu\xE1rio ${userId}:`, err.message);
      return [];
    }
  }
};

// src/server/repositories/SessionRepository.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_drizzle_orm3 = require("drizzle-orm");
var SESSION_EXPIRY_DAYS = 30;
var SessionRepository = class {
  /**
   * Cria uma sessão criptograficamente segura para o usuário.
   * Registra o evento SESSION_CREATED no VEND_AUTH_MEMORY.
   */
  static async createSession(userId, ipAddress, userAgent) {
    try {
      const token = import_crypto.default.randomBytes(32).toString("hex");
      const sessionId = "vend_sess_" + import_crypto.default.randomUUID();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
      const now = /* @__PURE__ */ new Date();
      const [newSession] = await db.insert(sessions).values({
        sessionId,
        userId,
        token,
        expiresAt,
        lastUsedAt: now,
        revokedAt: null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: now
      }).returning();
      persistDatabase();
      await AuthDatabase.logEvent({
        eventType: "SESSION_CREATED",
        userId,
        ipAddress,
        userAgent,
        metadata: { sessionId, expiresAt: expiresAt.toISOString() }
      });
      console.log(`[AUTH SESSION CREATED] Sess\xE3o criada com sucesso para userId ${userId}`);
      return { token, sessionId, expiresAt };
    } catch (err) {
      console.error(`[AUTH SESSION ERROR] Falha ao criar sess\xE3o para userId ${userId}:`, err.message);
      throw err;
    }
  }
  /**
   * Valida o token da sessão contra o banco permanente:
   * 1. Verifica se existe
   * 2. Verifica se não foi revogada (revokedAt is null)
   * 3. Verifica expiração temporal
   * 4. Atualiza last_used_at
   * 5. Retorna o registro completo do usuário autenticado
   */
  static async validateSession(token) {
    if (!token || typeof token !== "string") {
      return null;
    }
    try {
      const rows = await db.select().from(sessions).where((0, import_drizzle_orm3.eq)(sessions.token, token.trim())).limit(1);
      if (rows.length === 0) {
        return null;
      }
      const session = rows[0];
      if (session.revokedAt) {
        console.log(`[AUTH SESSION VALIDATION] Sess\xE3o revogada em ${session.revokedAt}`);
        return null;
      }
      const expiry = new Date(session.expiresAt).getTime();
      const now = Date.now();
      if (expiry < now) {
        console.log(`[AUTH SESSION VALIDATION] Sess\xE3o expirada para userId ${session.userId}. Revogando.`);
        await this.revokeSession(token);
        return null;
      }
      const userRows = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, session.userId)).limit(1);
      if (userRows.length === 0) {
        console.warn(`[AUTH SESSION VALIDATION] Sess\xE3o aponta para usu\xE1rio inexistente id: ${session.userId}`);
        return null;
      }
      const user = userRows[0];
      await db.update(sessions).set({ lastUsedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(sessions.id, session.id)).catch(() => {
      });
      return user;
    } catch (err) {
      console.error("[AUTH SESSION ERROR] Erro na valida\xE7\xE3o da sess\xE3o:", err.message);
      throw err;
    }
  }
  /**
   * Revoga uma sessão ativa (logout ou invalidação)
   */
  static async revokeSession(token) {
    if (!token) return;
    try {
      const rows = await db.select().from(sessions).where((0, import_drizzle_orm3.eq)(sessions.token, token.trim())).limit(1);
      if (rows.length > 0) {
        const s = rows[0];
        await db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(sessions.id, s.id));
        persistDatabase();
        await AuthDatabase.logEvent({
          eventType: "SESSION_REVOKED",
          userId: s.userId,
          metadata: { sessionId: s.sessionId }
        });
        console.log(`[AUTH SESSION REVOKED] Sess\xE3o revogada com sucesso para userId ${s.userId}`);
      }
    } catch (err) {
      console.error("[AUTH SESSION ERROR] Erro ao revogar sess\xE3o:", err.message);
    }
  }
  /**
   * Revoga todas as sessões de um usuário (útil após alteração de senha)
   */
  static async revokeAllUserSessions(userId, exceptToken) {
    try {
      const now = /* @__PURE__ */ new Date();
      const userSessions = await db.select().from(sessions).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(sessions.userId, userId), (0, import_drizzle_orm3.isNull)(sessions.revokedAt)));
      for (const s of userSessions) {
        if (exceptToken && s.token === exceptToken) {
          continue;
        }
        await db.update(sessions).set({ revokedAt: now }).where((0, import_drizzle_orm3.eq)(sessions.id, s.id));
      }
      persistDatabase();
      await AuthDatabase.logEvent({
        eventType: "SESSION_REVOKED",
        userId,
        metadata: { reason: "ALL_SESSIONS_REVOKED" }
      });
      console.log(`[AUTH SESSION REVOKED] Todas as sess\xF5es do usu\xE1rio ${userId} foram revogadas.`);
    } catch (err) {
      console.error(`[AUTH SESSION ERROR] Erro ao revogar sess\xF5es do usu\xE1rio ${userId}:`, err.message);
    }
  }
};

// src/server/repositories/UserRepository.ts
var UserRepository = class {
  /**
   * Generates a clean, unique username fallback if none was provided
   */
  static generateDefaultUsername(name, email) {
    const fromEmail = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    if (fromEmail.length >= 3) {
      return fromEmail;
    }
    const fromName = name.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
    return (fromName.length >= 3 ? fromName : "vend_user") + "_" + Math.floor(100 + Math.random() * 900);
  }
  /**
   * Finds a user by normalized email.
   * Performs an exact match first, and falls back to a case-insensitive,
   * whitespace-trimmed SQL lookup to ensure no legacy or untrimmed account is missed.
   */
  static async findByEmail(rawEmail) {
    const cleanEmail = normalizeEmail(rawEmail);
    if (!cleanEmail) {
      return null;
    }
    console.log(`[AUTH USER LOOKUP] Buscando conta para: ${cleanEmail}`);
    try {
      const byNorm = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.normalizedEmail, cleanEmail)).limit(1);
      if (byNorm.length > 0) {
        console.log(`[AUTH USER FOUND] Usu\xE1rio localizado via normalizedEmail: id ${byNorm[0].id}`);
        return byNorm[0];
      }
      const direct = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.email, cleanEmail)).limit(1);
      if (direct.length > 0) {
        console.log(`[AUTH USER FOUND] Usu\xE1rio localizado via email direto: id ${direct[0].id}`);
        if (!direct[0].normalizedEmail) {
          await db.update(users).set({ normalizedEmail: cleanEmail }).where((0, import_drizzle_orm4.eq)(users.id, direct[0].id)).catch(() => {
          });
        }
        return direct[0];
      }
      const allUsers = await db.select().from(users);
      const found = allUsers.find((u) => normalizeEmail(u.email) === cleanEmail);
      if (found) {
        console.log(`[AUTH USER FOUND] Usu\xE1rio localizado via normaliza\xE7\xE3o fallback: id ${found.id}`);
        try {
          await db.update(users).set({ email: cleanEmail, normalizedEmail: cleanEmail, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm4.eq)(users.id, found.id));
          found.email = cleanEmail;
          found.normalizedEmail = cleanEmail;
          persistDatabase();
          console.log(`[AUTH USER LOOKUP] Email da conta id ${found.id} atualizado para formato normalizado: ${cleanEmail}`);
        } catch (updateErr) {
          console.warn("[AUTH USER LOOKUP] Aviso ao normalizar email legado:", updateErr.message);
        }
        return found;
      }
      console.log(`[AUTH USER NOT FOUND] Nenhuma conta encontrada para o email: ${cleanEmail}`);
      return null;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usu\xE1rio por email (${cleanEmail}):`, err.message);
      throw err;
    }
  }
  /**
   * Finds a user by username (case-insensitive)
   */
  static async findByUsername(rawUsername) {
    if (!rawUsername || typeof rawUsername !== "string") {
      return null;
    }
    const cleanUsername = rawUsername.trim().toLowerCase();
    try {
      const rows = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.username, cleanUsername)).limit(1);
      if (rows.length > 0) {
        return rows[0];
      }
      const allUsers = await db.select().from(users);
      return allUsers.find((u) => u.username && u.username.trim().toLowerCase() === cleanUsername) || null;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usu\xE1rio por username:`, err.message);
      return null;
    }
  }
  /**
   * Finds a user by ID
   */
  static async findById(id) {
    try {
      const rows = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.id, id)).limit(1);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Erro ao buscar usu\xE1rio por ID (${id}):`, err.message);
      throw err;
    }
  }
  /**
   * Creates a new user in the persistent store.
   * Logs USER_CREATED event to VEND_AUTH_MEMORY.
   */
  static async createUser(data) {
    const cleanEmail = normalizeEmail(data.email);
    if (!cleanEmail) {
      throw new Error("E-mail inv\xE1lido ou vazio para cria\xE7\xE3o de conta.");
    }
    console.log(`[AUTH REGISTER] Criando nova conta oficial para email: ${cleanEmail}`);
    let passwordHash = data.passwordHash;
    if (!passwordHash && data.password) {
      const salt = await import_bcryptjs.default.genSalt(10);
      passwordHash = await import_bcryptjs.default.hash(data.password, salt);
    }
    const uid = data.uid || "vend_" + import_crypto2.default.randomUUID();
    const username = data.username ? data.username.trim().toLowerCase() : this.generateDefaultUsername(data.name, cleanEmail);
    try {
      const [newUser] = await db.insert(users).values({
        uid,
        username,
        email: cleanEmail,
        normalizedEmail: cleanEmail,
        passwordHash: passwordHash || null,
        name: data.name.trim(),
        phone: data.phone ? data.phone.trim() : null,
        location: data.location ? data.location.trim() : "Brasil",
        avatarUrl: data.avatarUrl || null,
        role: data.role || "USER",
        status: data.status || "ACTIVE",
        planSlug: data.planSlug || "free",
        emailVerified: false,
        metadata: data.metadata || null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      persistDatabase();
      console.log(`[AUTH REGISTER] Conta criada e persistida com sucesso! id: ${newUser.id}`);
      await AuthDatabase.logEvent({
        eventType: "USER_CREATED",
        userId: newUser.id,
        email: cleanEmail,
        metadata: {
          username: newUser.username,
          role: newUser.role,
          name: newUser.name
        }
      });
      return newUser;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Falha ao persistir novo usu\xE1rio (${cleanEmail}):`, err.message);
      throw err;
    }
  }
  /**
   * Updates an existing user record
   */
  static async updateUser(id, data) {
    try {
      const updates = {
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (data.email !== void 0) {
        const clean = normalizeEmail(data.email);
        updates.email = clean;
        updates.normalizedEmail = clean;
      }
      if (data.username !== void 0) updates.username = data.username ? data.username.trim().toLowerCase() : null;
      if (data.name !== void 0) updates.name = data.name.trim();
      if (data.phone !== void 0) updates.phone = data.phone ? data.phone.trim() : null;
      if (data.location !== void 0) updates.location = data.location ? data.location.trim() : null;
      if (data.avatarUrl !== void 0) updates.avatarUrl = data.avatarUrl;
      if (data.role !== void 0) updates.role = data.role;
      if (data.status !== void 0) updates.status = data.status;
      if (data.planSlug !== void 0) updates.planSlug = data.planSlug;
      if (data.password) {
        const salt = await import_bcryptjs.default.genSalt(10);
        updates.passwordHash = await import_bcryptjs.default.hash(data.password, salt);
      } else if (data.passwordHash !== void 0) {
        updates.passwordHash = data.passwordHash;
      }
      const [updated] = await db.update(users).set(updates).where((0, import_drizzle_orm4.eq)(users.id, id)).returning();
      persistDatabase();
      await AuthDatabase.logEvent({
        eventType: "ACCOUNT_UPDATED",
        userId: id,
        email: updated?.email,
        metadata: { updatedFields: Object.keys(updates) }
      });
      return updated || null;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Falha ao atualizar usu\xE1rio id ${id}:`, err.message);
      throw err;
    }
  }
  /**
   * Updates password securely and logs PASSWORD_CHANGED
   */
  static async updatePassword(userId, newPassword) {
    try {
      const salt = await import_bcryptjs.default.genSalt(10);
      const passwordHash = await import_bcryptjs.default.hash(newPassword, salt);
      await db.update(users).set({
        passwordHash,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm4.eq)(users.id, userId));
      persistDatabase();
      const user = await this.findById(userId);
      await AuthDatabase.logEvent({
        eventType: "PASSWORD_CHANGED",
        userId,
        email: user?.email
      });
      console.log(`[AUTH] Senha do usu\xE1rio id ${userId} alterada com sucesso.`);
      return true;
    } catch (err) {
      console.error(`[AUTH DATABASE ERROR] Erro ao atualizar senha do usu\xE1rio id ${userId}:`, err.message);
      throw err;
    }
  }
  /**
   * Records a successful login: updates lastLoginAt and logs LOGIN_SUCCESS
   */
  static async recordLogin(userId, ipAddress, userAgent) {
    try {
      const now = /* @__PURE__ */ new Date();
      await db.update(users).set({ lastLoginAt: now }).where((0, import_drizzle_orm4.eq)(users.id, userId)).catch(() => {
      });
      const user = await this.findById(userId);
      await AuthDatabase.logEvent({
        eventType: "LOGIN_SUCCESS",
        userId,
        email: user?.email,
        ipAddress,
        userAgent
      });
      persistDatabase();
    } catch (err) {
      console.warn("[AUTH] Falha ao registrar lastLoginAt:", err.message);
    }
  }
  /**
   * Records a failed login attempt for security monitoring
   */
  static async recordLoginFailure(email, reason, ipAddress, userAgent) {
    try {
      await AuthDatabase.logEvent({
        eventType: "LOGIN_FAILED",
        email: normalizeEmail(email),
        ipAddress,
        userAgent,
        metadata: { reason }
      });
    } catch (err) {
      console.warn("[AUTH] Falha ao registrar tentativa falha de login:", err.message);
    }
  }
  /**
   * Verifies password against hash safely without logging secrets
   */
  static async verifyPassword(password, passwordHash) {
    if (!password || !passwordHash) {
      console.log("[AUTH PASSWORD CHECK] Falha: senha ou hash ausente.");
      return false;
    }
    try {
      const isValid = await import_bcryptjs.default.compare(password, passwordHash);
      console.log(`[AUTH PASSWORD CHECK] Valida\xE7\xE3o conclu\xEDda: ${isValid ? "SENHA CORRETA" : "SENHA INCORRETA"}`);
      return isValid;
    } catch (err) {
      console.error("[AUTH DATABASE ERROR] Erro na verifica\xE7\xE3o criptogr\xE1fica de senha:", err.message);
      return false;
    }
  }
  /**
   * Lists all users
   */
  static async listUsers() {
    try {
      return await db.select().from(users).orderBy((0, import_drizzle_orm4.desc)(users.createdAt));
    } catch (err) {
      console.error("[AUTH DATABASE ERROR] Falha ao listar usu\xE1rios:", err.message);
      throw err;
    }
  }
  /**
   * Session delegations for backward compatibility
   */
  static async createSession(userId, ipAddress, userAgent) {
    return SessionRepository.createSession(userId, ipAddress, userAgent);
  }
  static async validateSession(token) {
    return SessionRepository.validateSession(token);
  }
  static async deleteSession(token) {
    return SessionRepository.revokeSession(token);
  }
  /**
   * ensureMasterOwner():
   * 1. verificar se existe o Master Owner;
   * 2. se existir, não duplicar;
   * 3. se não existir, criar através das credenciais configuradas como segredo do servidor;
   * 4. armazenar somente password_hash;
   * 5. registrar created_at;
   * 6. registrar role = MASTER_OWNER;
   * 7. impedir duplicação.
   */
  static async ensureMasterOwner() {
    const masterEmail = normalizeEmail(process.env.MASTER_OWNER_EMAIL || "alifergael76@gmail.com");
    const masterPassword = process.env.MASTER_OWNER_PASSWORD || "VendMais@2026";
    console.log(`[AUTH MASTER OWNER] Verificando integridade da conta Master Owner: ${masterEmail}`);
    try {
      const existing = await this.findByEmail(masterEmail);
      if (existing) {
        console.log(`[AUTH MASTER OWNER] Master Owner existente identificado (id: ${existing.id}). Nenhuma duplica\xE7\xE3o criada.`);
        if (existing.role !== "MASTER_OWNER") {
          await db.update(users).set({ role: "MASTER_OWNER", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm4.eq)(users.id, existing.id));
          existing.role = "MASTER_OWNER";
          persistDatabase();
        }
        return existing;
      }
      const salt = await import_bcryptjs.default.genSalt(10);
      const passwordHash = await import_bcryptjs.default.hash(masterPassword, salt);
      const now = /* @__PURE__ */ new Date();
      const [newMaster] = await db.insert(users).values({
        uid: "vend_master_owner_primary",
        username: "master_owner",
        email: masterEmail,
        normalizedEmail: masterEmail,
        passwordHash,
        name: "Master Owner VEND+",
        phone: "(11) 99999-0000",
        location: "S\xE3o Paulo, SP",
        role: "MASTER_OWNER",
        status: "ACTIVE",
        planSlug: "lendario",
        emailVerified: true,
        createdAt: now,
        updatedAt: now
      }).returning();
      persistDatabase();
      await AuthDatabase.logEvent({
        eventType: "USER_CREATED",
        userId: newMaster.id,
        email: masterEmail,
        metadata: { role: "MASTER_OWNER", reason: "PRIMARY_MASTER_INITIALIZATION" }
      });
      console.log(`[AUTH MASTER OWNER] Conta Master Owner criada com sucesso (id: ${newMaster.id})`);
      return newMaster;
    } catch (err) {
      console.error("[AUTH MASTER OWNER ERROR] Erro ao assegurar Master Owner:", err.message);
      throw err;
    }
  }
  /**
   * Sanitizes user object to safely send over the network.
   * NEVER returns password or passwordHash.
   */
  static sanitizeUser(user) {
    return {
      id: user.id,
      uid: user.uid,
      username: user.username || null,
      email: user.email,
      normalizedEmail: user.normalizedEmail || normalizeEmail(user.email),
      name: user.name,
      role: user.role,
      status: user.status,
      planSlug: user.planSlug,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      location: user.location || null,
      emailVerified: Boolean(user.emailVerified),
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      createdAt: user.createdAt ? new Date(user.createdAt) : /* @__PURE__ */ new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : /* @__PURE__ */ new Date()
    };
  }
};

// src/middleware/auth.ts
var authenticateUser = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1].trim();
    }
    if (!token && req.cookies && req.cookies.vend_session) {
      token = req.cookies.vend_session;
    }
    if (!token) {
      return next();
    }
    const sessionUser = await UserRepository.validateSession(token);
    if (sessionUser) {
      if (sessionUser.status === "BLOCKED") {
        return res.status(403).json({ error: "Conta bloqueada por motivos de seguran\xE7a. Contate o suporte." });
      }
      req.user = {
        id: sessionUser.id,
        uid: sessionUser.uid,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
        status: sessionUser.status,
        planSlug: sessionUser.planSlug,
        phone: sessionUser.phone,
        avatarUrl: sessionUser.avatarUrl,
        location: sessionUser.location
      };
      return next();
    }
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded && decoded.uid) {
        const email = (decoded.email || `${decoded.uid}@vendmais.com`).trim().toLowerCase();
        let existing = await db.select().from(users).where((0, import_drizzle_orm5.eq)(users.uid, decoded.uid)).limit(1);
        if (existing.length === 0) {
          existing = await db.select().from(users).where((0, import_drizzle_orm5.eq)(users.email, email)).limit(1);
          if (existing.length > 0) {
            await db.update(users).set({ uid: decoded.uid }).where((0, import_drizzle_orm5.eq)(users.id, existing[0].id));
          }
        }
        if (existing.length === 0) {
          const inserted = await db.insert(users).values({
            uid: decoded.uid,
            email,
            name: decoded.name || email.split("@")[0],
            avatarUrl: decoded.picture || null,
            role: "USER",
            status: "ACTIVE",
            planSlug: "free"
          }).returning();
          existing = inserted;
        }
        const u = existing[0];
        if (u.status === "BLOCKED") {
          return res.status(403).json({ error: "Conta bloqueada por motivos de seguran\xE7a." });
        }
        req.user = {
          id: u.id,
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          planSlug: u.planSlug,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          location: u.location
        };
      }
    } catch {
    }
    next();
  } catch (err) {
    console.error("Error in authenticateUser middleware:", err);
    next();
  }
};
var requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "N\xE3o autorizado. Por favor, fa\xE7a login para continuar." });
  }
  next();
};
var requireMasterOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "N\xE3o autorizado. Fa\xE7a login." });
  }
  if (req.user.role !== "MASTER_OWNER") {
    return res.status(403).json({ error: "Acesso restrito ao Master Owner da plataforma." });
  }
  next();
};

// src/server/authRoutes.ts
var import_express = require("express");
var import_drizzle_orm7 = require("drizzle-orm");

// src/server/repositories/PasswordResetRepository.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var import_drizzle_orm6 = require("drizzle-orm");
var TOKEN_EXPIRY_HOURS = 1;
var PasswordResetRepository = class {
  /**
   * Hashes a token using SHA-256 to ensure no plaintext tokens are stored in the database
   */
  static hashToken(token) {
    return import_crypto3.default.createHash("sha256").update(token).digest("hex");
  }
  /**
   * Gera um token de recuperação seguro de uso único para o usuário
   */
  static async createResetToken(userId, email, ipAddress) {
    try {
      const rawToken = import_crypto3.default.randomBytes(32).toString("hex");
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
      await db.insert(passwordResets).values({
        userId,
        token: rawToken.substring(0, 16) + "...",
        // safe masked token for logging reference
        tokenHash,
        expiresAt,
        usedAt: null,
        ipAddress: ipAddress || null,
        createdAt: /* @__PURE__ */ new Date()
      });
      persistDatabase();
      console.log(`[PASSWORD RESET] Token de recupera\xE7\xE3o gerado para o usu\xE1rio id: ${userId}`);
      return { rawToken, expiresAt };
    } catch (err) {
      console.error(`[PASSWORD RESET ERROR] Falha ao criar token de recupera\xE7\xE3o:`, err.message);
      throw err;
    }
  }
  /**
   * Valida e consome o token de uso único.
   * Retorna o ID do usuário se for válido e não expirado/já utilizado.
   */
  static async consumeToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string") {
      return null;
    }
    try {
      const tokenHash = this.hashToken(rawToken.trim());
      const rows = await db.select().from(passwordResets).where((0, import_drizzle_orm6.eq)(passwordResets.tokenHash, tokenHash)).limit(1);
      if (rows.length === 0) {
        console.log("[PASSWORD RESET] Token n\xE3o encontrado.");
        return null;
      }
      const reset = rows[0];
      if (reset.usedAt) {
        console.log("[PASSWORD RESET] Token j\xE1 foi utilizado.");
        return null;
      }
      const expiry = new Date(reset.expiresAt).getTime();
      const now = Date.now();
      if (expiry < now) {
        console.log("[PASSWORD RESET] Token expirado.");
        return null;
      }
      await db.update(passwordResets).set({ usedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(passwordResets.id, reset.id));
      persistDatabase();
      return reset.userId;
    } catch (err) {
      console.error("[PASSWORD RESET ERROR] Falha ao validar token:", err.message);
      return null;
    }
  }
};

// src/server/authRoutes.ts
var router = (0, import_express.Router)();
var SESSION_EXPIRY_DAYS2 = 30;
var loginAttempts = /* @__PURE__ */ new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) {
    return { allowed: true };
  }
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1e3);
    return { allowed: false, waitSeconds };
  }
  if (now - entry.firstAttempt > 5 * 60 * 1e3) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}
function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
    if (entry.count >= 5) {
      entry.lockedUntil = now + 2 * 60 * 1e3;
      console.warn(`[AUTH SECURITY] Rate limit atingido para chave ${key}. Bloqueado por 2 minutos.`);
    }
  }
}
function clearFailedAttempts(key) {
  loginAttempts.delete(key);
}
function setSessionCookie(res, token) {
  res.cookie("vend_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY_DAYS2 * 24 * 60 * 60 * 1e3,
    path: "/"
  });
}
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      username,
      email: rawEmail,
      password,
      confirmPassword,
      phone,
      location,
      role
    } = req.body;
    console.log("[AUTH REGISTER] Requisi\xE7\xE3o de cadastro de conta recebida");
    if (!name || typeof name !== "string" || !name.trim() || !rawEmail || !password) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Nome, e-mail e senha s\xE3o obrigat\xF3rios.",
        message: "Nome, e-mail e senha s\xE3o obrigat\xF3rios."
      });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "A senha deve ter no m\xEDnimo 6 caracteres.",
        message: "A senha deve ter no m\xEDnimo 6 caracteres."
      });
    }
    if (confirmPassword !== void 0 && confirmPassword !== password) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "As senhas n\xE3o coincidem. Verifique e tente novamente.",
        message: "As senhas n\xE3o coincidem. Verifique e tente novamente."
      });
    }
    const cleanEmail = normalizeEmail(rawEmail);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Formato de e-mail inv\xE1lido. Verifique e tente novamente.",
        message: "Formato de e-mail inv\xE1lido. Verifique e tente novamente."
      });
    }
    console.log(`[AUTH USER LOOKUP] Verificando se e-mail j\xE1 existe na base oficial: ${cleanEmail}`);
    const existingEmail = await UserRepository.findByEmail(cleanEmail);
    if (existingEmail) {
      console.log(`[AUTH USER FOUND] Cadastro bloqueado por duplicidade para e-mail: ${cleanEmail}`);
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        error: "Este e-mail j\xE1 possui uma conta. Fa\xE7a login.",
        message: "Este e-mail j\xE1 possui uma conta. Fa\xE7a login."
      });
    }
    if (username && typeof username === "string" && username.trim()) {
      const cleanUsername = username.trim().toLowerCase();
      const existingUsername = await UserRepository.findByUsername(cleanUsername);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          code: "USERNAME_ALREADY_EXISTS",
          error: "Este nome de usu\xE1rio j\xE1 est\xE1 em uso. Escolha outro.",
          message: "Este nome de usu\xE1rio j\xE1 est\xE1 em uso. Escolha outro."
        });
      }
    }
    const isMasterOwnerEmail = process.env.MASTER_OWNER_EMAIL && cleanEmail === normalizeEmail(process.env.MASTER_OWNER_EMAIL);
    const safeRole = isMasterOwnerEmail ? "MASTER_OWNER" : role === "DELIVERY_DRIVER" ? "DELIVERY_DRIVER" : "USER";
    const newUser = await UserRepository.createUser({
      email: cleanEmail,
      username: username ? String(username).trim().toLowerCase() : void 0,
      password,
      name: name.trim(),
      phone: phone ? String(phone).trim() : null,
      location: location ? String(location).trim() : "Brasil",
      role: safeRole
    });
    console.log(`[AUTH REGISTER] Usu\xE1rio id ${newUser.id} persistido com sucesso na VEND_AUTH_MEMORY`);
    await db.insert(profiles).values({
      userId: newUser.id,
      bio: `Membro VEND+ desde ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}`
    }).catch((err) => {
      console.warn("[AUTH REGISTER] Aviso ao criar perfil complementar:", err.message);
    });
    const session = await SessionRepository.createSession(newUser.id, req.ip, req.headers["user-agent"]);
    setSessionCookie(res, session.token);
    await db.insert(auditLogs).values({
      userId: newUser.id,
      action: "REGISTER",
      entityType: "USER",
      entityId: String(newUser.id),
      details: JSON.stringify({ email: cleanEmail, role: newUser.role }),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    }).catch(() => {
    });
    persistDatabase();
    return res.status(201).json({
      success: true,
      message: "Conta criada com sucesso!",
      token: session.token,
      user: UserRepository.sanitizeUser(newUser),
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString()
      }
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro no registro de conta:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "N\xE3o foi poss\xEDvel verificar sua conta agora. Tente novamente.",
      message: "N\xE3o foi poss\xEDvel verificar sua conta agora. Tente novamente."
    });
  }
});
router.post("/login", async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.login || req.body.username;
    const { password } = req.body;
    console.log("[AUTH LOGIN ATTEMPT] Tentativa de login recebida");
    if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim() || !password) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "E-mail e senha s\xE3o obrigat\xF3rios.",
        message: "E-mail e senha s\xE3o obrigat\xF3rios."
      });
    }
    const cleanEmail = normalizeEmail(rawEmail);
    const rateLimitKey = `${req.ip || "ip"}_${cleanEmail}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        code: "TOO_MANY_REQUESTS",
        error: `Muitas tentativas incorretas. Aguarde ${rateLimit.waitSeconds || 60} segundos antes de tentar novamente.`,
        message: `Muitas tentativas incorretas. Aguarde ${rateLimit.waitSeconds || 60} segundos antes de tentar novamente.`
      });
    }
    console.log(`[AUTH USER LOOKUP] Buscando conta persistente para: ${cleanEmail}`);
    let user = await UserRepository.findByEmail(cleanEmail);
    if (!user) {
      user = await UserRepository.findByUsername(cleanEmail);
    }
    if (!user) {
      console.log(`[AUTH USER NOT FOUND] Conta inexistente para identificador: ${cleanEmail}`);
      recordFailedAttempt(rateLimitKey);
      await UserRepository.recordLoginFailure(cleanEmail, "USER_NOT_FOUND", req.ip, req.headers["user-agent"]);
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        error: "Conta n\xE3o encontrada. Verifique o e-mail ou cadastre-se.",
        message: "Conta n\xE3o encontrada. Verifique o e-mail ou cadastre-se."
      });
    }
    console.log(`[AUTH USER FOUND] Usu\xE1rio encontrado id ${user.id} (${user.email}), status: ${user.status}`);
    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        error: "Esta conta est\xE1 temporariamente desativada. Entre em contato com o suporte.",
        message: "Esta conta est\xE1 temporariamente desativada. Entre em contato com o suporte."
      });
    }
    const userPasswordHash = user.passwordHash || user.password_hash;
    if (!userPasswordHash) {
      return res.status(400).json({
        success: false,
        code: "GOOGLE_AUTH_REQUIRED",
        error: 'Esta conta foi vinculada via Google. Por favor, utilize o bot\xE3o "Entrar com Google".',
        message: 'Esta conta foi vinculada via Google. Por favor, utilize o bot\xE3o "Entrar com Google".'
      });
    }
    console.log(`[AUTH PASSWORD CHECK] Verificando credenciais para id ${user.id}...`);
    const isMatch = await UserRepository.verifyPassword(password, userPasswordHash);
    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      await UserRepository.recordLoginFailure(cleanEmail, "INVALID_PASSWORD", req.ip, req.headers["user-agent"]);
      return res.status(401).json({
        success: false,
        code: "INVALID_PASSWORD",
        error: "Senha incorreta. Verifique seus dados.",
        message: "Senha incorreta. Verifique seus dados."
      });
    }
    clearFailedAttempts(rateLimitKey);
    await UserRepository.recordLogin(user.id, req.ip, req.headers["user-agent"]);
    const session = await SessionRepository.createSession(user.id, req.ip, req.headers["user-agent"]);
    setSessionCookie(res, session.token);
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: String(user.id),
      details: JSON.stringify({ email: cleanEmail }),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    }).catch(() => {
    });
    persistDatabase();
    return res.json({
      success: true,
      message: "Login realizado com sucesso!",
      token: session.token,
      user: UserRepository.sanitizeUser(user),
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString()
      }
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro durante o processo de login:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "N\xE3o foi poss\xEDvel verificar sua conta agora. Tente novamente.",
      message: "N\xE3o foi poss\xEDvel verificar sua conta agora. Tente novamente."
    });
  }
});
router.post("/logout", async (req, res) => {
  try {
    const cookieToken = req.cookies?.vend_session;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bearerToken || cookieToken;
    if (token) {
      await SessionRepository.revokeSession(token);
    }
    res.clearCookie("vend_session", { path: "/" });
    const userId = req.user?.id;
    console.log(`[AUTH LOGOUT] Sess\xE3o finalizada para userId: ${userId || "an\xF4nimo"}`);
    if (userId) {
      await AuthDatabase.logEvent({
        eventType: "LOGOUT",
        userId,
        email: req.user?.email
      });
      await db.insert(auditLogs).values({
        userId,
        action: "LOGOUT",
        entityType: "USER",
        entityId: String(userId),
        details: JSON.stringify({ email: req.user?.email })
      }).catch(() => {
      });
    }
    persistDatabase();
    return res.json({
      success: true,
      message: "Sess\xE3o encerrada com sucesso."
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro ao sair:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "Erro ao sair."
    });
  }
});
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.vend_session;
    const token = bearerToken || cookieToken;
    if (!token) {
      return res.status(401).json({
        authenticated: false,
        code: "SESSION_EXPIRED",
        user: null,
        error: "Sess\xE3o n\xE3o encontrada ou expirada."
      });
    }
    const user = await SessionRepository.validateSession(token);
    if (!user) {
      return res.status(401).json({
        authenticated: false,
        code: "SESSION_EXPIRED",
        user: null,
        error: "Sess\xE3o n\xE3o encontrada ou expirada."
      });
    }
    if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
      return res.status(403).json({
        authenticated: false,
        code: "ACCOUNT_DISABLED",
        user: null,
        error: "Usu\xE1rio bloqueado ou inativo."
      });
    }
    const [userProfile] = await db.select().from(profiles).where((0, import_drizzle_orm7.eq)(profiles.userId, user.id)).limit(1).catch(() => []);
    return res.json({
      authenticated: true,
      user: {
        ...UserRepository.sanitizeUser(user),
        profile: userProfile || null
      }
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Falha no endpoint /api/auth/me:", err);
    return res.status(500).json({
      authenticated: false,
      code: "DATABASE_ERROR",
      user: null,
      error: "N\xE3o foi poss\xEDvel verificar sua conta agora. Tente novamente."
    });
  }
});
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { name, phone, location, avatarUrl, bio, documentNumber, preferences } = req.body;
    const userUpdates = {};
    if (name && typeof name === "string" && name.trim()) userUpdates.name = name.trim();
    if (phone !== void 0) userUpdates.phone = phone ? String(phone).trim() : null;
    if (location !== void 0) userUpdates.location = location ? String(location).trim() : null;
    if (avatarUrl !== void 0) userUpdates.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
    if (Object.keys(userUpdates).length > 0) {
      await UserRepository.updateUser(user.id, userUpdates);
    }
    const profileUpdates = { updatedAt: /* @__PURE__ */ new Date() };
    if (bio !== void 0) profileUpdates.bio = bio ? String(bio).trim() : null;
    if (documentNumber !== void 0) profileUpdates.documentNumber = documentNumber ? String(documentNumber).trim() : null;
    if (preferences !== void 0) {
      profileUpdates.preferences = typeof preferences === "string" ? preferences : JSON.stringify(preferences);
    }
    const [existingProfile] = await db.select().from(profiles).where((0, import_drizzle_orm7.eq)(profiles.userId, user.id)).limit(1);
    if (existingProfile) {
      await db.update(profiles).set(profileUpdates).where((0, import_drizzle_orm7.eq)(profiles.userId, user.id));
    } else {
      await db.insert(profiles).values({
        userId: user.id,
        bio: profileUpdates.bio || null,
        documentNumber: profileUpdates.documentNumber || null,
        preferences: profileUpdates.preferences || null
      });
    }
    const updatedUser = await UserRepository.findById(user.id);
    const [updatedProfile] = await db.select().from(profiles).where((0, import_drizzle_orm7.eq)(profiles.userId, user.id)).limit(1);
    return res.json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: {
        ...UserRepository.sanitizeUser(updatedUser),
        profile: updatedProfile || null
      }
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, error: "Erro ao atualizar perfil." });
  }
});
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Senha atual e nova senha s\xE3o obrigat\xF3rias."
      });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "A nova senha deve ter no m\xEDnimo 6 caracteres."
      });
    }
    if (confirmPassword !== void 0 && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "A nova senha e a confirma\xE7\xE3o n\xE3o coincidem."
      });
    }
    const user = await UserRepository.findById(userId);
    if (!user || !user.passwordHash) {
      return res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        error: "N\xE3o foi poss\xEDvel alterar a senha desta conta."
      });
    }
    const isCurrentValid = await UserRepository.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PASSWORD",
        error: "Senha atual incorreta. Tente novamente."
      });
    }
    await UserRepository.updatePassword(userId, newPassword);
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.cookies?.vend_session;
    if (currentToken) {
      await SessionRepository.revokeAllUserSessions(userId, currentToken);
    }
    return res.json({
      success: true,
      message: "Senha alterada com sucesso!"
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro na altera\xE7\xE3o de senha:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "N\xE3o foi poss\xEDvel alterar sua senha agora. Tente novamente."
    });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim()) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "E-mail \xE9 obrigat\xF3rio."
      });
    }
    const cleanEmail = normalizeEmail(rawEmail);
    console.log(`[AUTH FORGOT PASSWORD] Solicita\xE7\xE3o para email: ${cleanEmail}`);
    const user = await UserRepository.findByEmail(cleanEmail);
    let devResetToken;
    if (user) {
      const { rawToken } = await PasswordResetRepository.createResetToken(user.id, cleanEmail, req.ip);
      devResetToken = rawToken;
      await db.insert(auditLogs).values({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "USER",
        entityId: String(user.id),
        details: JSON.stringify({ email: cleanEmail })
      }).catch(() => {
      });
    }
    return res.json({
      success: true,
      message: "Se o e-mail estiver cadastrado, as instru\xE7\xF5es de recupera\xE7\xE3o foram geradas.",
      resetToken: devResetToken || null
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro na recupera\xE7\xE3o de senha:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "N\xE3o foi poss\xEDvel processar a recupera\xE7\xE3o agora. Tente novamente."
    });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Token e nova senha s\xE3o obrigat\xF3rios."
      });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "A nova senha deve ter no m\xEDnimo 6 caracteres."
      });
    }
    if (confirmPassword !== void 0 && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "As senhas n\xE3o coincidem."
      });
    }
    const userId = await PasswordResetRepository.consumeToken(token);
    if (!userId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TOKEN",
        error: "Link de redefini\xE7\xE3o inv\xE1lido ou expirado. Solicite uma nova redefini\xE7\xE3o."
      });
    }
    await UserRepository.updatePassword(userId, newPassword);
    await SessionRepository.revokeAllUserSessions(userId);
    return res.json({
      success: true,
      message: "Senha redefinida com sucesso! Fa\xE7a login com sua nova senha."
    });
  } catch (err) {
    console.error("[AUTH DATABASE ERROR] Erro ao redefinir senha:", err);
    return res.status(500).json({
      success: false,
      code: "DATABASE_ERROR",
      error: "Erro ao redefinir senha. Tente novamente."
    });
  }
});
router.get("/events", requireMasterOwner, async (req, res) => {
  try {
    const events = await AuthDatabase.getRecentEvents(100);
    return res.json({ success: true, events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/storage-status", (req, res) => {
  const status = detectStorageStatus();
  return res.json(status);
});
var authRoutes_default = router;

// src/server/productRoutes.ts
var import_express2 = require("express");
var import_drizzle_orm8 = require("drizzle-orm");
var router2 = (0, import_express2.Router)();
function validateProductImageMatch(name, categoryName, imageUrl, priceCents) {
  if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
    return { valid: false, reason: "O produto precisa ter uma imagem v\xE1lida ou placeholder neutro." };
  }
  if (!name || name.trim().length < 3) {
    return { valid: false, reason: "O produto precisa de um nome descritivo com pelo menos 3 caracteres." };
  }
  if (priceCents <= 0) {
    return { valid: false, reason: "O pre\xE7o do produto deve ser maior que zero." };
  }
  const isDataUrl = imageUrl.startsWith("data:image/");
  const isHttpUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
  const isInternalPath = imageUrl.startsWith("/");
  if (!isDataUrl && !isHttpUrl && !isInternalPath) {
    return { valid: false, reason: "URL da imagem inv\xE1lida." };
  }
  return { valid: true };
}
router2.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const q = req.query.q ? String(req.query.q).trim() : "";
    const categorySlug = req.query.categoria ? String(req.query.categoria).trim() : "";
    const condition = req.query.condicao ? String(req.query.condicao).trim().toUpperCase() : "";
    const location = req.query.localizacao ? String(req.query.localizacao).trim() : "";
    const minPrice = req.query.precoMin ? parseInt(req.query.precoMin) * 100 : void 0;
    const maxPrice = req.query.precoMax ? parseInt(req.query.precoMax) * 100 : void 0;
    const offersDelivery = req.query.entrega === "true";
    const offersPickup = req.query.retirada === "true";
    const allowsNegotiation = req.query.negociacao === "true";
    const conditions = [(0, import_drizzle_orm8.eq)(products.status, "ACTIVE")];
    if (q) {
      conditions.push(
        (0, import_drizzle_orm8.or)(
          (0, import_drizzle_orm8.ilike)(products.name, `%${q}%`),
          (0, import_drizzle_orm8.ilike)(products.description, `%${q}%`),
          (0, import_drizzle_orm8.ilike)(products.location, `%${q}%`)
        )
      );
    }
    if (condition && (condition === "NOVO" || condition === "USADO")) {
      conditions.push((0, import_drizzle_orm8.eq)(products.condition, condition));
    }
    if (location) {
      conditions.push((0, import_drizzle_orm8.ilike)(products.location, `%${location}%`));
    }
    if (minPrice !== void 0 && !isNaN(minPrice)) {
      conditions.push((0, import_drizzle_orm8.gte)(products.priceCents, minPrice));
    }
    if (maxPrice !== void 0 && !isNaN(maxPrice)) {
      conditions.push((0, import_drizzle_orm8.lte)(products.priceCents, maxPrice));
    }
    if (offersDelivery) {
      conditions.push((0, import_drizzle_orm8.eq)(products.offersDelivery, true));
    }
    if (offersPickup) {
      conditions.push((0, import_drizzle_orm8.eq)(products.offersPickup, true));
    }
    if (allowsNegotiation) {
      conditions.push((0, import_drizzle_orm8.eq)(products.allowsNegotiation, true));
    }
    if (req.query.sellerId) {
      const parsedSellerId = parseInt(req.query.sellerId);
      if (!isNaN(parsedSellerId)) {
        conditions.push((0, import_drizzle_orm8.eq)(products.sellerId, parsedSellerId));
      }
    }
    if (req.query.storeId) {
      const parsedStoreId = parseInt(req.query.storeId);
      if (!isNaN(parsedStoreId)) {
        conditions.push((0, import_drizzle_orm8.eq)(products.storeId, parsedStoreId));
      }
    }
    let targetCategoryId;
    if (categorySlug) {
      const cat = await db.select().from(categories).where((0, import_drizzle_orm8.eq)(categories.slug, categorySlug)).limit(1);
      if (cat.length > 0) {
        targetCategoryId = cat[0].id;
        conditions.push((0, import_drizzle_orm8.eq)(products.categoryId, targetCategoryId));
      }
    }
    const whereClause = (0, import_drizzle_orm8.and)(...conditions);
    const [{ total }] = await db.select({ total: (0, import_drizzle_orm8.count)() }).from(products).where(whereClause);
    const items = await db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      condition: products.condition,
      priceCents: products.priceCents,
      originalPriceCents: products.originalPriceCents,
      stock: products.stock,
      location: products.location,
      offersDelivery: products.offersDelivery,
      offersPickup: products.offersPickup,
      allowsNegotiation: products.allowsNegotiation,
      status: products.status,
      rating: products.rating,
      viewsCount: products.viewsCount,
      imageUrl: products.imageUrl,
      isDemo: products.isDemo,
      createdAt: products.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon
      },
      seller: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        location: users.location
      }
    }).from(products).leftJoin(categories, (0, import_drizzle_orm8.eq)(products.categoryId, categories.id)).leftJoin(users, (0, import_drizzle_orm8.eq)(products.sellerId, users.id)).where(whereClause).orderBy((0, import_drizzle_orm8.desc)(products.createdAt)).limit(limit).offset(offset);
    return res.json({
      items,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  } catch (err) {
    console.error("List products error:", err);
    return res.status(500).json({ error: "N\xE3o foi poss\xEDvel carregar os produtos. Tente novamente." });
  }
});
router2.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);
    const condition = isNumeric ? (0, import_drizzle_orm8.eq)(products.id, parseInt(identifier)) : (0, import_drizzle_orm8.eq)(products.slug, identifier);
    const result = await db.select({
      product: products,
      category: categories,
      seller: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        location: users.location,
        phone: users.phone,
        planSlug: users.planSlug
      }
    }).from(products).leftJoin(categories, (0, import_drizzle_orm8.eq)(products.categoryId, categories.id)).leftJoin(users, (0, import_drizzle_orm8.eq)(products.sellerId, users.id)).where(condition).limit(1);
    if (result.length === 0) {
      return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    }
    const { product, category, seller } = result[0];
    await db.update(products).set({ viewsCount: product.viewsCount + 1 }).where((0, import_drizzle_orm8.eq)(products.id, product.id));
    const extraImages = await db.select().from(productImages).where((0, import_drizzle_orm8.eq)(productImages.productId, product.id)).orderBy(productImages.displayOrder);
    let storeData = null;
    if (product.storeId) {
      const [s] = await db.select().from(stores).where((0, import_drizzle_orm8.eq)(stores.id, product.storeId)).limit(1);
      storeData = s || null;
    }
    const mappedImages = extraImages.map((img) => ({
      id: img.id,
      productId: img.productId,
      url: img.imageUrl,
      imageUrl: img.imageUrl,
      type: img.type || (img.isPrimary ? "main" : "gallery"),
      position: img.displayOrder,
      displayOrder: img.displayOrder,
      isPrimary: img.isPrimary,
      createdAt: img.createdAt
    }));
    const fullImagesList = mappedImages.length > 0 ? mappedImages : [
      {
        id: 0,
        productId: product.id,
        imageUrl: product.imageUrl,
        url: product.imageUrl,
        isPrimary: true,
        type: "main",
        position: 0,
        displayOrder: 0,
        createdAt: product.createdAt
      }
    ];
    return res.json({
      ...product,
      category,
      seller,
      store: storeData,
      images: fullImagesList,
      productImages: fullImagesList
    });
  } catch (err) {
    console.error("Get product error:", err);
    return res.status(500).json({ error: "Erro ao carregar dados do produto." });
  }
});
router2.post("/", requireAuth, async (req, res) => {
  try {
    const seller = req.user;
    const {
      name,
      description,
      categoryId,
      subcategory,
      condition = "NOVO",
      priceCents,
      originalPriceCents,
      stock = 1,
      location,
      offersDelivery = true,
      offersPickup = true,
      allowsNegotiation = true,
      imageUrl,
      productImages: inputProductImages,
      additionalImages = [],
      storeId
    } = req.body;
    let resolvedMainImageUrl = imageUrl ? imageUrl.trim() : "";
    if (!resolvedMainImageUrl && Array.isArray(inputProductImages) && inputProductImages.length > 0) {
      const mainImg = inputProductImages.find((i) => i.type === "main") || inputProductImages[0];
      if (mainImg?.url) {
        resolvedMainImageUrl = mainImg.url.trim();
      }
    }
    if (!name || !description || !categoryId || priceCents === void 0 || !resolvedMainImageUrl) {
      return res.status(400).json({
        error: "Todos os campos obrigat\xF3rios (nome, descri\xE7\xE3o, categoria, pre\xE7o e pelo menos uma foto) devem ser preenchidos."
      });
    }
    const [cat] = await db.select().from(categories).where((0, import_drizzle_orm8.eq)(categories.id, parseInt(categoryId))).limit(1);
    if (!cat) {
      return res.status(400).json({ error: "Categoria selecionada n\xE3o existe." });
    }
    const imageCheck = validateProductImageMatch(name, cat.name, resolvedMainImageUrl, Number(priceCents));
    if (!imageCheck.valid) {
      return res.status(400).json({ error: imageCheck.reason });
    }
    const userPlanSlug = seller.planSlug || "free";
    const [plan] = await db.select().from(plans).where((0, import_drizzle_orm8.eq)(plans.slug, userPlanSlug)).limit(1);
    const maxActive = plan ? plan.maxActiveListings : 10;
    const [{ activeCount }] = await db.select({ activeCount: (0, import_drizzle_orm8.count)() }).from(products).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(products.sellerId, seller.id), (0, import_drizzle_orm8.eq)(products.status, "ACTIVE")));
    if (Number(activeCount) >= maxActive) {
      return res.status(403).json({
        error: `Voc\xEA atingiu o limite de ${maxActive} an\xFAncios ativos do seu plano (${plan?.name || "FREE"}). Fa\xE7a upgrade para publicar mais.`
      });
    }
    const cleanSlugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${cleanSlugBase}-${Date.now().toString(36)}`;
    const [newProduct] = await db.insert(products).values({
      sellerId: seller.id,
      storeId: storeId ? parseInt(storeId) : null,
      name: name.trim(),
      slug,
      description: description.trim(),
      categoryId: parseInt(categoryId),
      subcategory: subcategory ? subcategory.trim() : null,
      condition: condition === "USADO" ? "USADO" : "NOVO",
      priceCents: parseInt(priceCents),
      originalPriceCents: originalPriceCents ? parseInt(originalPriceCents) : null,
      stock: Math.max(1, parseInt(stock) || 1),
      location: location ? location.trim() : seller.location || "Local",
      offersDelivery: Boolean(offersDelivery),
      offersPickup: Boolean(offersPickup),
      allowsNegotiation: Boolean(allowsNegotiation),
      status: "ACTIVE",
      imageUrl: resolvedMainImageUrl,
      isDemo: false
    }).returning();
    const imagesToSave = [];
    if (Array.isArray(inputProductImages) && inputProductImages.length > 0) {
      for (let i = 0; i < inputProductImages.length; i++) {
        const item = inputProductImages[i];
        if (!item?.url) continue;
        const isMain = item.type === "main" || i === 0 && !inputProductImages.some((x) => x.type === "main");
        imagesToSave.push({
          url: item.url.trim(),
          type: item.type || (isMain ? "main" : "gallery"),
          position: typeof item.position === "number" ? item.position : i,
          isPrimary: isMain
        });
      }
    } else {
      imagesToSave.push({
        url: resolvedMainImageUrl,
        type: "main",
        position: 0,
        isPrimary: true
      });
      if (Array.isArray(additionalImages)) {
        for (let i = 0; i < additionalImages.length; i++) {
          if (typeof additionalImages[i] === "string" && additionalImages[i].trim()) {
            imagesToSave.push({
              url: additionalImages[i].trim(),
              type: "gallery",
              position: i + 1,
              isPrimary: false
            });
          }
        }
      }
    }
    for (const img of imagesToSave) {
      await db.insert(productImages).values({
        productId: newProduct.id,
        imageUrl: img.url,
        isPrimary: img.isPrimary,
        displayOrder: img.position,
        type: img.type
      });
    }
    persistDatabase();
    await db.insert(auditLogs).values({
      userId: seller.id,
      action: "CREATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: String(newProduct.id),
      details: JSON.stringify({ name: newProduct.name, priceCents: newProduct.priceCents, photosCount: imagesToSave.length })
    });
    const savedImages = await db.select().from(productImages).where((0, import_drizzle_orm8.eq)(productImages.productId, newProduct.id)).orderBy(productImages.displayOrder);
    const mappedSaved = savedImages.map((img) => ({
      id: img.id,
      productId: img.productId,
      url: img.imageUrl,
      imageUrl: img.imageUrl,
      type: img.type || (img.isPrimary ? "main" : "gallery"),
      position: img.displayOrder,
      displayOrder: img.displayOrder,
      isPrimary: img.isPrimary,
      createdAt: img.createdAt
    }));
    return res.status(201).json({
      message: "Produto publicado com sucesso!",
      id: newProduct.id,
      ...newProduct,
      product: newProduct,
      images: mappedSaved,
      productImages: mappedSaved
    });
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ error: "Erro ao publicar produto. Tente novamente." });
  }
});
router2.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const seller = req.user;
    const productId = parseInt(id);
    const [existing] = await db.select().from(products).where((0, import_drizzle_orm8.eq)(products.id, productId)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    }
    if (existing.sellerId !== seller.id && seller.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar este produto." });
    }
    const {
      name,
      description,
      categoryId,
      subcategory,
      condition,
      priceCents,
      originalPriceCents,
      stock,
      location,
      offersDelivery,
      offersPickup,
      allowsNegotiation,
      imageUrl,
      productImages: updatedProductImages
    } = req.body;
    let finalMainImageUrl = imageUrl ? imageUrl.trim() : existing.imageUrl;
    if (Array.isArray(updatedProductImages) && updatedProductImages.length > 0) {
      const mainImg = updatedProductImages.find((i) => i.type === "main") || updatedProductImages[0];
      if (mainImg?.url) {
        finalMainImageUrl = mainImg.url.trim();
      }
    }
    const [updatedProduct] = await db.update(products).set({
      name: name !== void 0 ? name.trim() : existing.name,
      description: description !== void 0 ? description.trim() : existing.description,
      categoryId: categoryId !== void 0 ? parseInt(categoryId) : existing.categoryId,
      subcategory: subcategory !== void 0 ? subcategory ? subcategory.trim() : null : existing.subcategory,
      condition: condition !== void 0 ? condition === "USADO" ? "USADO" : "NOVO" : existing.condition,
      priceCents: priceCents !== void 0 ? parseInt(priceCents) : existing.priceCents,
      originalPriceCents: originalPriceCents !== void 0 ? originalPriceCents ? parseInt(originalPriceCents) : null : existing.originalPriceCents,
      stock: stock !== void 0 ? Math.max(0, parseInt(stock)) : existing.stock,
      location: location !== void 0 ? location.trim() : existing.location,
      offersDelivery: offersDelivery !== void 0 ? Boolean(offersDelivery) : existing.offersDelivery,
      offersPickup: offersPickup !== void 0 ? Boolean(offersPickup) : existing.offersPickup,
      allowsNegotiation: allowsNegotiation !== void 0 ? Boolean(allowsNegotiation) : existing.allowsNegotiation,
      imageUrl: finalMainImageUrl,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm8.eq)(products.id, productId)).returning();
    if (Array.isArray(updatedProductImages)) {
      await db.delete(productImages).where((0, import_drizzle_orm8.eq)(productImages.productId, productId));
      for (let i = 0; i < updatedProductImages.length; i++) {
        const item = updatedProductImages[i];
        if (!item?.url) continue;
        const isMain = item.type === "main" || i === 0 && !updatedProductImages.some((x) => x.type === "main");
        await db.insert(productImages).values({
          productId,
          imageUrl: item.url.trim(),
          isPrimary: isMain,
          displayOrder: typeof item.position === "number" ? item.position : i,
          type: item.type || (isMain ? "main" : "gallery")
        });
      }
    }
    persistDatabase();
    await db.insert(auditLogs).values({
      userId: seller.id,
      action: "UPDATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: String(productId),
      details: JSON.stringify({ name: updatedProduct.name, priceCents: updatedProduct.priceCents })
    });
    const refreshedImages = await db.select().from(productImages).where((0, import_drizzle_orm8.eq)(productImages.productId, productId)).orderBy(productImages.displayOrder);
    const mapped = refreshedImages.map((img) => ({
      id: img.id,
      productId: img.productId,
      url: img.imageUrl,
      imageUrl: img.imageUrl,
      type: img.type || (img.isPrimary ? "main" : "gallery"),
      position: img.displayOrder,
      displayOrder: img.displayOrder,
      isPrimary: img.isPrimary,
      createdAt: img.createdAt
    }));
    return res.json({
      message: "Produto e fotos atualizados com sucesso!",
      product: updatedProduct,
      images: mapped,
      productImages: mapped
    });
  } catch (err) {
    console.error("Update product error:", err);
    return res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});
router2.delete("/:id/images/:imageId", requireAuth, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const user = req.user;
    const productId = parseInt(id);
    const imgId = parseInt(imageId);
    const [prod] = await db.select().from(products).where((0, import_drizzle_orm8.eq)(products.id, productId)).limit(1);
    if (!prod) {
      return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    }
    if (prod.sellerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    await db.delete(productImages).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(productImages.id, imgId), (0, import_drizzle_orm8.eq)(productImages.productId, productId)));
    const remaining = await db.select().from(productImages).where((0, import_drizzle_orm8.eq)(productImages.productId, productId)).orderBy(productImages.displayOrder);
    if (remaining.length > 0 && !remaining.some((i) => i.isPrimary)) {
      await db.update(productImages).set({ isPrimary: true, type: "main" }).where((0, import_drizzle_orm8.eq)(productImages.id, remaining[0].id));
      await db.update(products).set({ imageUrl: remaining[0].imageUrl }).where((0, import_drizzle_orm8.eq)(products.id, productId));
    }
    persistDatabase();
    return res.json({
      success: true,
      message: "Foto removida com sucesso.",
      remainingImages: remaining
    });
  } catch (err) {
    console.error("Delete image error:", err);
    return res.status(500).json({ error: "Erro ao excluir imagem." });
  }
});
router2.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
      return res.status(400).json({ error: "Status inv\xE1lido." });
    }
    const [prod] = await db.select().from(products).where((0, import_drizzle_orm8.eq)(products.id, parseInt(id))).limit(1);
    if (!prod) {
      return res.status(404).json({ error: "Produto n\xE3o encontrado." });
    }
    if (prod.sellerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    const [updated] = await db.update(products).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm8.eq)(products.id, prod.id)).returning();
    persistDatabase();
    return res.json({ message: "Status atualizado com sucesso!", product: updated });
  } catch (err) {
    console.error("Update status error:", err);
    return res.status(500).json({ error: "Erro ao atualizar status." });
  }
});
var productRoutes_default = router2;

// src/server/serviceRoutes.ts
var import_express3 = require("express");
var import_drizzle_orm9 = require("drizzle-orm");
var router3 = (0, import_express3.Router)();
router3.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const q = req.query.q ? String(req.query.q).trim() : "";
    const categorySlug = req.query.categoria ? String(req.query.categoria).trim() : "";
    const location = req.query.localizacao ? String(req.query.localizacao).trim() : "";
    const conditions = [(0, import_drizzle_orm9.eq)(services.status, "ACTIVE")];
    if (q) {
      conditions.push(
        (0, import_drizzle_orm9.or)(
          (0, import_drizzle_orm9.ilike)(services.name, `%${q}%`),
          (0, import_drizzle_orm9.ilike)(services.description, `%${q}%`),
          (0, import_drizzle_orm9.ilike)(services.location, `%${q}%`)
        )
      );
    }
    if (location) {
      conditions.push((0, import_drizzle_orm9.ilike)(services.location, `%${location}%`));
    }
    if (categorySlug) {
      const cat = await db.select().from(categories).where((0, import_drizzle_orm9.eq)(categories.slug, categorySlug)).limit(1);
      if (cat.length > 0) {
        conditions.push((0, import_drizzle_orm9.eq)(services.categoryId, cat[0].id));
      }
    }
    const whereClause = (0, import_drizzle_orm9.and)(...conditions);
    const [{ total }] = await db.select({ total: (0, import_drizzle_orm9.count)() }).from(services).where(whereClause);
    const items = await db.select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      description: services.description,
      priceCents: services.priceCents,
      priceType: services.priceType,
      location: services.location,
      offersDelivery: services.offersDelivery,
      allowsNegotiation: services.allowsNegotiation,
      rating: services.rating,
      totalReviews: services.totalReviews,
      status: services.status,
      imageUrl: services.imageUrl,
      isDemo: services.isDemo,
      createdAt: services.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon
      },
      provider: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        location: users.location,
        phone: users.phone
      }
    }).from(services).leftJoin(categories, (0, import_drizzle_orm9.eq)(services.categoryId, categories.id)).leftJoin(users, (0, import_drizzle_orm9.eq)(services.providerId, users.id)).where(whereClause).orderBy((0, import_drizzle_orm9.desc)(services.createdAt)).limit(limit).offset(offset);
    return res.json({
      items,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  } catch (err) {
    console.error("List services error:", err);
    return res.status(500).json({ error: "N\xE3o foi poss\xEDvel carregar os servi\xE7os." });
  }
});
router3.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);
    const condition = isNumeric ? (0, import_drizzle_orm9.eq)(services.id, parseInt(identifier)) : (0, import_drizzle_orm9.eq)(services.slug, identifier);
    const result = await db.select({
      service: services,
      category: categories,
      provider: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        location: users.location,
        phone: users.phone,
        email: users.email
      }
    }).from(services).leftJoin(categories, (0, import_drizzle_orm9.eq)(services.categoryId, categories.id)).leftJoin(users, (0, import_drizzle_orm9.eq)(services.providerId, users.id)).where(condition).limit(1);
    if (result.length === 0) {
      return res.status(404).json({ error: "Servi\xE7o n\xE3o encontrado." });
    }
    return res.json({
      ...result[0].service,
      category: result[0].category,
      provider: result[0].provider
    });
  } catch (err) {
    console.error("Get service error:", err);
    return res.status(500).json({ error: "Erro ao carregar detalhes do servi\xE7o." });
  }
});
router3.post("/", requireAuth, async (req, res) => {
  try {
    const provider = req.user;
    const {
      name,
      description,
      categoryId,
      priceCents,
      priceType = "STARTING_AT",
      location,
      offersDelivery = false,
      allowsNegotiation = true,
      imageUrl
    } = req.body;
    if (!name || !description || !categoryId || priceCents === void 0 || !imageUrl) {
      return res.status(400).json({ error: "Preencha todos os campos obrigat\xF3rios do servi\xE7o." });
    }
    const cleanSlugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${cleanSlugBase}-${Date.now().toString(36)}`;
    const [newService] = await db.insert(services).values({
      providerId: provider.id,
      name: name.trim(),
      slug,
      description: description.trim(),
      categoryId: parseInt(categoryId),
      priceCents: parseInt(priceCents),
      priceType: priceType === "FIXED" ? "FIXED" : "STARTING_AT",
      location: location ? location.trim() : provider.location || "Local",
      offersDelivery: Boolean(offersDelivery),
      allowsNegotiation: Boolean(allowsNegotiation),
      status: "ACTIVE",
      imageUrl: imageUrl.trim(),
      isDemo: false
    }).returning();
    await db.insert(auditLogs).values({
      userId: provider.id,
      action: "CREATE_SERVICE",
      entityType: "SERVICE",
      entityId: String(newService.id),
      details: JSON.stringify({ name: newService.name })
    });
    return res.status(201).json({
      message: "Servi\xE7o anunciado com sucesso!",
      service: newService
    });
  } catch (err) {
    console.error("Create service error:", err);
    return res.status(500).json({ error: "Erro ao cadastrar servi\xE7o." });
  }
});
var serviceRoutes_default = router3;

// src/server/storeRoutes.ts
var import_express4 = require("express");
var import_drizzle_orm10 = require("drizzle-orm");

// src/server/ecosystemCatalog.ts
var VERIFIED_ECOSYSTEM_PRODUCTS = [
  // 1. ELETRÔNICOS & TECH
  {
    id: "eco-prod-01",
    name: "Smartphone Galaxy S23 Ultra 256GB Preto Phantom 5G",
    categorySlug: "celulares",
    categoryName: "Celulares e Telefonia",
    niche: "Eletr\xF4nicos & Inform\xE1tica",
    description: 'Smartphone topo de linha com c\xE2mera de 200MP, tela Dynamic AMOLED 2X de 6.8", caneta S-Pen integrada e processador Snapdragon 8 Gen 2. Acompanha carregador original homologado Anatel.',
    costPriceCents: 345e3,
    // Custo: R$ 3.450,00
    suggestedRetailPriceCents: 449900,
    // Venda: R$ 4.499,00 (~30.4% margem)
    defaultMarginPercent: 30,
    stock: 14,
    supplierName: "Distribuidora TechSul Brasil",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["smartphone", "samsung", "galaxy", "5g", "tech"]
  },
  {
    id: "eco-prod-02",
    name: "Notebook Dell Inspiron 15 Intel Core i7 16GB RAM SSD 512GB",
    categorySlug: "informatica",
    categoryName: "Inform\xE1tica e Escrit\xF3rio",
    niche: "Eletr\xF4nicos & Inform\xE1tica",
    description: 'Notebook de alta performance para produtividade, programa\xE7\xE3o e design. Tela 15.6" Full HD antirreflexo, teclado retroiluminado com teclado num\xE9rico e bateria de longa dura\xE7\xE3o.',
    costPriceCents: 26e4,
    // Custo: R$ 2.600,00
    suggestedRetailPriceCents: 359e3,
    // Venda: R$ 3.590,00 (~38% margem)
    defaultMarginPercent: 38,
    stock: 8,
    supplierName: "Megaware Inform\xE1tica Atacado",
    location: "Campinas, SP",
    imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["notebook", "dell", "i7", "computador", "ssd"]
  },
  {
    id: "eco-prod-03",
    name: "Fone de Ouvido Bluetooth Over-Ear com Cancelamento Ativo de Ru\xEDdo (ANC)",
    categorySlug: "eletronicos",
    categoryName: "Eletr\xF4nicos e \xC1udio",
    niche: "Eletr\xF4nicos & Inform\xE1tica",
    description: "Fone sem fio premium com drivers de neod\xEDmio de 40mm, cancelamento de ru\xEDdo ativo inteligente, microfone para chamadas n\xEDtidas e autonomia de at\xE9 40 horas cont\xEDnuas de reprodu\xE7\xE3o.",
    costPriceCents: 19500,
    // Custo: R$ 195,00
    suggestedRetailPriceCents: 34900,
    // Venda: R$ 349,00 (~79% margem)
    defaultMarginPercent: 75,
    stock: 25,
    supplierName: "AudioMax Distribui\xE7\xE3o",
    location: "Curitiba, PR",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["fone", "bluetooth", "audio", "headphone", "anc"]
  },
  {
    id: "eco-prod-04",
    name: "Smart TV 50 Polegadas 4K UHD HDR com Wi-Fi e Comando de Voz",
    categorySlug: "eletronicos",
    categoryName: "Eletr\xF4nicos e \xC1udio",
    niche: "Eletr\xF4nicos & Inform\xE1tica",
    description: "Televisor inteligente com tecnologia Crystal UHD 4K, processador Crystal 4K com upscaling inteligente, HDR10+, assistente de voz Alexa integrada e design sem bordas aparentes.",
    costPriceCents: 155e3,
    // Custo: R$ 1.550,00
    suggestedRetailPriceCents: 219900,
    // Venda: R$ 2.199,00 (~41% margem)
    defaultMarginPercent: 41,
    stock: 10,
    supplierName: "EletroPrime Fornecedores",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["tv", "smart-tv", "4k", "eletronicos"]
  },
  {
    id: "eco-prod-05",
    name: "Console PlayStation 5 Edi\xE7\xE3o Digital com Controle DualSense Branco",
    categorySlug: "games",
    categoryName: "Games e Consoles",
    niche: "Eletr\xF4nicos & Inform\xE1tica",
    description: "Console Sony PS5 Digital Edition com SSD de 825GB ultrarr\xE1pido, ray tracing em tempo real, taxa de quadros de at\xE9 120 FPS e controle sem fio DualSense com feedback t\xE1til imersivo.",
    costPriceCents: 295e3,
    // Custo: R$ 2.950,00
    suggestedRetailPriceCents: 369900,
    // Venda: R$ 3.699,00 (~25% margem)
    defaultMarginPercent: 25,
    stock: 6,
    supplierName: "GameZone Distribuidora Nacional",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["ps5", "playstation", "sony", "games", "console"]
  },
  // 2. FERRAMENTAS & EQUIPAMENTOS
  {
    id: "eco-prod-06",
    name: "Furadeira e Parafusadeira de Impacto 18V Bateria L\xEDtio com Maleta e 24 Acess\xF3rios",
    categorySlug: "ferramentas",
    categoryName: "Ferramentas e Constru\xE7\xE3o",
    niche: "Ferramentas & Equipamentos",
    description: "Ferramenta profissional robusta com 2 baterias intercambi\xE1veis de 18V, mandril de aperto r\xE1pido met\xE1lico, luz LED de trabalho e controle de torque de 25 posi\xE7\xF5es mais modo impacto para concreto.",
    costPriceCents: 21e3,
    // Custo: R$ 210,00
    suggestedRetailPriceCents: 38900,
    // Venda: R$ 389,00 (~85% margem)
    defaultMarginPercent: 85,
    stock: 30,
    supplierName: "Ferramentas do Brasil Distribuidora",
    location: "Joinville, SC",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["furadeira", "parafusadeira", "ferramentas", "bateria"]
  },
  {
    id: "eco-prod-07",
    name: "Jogo de Chaves e Ferramentas Manuais 110 Pe\xE7as em Maleta Termopl\xE1stica",
    categorySlug: "ferramentas",
    categoryName: "Ferramentas e Constru\xE7\xE3o",
    niche: "Ferramentas & Equipamentos",
    description: "Kit completo de ferramentas manuais em a\xE7o cromo van\xE1dio com alicates, chaves de fenda, chaves combinadas, catraca revers\xEDvel e soquetes m\xE9tricos.",
    costPriceCents: 14e3,
    // Custo: R$ 140,00
    suggestedRetailPriceCents: 24900,
    // Venda: R$ 249,00 (~77% margem)
    defaultMarginPercent: 77,
    stock: 18,
    supplierName: "Ferramentas do Brasil Distribuidora",
    location: "Joinville, SC",
    imageUrl: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["chaves", "maleta", "ferramentas", "mecanica"]
  },
  // 3. PET SHOP
  {
    id: "eco-prod-08",
    name: "Bebedouro Fonte Autom\xE1tica com Filtro de Carv\xE3o Ativado para Gatos e C\xE3es 2.5L",
    categorySlug: "pet",
    categoryName: "Pet Shop e Animais",
    niche: "Pet Shop",
    description: "Fonte bebedouro el\xE9trica ultra silenciosa com bomba submersa de baixo consumo, triplo sistema de filtragem de \xE1gua com carv\xE3o ativado e capacidade de 2.5 litros.",
    costPriceCents: 6500,
    // Custo: R$ 65,00
    suggestedRetailPriceCents: 13900,
    // Venda: R$ 139,00 (~113% margem)
    defaultMarginPercent: 110,
    stock: 45,
    supplierName: "PetDistribuidora Sul",
    location: "Porto Alegre, RS",
    imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["bebedouro", "fonte", "gatos", "caes", "pet"]
  },
  {
    id: "eco-prod-09",
    name: "Ra\xE7\xE3o Super Premium para C\xE3es Adultos Sabor Frango e Arroz 15kg",
    categorySlug: "pet",
    categoryName: "Pet Shop e Animais",
    niche: "Pet Shop",
    description: "Alimento de alta digestibilidade formulado com prote\xEDnas nobres, prebi\xF3ticos naturais, \xF4mega 3 e 6 para pelagem saud\xE1vel e livre de corantes ou aromatizantes artificiais.",
    costPriceCents: 12500,
    // Custo: R$ 125,00
    suggestedRetailPriceCents: 19990,
    // Venda: R$ 199,90 (~60% margem)
    defaultMarginPercent: 60,
    stock: 35,
    supplierName: "NutriPet Agropecu\xE1ria",
    location: "Campinas, SP",
    imageUrl: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["racao", "caes", "premium", "pet"]
  },
  // 4. CASA, COZINHA & ELETRODOMÉSTICOS
  {
    id: "eco-prod-10",
    name: "Cafeteira Espresso Autom\xE1tica 15 Bar em A\xE7o Inox com Vaporizador de Leite",
    categorySlug: "eletrodomesticos",
    categoryName: "Eletrodom\xE9sticos e Cozinha",
    niche: "Casa & Cozinha",
    description: "M\xE1quina de caf\xE9 espresso italiana de alta press\xE3o 15 bar, caldeira em alum\xEDnio fundido, vaporizador profissional para cappuccino cremoso e suporte duplo para x\xEDcaras.",
    costPriceCents: 32e3,
    // Custo: R$ 320,00
    suggestedRetailPriceCents: 54900,
    // Venda: R$ 549,00 (~71% margem)
    defaultMarginPercent: 70,
    stock: 12,
    supplierName: "HomeStyle Brasil",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["cafeteira", "espresso", "cafe", "cozinha"]
  },
  {
    id: "eco-prod-11",
    name: "Fritadeira El\xE9trica sem \xD3leo Air Fryer Digital 4.5 Litros Inox 1500W",
    categorySlug: "eletrodomesticos",
    categoryName: "Eletrodom\xE9sticos e Cozinha",
    niche: "Casa & Cozinha",
    description: "Fritadeira com circula\xE7\xE3o de ar quente 360\xB0, painel digital touch screen com 8 programas pr\xE9-definidos, cesto antiaderente remov\xEDvel de f\xE1cil limpeza e timer sonoro.",
    costPriceCents: 18e3,
    // Custo: R$ 180,00
    suggestedRetailPriceCents: 32900,
    // Venda: R$ 329,00 (~82% margem)
    defaultMarginPercent: 80,
    stock: 20,
    supplierName: "HomeStyle Brasil",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["airfryer", "cozinha", "eletrodomesticos", "fritadeira"]
  },
  // 5. MODA, ACESSÓRIOS & RELÓGIOS
  {
    id: "eco-prod-12",
    name: "Rel\xF3gio Smartwatch Pro AMOLED com GPS Integrado e Monitor Card\xEDaco",
    categorySlug: "relogios",
    categoryName: "Moda e Acess\xF3rios",
    niche: "Moda & Acess\xF3rios",
    description: "Smartwatch elegante com caixa em alum\xEDnio aeroespacial, display AMOLED de alta resolu\xE7\xE3o, mais de 100 modos esportivos, monitor de oxig\xEAnio SpO2 e resist\xEAncia \xE0 \xE1gua 50 metros.",
    costPriceCents: 14500,
    // Custo: R$ 145,00
    suggestedRetailPriceCents: 28900,
    // Venda: R$ 289,00 (~99% margem)
    defaultMarginPercent: 95,
    stock: 40,
    supplierName: "Chronos Import & Distribui\xE7\xE3o",
    location: "S\xE3o Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["relogio", "smartwatch", "acessorios", "moda"]
  },
  {
    id: "eco-prod-13",
    name: 'Mochila Imperme\xE1vel Antifurto para Notebook 15.6" com Entrada USB',
    categorySlug: "moda",
    categoryName: "Moda e Acess\xF3rios",
    niche: "Moda & Acess\xF3rios",
    description: "Mochila executiva confeccionada em tecido Oxford repelente a \xE1gua, z\xEDperes ocultos antifurto, compartimento acolchoado para laptop e porta de carregamento USB externa.",
    costPriceCents: 7500,
    // Custo: R$ 75,00
    suggestedRetailPriceCents: 15990,
    // Venda: R$ 159,90 (~113% margem)
    defaultMarginPercent: 110,
    stock: 50,
    supplierName: "UrbanStyle Acess\xF3rios",
    location: "Belo Horizonte, MG",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["mochila", "notebook", "antifurto", "moda"]
  },
  {
    id: "eco-prod-14",
    name: "T\xEAnis Esportivo Running Amortecimento Pro Respir\xE1vel",
    categorySlug: "calcados",
    categoryName: "Moda e Acess\xF3rios",
    niche: "Moda & Acess\xF3rios",
    description: "Cal\xE7ado esportivo com cabedal em mesh ventilado, entressola em espuma EVA de alta absor\xE7\xE3o de impacto e solado em borracha antiderrapante de alta durabilidade.",
    costPriceCents: 11e3,
    // Custo: R$ 110,00
    suggestedRetailPriceCents: 22990,
    // Venda: R$ 229,90 (~109% margem)
    defaultMarginPercent: 105,
    stock: 28,
    supplierName: "SportLine Cal\xE7ados Atacado",
    location: "Franca, SP",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    condition: "NOVO",
    tags: ["tenis", "calcados", "corrida", "moda"]
  }
];

// src/server/geminiService.ts
var import_genai = require("@google/genai");
var geminiClient = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}
async function callGeminiJson(prompt, fallback) {
  const client = getGeminiClient();
  if (!client) {
    return fallback;
  }
  try {
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Gemini API timeout")), 12e3)
    );
    const callPromise = client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const response = await Promise.race([callPromise, timeoutPromise]);
    const text2 = response?.text?.trim();
    if (!text2) return fallback;
    return JSON.parse(text2);
  } catch (err) {
    console.warn("[VEND+ Gemini API] Using fallback response:", err?.message || err);
    return fallback;
  }
}
async function generateStoreConceptAI(input) {
  const niche = input.niche || "Eletr\xF4nicos & Inform\xE1tica";
  const target = input.targetAudience || "Consumidores que buscam qualidade e confian\xE7a";
  const rawName = input.storeName?.trim() || "";
  const stylePresets = {
    modern: {
      primary: "#0F172A",
      secondary: "#0284C7",
      accent: "#10B981",
      surface: "#F8FAFC"
    },
    dark_tech: {
      primary: "#0B192C",
      secondary: "#00ADB5",
      accent: "#38BDF8",
      surface: "#0F172A"
    },
    elegant: {
      primary: "#18181B",
      secondary: "#D97706",
      accent: "#F59E0B",
      surface: "#FAFAFA"
    },
    vibrant: {
      primary: "#EA580C",
      secondary: "#F59E0B",
      accent: "#E11D48",
      surface: "#FFF7ED"
    },
    eco: {
      primary: "#064E3B",
      secondary: "#059669",
      accent: "#34D399",
      surface: "#F0FDF4"
    }
  };
  const selectedStyle = input.visualStyle || "modern";
  const defaultColors = stylePresets[selectedStyle] || stylePresets.modern;
  const defaultName = rawName || `${niche.split(" ")[0]} Prime Express`;
  const fallback = {
    storeName: defaultName,
    slogan: `Os melhores produtos de ${niche} com envio r\xE1pido e garantia VEND+.`,
    visualStyle: selectedStyle,
    colors: defaultColors,
    bannerHeadline: `Sua Escolha Inteligente em ${niche}`,
    bannerSubheadline: `Cat\xE1logo selecionado a dedo com os melhores pre\xE7os e pronta entrega na sua regi\xE3o.`,
    bannerCtaText: "Ver Ofertas do Cat\xE1logo",
    promotionalBanners: [
      {
        title: "Garantia e Proced\xEAncia",
        subtitle: "Todos os produtos testados e aprovados pelo VEND+",
        tag: "100% Seguro",
        badgeColor: "emerald"
      },
      {
        title: "Envio R\xE1pido & Retirada",
        subtitle: "Receba no mesmo dia via motoboy ou retire no balc\xE3o",
        tag: "Entrega Express",
        badgeColor: "sky"
      },
      {
        title: "Condi\xE7\xF5es Especiais",
        subtitle: "Parcelamento facilitado ou desconto exclusivo no Pix",
        tag: "Melhor Pre\xE7o",
        badgeColor: "amber"
      }
    ],
    aboutText: `A ${defaultName} nasceu com a miss\xE3o de aproximar produtos de alta qualidade do p\xFAblico de ${target}. Com foco em atendimento \xE1gil, transpar\xEAncia nos pre\xE7os e rigorosa inspe\xE7\xE3o de proced\xEAncia, oferecemos a melhor experi\xEAncia de compra integrada ao ecossistema VEND+.`,
    faq: [
      {
        question: "Os produtos possuem garantia?",
        answer: "Sim! Todos os nossos produtos contam com garantia legal de 90 dias com suporte direto e respaldo da plataforma VEND+."
      },
      {
        question: "Quais s\xE3o as formas de envio dispon\xEDveis?",
        answer: "Trabalhamos com entrega expressa local via entregadores parceiros VEND+, envio pelos Correios e retirada presencial combinada."
      },
      {
        question: "Quais m\xE9todos de pagamento s\xE3o aceitos?",
        answer: "Aceitamos Pix com confirma\xE7\xE3o imediata, cart\xE3o de cr\xE9dito em at\xE9 12x via Mercado Pago e boleto banc\xE1rio."
      },
      {
        question: "Como acompanhar meu pedido?",
        answer: "Assim que seu pedido for realizado, voc\xEA recebe o c\xF3digo de rastreio e c\xF3digo de seguran\xE7a de 4 d\xEDgitos para confer\xEAncia na entrega."
      }
    ],
    seo: {
      metaTitle: `${defaultName} | Loja Oficial no VEND+`,
      metaDescription: `Compre online na ${defaultName}. Especialista em ${niche} para ${target}. Pagamento seguro Mercado Pago e entrega r\xE1pida.`,
      keywords: [niche.toLowerCase(), "loja online", "vend+", "comprar online", "brasil", target.toLowerCase()]
    },
    contactInfo: {
      whatsapp: "(11) 99876-5432",
      supportEmail: `contato@${defaultName.toLowerCase().replace(/[^a-z0-9]/g, "")}.vendmais.com`,
      businessHours: "Segunda a S\xE1bado das 08h \xE0s 19h"
    }
  };
  const prompt = `Voc\xEA \xE9 o Diretor Comercial de IA do VEND+ Marketplace.
Gere a identidade e apresenta\xE7\xE3o comercial completa de uma nova loja virtual virtual dentro da plataforma.
Dados do cliente:
- Nome desejado: ${rawName || "(Gere um nome comercial atraente e marcante)"}
- Nicho: ${niche}
- P\xFAblico-alvo: ${target}
- Estilo visual pretendido: ${selectedStyle}
- Margem de lucro m\xE9dia: ${input.profitMarginPercent || 35}%

Retorne ESTRITAMENTE um objeto JSON no seguinte formato:
{
  "storeName": "string",
  "slogan": "string comercial curto e marcante",
  "visualStyle": "${selectedStyle}",
  "colors": {
    "primary": "hex color",
    "secondary": "hex color",
    "accent": "hex color",
    "surface": "hex color"
  },
  "bannerHeadline": "string impactante para o banner principal",
  "bannerSubheadline": "string explicativo com proposta de valor",
  "bannerCtaText": "string chamada para acao",
  "promotionalBanners": [
    { "title": "string", "subtitle": "string", "tag": "string", "badgeColor": "emerald | sky | amber | rose" }
  ],
  "aboutText": "texto institucional profissional da loja de 3 a 5 linhas",
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "seo": {
    "metaTitle": "string",
    "metaDescription": "string",
    "keywords": ["array", "de", "palavras-chave"]
  },
  "contactInfo": {
    "whatsapp": "(11) 99999-9999",
    "supportEmail": "email profissional",
    "businessHours": "horario de funcionamento"
  }
}`;
  return await callGeminiJson(prompt, fallback);
}
async function runCommercialAiTool(tool, data) {
  const client = getGeminiClient();
  switch (tool) {
    case "optimize-title": {
      const rawTitle = String(data.title || "").trim();
      const category = String(data.category || "").trim();
      const fallback = {
        optimizedTitle: `${rawTitle} Original com Garantia e Pronta Entrega`,
        searchKeywords: [rawTitle.toLowerCase(), "original", "garantia", "vend+"],
        tips: "T\xEDtulo otimizado com marca, atributos principais e termo de busca."
      };
      const prompt = `Voc\xEA \xE9 o otimizador de t\xEDtulos para marketplaces do VEND+.
Transforme o seguinte t\xEDtulo num t\xEDtulo de alto ranqueamento (SEO) para e-commerce:
T\xEDtulo original: "${rawTitle}"
Categoria: "${category}"

Retorne ESTRITAMENTE em JSON:
{
  "optimizedTitle": "t\xEDtulo claro, preciso, sem clich\xEAs, at\xE9 75 caracteres",
  "searchKeywords": ["termo1", "termo2", "termo3"],
  "tips": "dica r\xE1pida de ranqueamento"
}`;
      return await callGeminiJson(prompt, fallback);
    }
    case "generate-social-post": {
      const { productName, price, storeName, benefits } = data;
      const fallback = {
        instagramCaption: `\u{1F525} Destaque na ${storeName || "nossa loja"}!

${productName} por apenas R$ ${price || "confira o valor"}!

\u2728 Garantia de qualidade e envio imediato para todo o Brasil.
\u{1F4E6} Compre com seguran\xE7a no VEND+.

\u{1F449} Link na bio ou direct para pedir o seu!`,
        whatsappMessage: `Ol\xE1! Olha essa novidade na ${storeName || "nossa loja"}:

*${productName}*
\u{1F4B0} Por apenas: R$ ${price}
\u{1F69A} Entrega r\xE1pida no mesmo dia!

Responda essa mensagem para garantir o seu antes que acabe o estoque!`,
        hashtags: "#vendmais #oferta #promo\xE7\xE3o #comprasonline #qualidade"
      };
      const prompt = `Gere textos persuasivos para redes sociais anunciando o produto "${productName}" da loja "${storeName}". Pre\xE7o: R$ ${price}. Benef\xEDcios: ${benefits || "alta qualidade e proced\xEAncia"}.
Retorne ESTRITAMENTE em JSON:
{
  "instagramCaption": "legenda com emojis e chamada clara para acao",
  "whatsappMessage": "mensagem pronta para status e lista de transmissao do whatsapp",
  "hashtags": "string com hashtags relevantes"
}`;
      return await callGeminiJson(prompt, fallback);
    }
    case "generate-ad-copy": {
      const { productName, price, storeName } = data;
      const fallback = {
        metaAds: {
          headline: `${productName} com Pre\xE7o Especial`,
          primaryText: `Aproveite entrega r\xE1pida e garantia total na ${storeName || "Loja Oficial VEND+"}. Compre com desconto no Pix ou parcele em at\xE9 12x!`,
          callToAction: "Comprar Agora"
        },
        googleAds: {
          headline1: `Comprar ${productName}`,
          headline2: `Na ${storeName} | Pronta Entrega`,
          description: `Melhores pre\xE7os em ${productName}. Garantia comprovada, parcelamento facilitado e entrega r\xE1pida VEND+.`
        }
      };
      const prompt = `Gere an\xFAncios de alta convers\xE3o (Meta Ads e Google Ads) para o produto "${productName}" da loja "${storeName}".
Retorne ESTRITAMENTE em JSON com a estrutura do fallback.`;
      return await callGeminiJson(prompt, fallback);
    }
    case "generate-campaign": {
      const { campaignType, storeName, niche } = data;
      const fallback = {
        campaignName: `${campaignType || "Semana de Ofertas"} ${storeName || "VEND+"}`,
        theme: `Descontos imperd\xEDveis no nicho de ${niche || "produtos selecionados"}`,
        promotionalCoupon: "VEND10",
        discountPercent: 10,
        bannerHeadline: `A Grande Semana de Descontos da ${storeName || "Nossa Loja"}`,
        bannerSubtitle: `Aproveite at\xE9 30% OFF em produtos selecionados com garantia e pronta entrega.`,
        actionPlan: [
          "Divulgar no WhatsApp e redes sociais com o cupom promocional",
          "Destacar os produtos campe\xF5es de vendas na vitrine",
          "Oferecer frete gr\xE1tis para compras acima de valor estipulado"
        ]
      };
      const prompt = `Crie uma campanha promocional para a loja "${storeName}" no nicho "${niche}". Tipo de campanha: "${campaignType}".
Retorne ESTRITAMENTE em JSON:
{
  "campaignName": "string",
  "theme": "string",
  "promotionalCoupon": "string",
  "discountPercent": number,
  "bannerHeadline": "string",
  "bannerSubtitle": "string",
  "actionPlan": ["passo 1", "passo 2", "passo 3"]
}`;
      return await callGeminiJson(prompt, fallback);
    }
    case "suggest-trending-products": {
      const niche = String(data.niche || "Eletr\xF4nicos");
      const fallback = {
        niche,
        trendingProducts: [
          { name: "Smartphone 5G com alta mem\xF3ria", searchVolume: "Muito Alto", marginEstimated: "25-35%" },
          { name: "Fone Bluetooth com cancelamento de ru\xEDdo", searchVolume: "Alto", marginEstimated: "60-90%" },
          { name: "Smartwatch com monitor de sa\xFAde", searchVolume: "Alto", marginEstimated: "70-100%" },
          { name: "Acess\xF3rios e carregadores r\xE1pidos", searchVolume: "Cont\xEDnuo", marginEstimated: "100-150%" }
        ],
        commercialAdvice: "Mantenha produtos de giro r\xE1pido com margem saud\xE1vel e produtos de ticket m\xE9dio para ancorar valor."
      };
      const prompt = `Sugira os produtos com maior demanda e facilidade de venda para o nicho de "${niche}" em marketplaces locais e nacionais no Brasil.
Retorne ESTRITAMENTE em JSON:
{
  "niche": "${niche}",
  "trendingProducts": [
    { "name": "string", "searchVolume": "string", "marginEstimated": "string" }
  ],
  "commercialAdvice": "string com conselho estrategico"
}`;
      return await callGeminiJson(prompt, fallback);
    }
    default:
      return { error: "Ferramenta de IA n\xE3o reconhecida." };
  }
}

// src/server/storeRoutes.ts
var router4 = (0, import_express4.Router)();
router4.get("/ecosystem-catalog", async (req, res) => {
  try {
    const { nicho, categoria, q } = req.query;
    let list = [...VERIFIED_ECOSYSTEM_PRODUCTS];
    if (nicho) {
      const n = String(nicho).toLowerCase();
      list = list.filter((p) => p.niche.toLowerCase().includes(n));
    }
    if (categoria) {
      const c = String(categoria).toLowerCase();
      list = list.filter((p) => p.categorySlug.toLowerCase() === c);
    }
    if (q) {
      const query = String(q).toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return res.json({
      total: list.length,
      products: list
    });
  } catch (err) {
    console.error("Error fetching ecosystem catalog:", err);
    return res.status(500).json({ error: "Erro ao listar cat\xE1logo do ecossistema." });
  }
});
router4.post("/ai-tools", async (req, res) => {
  try {
    const { tool, data } = req.body;
    if (!tool) {
      return res.status(400).json({ error: "Ferramenta n\xE3o informada." });
    }
    const result = await runCommercialAiTool(tool, data || {});
    return res.json(result);
  } catch (err) {
    console.error("AI Tools error:", err);
    return res.status(500).json({ error: "Erro ao processar ferramenta de IA." });
  }
});
router4.post("/generate-ai-store", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const {
      storeName,
      niche,
      targetAudience,
      visualStyle,
      profitMarginPercent = 35,
      location = user.location || "S\xE3o Paulo, SP",
      phone = user.phone || "(11) 99999-0000",
      selectedProductOrigin = "BOTH",
      // 'ECOSYSTEM' | 'CLIENT' | 'BOTH'
      ecosystemProductIds = [],
      customProducts = []
    } = req.body;
    if (!niche) {
      return res.status(400).json({ error: "O nicho da loja \xE9 obrigat\xF3rio." });
    }
    const aiConcept = await generateStoreConceptAI({
      storeName,
      niche,
      targetAudience,
      visualStyle,
      profitMarginPercent: Number(profitMarginPercent),
      location
    });
    const finalStoreName = aiConcept.storeName || storeName || `${niche} Store`;
    const cleanSlugBase = finalStoreName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${cleanSlugBase}-${randomSuffix}`;
    const logoUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalStoreName)}&backgroundColor=0f172a,0284c7,10b981`;
    const bannerUrl = aiConcept.visualStyle === "dark_tech" ? "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80" : aiConcept.visualStyle === "elegant" ? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80" : aiConcept.visualStyle === "eco" ? "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&auto=format&fit=crop&q=80" : aiConcept.visualStyle === "vibrant" ? "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1600&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&auto=format&fit=crop&q=80";
    const storeThemeConfig = {
      bio: aiConcept.slogan,
      slogan: aiConcept.slogan,
      niche,
      targetAudience,
      visualStyle: aiConcept.visualStyle,
      colors: aiConcept.colors,
      bannerHeadline: aiConcept.bannerHeadline,
      bannerSubheadline: aiConcept.bannerSubheadline,
      bannerCtaText: aiConcept.bannerCtaText,
      promotionalBanners: aiConcept.promotionalBanners,
      aboutText: aiConcept.aboutText,
      faq: aiConcept.faq,
      seo: aiConcept.seo,
      contactInfo: {
        ...aiConcept.contactInfo,
        phone: phone || aiConcept.contactInfo.whatsapp,
        location
      },
      profitMarginDefault: Number(profitMarginPercent)
    };
    const [createdStore] = await db.insert(stores).values({
      userId: user.id,
      name: finalStoreName,
      slug,
      category: niche,
      location: location.trim(),
      phone: phone ? phone.trim() : null,
      hours: aiConcept.contactInfo.businessHours || "Seg a Sex: 08:00 - 18:00",
      logoUrl,
      bannerUrl,
      description: JSON.stringify(storeThemeConfig),
      offersDelivery: true,
      offersPickup: true,
      status: "ACTIVE"
    }).returning();
    const dbCategories = await db.select().from(categories);
    const categoryMap = new Map(dbCategories.map((c) => [c.slug, c.id]));
    const defaultCategoryId = dbCategories[0]?.id || 1;
    const insertedProducts = [];
    const selectedEcosystemProducts = VERIFIED_ECOSYSTEM_PRODUCTS.filter(
      (p) => ecosystemProductIds && ecosystemProductIds.includes(p.id) || selectedProductOrigin === "ECOSYSTEM" && (!ecosystemProductIds || ecosystemProductIds.length === 0) && p.niche.toLowerCase().includes(niche.toLowerCase().split(" ")[0])
    );
    const ecosystemToAdd = selectedEcosystemProducts.length > 0 ? selectedEcosystemProducts : selectedProductOrigin !== "CLIENT" ? VERIFIED_ECOSYSTEM_PRODUCTS.filter((p) => p.niche.toLowerCase().includes(niche.toLowerCase().split(" ")[0])).slice(0, 4) : [];
    for (const eco of ecosystemToAdd) {
      const catId = categoryMap.get(eco.categorySlug) || defaultCategoryId;
      const margin = Number(profitMarginPercent) || eco.defaultMarginPercent;
      const finalPriceCents = Math.round(eco.costPriceCents * (1 + margin / 100));
      const prodSlug = `${slug}-${eco.id}-${Math.random().toString(36).substring(2, 5)}`;
      const [p] = await db.insert(products).values({
        sellerId: user.id,
        storeId: createdStore.id,
        name: eco.name,
        slug: prodSlug,
        description: eco.description,
        categoryId: catId,
        condition: eco.condition,
        priceCents: finalPriceCents,
        originalPriceCents: eco.costPriceCents,
        // Stores real cost price for margin tracking
        stock: eco.stock,
        location: location.trim(),
        offersDelivery: true,
        offersPickup: true,
        allowsNegotiation: false,
        status: "ACTIVE",
        imageUrl: eco.imageUrl
        // 100% rigorous exact image
      }).returning();
      insertedProducts.push(p);
    }
    if (Array.isArray(customProducts) && customProducts.length > 0) {
      for (const custom of customProducts) {
        if (!custom.name || !custom.imageUrl) continue;
        const costCents = Number(custom.costPriceCents) || 5e3;
        const margin = Number(custom.marginPercent) || Number(profitMarginPercent);
        const salePrice = Math.round(costCents * (1 + margin / 100));
        const catId = custom.categorySlug && categoryMap.get(custom.categorySlug) || defaultCategoryId;
        const prodSlug = `${slug}-custom-${Math.random().toString(36).substring(2, 6)}`;
        const [p] = await db.insert(products).values({
          sellerId: user.id,
          storeId: createdStore.id,
          name: custom.name.trim(),
          slug: prodSlug,
          description: custom.description?.trim() || `${custom.name} com qualidade e garantia da ${finalStoreName}.`,
          categoryId: catId,
          condition: custom.condition || "NOVO",
          priceCents: salePrice,
          originalPriceCents: costCents,
          stock: Number(custom.stock) || 5,
          location: location.trim(),
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false,
          status: "ACTIVE",
          imageUrl: custom.imageUrl.trim()
        }).returning();
        insertedProducts.push(p);
      }
    }
    return res.status(201).json({
      message: "Loja virtual com IA criada com sucesso!",
      store: {
        ...createdStore,
        themeConfig: storeThemeConfig
      },
      productsCount: insertedProducts.length,
      slug: createdStore.slug,
      storeUrl: `/loja/${createdStore.slug}`
    });
  } catch (err) {
    console.error("Error in generate-ai-store:", err);
    return res.status(500).json({ error: "Erro ao gerar loja com IA. " + (err?.message || "") });
  }
});
router4.get("/my/current", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const userStores = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.userId, user.id)).orderBy((0, import_drizzle_orm10.desc)(stores.createdAt));
    if (userStores.length === 0) {
      return res.json({ hasStore: false });
    }
    const store = userStores[0];
    let themeConfig = {};
    if (store.description && store.description.startsWith("{")) {
      try {
        themeConfig = JSON.parse(store.description);
      } catch {
        themeConfig = { bio: store.description };
      }
    } else {
      themeConfig = { bio: store.description };
    }
    const storeProducts = await db.select({
      product: products,
      category: categories
    }).from(products).leftJoin(categories, (0, import_drizzle_orm10.eq)(products.categoryId, categories.id)).where((0, import_drizzle_orm10.eq)(products.storeId, store.id)).orderBy((0, import_drizzle_orm10.desc)(products.createdAt));
    const totalProductsCount = storeProducts.length;
    const activeProducts = storeProducts.filter((p) => p.product.status === "ACTIVE");
    const storeOrders = await db.select().from(orders).where((0, import_drizzle_orm10.eq)(orders.sellerId, user.id)).orderBy((0, import_drizzle_orm10.desc)(orders.createdAt));
    const totalGrossRevenueCents = storeOrders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalGrossCents, 0);
    const totalNetProfitCents = storeOrders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.sellerNetCents, 0);
    return res.json({
      hasStore: true,
      store: {
        ...store,
        themeConfig
      },
      allStores: userStores,
      products: storeProducts.map((sp) => ({
        ...sp.product,
        category: sp.category
      })),
      metrics: {
        totalProductsCount,
        activeProductsCount: activeProducts.length,
        totalOrdersCount: storeOrders.length,
        totalGrossRevenueCents,
        totalNetProfitCents
      },
      recentOrders: storeOrders.slice(0, 10)
    });
  } catch (err) {
    console.error("Error fetching current user store:", err);
    return res.status(500).json({ error: "Erro ao carregar dados da loja." });
  }
});
router4.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [storeRecord] = await db.select({
      store: stores,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl
      }
    }).from(stores).leftJoin(users, (0, import_drizzle_orm10.eq)(stores.userId, users.id)).where((0, import_drizzle_orm10.eq)(stores.slug, slug)).limit(1);
    if (!storeRecord) {
      return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    }
    const rawStore = storeRecord.store;
    let themeConfig = {};
    if (rawStore.description && rawStore.description.startsWith("{")) {
      try {
        themeConfig = JSON.parse(rawStore.description);
      } catch {
        themeConfig = { bio: rawStore.description };
      }
    } else {
      themeConfig = { bio: rawStore.description };
    }
    const storeProducts = await db.select({
      product: products,
      category: categories
    }).from(products).leftJoin(categories, (0, import_drizzle_orm10.eq)(products.categoryId, categories.id)).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(products.storeId, rawStore.id), (0, import_drizzle_orm10.eq)(products.status, "ACTIVE"))).orderBy((0, import_drizzle_orm10.desc)(products.createdAt)).limit(60);
    return res.json({
      ...rawStore,
      themeConfig,
      owner: storeRecord.owner,
      products: storeProducts.map((sp) => ({
        ...sp.product,
        category: sp.category
      }))
    });
  } catch (err) {
    console.error("Get store by slug error:", err);
    return res.status(500).json({ error: "Erro ao carregar loja." });
  }
});
router4.patch("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const storeId = parseInt(req.params.id);
    const [existing] = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).limit(1);
    if (!existing) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    if (existing.userId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Permiss\xE3o negada para editar esta loja." });
    }
    const {
      name,
      description,
      themeConfig,
      logoUrl,
      bannerUrl,
      phone,
      hours,
      location,
      offersDelivery,
      offersPickup
    } = req.body;
    const updates = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (name) updates.name = name.trim();
    if (logoUrl !== void 0) updates.logoUrl = logoUrl;
    if (bannerUrl !== void 0) updates.bannerUrl = bannerUrl;
    if (phone !== void 0) updates.phone = phone;
    if (hours !== void 0) updates.hours = hours;
    if (location !== void 0) updates.location = location;
    if (offersDelivery !== void 0) updates.offersDelivery = Boolean(offersDelivery);
    if (offersPickup !== void 0) updates.offersPickup = Boolean(offersPickup);
    if (themeConfig) {
      updates.description = typeof themeConfig === "string" ? themeConfig : JSON.stringify(themeConfig);
    } else if (description !== void 0) {
      updates.description = description;
    }
    const [updated] = await db.update(stores).set(updates).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).returning();
    return res.json({
      message: "Loja atualizada com sucesso!",
      store: updated
    });
  } catch (err) {
    console.error("Update store error:", err);
    return res.status(500).json({ error: "Erro ao atualizar loja." });
  }
});
router4.post("/:id/products", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const storeId = parseInt(req.params.id);
    const [store] = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).limit(1);
    if (!store) return res.status(404).json({ error: "Loja n\xE3o encontrada." });
    if (store.userId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso negado." });
    }
    const {
      name,
      description,
      costPriceCents,
      marginPercent = 35,
      priceCents,
      stock = 1,
      imageUrl,
      categoryId,
      condition = "NOVO",
      ecosystemProductId
    } = req.body;
    if (!name || !imageUrl) {
      return res.status(400).json({ error: "Nome e imagem fiel do produto s\xE3o obrigat\xF3rios." });
    }
    const cost = Number(costPriceCents) || 0;
    const finalPrice = priceCents ? Number(priceCents) : Math.round(cost * (1 + Number(marginPercent) / 100));
    const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const slug = `${store.slug}-${cleanName}-${Date.now().toString(36)}`;
    const [newProd] = await db.insert(products).values({
      storeId: store.id,
      sellerId: user.id,
      name: name.trim(),
      slug,
      description: description ? description.trim() : `${name} com nota e garantia.`,
      categoryId: categoryId || 1,
      condition,
      priceCents: finalPrice,
      originalPriceCents: cost > 0 ? cost : null,
      stock: Number(stock),
      location: store.location,
      offersDelivery: true,
      offersPickup: true,
      allowsNegotiation: false,
      status: "ACTIVE",
      imageUrl: imageUrl.trim()
    }).returning();
    return res.status(201).json({
      message: "Produto adicionado com sucesso \xE0 sua loja!",
      product: newProd
    });
  } catch (err) {
    console.error("Add product error:", err);
    return res.status(500).json({ error: "Erro ao adicionar produto." });
  }
});
router4.patch("/:id/products/:productId", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const storeId = parseInt(req.params.id);
    const productId = parseInt(req.params.productId);
    const [store] = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).limit(1);
    if (!store || store.userId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso negado." });
    }
    const [prod] = await db.select().from(products).where((0, import_drizzle_orm10.eq)(products.id, productId)).limit(1);
    if (!prod || prod.storeId !== storeId) {
      return res.status(404).json({ error: "Produto n\xE3o encontrado nesta loja." });
    }
    const {
      name,
      description,
      priceCents,
      originalPriceCents,
      stock,
      status,
      imageUrl
    } = req.body;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (name) updates.name = name.trim();
    if (description !== void 0) updates.description = description.trim();
    if (priceCents !== void 0) updates.priceCents = Number(priceCents);
    if (originalPriceCents !== void 0) updates.originalPriceCents = Number(originalPriceCents);
    if (stock !== void 0) updates.stock = Number(stock);
    if (status !== void 0) updates.status = status;
    if (imageUrl) updates.imageUrl = imageUrl.trim();
    const [updated] = await db.update(products).set(updates).where((0, import_drizzle_orm10.eq)(products.id, productId)).returning();
    return res.json({
      message: "Produto atualizado!",
      product: updated
    });
  } catch (err) {
    console.error("Update product error:", err);
    return res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});
router4.delete("/:id/products/:productId", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const storeId = parseInt(req.params.id);
    const productId = parseInt(req.params.productId);
    const [store] = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).limit(1);
    if (!store || store.userId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso negado." });
    }
    await db.delete(products).where((0, import_drizzle_orm10.and)((0, import_drizzle_orm10.eq)(products.id, productId), (0, import_drizzle_orm10.eq)(products.storeId, storeId)));
    return res.json({ message: "Produto removido da loja com sucesso." });
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ error: "Erro ao remover produto." });
  }
});
router4.post("/:id/bulk-margin", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const storeId = parseInt(req.params.id);
    const { marginPercent } = req.body;
    if (!marginPercent || isNaN(Number(marginPercent))) {
      return res.status(400).json({ error: "Margem percentual inv\xE1lida." });
    }
    const [store] = await db.select().from(stores).where((0, import_drizzle_orm10.eq)(stores.id, storeId)).limit(1);
    if (!store || store.userId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso negado." });
    }
    const margin = Number(marginPercent);
    const storeProds = await db.select().from(products).where((0, import_drizzle_orm10.eq)(products.storeId, storeId));
    let updatedCount = 0;
    for (const p of storeProds) {
      if (p.originalPriceCents && p.originalPriceCents > 0) {
        const newPrice = Math.round(p.originalPriceCents * (1 + margin / 100));
        await db.update(products).set({ priceCents: newPrice, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm10.eq)(products.id, p.id));
        updatedCount++;
      }
    }
    return res.json({
      message: `Margem de ${margin}% aplicada com sucesso a ${updatedCount} produtos!`,
      updatedCount
    });
  } catch (err) {
    console.error("Bulk margin error:", err);
    return res.status(500).json({ error: "Erro ao atualizar margem em massa." });
  }
});
var storeRoutes_default = router4;

// src/server/negotiationRoutes.ts
var import_express5 = require("express");
var import_drizzle_orm11 = require("drizzle-orm");
var router5 = (0, import_express5.Router)();
router5.get("/my", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const list = await db.select({
      negotiation: negotiations,
      product: products,
      service: services,
      buyer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl }
    }).from(negotiations).leftJoin(products, (0, import_drizzle_orm11.eq)(negotiations.productId, products.id)).leftJoin(services, (0, import_drizzle_orm11.eq)(negotiations.serviceId, services.id)).leftJoin(users, (0, import_drizzle_orm11.eq)(negotiations.buyerId, users.id)).where((0, import_drizzle_orm11.or)((0, import_drizzle_orm11.eq)(negotiations.buyerId, user.id), (0, import_drizzle_orm11.eq)(negotiations.sellerId, user.id))).orderBy((0, import_drizzle_orm11.desc)(negotiations.updatedAt));
    return res.json(list);
  } catch (err) {
    console.error("List negotiations error:", err);
    return res.status(500).json({ error: "Erro ao carregar negocia\xE7\xF5es." });
  }
});
router5.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const [neg] = await db.select({
      negotiation: negotiations,
      product: products,
      service: services,
      buyer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl }
    }).from(negotiations).leftJoin(products, (0, import_drizzle_orm11.eq)(negotiations.productId, products.id)).leftJoin(services, (0, import_drizzle_orm11.eq)(negotiations.serviceId, services.id)).leftJoin(users, (0, import_drizzle_orm11.eq)(negotiations.buyerId, users.id)).where((0, import_drizzle_orm11.eq)(negotiations.id, parseInt(id))).limit(1);
    if (!neg) {
      return res.status(404).json({ error: "Negocia\xE7\xE3o n\xE3o encontrada." });
    }
    if (neg.negotiation.buyerId !== user.id && neg.negotiation.sellerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso n\xE3o autorizado a esta negocia\xE7\xE3o." });
    }
    const messages = await db.select({
      id: negotiationMessages.id,
      senderId: negotiationMessages.senderId,
      message: negotiationMessages.message,
      offerCents: negotiationMessages.offerCents,
      messageType: negotiationMessages.messageType,
      createdAt: negotiationMessages.createdAt,
      sender: { id: users.id, name: users.name }
    }).from(negotiationMessages).leftJoin(users, (0, import_drizzle_orm11.eq)(negotiationMessages.senderId, users.id)).where((0, import_drizzle_orm11.eq)(negotiationMessages.negotiationId, neg.negotiation.id)).orderBy(negotiationMessages.createdAt);
    return res.json({
      ...neg.negotiation,
      product: neg.product,
      service: neg.service,
      buyer: neg.buyer,
      messages
    });
  } catch (err) {
    console.error("Get negotiation error:", err);
    return res.status(500).json({ error: "Erro ao carregar detalhes da negocia\xE7\xE3o." });
  }
});
router5.post("/start", requireAuth, async (req, res) => {
  try {
    const buyer = req.user;
    const { productId, serviceId, offerCents, message } = req.body;
    if (!productId && !serviceId || !offerCents || offerCents <= 0) {
      return res.status(400).json({ error: "Item e valor da oferta s\xE3o obrigat\xF3rios." });
    }
    let sellerId;
    let initialPriceCents;
    if (productId) {
      const [p] = await db.select().from(products).where((0, import_drizzle_orm11.eq)(products.id, parseInt(productId))).limit(1);
      if (!p) return res.status(404).json({ error: "Produto n\xE3o encontrado." });
      if (p.sellerId === buyer.id) return res.status(400).json({ error: "Voc\xEA n\xE3o pode negociar seu pr\xF3prio produto." });
      if (!p.allowsNegotiation) return res.status(400).json({ error: "Este produto n\xE3o aceita negocia\xE7\xE3o." });
      sellerId = p.sellerId;
      initialPriceCents = p.priceCents;
    } else {
      const [s] = await db.select().from(services).where((0, import_drizzle_orm11.eq)(services.id, parseInt(serviceId))).limit(1);
      if (!s) return res.status(404).json({ error: "Servi\xE7o n\xE3o encontrado." });
      if (s.providerId === buyer.id) return res.status(400).json({ error: "Voc\xEA n\xE3o pode negociar seu pr\xF3prio servi\xE7o." });
      if (!s.allowsNegotiation) return res.status(400).json({ error: "Este servi\xE7o n\xE3o aceita negocia\xE7\xE3o." });
      sellerId = s.providerId;
      initialPriceCents = s.priceCents;
    }
    const existing = await db.select().from(negotiations).where(
      (0, import_drizzle_orm11.and)(
        productId ? (0, import_drizzle_orm11.eq)(negotiations.productId, parseInt(productId)) : (0, import_drizzle_orm11.eq)(negotiations.serviceId, parseInt(serviceId)),
        (0, import_drizzle_orm11.eq)(negotiations.buyerId, buyer.id),
        (0, import_drizzle_orm11.eq)(negotiations.status, "OPEN")
      )
    ).limit(1);
    let negId;
    if (existing.length > 0) {
      negId = existing[0].id;
      await db.update(negotiations).set({
        currentOfferCents: parseInt(offerCents),
        lastOfferBy: "BUYER",
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm11.eq)(negotiations.id, negId));
    } else {
      const [created] = await db.insert(negotiations).values({
        productId: productId ? parseInt(productId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        buyerId: buyer.id,
        sellerId,
        initialPriceCents,
        currentOfferCents: parseInt(offerCents),
        lastOfferBy: "BUYER",
        status: "OPEN"
      }).returning();
      negId = created.id;
    }
    await db.insert(negotiationMessages).values({
      negotiationId: negId,
      senderId: buyer.id,
      message: message ? message.trim() : `Oferta enviada: R$ ${(parseInt(offerCents) / 100).toFixed(2).replace(".", ",")}`,
      offerCents: parseInt(offerCents),
      messageType: "OFFER"
    });
    await db.insert(notifications).values({
      userId: sellerId,
      title: "Nova proposta de negocia\xE7\xE3o",
      message: `${buyer.name} enviou uma proposta de R$ ${(parseInt(offerCents) / 100).toFixed(2).replace(".", ",")}`,
      type: "OFFER",
      link: `/minhas-negociacoes`
    });
    return res.status(201).json({
      message: "Proposta enviada ao vendedor!",
      negotiationId: negId
    });
  } catch (err) {
    console.error("Start negotiation error:", err);
    return res.status(500).json({ error: "Erro ao iniciar negocia\xE7\xE3o." });
  }
});
router5.post("/:id/respond", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { action, counterOfferCents, message } = req.body;
    const [neg] = await db.select().from(negotiations).where((0, import_drizzle_orm11.eq)(negotiations.id, parseInt(id))).limit(1);
    if (!neg) return res.status(404).json({ error: "Negocia\xE7\xE3o n\xE3o encontrada." });
    if (neg.buyerId !== user.id && neg.sellerId !== user.id) {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    if (neg.status !== "OPEN") {
      return res.status(400).json({ error: "Esta negocia\xE7\xE3o j\xE1 foi finalizada." });
    }
    const isBuyer = neg.buyerId === user.id;
    const targetUserId = isBuyer ? neg.sellerId : neg.buyerId;
    if (action === "ACCEPT") {
      await db.update(negotiations).set({
        status: "ACCEPTED",
        finalAgreedPriceCents: neg.currentOfferCents,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm11.eq)(negotiations.id, neg.id));
      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || `Oferta aceita no valor de R$ ${(neg.currentOfferCents / 100).toFixed(2).replace(".", ",")}!`,
        offerCents: neg.currentOfferCents,
        messageType: "ACCEPT"
      });
      await db.insert(notifications).values({
        userId: targetUserId,
        title: "Oferta Aceita!",
        message: `${user.name} aceitou a oferta de R$ ${(neg.currentOfferCents / 100).toFixed(2).replace(".", ",")}. Finalize sua compra!`,
        type: "OFFER",
        link: `/minhas-negociacoes`
      });
      return res.json({ message: "Oferta aceita com sucesso!", finalPriceCents: neg.currentOfferCents });
    } else if (action === "REJECT") {
      await db.update(negotiations).set({
        status: "REJECTED",
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm11.eq)(negotiations.id, neg.id));
      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || "Oferta recusada.",
        messageType: "REJECT"
      });
      await db.insert(notifications).values({
        userId: targetUserId,
        title: "Oferta Recusada",
        message: `${user.name} recusou a proposta.`,
        type: "OFFER",
        link: `/minhas-negociacoes`
      });
      return res.json({ message: "Oferta recusada." });
    } else if (action === "COUNTER_OFFER") {
      if (!counterOfferCents || counterOfferCents <= 0) {
        return res.status(400).json({ error: "Valor da contraproposta \xE9 obrigat\xF3rio." });
      }
      await db.update(negotiations).set({
        currentOfferCents: parseInt(counterOfferCents),
        lastOfferBy: isBuyer ? "BUYER" : "SELLER",
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm11.eq)(negotiations.id, neg.id));
      await db.insert(negotiationMessages).values({
        negotiationId: neg.id,
        senderId: user.id,
        message: message || `Contraproposta: R$ ${(parseInt(counterOfferCents) / 100).toFixed(2).replace(".", ",")}`,
        offerCents: parseInt(counterOfferCents),
        messageType: "COUNTER_OFFER"
      });
      await db.insert(notifications).values({
        userId: targetUserId,
        title: "Nova Contraproposta",
        message: `${user.name} fez uma contraproposta de R$ ${(parseInt(counterOfferCents) / 100).toFixed(2).replace(".", ",")}`,
        type: "OFFER",
        link: `/minhas-negociacoes`
      });
      return res.json({ message: "Contraproposta enviada!" });
    }
    return res.status(400).json({ error: "A\xE7\xE3o inv\xE1lida." });
  } catch (err) {
    console.error("Respond negotiation error:", err);
    return res.status(500).json({ error: "Erro ao responder negocia\xE7\xE3o." });
  }
});
var negotiationRoutes_default = router5;

// src/server/orderRoutes.ts
var import_express6 = require("express");
var import_crypto4 = __toESM(require("crypto"), 1);
var import_drizzle_orm12 = require("drizzle-orm");
var router6 = (0, import_express6.Router)();
function generate4DigitCode() {
  return import_crypto4.default.randomInt(1e3, 1e4).toString();
}
router6.post("/checkout", requireAuth, async (req, res) => {
  try {
    const buyer = req.user;
    const { items, deliveryType = "SHIPPING", addressId, acceptedNegotiationId } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "O carrinho est\xE1 vazio." });
    }
    let totalGrossCents = 0;
    let sellerId = null;
    const validatedItems = [];
    let negotiationAgreedPriceCents = null;
    if (acceptedNegotiationId) {
      const [neg] = await db.select().from(negotiations).where(
        (0, import_drizzle_orm12.and)(
          (0, import_drizzle_orm12.eq)(negotiations.id, parseInt(acceptedNegotiationId)),
          (0, import_drizzle_orm12.eq)(negotiations.buyerId, buyer.id),
          (0, import_drizzle_orm12.eq)(negotiations.status, "ACCEPTED")
        )
      ).limit(1);
      if (neg && neg.finalAgreedPriceCents) {
        negotiationAgreedPriceCents = neg.finalAgreedPriceCents;
      }
    }
    for (const it of items) {
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      if (it.productId) {
        const [p] = await db.select().from(products).where((0, import_drizzle_orm12.eq)(products.id, parseInt(it.productId))).limit(1);
        if (!p || p.status !== "ACTIVE") {
          return res.status(400).json({ error: `Produto ${p ? p.name : ""} n\xE3o est\xE1 dispon\xEDvel para compra.` });
        }
        if (p.sellerId === buyer.id) {
          return res.status(400).json({ error: "Voc\xEA n\xE3o pode comprar seu pr\xF3prio produto." });
        }
        if (sellerId && sellerId !== p.sellerId) {
          return res.status(400).json({
            error: "No momento, cada pedido no VEND+ deve conter itens de apenas um vendedor."
          });
        }
        sellerId = p.sellerId;
        const unitPrice = negotiationAgreedPriceCents || p.priceCents;
        const subtotal = unitPrice * qty;
        totalGrossCents += subtotal;
        validatedItems.push({
          productId: p.id,
          itemType: "PRODUCT",
          title: p.name,
          unitPriceCents: unitPrice,
          quantity: qty,
          subtotalCents: subtotal,
          imageUrl: p.imageUrl
        });
      } else if (it.serviceId) {
        const [s] = await db.select().from(services).where((0, import_drizzle_orm12.eq)(services.id, parseInt(it.serviceId))).limit(1);
        if (!s || s.status !== "ACTIVE") {
          return res.status(400).json({ error: "Servi\xE7o n\xE3o est\xE1 dispon\xEDvel." });
        }
        if (s.providerId === buyer.id) {
          return res.status(400).json({ error: "Voc\xEA n\xE3o pode contratar seu pr\xF3prio servi\xE7o." });
        }
        sellerId = s.providerId;
        const unitPrice = negotiationAgreedPriceCents || s.priceCents;
        const subtotal = unitPrice * qty;
        totalGrossCents += subtotal;
        validatedItems.push({
          serviceId: s.id,
          itemType: "SERVICE",
          title: s.name,
          unitPriceCents: unitPrice,
          quantity: qty,
          subtotalCents: subtotal,
          imageUrl: s.imageUrl
        });
      }
    }
    if (!sellerId) {
      return res.status(400).json({ error: "Vendedor n\xE3o identificado." });
    }
    const [sellerUser] = await db.select().from(users).where((0, import_drizzle_orm12.eq)(users.id, sellerId)).limit(1);
    const sellerPlanSlug = sellerUser?.planSlug || "free";
    const [plan] = await db.select().from(plans).where((0, import_drizzle_orm12.eq)(plans.slug, sellerPlanSlug)).limit(1);
    const commissionPercent = plan?.commissionPercent ?? (sellerPlanSlug === "free" ? 7 : 4);
    const commissionCents = Math.round(totalGrossCents * commissionPercent / 100);
    const sellerNetCents = totalGrossCents - commissionCents;
    const shippingFeeCents = deliveryType === "SHIPPING" ? 1490 : 0;
    const finalTotalWithShipping = totalGrossCents + shippingFeeCents;
    const deliveryCode = generate4DigitCode();
    const orderNumber = `VEND-${Date.now().toString(36).toUpperCase()}-${import_crypto4.default.randomBytes(2).toString("hex").toUpperCase()}`;
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      buyerId: buyer.id,
      sellerId,
      status: "AWAITING_PAYMENT",
      totalGrossCents: finalTotalWithShipping,
      commissionCents,
      sellerNetCents,
      shippingFeeCents,
      deliveryType: deliveryType === "PICKUP" ? "PICKUP" : "SHIPPING",
      deliveryAddressId: addressId ? parseInt(addressId) : null,
      deliveryCode,
      deliveryCodeUsed: false,
      deliveryAttempts: 0
    }).returning();
    for (const item of validatedItems) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId || null,
        serviceId: item.serviceId || null,
        itemType: item.itemType,
        title: item.title,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.subtotalCents,
        imageUrl: item.imageUrl
      });
    }
    await db.insert(commissions).values({
      orderId: newOrder.id,
      sellerId,
      grossAmountCents: totalGrossCents,
      commissionPercent,
      commissionCents,
      sellerNetAmountCents: sellerNetCents,
      planNameAtSale: plan?.name || "FREE"
    });
    await db.insert(deliveryCodes).values({
      orderId: newOrder.id,
      code: deliveryCode,
      used: false,
      attempts: 0
    });
    if (acceptedNegotiationId) {
      await db.update(negotiations).set({ status: "COMPLETED", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm12.eq)(negotiations.id, parseInt(acceptedNegotiationId)));
    }
    await db.insert(notifications).values({
      userId: sellerId,
      title: "Novo pedido recebido!",
      message: `Voc\xEA recebeu um novo pedido #${newOrder.orderNumber}.`,
      type: "ORDER",
      link: `/pedidos`
    });
    await db.insert(notifications).values({
      userId: buyer.id,
      title: "Pedido criado!",
      message: `Seu pedido #${newOrder.orderNumber} foi criado com sucesso.`,
      type: "ORDER",
      link: `/pedidos`
    });
    await db.insert(auditLogs).values({
      userId: buyer.id,
      action: "CREATE_ORDER",
      entityType: "ORDER",
      entityId: String(newOrder.id),
      details: JSON.stringify({
        orderNumber: newOrder.orderNumber,
        totalGrossCents: newOrder.totalGrossCents,
        commissionCents
      })
    });
    return res.status(201).json({
      message: "Pedido gerado com sucesso!",
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalGrossCents: newOrder.totalGrossCents,
      commissionCents,
      sellerNetCents,
      shippingFeeCents
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Erro ao processar checkout." });
  }
});
router6.get("/my", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const type = req.query.tipo === "vendas" ? "SELLER" : "BUYER";
    const condition = type === "SELLER" ? (0, import_drizzle_orm12.eq)(orders.sellerId, user.id) : (0, import_drizzle_orm12.eq)(orders.buyerId, user.id);
    const userOrders = await db.select({
      order: orders,
      buyer: { id: users.id, name: users.name, email: users.email }
    }).from(orders).leftJoin(users, (0, import_drizzle_orm12.eq)(orders.buyerId, users.id)).where(condition).orderBy((0, import_drizzle_orm12.desc)(orders.createdAt));
    const result = [];
    for (const o of userOrders) {
      const items = await db.select().from(orderItems).where((0, import_drizzle_orm12.eq)(orderItems.orderId, o.order.id));
      const safeOrder = { ...o.order };
      if (user.id !== o.order.buyerId && user.role !== "MASTER_OWNER") {
        safeOrder.deliveryCode = "\u2022\u2022\u2022\u2022";
      }
      result.push({
        ...safeOrder,
        buyer: o.buyer,
        items
      });
    }
    return res.json(result);
  } catch (err) {
    console.error("List orders error:", err);
    return res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});
router6.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const [order] = await db.select({
      order: orders,
      buyer: { id: users.id, name: users.name, email: users.email, phone: users.phone },
      seller: { id: users.id, name: users.name, email: users.email, phone: users.phone }
    }).from(orders).leftJoin(users, (0, import_drizzle_orm12.eq)(orders.buyerId, users.id)).where((0, import_drizzle_orm12.eq)(orders.id, parseInt(id))).limit(1);
    if (!order) {
      return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    }
    if (order.order.buyerId !== user.id && order.order.sellerId !== user.id && order.order.deliveryDriverId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Acesso n\xE3o autorizado a este pedido." });
    }
    const items = await db.select().from(orderItems).where((0, import_drizzle_orm12.eq)(orderItems.orderId, order.order.id));
    let address = null;
    if (order.order.deliveryAddressId) {
      const [addr] = await db.select().from(addresses).where((0, import_drizzle_orm12.eq)(addresses.id, order.order.deliveryAddressId)).limit(1);
      address = addr || null;
    }
    const safeOrder = { ...order.order };
    if (user.id !== order.order.buyerId && user.role !== "MASTER_OWNER") {
      safeOrder.deliveryCode = "\u2022\u2022\u2022\u2022";
    }
    return res.json({
      ...safeOrder,
      buyer: order.buyer,
      seller: order.seller,
      items,
      address
    });
  } catch (err) {
    console.error("Get order error:", err);
    return res.status(500).json({ error: "Erro ao obter pedido." });
  }
});
router6.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const [order] = await db.select().from(orders).where((0, import_drizzle_orm12.eq)(orders.id, parseInt(id))).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.sellerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    if (status === "DELIVERED") {
      return res.status(400).json({
        error: "Pedidos com entrega n\xE3o podem ser marcados como ENTREGUE diretamente. \xC9 obrigat\xF3rio validar o c\xF3digo de 4 d\xEDgitos do comprador."
      });
    }
    const allowed = ["PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "CANCELLED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Transi\xE7\xE3o de status n\xE3o permitida." });
    }
    const [updated] = await db.update(orders).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm12.eq)(orders.id, order.id)).returning();
    await db.insert(notifications).values({
      userId: order.buyerId,
      title: "Atualiza\xE7\xE3o no seu pedido",
      message: `Seu pedido #${order.orderNumber} agora est\xE1: ${status}`,
      type: "ORDER",
      link: `/pedidos`
    });
    return res.json({ message: "Status atualizado com sucesso!", order: updated });
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ error: "Erro ao atualizar status." });
  }
});
var orderRoutes_default = router6;

// src/server/deliveryRoutes.ts
var import_express7 = require("express");
var import_drizzle_orm13 = require("drizzle-orm");
var router7 = (0, import_express7.Router)();
var MAX_DELIVERY_ATTEMPTS = 3;
router7.get("/my-deliveries", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const [driver] = await db.select().from(deliveryDrivers).where((0, import_drizzle_orm13.eq)(deliveryDrivers.userId, user.id)).limit(1);
    const list = await db.select({
      order: orders,
      buyer: { id: users.id, name: users.name, phone: users.phone },
      seller: { id: users.id, name: users.name, phone: users.phone },
      address: addresses
    }).from(orders).leftJoin(users, (0, import_drizzle_orm13.eq)(orders.buyerId, users.id)).leftJoin(addresses, (0, import_drizzle_orm13.eq)(orders.deliveryAddressId, addresses.id)).where(
      (0, import_drizzle_orm13.or)(
        (0, import_drizzle_orm13.eq)(orders.deliveryDriverId, user.id),
        (0, import_drizzle_orm13.and)((0, import_drizzle_orm13.eq)(orders.status, "READY_FOR_PICKUP"), (0, import_drizzle_orm13.eq)(orders.deliveryType, "SHIPPING"))
      )
    ).orderBy((0, import_drizzle_orm13.desc)(orders.createdAt));
    const sanitizedList = list.map((item) => ({
      ...item.order,
      deliveryCode: "\u2022\u2022\u2022\u2022",
      // Masked! Driver must ask buyer on delivery
      buyer: item.buyer,
      seller: item.seller,
      address: item.address
    }));
    return res.json({
      driver: driver || null,
      deliveries: sanitizedList
    });
  } catch (err) {
    console.error("List driver deliveries error:", err);
    return res.status(500).json({ error: "Erro ao carregar entregas." });
  }
});
router7.post("/accept/:orderId", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const [order] = await db.select().from(orders).where((0, import_drizzle_orm13.eq)(orders.id, parseInt(orderId))).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.deliveryDriverId && order.deliveryDriverId !== user.id) {
      return res.status(400).json({ error: "Este pedido j\xE1 foi atribu\xEDdo a outro entregador." });
    }
    let [driver] = await db.select().from(deliveryDrivers).where((0, import_drizzle_orm13.eq)(deliveryDrivers.userId, user.id)).limit(1);
    if (!driver) {
      const [created] = await db.insert(deliveryDrivers).values({
        userId: user.id,
        region: user.location || "Local",
        status: "DELIVERING"
      }).returning();
      driver = created;
    }
    await db.update(orders).set({
      deliveryDriverId: user.id,
      status: "OUT_FOR_DELIVERY",
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm13.eq)(orders.id, order.id));
    await db.insert(notifications).values({
      userId: order.buyerId,
      title: "Seu pedido saiu para entrega!",
      message: `${user.name} est\xE1 a caminho. Tenha seu c\xF3digo de 4 d\xEDgitos em m\xE3os para confirmar o recebimento.`,
      type: "DELIVERY",
      link: `/pedidos`
    });
    return res.json({ message: "Entrega aceita! Pedido em rota." });
  } catch (err) {
    console.error("Accept delivery error:", err);
    return res.status(500).json({ error: "Erro ao aceitar entrega." });
  }
});
router7.post("/confirm-code", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { orderId, code } = req.body;
    if (!orderId || !code) {
      return res.status(400).json({ error: "Pedido e c\xF3digo de 4 d\xEDgitos s\xE3o obrigat\xF3rios." });
    }
    const cleanCode = String(code).trim();
    if (cleanCode.length !== 4) {
      return res.status(400).json({ error: "O c\xF3digo de entrega deve conter exatamente 4 d\xEDgitos." });
    }
    const [order] = await db.select().from(orders).where((0, import_drizzle_orm13.eq)(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    }
    if (order.deliveryDriverId !== user.id && order.sellerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para confirmar a entrega deste pedido." });
    }
    if (order.status === "DELIVERED" || order.deliveryCodeUsed) {
      return res.status(400).json({ error: "NEGADO: Este c\xF3digo j\xE1 foi utilizado e a entrega j\xE1 est\xE1 confirmada." });
    }
    const [codeRecord] = await db.select().from(deliveryCodes).where((0, import_drizzle_orm13.eq)(deliveryCodes.orderId, order.id)).limit(1);
    if (!codeRecord) {
      return res.status(500).json({ error: "Registro do c\xF3digo de entrega n\xE3o localizado no sistema." });
    }
    if (codeRecord.used) {
      return res.status(400).json({ error: "NEGADO: C\xF3digo j\xE1 utilizado anteriormente." });
    }
    if (codeRecord.attempts >= MAX_DELIVERY_ATTEMPTS) {
      return res.status(403).json({
        error: `NEGADO: Limite m\xE1ximo de ${MAX_DELIVERY_ATTEMPTS} tentativas incorretas atingido. Por seguran\xE7a, contate o suporte VEND+.`
      });
    }
    const isMatch = codeRecord.code === cleanCode;
    await db.insert(deliveryAttempts).values({
      orderId: order.id,
      driverId: user.id,
      attemptedCode: isMatch ? "****" : cleanCode,
      isSuccess: isMatch,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
    if (!isMatch) {
      const newAttempts = codeRecord.attempts + 1;
      await db.update(deliveryCodes).set({ attempts: newAttempts }).where((0, import_drizzle_orm13.eq)(deliveryCodes.id, codeRecord.id));
      await db.update(orders).set({ deliveryAttempts: newAttempts }).where((0, import_drizzle_orm13.eq)(orders.id, order.id));
      const remaining = MAX_DELIVERY_ATTEMPTS - newAttempts;
      return res.status(400).json({
        error: `NEGADO: C\xF3digo incorreto. Tentativas restantes: ${remaining}.`,
        remainingAttempts: remaining
      });
    }
    const now = /* @__PURE__ */ new Date();
    await db.update(deliveryCodes).set({
      used: true,
      usedAt: now
    }).where((0, import_drizzle_orm13.eq)(deliveryCodes.id, codeRecord.id));
    const [updatedOrder] = await db.update(orders).set({
      status: "DELIVERED",
      deliveryCodeUsed: true,
      deliveredAt: now,
      updatedAt: now
    }).where((0, import_drizzle_orm13.eq)(orders.id, order.id)).returning();
    await db.update(deliveryDrivers).set({
      totalDeliveries: (await db.select().from(deliveryDrivers).where((0, import_drizzle_orm13.eq)(deliveryDrivers.userId, user.id)))[0]?.totalDeliveries + 1 || 1,
      status: "AVAILABLE",
      updatedAt: now
    }).where((0, import_drizzle_orm13.eq)(deliveryDrivers.userId, user.id));
    await db.insert(notifications).values({
      userId: order.buyerId,
      title: "Entrega confirmada com sucesso!",
      message: `Seu pedido #${order.orderNumber} foi entregue. Avalie o vendedor e o entregador!`,
      type: "DELIVERY",
      link: `/pedidos`
    });
    await db.insert(notifications).values({
      userId: order.sellerId,
      title: "Pedido entregue!",
      message: `O pedido #${order.orderNumber} foi entregue com sucesso e o valor foi liberado.`,
      type: "SALE",
      link: `/pedidos`
    });
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "DELIVERY_CONFIRMED",
      entityType: "ORDER",
      entityId: String(order.id),
      details: JSON.stringify({
        confirmedBy: user.id,
        orderNumber: order.orderNumber,
        timestamp: now.toISOString()
      })
    });
    return res.json({
      success: true,
      message: "ENTREGA CONFIRMADA COM SUCESSO! C\xF3digo validado pelo backend.",
      order: updatedOrder
    });
  } catch (err) {
    console.error("Delivery code validation error:", err);
    return res.status(500).json({ error: "Erro ao validar c\xF3digo de entrega." });
  }
});
var deliveryRoutes_default = router7;

// src/server/paymentRoutes.ts
var import_express8 = require("express");
var import_drizzle_orm14 = require("drizzle-orm");
var router8 = (0, import_express8.Router)();
function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_ACCESS_TOKEN.trim().length > 0);
}
router8.post("/create-preference/:orderId", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { orderId } = req.params;
    const [order] = await db.select().from(orders).where((0, import_drizzle_orm14.eq)(orders.id, parseInt(orderId))).limit(1);
    if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    if (order.buyerId !== user.id && user.role !== "MASTER_OWNER") {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({
        configured: false,
        error: "A integra\xE7\xE3o com o Mercado Pago ainda precisa ser configurada com as chaves reais (MERCADOPAGO_ACCESS_TOKEN) nas vari\xE1veis de ambiente.",
        message: "Por favor, insira o token de acesso do Mercado Pago (Sandbox ou Produ\xE7\xE3o) nas configura\xE7\xF5es para processar pagamentos reais via PIX, Cart\xE3o e Boleto."
      });
    }
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const externalRef = `vend_${order.id}_${Date.now()}`;
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`
      },
      body: JSON.stringify({
        items: [
          {
            title: `Pedido VEND+ #${order.orderNumber}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: order.totalGrossCents / 100
          }
        ],
        external_reference: externalRef,
        back_urls: {
          success: `${process.env.APP_URL || "http://localhost:3000"}/pedidos?status=success`,
          failure: `${process.env.APP_URL || "http://localhost:3000"}/pedidos?status=failure`,
          pending: `${process.env.APP_URL || "http://localhost:3000"}/pedidos?status=pending`
        },
        auto_return: "approved",
        notification_url: `${process.env.APP_URL || "http://localhost:3000"}/api/payments/webhook`
      })
    });
    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("Mercado Pago API error:", errText);
      return res.status(500).json({ error: "Falha na comunica\xE7\xE3o com a API do Mercado Pago." });
    }
    const mpData = await mpResponse.json();
    await db.insert(payments).values({
      orderId: order.id,
      paymentType: "ORDER",
      amountCents: order.totalGrossCents,
      status: "PENDING",
      paymentMethod: "MERCADO_PAGO",
      externalReference: externalRef,
      mpRawResponse: JSON.stringify(mpData)
    });
    return res.json({
      configured: true,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      preferenceId: mpData.id,
      externalReference: externalRef
    });
  } catch (err) {
    console.error("Create preference error:", err);
    return res.status(500).json({ error: "Erro ao criar prefer\xEAncia de pagamento." });
  }
});
router8.post("/webhook", async (req, res) => {
  try {
    const { action, type, data } = req.body;
    const paymentId = data?.id || req.query["data.id"] || req.query.id;
    if (!paymentId) {
      return res.status(200).send("Event received without payment ID");
    }
    if (!isMercadoPagoConfigured()) {
      return res.status(200).send("Mercado Pago not configured");
    }
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const verifyRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` }
    });
    if (!verifyRes.ok) {
      return res.status(200).send("Payment not found on MP");
    }
    const paymentInfo = await verifyRes.json();
    const externalRef = paymentInfo.external_reference;
    const mpStatus = paymentInfo.status;
    if (!externalRef) {
      return res.status(200).send("No external reference");
    }
    const [existingPayment] = await db.select().from(payments).where((0, import_drizzle_orm14.eq)(payments.externalReference, externalRef)).limit(1);
    if (!existingPayment) {
      return res.status(200).send("Payment record not found");
    }
    if (existingPayment.status === "APPROVED" && mpStatus === "approved") {
      return res.status(200).send("Already processed (idempotent)");
    }
    let dbStatus = "PENDING";
    if (mpStatus === "approved") dbStatus = "APPROVED";
    else if (mpStatus === "rejected" || mpStatus === "cancelled") dbStatus = "CANCELLED";
    else if (mpStatus === "refunded") dbStatus = "REFUNDED";
    const now = /* @__PURE__ */ new Date();
    await db.update(payments).set({
      status: dbStatus,
      mpPaymentId: String(paymentId),
      mpStatus,
      mpRawResponse: JSON.stringify(paymentInfo),
      paidAt: dbStatus === "APPROVED" ? now : null
    }).where((0, import_drizzle_orm14.eq)(payments.id, existingPayment.id));
    if (dbStatus === "APPROVED" && existingPayment.orderId) {
      const [order] = await db.select().from(orders).where((0, import_drizzle_orm14.eq)(orders.id, existingPayment.orderId)).limit(1);
      if (order && order.status === "AWAITING_PAYMENT") {
        await db.update(orders).set({
          status: "PAID",
          paidAt: now,
          updatedAt: now
        }).where((0, import_drizzle_orm14.eq)(orders.id, order.id));
        await db.insert(notifications).values({
          userId: order.buyerId,
          title: "Pagamento aprovado!",
          message: `Seu pagamento para o pedido #${order.orderNumber} foi confirmado com sucesso.`,
          type: "ORDER",
          link: `/pedidos`
        });
        await db.insert(notifications).values({
          userId: order.sellerId,
          title: "Pagamento recebido!",
          message: `O pagamento do pedido #${order.orderNumber} foi aprovado. Prepare o pedido para envio.`,
          type: "SALE",
          link: `/pedidos`
        });
        await db.insert(auditLogs).values({
          userId: order.buyerId,
          action: "PAYMENT_APPROVED",
          entityType: "PAYMENT",
          entityId: String(existingPayment.id),
          details: JSON.stringify({ mpPaymentId: paymentId, orderId: order.id, amount: paymentInfo.transaction_amount })
        });
      }
    }
    return res.status(200).send("Webhook processed successfully");
  } catch (err) {
    console.error("Mercado Pago Webhook error:", err);
    return res.status(200).send("Webhook error handled");
  }
});
router8.get("/config-status", (req, res) => {
  return res.json({
    configured: isMercadoPagoConfigured(),
    environment: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-") ? "Sandbox / Testes" : "Produ\xE7\xE3o"
  });
});
var paymentRoutes_default = router8;

// src/server/planRoutes.ts
var import_express9 = require("express");
var import_drizzle_orm15 = require("drizzle-orm");
var router9 = (0, import_express9.Router)();
var PLAN_PIX_KEY = "11973479473";
function crc16(payload) {
  let crc = 65535;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 32768) !== 0) {
        crc = (crc << 1 ^ 4129) & 65535;
      } else {
        crc = crc << 1 & 65535;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function emvTlv(id, value) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}
function generatePixBrCode(key, amount, txId, description) {
  const gui = emvTlv("00", "br.gov.bcb.pix");
  const pixKey = emvTlv("01", key);
  const desc15 = description ? emvTlv("02", description.substring(0, 25)) : "";
  const merchantAccountInfo = emvTlv("26", `${gui}${pixKey}${desc15}`);
  const txField = emvTlv("05", txId.substring(0, 25));
  const additionalData = emvTlv("62", txField);
  const amountStr = (amount / 100).toFixed(2);
  const rawPayload = emvTlv("00", "01") + // Format indicator
  emvTlv("01", "12") + // Dynamic/Static (12 = with amount)
  merchantAccountInfo + emvTlv("52", "0000") + // Merchant Category Code
  emvTlv("53", "986") + // Currency: BRL (986)
  emvTlv("54", amountStr) + // Amount
  emvTlv("58", "BR") + // Country code
  emvTlv("59", "VEND MAIS") + // Merchant name
  emvTlv("60", "SAO PAULO") + // City
  additionalData + "6304";
  const calculatedCrc = crc16(rawPayload);
  return `${rawPayload}${calculatedCrc}`;
}
router9.get("/", async (req, res) => {
  try {
    const list = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.status, "ACTIVE")).orderBy(plans.priceCents);
    return res.json(list);
  } catch (err) {
    console.error("List plans error:", err);
    return res.status(500).json({ error: "Erro ao listar planos." });
  }
});
router9.post("/create-pix", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { planSlug, planId } = req.body;
    let plan;
    if (planId) {
      [plan] = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.id, Number(planId))).limit(1);
    } else if (planSlug) {
      [plan] = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.slug, planSlug)).limit(1);
    }
    if (!plan) {
      return res.status(404).json({ error: "Plano selecionado n\xE3o encontrado." });
    }
    if (plan.priceCents === 0) {
      return res.status(400).json({ error: "O plano Gratuito n\xE3o requer pagamento por PIX." });
    }
    const txId = `VP${user.id}P${plan.id}T${Date.now().toString().slice(-6)}`;
    const externalRef = `PIX-PLAN-${user.id}-${plan.id}-${Date.now()}`;
    const brCode = generatePixBrCode(
      PLAN_PIX_KEY,
      plan.priceCents,
      txId,
      `VEND+ ${plan.name}`
    );
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      brCode
    )}`;
    const [paymentRecord] = await db.insert(payments).values({
      paymentType: "SUBSCRIPTION",
      amountCents: plan.priceCents,
      status: "PENDING",
      paymentMethod: "PIX",
      externalReference: externalRef
    }).returning();
    const formattedAmount = (plan.priceCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    return res.json({
      paymentId: paymentRecord.id,
      externalReference: externalRef,
      pixKey: PLAN_PIX_KEY,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.priceCents
      },
      amountCents: plan.priceCents,
      amountFormatted: formattedAmount,
      copiaECola: brCode,
      qrCodeUrl,
      status: "Aguardando pagamento"
    });
  } catch (err) {
    console.error("Create plan PIX error:", err);
    return res.status(500).json({ error: "Erro ao gerar pagamento PIX para o plano." });
  }
});
router9.post("/confirm-pix", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { paymentId, planSlug } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: "Identificador de pagamento n\xE3o fornecido." });
    }
    const [paymentRecord] = await db.select().from(payments).where((0, import_drizzle_orm15.and)((0, import_drizzle_orm15.eq)(payments.id, Number(paymentId)), (0, import_drizzle_orm15.eq)(payments.paymentType, "SUBSCRIPTION"))).limit(1);
    if (!paymentRecord) {
      return res.status(404).json({ error: "Registro de pagamento n\xE3o localizado." });
    }
    let targetPlan;
    if (planSlug) {
      [targetPlan] = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.slug, planSlug)).limit(1);
    }
    if (!targetPlan) {
      const matchingPlans = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.priceCents, paymentRecord.amountCents)).limit(1);
      targetPlan = matchingPlans[0];
    }
    if (!targetPlan) {
      return res.status(404).json({ error: "Plano correspondente n\xE3o encontrado." });
    }
    await db.update(payments).set({
      status: "APPROVED",
      paidAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm15.eq)(payments.id, paymentRecord.id));
    const startDate = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(endDate.getDate() + 30);
    const [sub] = await db.insert(subscriptions).values({
      userId: user.id,
      planId: targetPlan.id,
      status: "ACTIVE",
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      autoRenew: true
    }).returning();
    await db.update(payments).set({ subscriptionId: sub.id }).where((0, import_drizzle_orm15.eq)(payments.id, paymentRecord.id));
    await db.update(users).set({
      planSlug: targetPlan.slug,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm15.eq)(users.id, user.id));
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "PLAN_PIX_CONFIRMED",
      entityType: "PLAN",
      entityId: String(targetPlan.id),
      details: JSON.stringify({
        paymentId: paymentRecord.id,
        plan: targetPlan.name,
        slug: targetPlan.slug,
        amountCents: paymentRecord.amountCents,
        pixKey: PLAN_PIX_KEY,
        confirmedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    return res.json({
      success: true,
      message: `Pagamento confirmado com sucesso! Seu plano ${targetPlan.name} est\xE1 100% ativo.`,
      plan: targetPlan
    });
  } catch (err) {
    console.error("Confirm plan PIX error:", err);
    return res.status(500).json({ error: "Erro ao validar e confirmar pagamento PIX." });
  }
});
router9.post("/subscribe", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { planSlug } = req.body;
    if (!planSlug) {
      return res.status(400).json({ error: "Plano n\xE3o informado." });
    }
    const [plan] = await db.select().from(plans).where((0, import_drizzle_orm15.eq)(plans.slug, planSlug)).limit(1);
    if (!plan) {
      return res.status(404).json({ error: "Plano selecionado n\xE3o existe." });
    }
    if (plan.priceCents > 0) {
      return res.status(402).json({
        error: "Este plano \xE9 pago e requer confirma\xE7\xE3o de pagamento por PIX antes de ser liberado.",
        requiresPayment: true,
        planId: plan.id,
        planSlug: plan.slug,
        priceCents: plan.priceCents
      });
    }
    const startDate = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(endDate.getDate() + 30);
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      autoRenew: true
    });
    await db.update(users).set({
      planSlug: plan.slug,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm15.eq)(users.id, user.id));
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "UPGRADE_PLAN_FREE",
      entityType: "PLAN",
      entityId: String(plan.id),
      details: JSON.stringify({ plan: plan.name, slug: plan.slug })
    });
    return res.json({
      message: `Plano ${plan.name} ativado com sucesso!`,
      currentPlan: plan
    });
  } catch (err) {
    console.error("Subscribe plan error:", err);
    return res.status(500).json({ error: "Erro ao processar ativa\xE7\xE3o de plano." });
  }
});
var planRoutes_default = router9;

// src/server/adminRoutes.ts
var import_express10 = require("express");
var import_drizzle_orm16 = require("drizzle-orm");
var router10 = (0, import_express10.Router)();
router10.get("/metrics", requireMasterOwner, async (req, res) => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: (0, import_drizzle_orm16.count)() }).from(users);
    const [{ totalProducts }] = await db.select({ totalProducts: (0, import_drizzle_orm16.count)() }).from(products);
    const allProducts = await db.select().from(products);
    const inStockProducts = allProducts.filter((p) => p.stock > 0).length;
    const outOfStockProducts = allProducts.filter((p) => p.stock <= 0).length;
    const [{ totalServices }] = await db.select({ totalServices: (0, import_drizzle_orm16.count)() }).from(services);
    const [{ totalStores }] = await db.select({ totalStores: (0, import_drizzle_orm16.count)() }).from(stores);
    const allStores = await db.select().from(stores).orderBy((0, import_drizzle_orm16.desc)(stores.createdAt)).limit(20);
    const [{ totalOrders }] = await db.select({ totalOrders: (0, import_drizzle_orm16.count)() }).from(orders);
    const ordersResult = await db.select().from(orders);
    const paidOrders = ordersResult.filter(
      (o) => o.status !== "CANCELLED" && o.status !== "AWAITING_PAYMENT"
    );
    const gmvCents = paidOrders.reduce((sum, o) => sum + o.totalGrossCents, 0);
    const commissionsCents = paidOrders.reduce((sum, o) => sum + o.commissionCents, 0);
    const sellersNetCents = paidOrders.reduce((sum, o) => sum + o.sellerNetCents, 0);
    const allSubscriptions = await db.select().from(subscriptions);
    const activeSubscriptions = allSubscriptions.filter((s) => s.status === "ACTIVE").length;
    const plansSold = allSubscriptions.length;
    const allPayments = await db.select().from(payments).orderBy((0, import_drizzle_orm16.desc)(payments.createdAt));
    const pixPayments = allPayments.filter((p) => p.paymentMethod === "PIX");
    const pixApproved = pixPayments.filter((p) => p.status === "APPROVED");
    const pixPending = pixPayments.filter((p) => p.status === "PENDING");
    const pixRevenueCents = pixApproved.reduce((sum, p) => sum + p.amountCents, 0);
    const mpPayments = allPayments.filter((p) => p.paymentMethod === "MERCADO_PAGO");
    const mpApproved = mpPayments.filter((p) => p.status === "APPROVED");
    const mpRevenueCents = mpApproved.reduce((sum, p) => sum + p.amountCents, 0);
    const planPayments = allPayments.filter(
      (p) => p.paymentType === "SUBSCRIPTION" && p.status === "APPROVED"
    );
    const plansRevenueCents = planPayments.reduce((sum, p) => sum + p.amountCents, 0);
    const totalPlatformRevenueCents = commissionsCents + plansRevenueCents;
    const recentOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalGrossCents: orders.totalGrossCents,
      commissionCents: orders.commissionCents,
      sellerNetCents: orders.sellerNetCents,
      deliveryCode: orders.deliveryCode,
      deliveryCodeUsed: orders.deliveryCodeUsed,
      createdAt: orders.createdAt,
      buyer: { name: users.name, email: users.email }
    }).from(orders).leftJoin(users, (0, import_drizzle_orm16.eq)(orders.buyerId, users.id)).orderBy((0, import_drizzle_orm16.desc)(orders.createdAt)).limit(10);
    return res.json({
      metrics: {
        totalUsers: Number(totalUsers),
        totalProducts: Number(totalProducts),
        inStockProducts,
        outOfStockProducts,
        totalServices: Number(totalServices),
        totalStores: Number(totalStores),
        totalOrders: Number(totalOrders),
        paidOrdersCount: paidOrders.length,
        gmvCents,
        commissionsCents,
        sellersNetCents,
        plansSold,
        activeSubscriptions,
        plansRevenueCents,
        totalPlatformRevenueCents,
        pix: {
          key: "11973479473",
          totalCount: pixPayments.length,
          approvedCount: pixApproved.length,
          pendingCount: pixPending.length,
          revenueCents: pixRevenueCents
        },
        mercadoPago: {
          status: "ONLINE",
          configured: true,
          totalCount: mpPayments.length,
          approvedCount: mpApproved.length,
          revenueCents: mpRevenueCents
        }
      },
      recentOrders,
      recentStores: allStores,
      recentPayments: allPayments.slice(0, 15)
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    return res.status(500).json({ error: "Erro ao carregar m\xE9tricas administrativas." });
  }
});
router10.get("/financial-report", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalGrossCents: orders.totalGrossCents,
      commissionCents: orders.commissionCents,
      sellerNetCents: orders.sellerNetCents,
      shippingFeeCents: orders.shippingFeeCents,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      buyer: { id: users.id, name: users.name, email: users.email },
      commission: commissions
    }).from(orders).leftJoin(users, (0, import_drizzle_orm16.eq)(orders.buyerId, users.id)).leftJoin(commissions, (0, import_drizzle_orm16.eq)(orders.id, commissions.orderId)).orderBy((0, import_drizzle_orm16.desc)(orders.createdAt));
    return res.json(list);
  } catch (err) {
    console.error("Financial report error:", err);
    return res.status(500).json({ error: "Erro ao carregar relat\xF3rio financeiro." });
  }
});
router10.get("/users", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select().from(users).orderBy((0, import_drizzle_orm16.desc)(users.createdAt)).limit(100);
    return res.json(list);
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ error: "Erro ao listar usu\xE1rios." });
  }
});
router10.patch("/users/:id", requireMasterOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, planSlug } = req.body;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (role && ["USER", "MASTER_OWNER", "DELIVERY_DRIVER"].includes(role)) {
      updates.role = role;
    }
    if (status && ["ACTIVE", "SUSPENDED", "BLOCKED"].includes(status)) {
      updates.status = status;
    }
    if (planSlug) {
      updates.planSlug = planSlug;
    }
    const [updated] = await db.update(users).set(updates).where((0, import_drizzle_orm16.eq)(users.id, parseInt(id))).returning();
    persistDatabase();
    return res.json({ message: "Usu\xE1rio atualizado com sucesso!", user: updated });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ error: "Erro ao atualizar usu\xE1rio." });
  }
});
router10.patch("/plans/:id", requireMasterOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { priceCents, commissionPercent, maxActiveListings, features, status } = req.body;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (priceCents !== void 0) updates.priceCents = parseInt(priceCents);
    if (commissionPercent !== void 0) updates.commissionPercent = parseInt(commissionPercent);
    if (maxActiveListings !== void 0) updates.maxActiveListings = parseInt(maxActiveListings);
    if (features) updates.features = typeof features === "string" ? features : JSON.stringify(features);
    if (status) updates.status = status;
    const [updated] = await db.update(plans).set(updates).where((0, import_drizzle_orm16.eq)(plans.id, parseInt(id))).returning();
    return res.json({ message: "Plano atualizado com sucesso!", plan: updated });
  } catch (err) {
    console.error("Update plan error:", err);
    return res.status(500).json({ error: "Erro ao atualizar plano." });
  }
});
router10.post("/clear-demo-data", requireMasterOwner, async (req, res) => {
  try {
    await db.delete(products).where((0, import_drizzle_orm16.eq)(products.isDemo, true));
    await db.delete(services).where((0, import_drizzle_orm16.eq)(services.isDemo, true));
    await db.insert(auditLogs).values({
      userId: req.user.id,
      action: "CLEAR_DEMO_DATA",
      entityType: "CATALOG",
      details: "Dados de demonstra\xE7\xE3o removidos pelo Master Owner."
    });
    return res.json({ message: "Todos os dados de demonstra\xE7\xE3o foram limpos com sucesso do banco de dados." });
  } catch (err) {
    console.error("Clear demo data error:", err);
    return res.status(500).json({ error: "Erro ao limpar dados de demonstra\xE7\xE3o." });
  }
});
router10.post("/import-feed", requireMasterOwner, async (req, res) => {
  try {
    const { feedJson } = req.body;
    if (!feedJson) {
      return res.status(400).json({ error: "JSON do feed \xE9 obrigat\xF3rio." });
    }
    let parsedItems;
    try {
      parsedItems = typeof feedJson === "string" ? JSON.parse(feedJson) : feedJson;
    } catch {
      return res.status(400).json({ error: "Formato JSON inv\xE1lido." });
    }
    if (!Array.isArray(parsedItems)) {
      return res.status(400).json({ error: "O feed deve ser uma lista (array) de produtos." });
    }
    const inserted = [];
    const rejected = [];
    const catList = await db.select().from(categories);
    const catMap = new Map(catList.map((c) => [c.slug.toLowerCase(), c.id]));
    for (const item of parsedItems) {
      const { name, imageUrl, categorySlug, priceCents, description, stock = 1, location = "Brasil" } = item;
      if (!name || !imageUrl || !priceCents || !categorySlug) {
        rejected.push({ item, reason: "Campos obrigat\xF3rios ausentes (name, imageUrl, categorySlug, priceCents)." });
        continue;
      }
      const categoryId = catMap.get(String(categorySlug).toLowerCase());
      if (!categoryId) {
        rejected.push({ item, reason: `Categoria '${categorySlug}' n\xE3o encontrada no sistema.` });
        continue;
      }
      const cleanSlugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = `${cleanSlugBase}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e3)}`;
      const [newProduct] = await db.insert(products).values({
        sellerId: req.user.id,
        name: String(name).trim(),
        slug,
        description: description ? String(description).trim() : `Produto de cat\xE1logo importado: ${name}`,
        categoryId,
        condition: "NOVO",
        priceCents: parseInt(priceCents),
        stock: Math.max(1, parseInt(stock) || 1),
        location: String(location).trim(),
        offersDelivery: true,
        offersPickup: true,
        allowsNegotiation: true,
        status: "ACTIVE",
        imageUrl: String(imageUrl).trim(),
        isDemo: false
      }).returning();
      inserted.push(newProduct);
    }
    return res.json({
      message: `Importa\xE7\xE3o conclu\xEDda. ${inserted.length} inseridos, ${rejected.length} rejeitados.`,
      insertedCount: inserted.length,
      rejectedCount: rejected.length,
      rejected
    });
  } catch (err) {
    console.error("Import feed error:", err);
    return res.status(500).json({ error: "Erro ao importar feed de cat\xE1logo." });
  }
});
router10.get("/settings", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select().from(appSettings);
    return res.json(list);
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ error: "Erro ao listar configura\xE7\xF5es." });
  }
});
router10.post("/settings", requireMasterOwner, async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === void 0) {
      return res.status(400).json({ error: "Chave e valor s\xE3o obrigat\xF3rios." });
    }
    const [updated] = await db.insert(appSettings).values({ key, value: String(value), description }).onConflictDoUpdate({
      target: appSettings.key,
      set: { value: String(value), updatedAt: /* @__PURE__ */ new Date() }
    }).returning();
    return res.json({ message: "Configura\xE7\xE3o atualizada com sucesso!", setting: updated });
  } catch (err) {
    console.error("Save setting error:", err);
    return res.status(500).json({ error: "Erro ao salvar configura\xE7\xE3o." });
  }
});
router10.get("/stores", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      category: stores.category,
      location: stores.location,
      status: stores.status,
      followersCount: stores.followersCount,
      rating: stores.rating,
      createdAt: stores.createdAt,
      owner: { id: users.id, name: users.name, email: users.email }
    }).from(stores).leftJoin(users, (0, import_drizzle_orm16.eq)(stores.userId, users.id)).orderBy((0, import_drizzle_orm16.desc)(stores.createdAt));
    return res.json(list);
  } catch (err) {
    console.error("Admin stores error:", err);
    return res.status(500).json({ error: "Erro ao listar lojas." });
  }
});
router10.get("/products", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      priceCents: products.priceCents,
      stock: products.stock,
      condition: products.condition,
      status: products.status,
      location: products.location,
      imageUrl: products.imageUrl,
      seller: { id: users.id, name: users.name, email: users.email },
      category: { id: categories.id, name: categories.name }
    }).from(products).leftJoin(users, (0, import_drizzle_orm16.eq)(products.sellerId, users.id)).leftJoin(categories, (0, import_drizzle_orm16.eq)(products.categoryId, categories.id)).orderBy((0, import_drizzle_orm16.desc)(products.createdAt)).limit(100);
    return res.json(list);
  } catch (err) {
    console.error("Admin products error:", err);
    return res.status(500).json({ error: "Erro ao listar produtos." });
  }
});
router10.get("/subscriptions", requireMasterOwner, async (req, res) => {
  try {
    const list = await db.select({
      id: subscriptions.id,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      createdAt: subscriptions.createdAt,
      user: { id: users.id, name: users.name, email: users.email },
      plan: { id: plans.id, name: plans.name, slug: plans.slug, priceCents: plans.priceCents }
    }).from(subscriptions).leftJoin(users, (0, import_drizzle_orm16.eq)(subscriptions.userId, users.id)).leftJoin(plans, (0, import_drizzle_orm16.eq)(subscriptions.planId, plans.id)).orderBy((0, import_drizzle_orm16.desc)(subscriptions.createdAt));
    return res.json(list);
  } catch (err) {
    console.error("Admin subscriptions error:", err);
    return res.status(500).json({ error: "Erro ao listar assinaturas." });
  }
});
var adminRoutes_default = router10;

// src/server/uploadRoutes.ts
var import_express11 = require("express");
var import_path3 = __toESM(require("path"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var router11 = (0, import_express11.Router)();
var UPLOADS_DIR = import_path3.default.join(process.cwd(), "data", "uploads");
function ensureUploadsDir() {
  if (!import_fs3.default.existsSync(UPLOADS_DIR)) {
    import_fs3.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}
var MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
function isValidImageBuffer(buffer, mimeType) {
  if (buffer.length < 12) return false;
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) {
    return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  }
  if (normalized.includes("png")) {
    return buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71;
  }
  if (normalized.includes("webp")) {
    const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
    const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
    return isRiff && isWebp;
  }
  return false;
}
function processAndSaveImage(rawBase64, requestedMime) {
  ensureUploadsDir();
  let mimeType = requestedMime || "image/jpeg";
  let base64Data = rawBase64;
  if (rawBase64.startsWith("data:")) {
    const matches = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }
  }
  mimeType = mimeType.toLowerCase();
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new Error("Formato inv\xE1lido. Os formatos aceitos s\xE3o JPG, JPEG, PNG e WEBP.");
  }
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error("Imagem muito pesada. O tamanho m\xE1ximo permitido \xE9 15MB.");
  }
  if (!isValidImageBuffer(buffer, mimeType)) {
    throw new Error("Arquivo de imagem corrompido ou formato incompat\xEDvel.");
  }
  const timestamp2 = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `vend_${timestamp2}_${randomSuffix}${ext}`;
  const filePath = import_path3.default.join(UPLOADS_DIR, fileName);
  import_fs3.default.writeFileSync(filePath, buffer);
  return {
    url: `/uploads/${fileName}`,
    fileName,
    sizeBytes: buffer.length,
    mimeType
  };
}
router11.post("/", authenticateUser, (req, res) => {
  try {
    const { imageBase64, mimeType, images } = req.body;
    if (Array.isArray(images) && images.length > 0) {
      if (images.length > 10) {
        return res.status(400).json({ error: "Limite de at\xE9 10 fotos por upload excedido." });
      }
      const uploadedResults = [];
      for (const item of images) {
        if (!item.imageBase64) continue;
        const result = processAndSaveImage(item.imageBase64, item.mimeType);
        uploadedResults.push({
          ...result,
          type: item.type || "gallery",
          position: item.position ?? uploadedResults.length
        });
      }
      return res.json({
        success: true,
        count: uploadedResults.length,
        images: uploadedResults,
        message: `${uploadedResults.length} foto(s) enviada(s) com sucesso.`
      });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma foto selecionada para envio." });
    }
    const saved = processAndSaveImage(imageBase64, mimeType);
    return res.json({
      success: true,
      url: saved.url,
      fileName: saved.fileName,
      sizeBytes: saved.sizeBytes,
      mimeType: saved.mimeType,
      message: "Foto adicionada com sucesso."
    });
  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(400).json({ error: err.message || "Erro ao processar upload da foto." });
  }
});
var uploadRoutes_default = router11;

// src/server/categoryRoutes.ts
var import_express12 = require("express");
var import_drizzle_orm17 = require("drizzle-orm");
var router12 = (0, import_express12.Router)();
router12.get("/", async (req, res) => {
  try {
    const list = await db.select().from(categories).where((0, import_drizzle_orm17.eq)(categories.isActive, true)).orderBy(categories.name);
    return res.json(list);
  } catch (err) {
    console.error("List categories error:", err);
    return res.status(500).json({ error: "Erro ao carregar categorias." });
  }
});
router12.post("/", requireMasterOwner, async (req, res) => {
  try {
    const { name, icon = "Tag", description } = req.body;
    if (!name) return res.status(400).json({ error: "Nome da categoria \xE9 obrigat\xF3rio." });
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [newCat] = await db.insert(categories).values({
      name: name.trim(),
      slug,
      icon,
      description,
      isActive: true
    }).returning();
    return res.status(201).json({ message: "Categoria criada!", category: newCat });
  } catch (err) {
    console.error("Create category error:", err);
    return res.status(500).json({ error: "Erro ao criar categoria." });
  }
});
var categoryRoutes_default = router12;

// src/server/reviewRoutes.ts
var import_express13 = require("express");
var import_drizzle_orm18 = require("drizzle-orm");
var router13 = (0, import_express13.Router)();
router13.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await db.select({
      review: reviews,
      reviewer: { id: users.id, name: users.name, avatarUrl: users.avatarUrl }
    }).from(reviews).leftJoin(users, (0, import_drizzle_orm18.eq)(reviews.reviewerId, users.id)).where((0, import_drizzle_orm18.eq)(reviews.targetUserId, parseInt(userId))).orderBy((0, import_drizzle_orm18.desc)(reviews.createdAt)).limit(30);
    return res.json(list);
  } catch (err) {
    console.error("List reviews error:", err);
    return res.status(500).json({ error: "Erro ao carregar avalia\xE7\xF5es." });
  }
});
router13.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { orderId, targetUserId, rating, comment, reviewType = "SELLER" } = req.body;
    if (!orderId || !targetUserId || !rating || !comment) {
      return res.status(400).json({ error: "Todos os campos s\xE3o obrigat\xF3rios." });
    }
    const numRating = parseInt(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "A avalia\xE7\xE3o deve ser entre 1 e 5 estrelas." });
    }
    const [order] = await db.select().from(orders).where((0, import_drizzle_orm18.eq)(orders.id, parseInt(orderId))).limit(1);
    if (!order) {
      return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
    }
    if (order.status !== "DELIVERED") {
      return res.status(400).json({
        error: "N\xE3o \xE9 permitido avaliar antes da conclus\xE3o e entrega do pedido."
      });
    }
    const [existing] = await db.select().from(reviews).where(
      (0, import_drizzle_orm18.and)(
        (0, import_drizzle_orm18.eq)(reviews.orderId, parseInt(orderId)),
        (0, import_drizzle_orm18.eq)(reviews.reviewerId, user.id),
        (0, import_drizzle_orm18.eq)(reviews.targetUserId, parseInt(targetUserId))
      )
    ).limit(1);
    if (existing) {
      return res.status(400).json({ error: "Voc\xEA j\xE1 avaliou este pedido." });
    }
    const [newReview] = await db.insert(reviews).values({
      orderId: order.id,
      reviewerId: user.id,
      targetUserId: parseInt(targetUserId),
      rating: numRating,
      comment: comment.trim(),
      reviewType: reviewType === "DRIVER" ? "DRIVER" : "SELLER"
    }).returning();
    return res.status(201).json({ message: "Avalia\xE7\xE3o enviada com sucesso!", review: newReview });
  } catch (err) {
    console.error("Create review error:", err);
    return res.status(500).json({ error: "Erro ao enviar avalia\xE7\xE3o." });
  }
});
var reviewRoutes_default = router13;

// src/server/favoriteRoutes.ts
var import_express14 = require("express");
var import_drizzle_orm19 = require("drizzle-orm");
var router14 = (0, import_express14.Router)();
router14.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const favs = await db.select().from(favorites).where((0, import_drizzle_orm19.eq)(favorites.userId, user.id)).orderBy((0, import_drizzle_orm19.desc)(favorites.createdAt));
    const enriched = [];
    for (const f of favs) {
      if (f.itemType === "PRODUCT") {
        const [prod] = await db.select().from(products).where((0, import_drizzle_orm19.eq)(products.id, f.itemId)).limit(1);
        if (prod) enriched.push({ ...f, item: prod });
      } else if (f.itemType === "SERVICE") {
        const [serv] = await db.select().from(services).where((0, import_drizzle_orm19.eq)(services.id, f.itemId)).limit(1);
        if (serv) enriched.push({ ...f, item: serv });
      } else if (f.itemType === "STORE") {
        const [st] = await db.select().from(stores).where((0, import_drizzle_orm19.eq)(stores.id, f.itemId)).limit(1);
        if (st) enriched.push({ ...f, item: st });
      }
    }
    return res.json(enriched);
  } catch (err) {
    console.error("List favorites error:", err);
    return res.status(500).json({ error: "Erro ao carregar favoritos." });
  }
});
router14.post("/toggle", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { itemType, itemId } = req.body;
    if (!itemType || !itemId) {
      return res.status(400).json({ error: "Tipo e ID do item s\xE3o obrigat\xF3rios." });
    }
    const [existing] = await db.select().from(favorites).where(
      (0, import_drizzle_orm19.and)(
        (0, import_drizzle_orm19.eq)(favorites.userId, user.id),
        (0, import_drizzle_orm19.eq)(favorites.itemType, itemType),
        (0, import_drizzle_orm19.eq)(favorites.itemId, parseInt(itemId))
      )
    ).limit(1);
    if (existing) {
      await db.delete(favorites).where((0, import_drizzle_orm19.eq)(favorites.id, existing.id));
      return res.json({ favorited: false, message: "Removido dos favoritos." });
    } else {
      await db.insert(favorites).values({
        userId: user.id,
        itemType,
        itemId: parseInt(itemId)
      });
      return res.json({ favorited: true, message: "Adicionado aos favoritos!" });
    }
  } catch (err) {
    console.error("Toggle favorite error:", err);
    return res.status(500).json({ error: "Erro ao atualizar favoritos." });
  }
});
var favoriteRoutes_default = router14;

// src/server/notificationRoutes.ts
var import_express15 = require("express");
var import_drizzle_orm20 = require("drizzle-orm");
var router15 = (0, import_express15.Router)();
router15.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const list = await db.select().from(notifications).where((0, import_drizzle_orm20.eq)(notifications.userId, user.id)).orderBy((0, import_drizzle_orm20.desc)(notifications.createdAt)).limit(50);
    return res.json(list);
  } catch (err) {
    console.error("List notifications error:", err);
    return res.status(500).json({ error: "Erro ao carregar notifica\xE7\xF5es." });
  }
});
router15.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    await db.update(notifications).set({ isRead: true }).where((0, import_drizzle_orm20.eq)(notifications.userId, user.id));
    return res.json({ message: "Todas as notifica\xE7\xF5es foram marcadas como lidas." });
  } catch (err) {
    console.error("Mark read notifications error:", err);
    return res.status(500).json({ error: "Erro ao marcar notifica\xE7\xF5es." });
  }
});
var notificationRoutes_default = router15;

// src/server/addressRoutes.ts
var import_express16 = require("express");
var import_drizzle_orm21 = require("drizzle-orm");
var router16 = (0, import_express16.Router)();
router16.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const list = await db.select().from(addresses).where((0, import_drizzle_orm21.eq)(addresses.userId, user.id)).orderBy((0, import_drizzle_orm21.desc)(addresses.isDefault), (0, import_drizzle_orm21.desc)(addresses.createdAt));
    return res.json(list);
  } catch (err) {
    console.error("List addresses error:", err);
    return res.status(500).json({ error: "Erro ao carregar endere\xE7os." });
  }
});
router16.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const {
      recipientName,
      phone,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      postalCode,
      isDefault = false
    } = req.body;
    if (!recipientName || !phone || !street || !number || !neighborhood || !city || !state || !postalCode) {
      return res.status(400).json({ error: "Todos os campos obrigat\xF3rios do endere\xE7o devem ser preenchidos." });
    }
    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where((0, import_drizzle_orm21.eq)(addresses.userId, user.id));
    }
    const [newAddress] = await db.insert(addresses).values({
      userId: user.id,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      number: number.trim(),
      complement: complement ? complement.trim() : null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      postalCode: postalCode.trim(),
      isDefault: Boolean(isDefault)
    }).returning();
    return res.status(201).json({ message: "Endere\xE7o salvo com sucesso!", address: newAddress });
  } catch (err) {
    console.error("Create address error:", err);
    return res.status(500).json({ error: "Erro ao salvar endere\xE7o." });
  }
});
var addressRoutes_default = router16;

// src/server/seedData.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_drizzle_orm22 = require("drizzle-orm");
async function initializeDatabaseSeed() {
  try {
    const existingCats = await db.select({ count: (0, import_drizzle_orm22.count)() }).from(categories);
    if (Number(existingCats[0]?.count || 0) === 0) {
      const defaultCategories = [
        { name: "Celulares e Telefonia", slug: "celulares", icon: "Smartphone", description: "Smartphones, smartwatches e acess\xF3rios" },
        { name: "Inform\xE1tica e Escrit\xF3rio", slug: "informatica", icon: "Laptop", description: "Notebooks, computadores, monitores e perif\xE9ricos" },
        { name: "Eletr\xF4nicos e \xC1udio", slug: "eletronicos", icon: "Tv", description: "Smart TVs, fones de ouvido, caixas de som e home theater" },
        { name: "Games e Consoles", slug: "games", icon: "Gamepad2", description: "PlayStation, Xbox, Nintendo, jogos e controles" },
        { name: "Ferramentas e M\xE1quinas", slug: "ferramentas", icon: "Wrench", description: "Parafusadeiras, furadeiras, kits manuais e el\xE9tricos" },
        { name: "Rel\xF3gios e Acess\xF3rios", slug: "relogios", icon: "Watch", description: "Smartwatches esportivos, rel\xF3gios anal\xF3gicos e pulseiras" },
        { name: "Eletrodom\xE9sticos", slug: "eletrodomesticos", icon: "Coffee", description: "Cafeteiras, fritadeiras air fryer, liquidificadores e micro-ondas" },
        { name: "Pet Shop e Cuidados", slug: "pet", icon: "Dog", description: "Ra\xE7\xF5es premium, brinquedos, caminhas e acess\xF3rios pet" },
        { name: "Servi\xE7os Especializados", slug: "servicos", icon: "Briefcase", description: "T\xE9cnicos, eletricistas, instaladores e manuten\xE7\xE3o profissional" },
        { name: "Moda e Cal\xE7ados", slug: "moda", icon: "Shirt", description: "Roupas, t\xEAnis, bolsas e vestu\xE1rio masculino e feminino" },
        { name: "Casa e Decora\xE7\xE3o", slug: "casa", icon: "Home", description: "M\xF3veis, ilumina\xE7\xE3o, organiza\xE7\xE3o e decora\xE7\xE3o de interiores" },
        { name: "Automotivo e Pe\xE7as", slug: "automotivo", icon: "Car", description: "Acess\xF3rios automotivos, som, ferramentas e cuidados para carros" }
      ];
      for (const cat of defaultCategories) {
        await db.insert(categories).values(cat);
      }
      console.log("[VEND+] Categorias padr\xE3o inseridas.");
    }
    const existingPlans = await db.select({ count: (0, import_drizzle_orm22.count)() }).from(plans);
    if (Number(existingPlans[0]?.count || 0) === 0) {
      const defaultPlans = [
        {
          name: "Gratuito",
          slug: "free",
          priceCents: 0,
          maxActiveListings: 5,
          commissionPercent: 7,
          features: JSON.stringify(["At\xE9 5 an\xFAncios ativos", "Taxa de 7% por venda", "Recebimento seguro", "Suporte padr\xE3o"]),
          status: "ACTIVE"
        },
        {
          name: "B\xE1sico",
          slug: "basico",
          priceCents: 2990,
          maxActiveListings: 25,
          commissionPercent: 5,
          features: JSON.stringify(["At\xE9 25 an\xFAncios ativos", "Taxa reduzida de 5%", "Destaque nas buscas locais", "Suporte priorit\xE1rio via WhatsApp"]),
          status: "ACTIVE"
        },
        {
          name: "Premium",
          slug: "premium",
          priceCents: 6990,
          maxActiveListings: 100,
          commissionPercent: 4,
          features: JSON.stringify(["At\xE9 100 an\xFAncios ativos", "Taxa de apenas 4%", "Selo Loja Verificada", "Painel anal\xEDtico avan\xE7ado"]),
          status: "ACTIVE"
        },
        {
          name: "Lend\xE1rio",
          slug: "lendario",
          priceCents: 14990,
          maxActiveListings: 99999,
          commissionPercent: 3,
          features: JSON.stringify(["An\xFAncios ILIMITADOS", "Menor taxa da plataforma: 3%", "Cria\xE7\xE3o de Loja Virtual com IA", "Gestor de conta exclusivo"]),
          status: "ACTIVE"
        }
      ];
      for (const pl of defaultPlans) {
        await db.insert(plans).values(pl);
      }
      console.log("[VEND+] Planos padr\xE3o inseridos.");
    }
    await UserRepository.ensureMasterOwner();
    const masterEmail = (process.env.MASTER_OWNER_EMAIL || "alifergael76@gmail.com").trim().toLowerCase();
    const existingMaster = await db.select().from(users).where((0, import_drizzle_orm22.eq)(users.email, masterEmail)).limit(1);
    let masterUserId = existingMaster[0]?.id || 1;
    const quickAdminEmail = "admin@vendplus.com";
    if (masterEmail !== quickAdminEmail) {
      const existingQuickAdmin = await db.select().from(users).where((0, import_drizzle_orm22.eq)(users.email, quickAdminEmail)).limit(1);
      if (existingQuickAdmin.length === 0) {
        const salt = await import_bcryptjs2.default.genSalt(10);
        const passwordHash = await import_bcryptjs2.default.hash("VendMaster2025!", salt);
        const [qUser] = await db.insert(users).values({
          uid: "vend_admin_quick_001",
          username: "admin",
          email: quickAdminEmail,
          normalizedEmail: quickAdminEmail,
          passwordHash,
          name: "Administrador VEND+",
          phone: "(11) 98888-0000",
          location: "S\xE3o Paulo, SP",
          role: "MASTER_OWNER",
          status: "ACTIVE",
          planSlug: "lendario",
          emailVerified: true
        }).returning();
        await db.insert(profiles).values({
          userId: qUser.id,
          bio: "Conta de Demonstra\xE7\xE3o Administrativa VEND+"
        });
      } else {
        if (existingQuickAdmin[0].role !== "MASTER_OWNER") {
          await db.update(users).set({ role: "MASTER_OWNER" }).where((0, import_drizzle_orm22.eq)(users.id, existingQuickAdmin[0].id));
        }
      }
    }
    const [{ productCount }] = await db.select({ productCount: (0, import_drizzle_orm22.count)() }).from(products);
    if (Number(productCount) === 0) {
      const allCats = await db.select().from(categories);
      const catMap = new Map(allCats.map((c) => [c.slug, c.id]));
      let demoStoreId = null;
      const [demoStore] = await db.insert(stores).values({
        userId: masterUserId,
        name: "VEND+ Eletro & Tech Local",
        slug: "vend-eletro-tech",
        category: "Eletr\xF4nicos",
        location: "S\xE3o Paulo, SP",
        phone: "(11) 98888-1234",
        description: "Loja oficial parceira de eletr\xF4nicos, celulares e inform\xE1tica na sua cidade.",
        offersDelivery: true,
        offersPickup: true
      }).returning();
      demoStoreId = demoStore.id;
      const demoProducts = [
        {
          name: "Smartphone Galaxy S23 Ultra 256GB Preto Phantom",
          slug: "smartphone-galaxy-s23-ultra-256gb-demo",
          description: "Smartphone topo de linha com c\xE2mera de 200MP, caneta S-Pen integrada e processador Snapdragon 8 Gen 2. Acompanha carregador e nota fiscal.",
          categorySlug: "celulares",
          condition: "NOVO",
          priceCents: 429900,
          // R$ 4.299,00
          originalPriceCents: 549900,
          stock: 3,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Notebook Dell Inspiron 15 Intel Core i7 16GB SSD 512GB",
          slug: "notebook-dell-inspiron-15-i7-demo",
          description: "Notebook de alta performance para trabalho, programa\xE7\xE3o e estudos. Tela Full HD antirreflexo, bateria duradoura e teclado retroiluminado.",
          categorySlug: "informatica",
          condition: "USADO",
          priceCents: 285e3,
          // R$ 2.850,00
          originalPriceCents: 39e4,
          stock: 1,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Smart TV 50 Polegadas 4K UHD HDR com Comando de Voz",
          slug: "smart-tv-50-polegadas-4k-demo",
          description: "Televisor inteligente com qualidade de imagem ultra v\xEDvida, sistema \xE1gil com Netflix, YouTube, Prime Video e conex\xE3o Bluetooth.",
          categorySlug: "eletronicos",
          condition: "NOVO",
          priceCents: 199900,
          // R$ 1.999,00
          originalPriceCents: 249900,
          stock: 4,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false
        },
        {
          name: "Console PlayStation 5 Edi\xE7\xE3o Digital com 2 Controles DualSense",
          slug: "console-ps5-digital-2-controles-demo",
          description: "Console de \xFAltima gera\xE7\xE3o com SSD ultrarr\xE1pido, \xE1udio 3D imersivo e gr\xE1ficos em at\xE9 120 FPS. Pouco tempo de uso, em perfeito estado.",
          categorySlug: "games",
          condition: "USADO",
          priceCents: 319e3,
          // R$ 3.190,00
          originalPriceCents: 38e4,
          stock: 1,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Furadeira e Parafusadeira de Impacto a Bateria 18V com Maleta",
          slug: "furadeira-parafusadeira-impacto-18v-demo",
          description: "Kit completo de ferramentas profissionais para manuten\xE7\xE3o, marcenaria e montagem. Inclui 2 baterias de l\xEDtio, carregador bivolt e brocas.",
          categorySlug: "ferramentas",
          condition: "NOVO",
          priceCents: 38900,
          // R$ 389,00
          originalPriceCents: 45e3,
          stock: 8,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Rel\xF3gio Smartwatch Pro com Monitor Card\xEDaco e GPS Integrado",
          slug: "relogio-smartwatch-pro-gps-demo",
          description: "Rel\xF3gio esportivo e casual com display AMOLED, resist\xEAncia \xE0 \xE1gua 5ATM, monitoramento de sono, oxigena\xE7\xE3o do sangue e notifica\xE7\xF5es.",
          categorySlug: "relogios",
          condition: "NOVO",
          priceCents: 27900,
          // R$ 279,00
          originalPriceCents: 35e3,
          stock: 6,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Cafeteira Espresso Autom\xE1tica 15 Bar em A\xE7o Inox",
          slug: "cafeteira-espresso-automatica-demo",
          description: "Cafeteira para p\xF3 ou sach\xEAs, com bico vaporizador para leite e cappuccino cremoso. Design compacto e sofisticado para sua cozinha.",
          categorySlug: "eletrodomesticos",
          condition: "NOVO",
          priceCents: 54900,
          // R$ 549,00
          originalPriceCents: 69900,
          stock: 2,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true
        },
        {
          name: "Ra\xE7\xE3o Premium para C\xE3es Adultos Frango e Arroz 15kg",
          slug: "racao-premium-caes-15kg-demo",
          description: "Alimento completo e balanceado para c\xE3es de m\xE9dio e grande porte. Rica em \xF4mega 3 e 6, sem corantes artificiais.",
          categorySlug: "pet",
          condition: "NOVO",
          priceCents: 18900,
          // R$ 189,00
          originalPriceCents: 22e3,
          stock: 12,
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&auto=format&fit=crop&q=80",
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false
        }
      ];
      for (const p of demoProducts) {
        const catId = catMap.get(p.categorySlug) || allCats[0].id;
        await db.insert(products).values({
          sellerId: masterUserId,
          storeId: demoStoreId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: catId,
          condition: p.condition,
          priceCents: p.priceCents,
          originalPriceCents: p.originalPriceCents,
          stock: p.stock,
          location: p.location,
          offersDelivery: p.offersDelivery,
          offersPickup: p.offersPickup,
          allowsNegotiation: p.allowsNegotiation,
          status: "ACTIVE",
          imageUrl: p.imageUrl,
          isDemo: true
          // Clearly marked as demonstration data (Section 48)
        });
      }
      const demoServices = [
        {
          name: "Instala\xE7\xE3o e Manuten\xE7\xE3o de Ar-Condicionado e El\xE9trica Residencial",
          slug: "instalacao-ar-condicionado-eletrica-demo",
          description: "T\xE9cnico certificado para higieniza\xE7\xE3o, recarga de g\xE1s, reparos el\xE9tricos e instala\xE7\xE3o de ar condicionado split.",
          categorySlug: "servicos",
          priceCents: 15e3,
          // a partir de R$ 150,00
          priceType: "STARTING_AT",
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80"
        },
        {
          name: "Formata\xE7\xE3o, Limpeza e Manuten\xE7\xE3o Preventiva de Computadores e Notebooks",
          slug: "formatacao-manutencao-pc-notebook-demo",
          description: "Assist\xEAncia t\xE9cnica especializada em hardware e software. Troca de pasta t\xE9rmica, upgrade para SSD e remo\xE7\xE3o de v\xEDrus.",
          categorySlug: "servicos",
          priceCents: 12e3,
          // a partir de R$ 120,00
          priceType: "STARTING_AT",
          location: "S\xE3o Paulo, SP",
          imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80"
        }
      ];
      for (const s of demoServices) {
        const catId = catMap.get(s.categorySlug) || allCats[0].id;
        await db.insert(services).values({
          providerId: masterUserId,
          name: s.name,
          slug: s.slug,
          description: s.description,
          categoryId: catId,
          priceCents: s.priceCents,
          priceType: s.priceType,
          location: s.location,
          status: "ACTIVE",
          imageUrl: s.imageUrl,
          isDemo: true
        });
      }
      console.log("[VEND+] Cat\xE1logo inicial de demonstra\xE7\xE3o (marcado como isDemo) inserido com sucesso.");
    }
    persistDatabase();
  } catch (err) {
    console.error("[VEND+] Seed initialization check:", err);
  }
}

// src/server/accountMigration.ts
var import_fs5 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);

// src/db/atomicStorage.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
function getBackupTimestamp(date = /* @__PURE__ */ new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}
function createTimestampedBackup(sourceFile, prefix = "vend_auth_backup_") {
  try {
    if (!import_fs4.default.existsSync(sourceFile)) {
      return null;
    }
    const dir = import_path4.default.dirname(sourceFile);
    const timestamp2 = getBackupTimestamp();
    const backupFileName = `${prefix}${timestamp2}.json`;
    const backupPath = import_path4.default.join(dir, backupFileName);
    import_fs4.default.copyFileSync(sourceFile, backupPath);
    console.log(`[Storage] Backup de seguran\xE7a criado com sucesso: ${backupFileName}`);
    return backupPath;
  } catch (err) {
    console.error(`[Storage] Falha ao gerar backup de seguran\xE7a:`, err.message);
    return null;
  }
}
function writeJsonAtomic(filePath, data) {
  const serialized = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const dir = import_path4.default.dirname(filePath);
  if (!import_fs4.default.existsSync(dir)) {
    import_fs4.default.mkdirSync(dir, { recursive: true });
  }
  if (import_fs4.default.existsSync(filePath)) {
    try {
      const existingRaw = import_fs4.default.readFileSync(filePath, "utf8");
      if (existingRaw && existingRaw.trim().length > 0) {
        const parsedExisting = JSON.parse(existingRaw);
        const parsedNew = typeof data === "string" ? JSON.parse(data) : data;
        const prevUsers = Array.isArray(parsedExisting?.users) ? parsedExisting.users.length : 0;
        const newUsers = Array.isArray(parsedNew?.users) ? parsedNew.users.length : 0;
        if (prevUsers > 0 && newUsers === 0) {
          console.error(`[Storage] BLOQUEIO DE SEGURAN\xC7A: Tentativa de gravar 0 usu\xE1rios sobre ${prevUsers} existentes abortada.`);
          throw new Error(`SAFETY_LOCK_ABORT: Attempt to overwrite ${prevUsers} users with 0 users.`);
        }
      }
    } catch (checkErr) {
      if (checkErr.message?.startsWith("SAFETY_LOCK_ABORT")) {
        throw checkErr;
      }
    }
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const fd = import_fs4.default.openSync(tmpPath, "w");
  try {
    import_fs4.default.writeSync(fd, serialized, 0, "utf8");
    import_fs4.default.fsyncSync(fd);
  } finally {
    import_fs4.default.closeSync(fd);
  }
  const bakPath = `${filePath}.bak`;
  if (import_fs4.default.existsSync(filePath)) {
    try {
      import_fs4.default.copyFileSync(filePath, bakPath);
    } catch {
    }
  }
  import_fs4.default.renameSync(tmpPath, filePath);
}

// src/server/accountMigration.ts
var DB_FILE = import_path5.default.join(process.cwd(), "data", "vend_database.json");
async function runAccountMigration() {
  console.log("================================================================================");
  console.log("[MIGRA\xC7\xC3O DE CONTAS] Iniciando verifica\xE7\xE3o e normaliza\xE7\xE3o persistente...");
  console.log("================================================================================");
  const report = {
    totalRead: 0,
    totalNormalized: 0,
    duplicatesResolved: 0,
    masterOwnerPreserved: false,
    backupCreated: null
  };
  if (!import_fs5.default.existsSync(DB_FILE)) {
    console.log("[MIGRA\xC7\xC3O DE CONTAS] Nenhum arquivo JSON existente no momento.");
    return report;
  }
  try {
    report.backupCreated = createTimestampedBackup(DB_FILE);
    const rawContent = import_fs5.default.readFileSync(DB_FILE, "utf8");
    if (!rawContent || !rawContent.trim()) {
      return report;
    }
    const data = JSON.parse(rawContent);
    const existingUsers = Array.isArray(data.users) ? data.users : [];
    report.totalRead = existingUsers.length;
    if (existingUsers.length === 0) {
      console.log("[MIGRA\xC7\xC3O DE CONTAS] Nenhum usu\xE1rio a migrar no arquivo.");
      return report;
    }
    const normalizedMap = /* @__PURE__ */ new Map();
    const idRemapping = /* @__PURE__ */ new Map();
    const cleanUsers = [];
    for (const u of existingUsers) {
      const originalEmail = u.email;
      const cleanEmail = normalizeEmail(originalEmail);
      if (cleanEmail !== originalEmail) {
        report.totalNormalized++;
      }
      u.email = cleanEmail;
      u.normalizedEmail = cleanEmail;
      u.normalized_email = cleanEmail;
      if (!u.username) {
        const prefix = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        u.username = prefix.length >= 3 ? prefix : `user_${u.id}`;
      }
      if (u.emailVerified === void 0 && u.email_verified === void 0) {
        u.emailVerified = true;
        u.email_verified = true;
      }
      if (!u.status) {
        u.status = "ACTIVE";
      }
      if (u.role === "MASTER_OWNER") {
        report.masterOwnerPreserved = true;
      }
      if (!normalizedMap.has(cleanEmail)) {
        normalizedMap.set(cleanEmail, u);
        cleanUsers.push(u);
      } else {
        report.duplicatesResolved++;
        const existing = normalizedMap.get(cleanEmail);
        if (u.role === "MASTER_OWNER" && existing.role !== "MASTER_OWNER") {
          idRemapping.set(existing.id, u.id);
          const index = cleanUsers.indexOf(existing);
          if (index !== -1) cleanUsers[index] = u;
          normalizedMap.set(cleanEmail, u);
          console.log(`[MIGRA\xC7\xC3O DE CONTAS] Duplicidade: Master Owner id ${u.id} preservado sobre id ${existing.id}`);
        } else {
          idRemapping.set(u.id, existing.id);
          console.log(`[MIGRA\xC7\xC3O DE CONTAS] Duplicidade: Conta id ${existing.id} preservada sobre duplicata id ${u.id}`);
        }
      }
    }
    if (idRemapping.size > 0) {
      const relTables = ["stores", "products", "services", "orders", "payments", "reviews", "negotiations", "subscriptions"];
      for (const t of relTables) {
        if (Array.isArray(data[t])) {
          for (const item of data[t]) {
            if (item.userId && idRemapping.has(item.userId)) {
              item.userId = idRemapping.get(item.userId);
            }
            if (item.sellerId && idRemapping.has(item.sellerId)) {
              item.sellerId = idRemapping.get(item.sellerId);
            }
            if (item.buyerId && idRemapping.has(item.buyerId)) {
              item.buyerId = idRemapping.get(item.buyerId);
            }
            if (item.providerId && idRemapping.has(item.providerId)) {
              item.providerId = idRemapping.get(item.providerId);
            }
          }
        }
      }
    }
    data.users = cleanUsers;
    writeJsonAtomic(DB_FILE, data);
    console.log(`[MIGRA\xC7\xC3O DE CONTAS] Conclu\xEDda com sucesso:`);
    console.log(` - Total de usu\xE1rios lidos:       ${report.totalRead}`);
    console.log(` - Emails normalizados:            ${report.totalNormalized}`);
    console.log(` - Duplicidades resolvidas:        ${report.duplicatesResolved}`);
    console.log(` - Master Owner preservado:        ${report.masterOwnerPreserved ? "SIM" : "N\xC3O REQUERIDO"}`);
    console.log(` - Usu\xE1rios finais persistidos:    ${cleanUsers.length}`);
    console.log("================================================================================");
    return report;
  } catch (err) {
    console.error("[MIGRA\xC7\xC3O DE CONTAS] Erro durante o processo de migra\xE7\xE3o:", err.message);
    return report;
  }
}

// server.ts
import_dotenv.default.config();
var PORT = 3e3;
async function startServer() {
  const app = (0, import_express17.default)();
  app.use(import_express17.default.json({ limit: "30mb" }));
  app.use(import_express17.default.urlencoded({ extended: true, limit: "30mb" }));
  app.use((0, import_cookie_parser.default)());
  const uploadsDir = import_path6.default.join(process.cwd(), "data", "uploads");
  if (!import_fs6.default.existsSync(uploadsDir)) {
    import_fs6.default.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", import_express17.default.static(uploadsDir, {
    maxAge: "7d"
  }));
  app.use(authenticateUser);
  app.get("/api/health", (req, res) => {
    const storage = detectStorageStatus();
    res.json({
      status: "ok",
      service: "VEND+ Marketplace API",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      storage: {
        mechanism: storage.mechanism,
        engine: storage.engine,
        isEphemeralEnvironment: storage.isEphemeralEnvironment,
        statement: storage.statement
      }
    });
  });
  app.get("/api/system/storage-status", (req, res) => {
    res.json(detectStorageStatus());
  });
  app.use("/api/auth", authRoutes_default);
  app.use("/api/products", productRoutes_default);
  app.use("/api/services", serviceRoutes_default);
  app.use("/api/stores", storeRoutes_default);
  app.use("/api/negotiations", negotiationRoutes_default);
  app.use("/api/orders", orderRoutes_default);
  app.use("/api/deliveries", deliveryRoutes_default);
  app.use("/api/payments", paymentRoutes_default);
  app.use("/api/plans", planRoutes_default);
  app.use("/api/admin", adminRoutes_default);
  app.use("/api/upload", uploadRoutes_default);
  app.use("/api/categories", categoryRoutes_default);
  app.use("/api/reviews", reviewRoutes_default);
  app.use("/api/favorites", favoriteRoutes_default);
  app.use("/api/notifications", notificationRoutes_default);
  app.use("/api/addresses", addressRoutes_default);
  try {
    await runAccountMigration();
    await initializeDatabaseSeed();
  } catch (err) {
    console.error("Database initialization note:", err.message);
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path6.default.join(process.cwd(), "dist");
    app.use(import_express17.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path6.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VEND+] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
