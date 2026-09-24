export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'USER' | 'MASTER_OWNER' | 'DELIVERY_DRIVER';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  planSlug: 'free' | 'basico' | 'premium' | 'lendario';
  phone?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  profile?: {
    bio?: string;
    rating?: string;
    totalReviews?: number;
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description?: string | null;
  isActive: boolean;
}

export type ProductImageType = 'main' | 'gallery' | 'desktop' | 'tablet' | 'mobile';

export interface ProductImage {
  id?: number;
  productId?: number;
  url: string;
  imageUrl?: string;
  type: ProductImageType;
  position: number;
  displayOrder?: number;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface Product {
  id: number;
  storeId?: number | null;
  sellerId: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  subcategory?: string | null;
  condition: 'NOVO' | 'USADO';
  priceCents: number;
  originalPriceCents?: number | null;
  stock: number;
  location: string;
  offersDelivery: boolean;
  offersPickup: boolean;
  allowsNegotiation: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'PENDING_REVIEW';
  rating: string;
  viewsCount: number;
  imageUrl: string;
  isDemo?: boolean;
  createdAt: string;
  category?: Category;
  seller?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    location?: string | null;
    phone?: string | null;
    planSlug?: string;
  };
  images?: Array<{
    id?: number;
    productId?: number;
    imageUrl: string;
    url?: string;
    isPrimary: boolean;
    type?: ProductImageType;
    position?: number;
    displayOrder?: number;
    createdAt?: string;
  }>;
  productImages?: ProductImage[];
  store?: any;
}

export interface ServiceItem {
  id: number;
  providerId: number;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  priceType: 'FIXED' | 'STARTING_AT';
  categoryId: number;
  location: string;
  offersDelivery: boolean;
  allowsNegotiation: boolean;
  rating: string;
  totalReviews: number;
  status: string;
  imageUrl: string;
  isDemo?: boolean;
  createdAt: string;
  category?: Category;
  provider?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    location?: string | null;
    phone?: string | null;
  };
}

export interface Store {
  id: number;
  userId: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  category: string;
  location: string;
  phone?: string | null;
  hours?: string | null;
  rating: string;
  offersDelivery: boolean;
  offersPickup: boolean;
  followersCount: number;
  status: string;
  products?: Product[];
  owner?: {
    name: string;
    email: string;
  };
}

export interface DirectBuyIntent {
  intentId: string;
  productId: number;
  sellerId: number;
  sellerName?: string;
  buyerId?: number;
  name: string;
  title: string;
  image: string;
  imageUrl: string;
  unitPriceCents: number;
  priceCents: number;
  quantity: number;
  variations?: Record<string, any> | string | null;
  subtotalCents: number;
  deliveryType: 'SHIPPING' | 'PICKUP';
  shippingFeeCents: number;
  totalCents: number;
  createdAt: string;
}

export interface CartItem {
  id: string; // generated unique id
  productId?: number;
  serviceId?: number;
  type: 'PRODUCT' | 'SERVICE';
  title: string;
  name?: string; // alias/nome
  priceCents: number;
  price?: number; // valor em reais (priceCents / 100)
  quantity: number;
  imageUrl: string;
  image?: string; // alias/imagem
  sellerId: number;
  sellerName?: string;
  stock?: number;
  variations?: Record<string, any> | string | null;
  subtotalCents?: number;
  subtotal?: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId?: number | null;
  serviceId?: number | null;
  itemType: 'PRODUCT' | 'SERVICE';
  title: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  imageUrl?: string | null;
  variations?: Record<string, any> | string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  buyerId: number;
  sellerId: number;
  status:
    | 'AWAITING_PAYMENT'
    | 'PAID'
    | 'PREPARING'
    | 'READY_FOR_PICKUP'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'WAITING_CONFIRMATION'
    | 'DELIVERED'
    | 'CANCELLED';
  totalGrossCents: number;
  commissionCents: number;
  sellerNetCents: number;
  shippingFeeCents: number;
  deliveryType: 'SHIPPING' | 'PICKUP';
  deliveryAddressId?: number | null;
  deliveryDriverId?: number | null;
  deliveryCode: string;
  deliveryCodeUsed: boolean;
  deliveryAttempts: number;
  payoutStatus?:
    | 'PENDING'
    | 'RELEASED'
    | 'PENDING_DELIVERY_CONFIRMATION'
    | 'AVAILABLE_FOR_PAYOUT'
    | 'REQUESTED'
    | 'PAID'
    | 'REFUNDED'
    | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';
  payoutReleasedAt?: string | null;
  payoutRequestedAt?: string | null;
  payoutCompletedAt?: string | null;
  deliveryConfirmedAt?: string | null;
  mpPaymentId?: string | null;
  confirmedByUserId?: number | null;
  paidAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  items?: OrderItem[];
  buyer?: { id: number; name: string; email: string; phone?: string | null };
  seller?: { id: number; name: string; email: string; phone?: string | null };
  address?: Address | null;
}

