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
  id?: string;
  reference: string;
  scope?: string | null;
  provider?: string;
  channel?: string | null;
  payerEmail?: string;
  amountKobo: number;
  serviceFeeKobo: number;
  providerFeeKobo?: number | null;
  totalKobo: number;
  currency?: string;
  status: string;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  gift?: {
    id: string;
    type: string;
    giverName: string | null;
    event: { id: string; slug: string; name: string } | null;
  } | null;
  order?: {
    id: string;
    number: string;
    recipientName: string;
    status: string;
    shippingZoneName: string | null;
    deliveryFeeKobo: number;
    vatKobo: number;
  } | null;
};

export type AdminPayoutDetail = import("@givvly/contracts").AdminPayoutRecord & {
  eventId?: string | null;
  eventSlug?: string | null;
  ownerEmail?: string | null;
  accountName?: string | null;
  rawStatus?: string;
  reference?: string | null;
  failureReason?: string | null;
  attempts?: number;
  completedAt?: string | null;
};

export type AdminLedgerEntry = import("@givvly/contracts").LedgerEntry & {
  accountCode?: string;
};

export type AdminUserListItem = import("@givvly/contracts").User & {
  phone?: string | null;
  status?: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerifiedAt?: string | null;
  kycTier?: number;
  bvnLast4?: string | null;
  kycUpgradedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  _count?: {
    events: number;
    payoutAccounts: number;
  };
};

export type AdminUserDetail = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  failedLogins: number;
  lockedUntil: string | null;
  walletPinSetAt: string | null;
  kycTier: number;
  bvnLast4: string | null;
  kycUpgradedAt: string | null;
  createdAt: string;
  payoutAccounts: Array<{
    id: string;
    bankName: string;
    accountName: string;
    accountLast4: string;
    status: string;
    isDefault: boolean;
  }>;
  events: Array<{
    id: string;
    slug: string;
    name: string;
    type: string;
    status: string;
    date: string;
    createdAt: string;
    giftCount: number;
    rsvpCount: number;
  }>;
  orders: Array<{
    id: string;
    number: string;
    recipientName: string;
    totalKobo: number;
    status: string;
    createdAt: string;
  }>;
  stats: {
    eventsCount: number;
    ordersCount: number;
    paidOrdersCount: number;
    totalOrdersSpentKobo: number;
    giftsGivenCount: number;
    totalGiftsGivenKobo: number;
    payoutsCount: number;
    totalPayoutsReceivedKobo: number;
  };
  transactions: Array<{
    id: string;
    kind: "ORDER" | "GIFT" | "PAYOUT";
    title: string;
    reference: string;
    amountKobo: number;
    status: string;
    createdAt: string;
  }>;
};

export type AdminLedgerReport = {
  trialBalance: {
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  };
  entries: AdminLedgerEntry[];
};

export type AdminFinancePnlReport = {
  windowDays: number | null;
  recognizedOrderCount: number;
  excluded: {
    total: number;
    cancelled: number;
    refunded: number;
    disputed: number;
    unpaidOrPending: number;
  };
  missingCostItemCount: number;
  summary: {
    totalCollectedKobo: number;
    merchandiseRevenueKobo: number;
    deliveryCollectedKobo: number;
    packagingCollectedKobo: number;
    vatCollectedKobo: number;
    vendorCostKobo: number;
    grossProfitKobo: number;
    grossMarginPct: number;
    gatewayFeesKobo: number;
    netProfitKobo: number;
    netMarginPct: number;
    avgOrderRevenueKobo: number;
    avgOrderNetProfitKobo: number;
  };
  dailySeries: Array<{
    date: string;
    orders: number;
    revenueKobo: number;
    cogsKobo: number;
    gatewayFeeKobo: number;
    netProfitKobo: number;
  }>;
  byVendor: Array<{
    vendorName: string;
    orders: number;
    units: number;
    revenueKobo: number;
    cogsKobo: number;
    grossProfitKobo: number;
    marginPct: number;
  }>;
  topProducts: Array<{
    productId: string;
    title: string;
    units: number;
    revenueKobo: number;
    cogsKobo: number;
    grossProfitKobo: number;
    marginPct: number;
  }>;
  orders: Array<{
    id: string;
    number: string;
    createdAt: string;
    status: string;
    vendorName: string;
    provider: string;
    totalKobo: number;
    subtotalKobo: number;
    cogsKobo: number;
    gatewayFeeKobo: number;
    grossProfitKobo: number;
    netProfitKobo: number;
    netMarginPct: number;
    missingCostItems: number;
  }>;
};

