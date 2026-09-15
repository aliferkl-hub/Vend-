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
  images?: Array<{ imageUrl: string; isPrimary: boolean }>;
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

export interface CartItem {
  id: string; // generated unique id
  productId?: number;
  serviceId?: number;
  type: 'PRODUCT' | 'SERVICE';
  title: string;
  priceCents: number;
  quantity: number;
  imageUrl: string;
  sellerId: number;
  sellerName?: string;
  stock?: number;
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