export interface Address {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface Plan {
  id: number;
  name: string;
  slug: 'free' | 'basico' | 'premium' | 'lendario';
  priceCents: number;
  maxActiveListings: number;
  commissionPercent: number;
  features: string | string[];
  status: string;
}

export interface NegotiationMessage {
  id: number;
  senderId: number;
  message: string;
  offerCents?: number | null;
  messageType: 'MESSAGE' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPT' | 'REJECT';
  createdAt: string;
  sender?: { id: number; name: string };
}

export interface Negotiation {
  id: number;
  productId?: number | null;
  serviceId?: number | null;
  buyerId: number;
  sellerId: number;
  initialPriceCents: number;
  currentOfferCents: number;
  lastOfferBy: 'BUYER' | 'SELLER';
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  finalAgreedPriceCents?: number | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  service?: ServiceItem;
  buyer?: { id: number; name: string; avatarUrl?: string | null };
  messages?: NegotiationMessage[];
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SellerPayoutAccount {
  id: number;
  sellerId: number;
  accountType: 'PIX' | 'BANK_ACCOUNT';
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' | null;
  pixKey?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  accountTypeDetail?: 'CORRENTE' | 'POUPANCA' | null;
  holderName: string;
  holderDocument: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  isVerified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: number;
  requestNumber: string;
  sellerId: number;
  payoutAccountId?: number | null;
  amountCents: number;
  feeCents: number;
  netAmountCents: number;
  status: 'REQUESTED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  receiptSnapshot?: string | null;
  orderIds?: string | null;
  processedByUserId?: number | null;
  paymentProofUrl?: string | null;
  notes?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  paidAt?: string | null;
  seller?: { id: number; name: string; email: string };
  payoutAccount?: SellerPayoutAccount | null;
  linkedOrders?: Array<{ orderId: number; orderNumber: string; mpPaymentId: string | null; amountCents: number }>;
}

export interface FinancialLedgerEntry {
  id: number;
  transactionNumber: string;
  orderId: number;
  orderNumber: string;
  paymentId?: number | null;
  buyerId: number;
  sellerId: number;
  buyerName?: string;
  sellerName?: string;
  grossAmountCents: number;
  platformFeeCents: number;
  sellerAmountCents: number;
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';
  orderStatus: string;
  payoutStatus:
    | 'PENDING_DELIVERY_CONFIRMATION'
    | 'AVAILABLE_FOR_PAYOUT'
    | 'REQUESTED'
    | 'PAID'
    | 'CANCELLED'
    | 'REFUNDED';
  approvedAt?: string | null;
  deliveryConfirmedAt?: string | null;
  payoutRequestedAt?: string | null;
  payoutCompletedAt?: string | null;
  payoutRequestId?: number | null;
  mpPaymentId?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerWalletSummary {
  pendingBalanceCents: number;
  availableBalanceCents: number;
  totalPaidOutCents: number;
  totalCommissionsCents: number;
  totalGrossSalesCents: number;
  pendingPayoutsCount: number;
  completedPayoutsCount: number;
  payoutAccount?: SellerPayoutAccount | null;
  recentTransactions?: FinancialLedgerEntry[];
  payoutRequests?: PayoutRequest[];
}