import type { VendorPricingMode, VendorPricingTier } from "@givvly/contracts";

export type AdminVendorSummary = {
  id: string;
  name: string;
  slug?: string;
  email: string;
  phone?: string;
  location?: string;
  logoUrl?: string;
  active?: boolean;
  pricingMode?: VendorPricingMode;
  markupBps?: number;
  discountBps?: number;
  commissionBps?: number;
  roundingStepKobo?: number;
  pricingTiers?: VendorPricingTier[] | null;
  productCount: number;
  status: "VERIFIED" | "PENDING_REVIEW";
};

export type CreateAdminVendorInput = {
  name: string;
  email: string;
  phone: string;
  location?: string;
  logoUrl?: string;
  active?: boolean;
  pricingMode?: VendorPricingMode;
  markupBps?: number;
  discountBps?: number;
  commissionBps?: number;
  roundingStepKobo?: number;
  pricingTiers?: VendorPricingTier[] | null;
};

export type UpdateAdminVendorInput = Partial<CreateAdminVendorInput>;

export type ProductVariant = {
  id: string;
  name: string;
  priceKobo: number;
  costPriceKobo?: number | null;
  priceOverridden?: boolean;
  stock?: number | null;
  sku?: string | null;
  active?: boolean;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceKobo: number;
  costPriceKobo?: number | null;
  priceOverridden?: boolean;
  category: string;
  giftType?: string;
  mainCategories?: string[];
  occasions: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  vendorId?: string | null;
  vendorName: string;
  inStock: boolean;
  stock?: number | null;
  rating: number;
  reviewCount: number;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  variants?: ProductVariant[];
  minPriceKobo?: number;
  maxPriceKobo?: number;
  packagingIncluded?: string;
  imageUrl?: string;
  images?: string[];
  active?: boolean;
  boxRole?: "GIFT_BOX" | "ITEM" | "EXCLUDED";
  boxMaxItems?: number | null;
  boxSizeTier?: "SMALL" | "MEDIUM" | "LARGE" | null;
};

export type UpdateProductInput = {
  name?: string;
  slug?: string;
  description?: string;
  priceKobo?: number;
  costPriceKobo?: number | null;
  priceOverridden?: boolean;
  category?: string;
  giftType?: string;
  mainCategories?: string[];
  occasions?: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  vendorId?: string | null;
  vendorName?: string;
  packagingIncluded?: string;
  imageUrl?: string;
  images?: string[];
  inStock?: boolean;
  stock?: number | null;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  variants?: ProductVariant[];
  active?: boolean;
  boxRole?: "GIFT_BOX" | "ITEM" | "EXCLUDED";
  boxMaxItems?: number | null;
  boxSizeTier?: "SMALL" | "MEDIUM" | "LARGE" | null;
};

export type CreateProductInput = {
  name: string;
  description: string;
  priceKobo: number;
  costPriceKobo?: number | null;
  priceOverridden?: boolean;
  category: string;
  giftType?: string;
  mainCategories?: string[];
  occasions: string[];
  relationships?: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  vendorId?: string | null;
  inStock: boolean;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  variants?: ProductVariant[];
  packagingIncluded?: string;
  imageUrl?: string;
  boxRole?: "GIFT_BOX" | "ITEM" | "EXCLUDED";
  boxMaxItems?: number | null;
  boxSizeTier?: "SMALL" | "MEDIUM" | "LARGE" | null;
};

export type AdminOrderItem = {
  id: string;
  productId?: string | null;
  title?: string;
  name?: string;
  qty: number;
  size?: string;
  vendorId?: string;
  vendorName?: string;
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
  channel?: string | null;
  failureReason?: string | null;
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
  vendor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    logoUrl?: string;
  } | null;
  payment?: AdminOrderPayment | null;
  history?: AdminOrderStatusHistory[];
  review?: any;
  disputes?: any[];
};
