export type {
  AdminModerationItem,
  AdminPayoutRecord,
  DisputeRecord,
  EventSummary,
  LedgerEntry,
  Order,
  User,
} from "@givvly/contracts";

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
  occasions: string[];
  relationships?: string[];
  vendorName: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  imageUrl?: string;
};

export type CreateProductInput = {
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  occasions: string[];
  inStock: boolean;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  imageUrl?: string;
};
