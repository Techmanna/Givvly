export type {
  AdminModerationItem,
  AdminPayoutRecord,
  DisputeRecord,
  EventSummary,
  LedgerEntry,
  Order,
  OrderStatus,
  User,
} from "@givvly/contracts";

import type { OrderStatus } from "@givvly/contracts";

export type AdminPaymentRecord = {
  reference: string;
  amountKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  status: string;
  createdAt: string;
};

export type AdminVendorSummary = {
  id: string;
  name: string;
  email: string;
  productCount: number;
  status: "VERIFIED" | "PENDING_REVIEW";
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  giftType?: string;
  mainCategories?: string[];
  occasions: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  vendorName: string;
  inStock: boolean;
  stock?: number | null;
  rating: number;
  reviewCount: number;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  imageUrl?: string;
  images?: string[];
  active?: boolean;
};

export type UpdateProductInput = {
  name?: string;
  slug?: string;
  description?: string;
  priceKobo?: number;
  category?: string;
  giftType?: string;
  mainCategories?: string[];
  occasions?: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  vendorName?: string;
  packagingIncluded?: string;
  imageUrl?: string;
  images?: string[];
  inStock?: boolean;
  stock?: number | null;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  active?: boolean;
};

export type CreateProductInput = {
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  giftType?: string;
  mainCategories?: string[];
  occasions: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  inStock: boolean;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  imageUrl?: string;
};

export type AdminOrderItem = {
  id: string;
  productId?: string | null;
  title?: string;
  name?: string;
  qty: number;
  unitPriceKobo: number;
  totalPriceKobo?: number;
  vtuMetadata?: {
    type?: "airtime" | "data" | string;
    network?: string;
    provider?: string;
    planName?: string;
    recipients?: string[];
    [key: string]: any;
  } | null;
};

export type AdminOrderStatusHistory = {
  id: string;
  status: OrderStatus;
  note?: string;
  actorId?: string;
  createdAt: string;
};

export type AdminOrderPayment = {
  id: string;
  reference: string;
  currency: string;
  amountKobo: number;
  status: string;
  provider: string;
  payerEmail?: string;
  authorizationUrl?: string;
  createdAt: string;
};

export type AdminAddressPayload = {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  vtuType?: "airtime" | "data";
  vtuProvider?: string;
  billItemIdentifier?: string;
  unitVtuAmountKobo?: number;
  recipientPhones?: string[];
  [key: string]: any;
};

export type AdminOrderDetail = {
  id: string;
  number: string;
  buyerUserId?: string | null;
  buyerEmail: string;
  recipientName: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  address?: AdminAddressPayload | string | null;
  giftNote?: string | null;
  wrapStyle?: string | null;
  status: OrderStatus;
  subtotalKobo: number;
  deliveryFeeKobo: number;
  feeKobo?: number;
  totalKobo: number;
  trackingToken: string;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: AdminOrderItem[];
  payment?: AdminOrderPayment | null;
  history?: AdminOrderStatusHistory[];
  review?: any;
  disputes?: any[];
};
