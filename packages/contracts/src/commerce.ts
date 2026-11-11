import { z } from "zod";
import { NIGERIAN_PHONE_REGEX } from "./auth";
import { SAFE_MEDIA_URL_REGEX } from "./events";
import type { OrderStatus, PoolItem, RegistryItem } from "./index";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  giftType?: string;
  occasions: string[];
  relationships: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  ageGroup?: string;
  mainCategories?: string[];
  imageUrl?: string;
  vendorName: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  isDigital?: boolean;
  digitalKind?: "AIRTIME" | "DATA" | "VOUCHER" | "GIFT_CARD";
};

export type BillSpotVtuType = "airtime" | "data";

export type BillSpotProviderSlug = "mtn" | "airtel" | "glo" | "t2mobile";

export type BillSpotProviderInfo = {
  id: number;
  name: string;
  slug: BillSpotProviderSlug | string;
  logo: string;
};

export type BillSpotProvidersResponse = {
  message: string;
  type: BillSpotVtuType;
  providers: BillSpotProviderInfo[];
};

export type BillSpotDataPlan = {
  name: string;
  bill_item_identifier: string;
  amount: number;
};

export type BillSpotPlansResponse = {
  message: string;
  provider: BillSpotProviderInfo;
  plans: BillSpotDataPlan[];
};

export type CatalogCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  productSlugs: string[];
};

export type CatalogFilters = {
  mainCategory?: string;
  occasion?: string;
  relationship?: string;
  gender?: string;
  ageGroup?: string;
  giftType?: string;
  isCombo?: boolean;
  maxPriceKobo?: number;
  q?: string;
};

// Group gift contribution schema (Section 8.1)
export function createPoolContributionSchema(remainingKobo: number) {
  const maxNaira = Math.max(500, Math.floor(remainingKobo / 100));
  return z
    .object({
      amountNaira: z.coerce
        .number()
        .int("Enter a whole Naira amount")
        .min(500, "Minimum contribution is ₦500")
        .max(
          maxNaira,
          `Contribution cannot exceed remaining amount (₦${maxNaira.toLocaleString("en-NG")})`
        ),
      name: z
        .string()
        .trim()
        .max(60, "Name must be 60 characters or fewer")
        .optional()
        .or(z.literal("")),
      email: z.string().email("Enter a valid email address").max(254),
      message: z
        .string()
        .max(500, "Message must be 500 characters or fewer")
        .optional()
        .or(z.literal("")),
      anonymous: z.boolean().default(false),
    })
    .refine(
      (v) =>
        v.anonymous ||
        Boolean(v.name && v.name.trim().length >= 2),
      {
        path: ["name"],
        message: "Enter your name (at least 2 characters) or give anonymously",
      }
    );
}

export type PoolContributionInput = {
  amountNaira: number;
  name?: string;
  email: string;
  message?: string;
  anonymous: boolean;
};

export const createRegistryItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(80, "Title must be 80 characters or fewer"),
  priceNaira: z.coerce
    .number()
    .int("Enter a whole Naira amount")
    .min(500, "Minimum price is ₦500")
    .max(5_000_000, "Maximum price is ₦5,000,000"),
  isPool: z.boolean().default(false),
  poolMode: z.enum(["PRODUCT", "CASH"]).default("CASH"),
  deadline: z.string().optional().or(z.literal("")),
});

export type CreateRegistryItemInput = z.infer<typeof createRegistryItemSchema>;

export type ReserveRegistryItemResponse = {
  item: RegistryItem;
  reservedUntil: string;
};

export type RegistryOwnerData = {
  registry: RegistryItem[];
  pools: PoolItem[];
};

// Direct checkout schema (Section 8.1)
export const directCheckoutSchema = z
  .object({
    recipientName: z
      .string()
      .trim()
      .max(60, "Recipient name must be 60 characters or fewer")
      .optional()
      .or(z.literal("")),
    recipientPhone: z
      .string()
      .trim()
      .refine((v) => NIGERIAN_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
        message: "Enter a valid Nigerian phone number (e.g. 08031234567)",
      }),
    buyerEmail: z
      .string()
      .trim()
      .email("Enter a valid email address to receive your order receipt and tracking link")
      .optional()
      .or(z.literal("")),
    street: z
      .string()
      .trim()
      .min(3, "Enter street address")
      .max(100, "Street address is too long"),
    area: z
      .string()
      .trim()
      .min(2, "Enter area / neighbourhood")
      .max(50, "Area is too long"),
    city: z.string().trim().min(2, "Enter city").max(40, "City is too long"),
    state: z.string().trim().min(2, "Select state").max(40, "State is too long"),
    giftNote: z
      .string()
      .trim()
      .max(300, "Gift note must be 300 characters or fewer")
      .optional()
      .or(z.literal("")),
    wrapping: z.boolean().default(false),
  })
  .refine(
    (v) =>
      `${v.street}, ${v.area}, ${v.city}, ${v.state}`.length <= 200,
    {
      path: ["street"],
      message: "Combined delivery address must be 200 characters or fewer",
    }
  );

export type DirectCheckoutInput = z.infer<typeof directCheckoutSchema>;

export type CreateDirectOrderItem = {
  productId?: string;
  productSlug?: string;
  name: string;
  qty: number;
  unitPriceKobo: number;
};

export type CreateDirectOrderRequest = {
  items?: CreateDirectOrderItem[];
  productSlug?: string;
  recipientName?: string;
  recipientPhone: string;
  recipientPhones?: string[];
  address?: {
    street: string;
    area: string;
    city: string;
    state: string;
  };
  giftNote?: string;
  wrapping?: boolean;
  buyerEmail?: string;
  vtuType?: BillSpotVtuType;
  vtuProvider?: string;
  billItemIdentifier?: string;
  customAmountKobo?: number;
};

export type SavedAddress = {
  id: string;
  label?: string; // e.g. "Home", "Office", "Mom's Place"
  recipientName: string;
  recipientPhone: string;
  buyerEmail?: string;
  street: string;
  area: string;
  city: string;
  state: string;
  isDefault?: boolean;
  createdAt: string;
};

// Dispute schema (Section 8.1)
export const DISPUTE_TYPES = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_DELIVERED",
  "OTHER",
] as const;

export type DisputeType = (typeof DISPUTE_TYPES)[number];

export const disputeFormSchema = z.object({
  type: z.enum(DISPUTE_TYPES, {
    errorMap: () => ({ message: "Choose a dispute type" }),
  }),
  description: z
    .string()
    .trim()
    .min(20, "Describe the issue in at least 20 characters")
    .max(1000, "Description must be 1,000 characters or fewer"),
  photos: z
    .array(
      z
        .string()
        .trim()
        .refine((v) => SAFE_MEDIA_URL_REGEX.test(v), {
          message: "Invalid evidence media URL",
        })
    )
    .max(5, "You can attach up to 5 media files")
    .optional(),
});

export type DisputeFormInput = z.infer<typeof disputeFormSchema>;

// Review schema (Section 8.1)
export const reviewFormSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Select a rating between 1 and 5 stars")
    .max(5, "Maximum rating is 5 stars"),
  comment: z
    .string()
    .trim()
    .max(500, "Comment must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type ReviewFormInput = z.infer<typeof reviewFormSchema>;

export type ProductReview = {
  id: string;
  productId?: string;
  productSlug?: string;
  authorName: string;
  verified: boolean;
  rating: number;
  title: string;
  comment: string;
  date: string;
  timestamp: number;
};

export const createProductReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Select a rating between 1 and 5 stars")
    .max(5, "Maximum rating is 5 stars"),
  authorName: z
    .string()
    .trim()
    .min(2, "Author name must be at least 2 characters")
    .max(60, "Author name must be 60 characters or fewer"),
  title: z
    .string()
    .trim()
    .min(3, "Review title must be at least 3 characters")
    .max(100, "Review title must be 100 characters or fewer"),
  comment: z
    .string()
    .trim()
    .min(5, "Review details must be at least 5 characters")
    .max(1000, "Review details must be 1,000 characters or fewer"),
  verified: z.boolean().optional(),
});

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;

export type ReviewEligibilityReason =
  | "UNAUTHENTICATED"
  | "NOT_PURCHASED"
  | "ALREADY_REVIEWED";

export type ReviewEligibilityResponse = {
  canReview: boolean;
  reason?: ReviewEligibilityReason;
  message?: string;
  orderId?: string;
  orderNumber?: string;
};

// Vendor status transitions (Section 8.1 & 9.F11)
export const NEXT_VALID_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING_PAYMENT: "CONFIRMED",
  CONFIRMED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export function getNextValidOrderStatus(
  current: OrderStatus
): OrderStatus | null {
  return NEXT_VALID_ORDER_STATUS[current] ?? null;
}

export const vendorStatusUpdateSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
  ] as const),
  trackingNote: z
    .string()
    .trim()
    .max(200, "Tracking note must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type VendorStatusUpdateInput = z.infer<typeof vendorStatusUpdateSchema>;

export const vendorProductSchema = z.object({
  name: z.string().trim().min(3, "Enter a product name").max(80),
  description: z.string().trim().min(10, "Enter a description").max(500),
  priceNaira: z.coerce.number().int().min(1000).max(5_000_000),
  category: z.string().trim().min(2).max(40),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => !v || SAFE_MEDIA_URL_REGEX.test(v), {
      message: "Invalid product media URL",
    })
    .optional()
    .or(z.literal("")),
  inStock: z.boolean().default(true),
});

export type VendorProductInput = z.infer<typeof vendorProductSchema>;

// Admin Console Types
export type AdminModerationItem = {
  id: string;
  eventSlug: string;
  eventName: string;
  authorName: string;
  text?: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REMOVED";
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  type: "CREDIT" | "DEBIT" | "FEE" | "PAYOUT";
  description: string;
  amountKobo: number;
  reference: string;
  createdAt: string;
};

export type DisputeRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  type: DisputeType;
  description: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  createdAt: string;
};

export type AdminPayoutRecord = {
  id: string;
  eventName: string;
  ownerName: string;
  bankName: string;
  accountNumberLast4: string;
  amountKobo: number;
  status: "SENT" | "FAILED" | "PENDING";
  createdAt: string;
};

// ==================== BESPOKE WISH PACKAGES ====================

export const bespokeWishCategoryEnum = z.enum([
  "LIFESTYLE",
  "BEAUTY_PERFUME",
  "TECH_GADGETS",
  "FASHION_JEWELRY",
  "HOME_LIVING",
  "GOURMET_DRINKS",
  "BABY_KIDS",
  "BOOKS_KEEPSAKES",
  "EXPERIENTIAL",
  "OTHER",
]);

export type BespokeWishCategory = z.infer<typeof bespokeWishCategoryEnum>;

export const bespokeWishItemSchema = z.object({
  title: z.string().trim().min(2, "Item title must be at least 2 characters").max(120),
  category: bespokeWishCategoryEnum.default("LIFESTYLE"),
  inspirationUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (e.g. Instagram link, Amazon, Zara, Apple)")
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  specs: z.string().trim().max(300).optional().or(z.literal("")),
  targetBudgetHint: z.string().trim().max(80).optional().or(z.literal("")),
  qty: z.coerce.number().int().min(1).default(1),
});

export type BespokeWishItem = z.infer<typeof bespokeWishItemSchema>;

export const bespokeWrapStyleEnum = z.enum([
  "SIGNATURE_VELVET_BOX",
  "WOODEN_KEEPSAKE_CRATE",
  "MINIMALIST_SATIN_WRAP",
  "STANDARD_GIFT_BAG",
]);

export type BespokeWrapStyle = z.infer<typeof bespokeWrapStyleEnum>;

export const createBespokeWishPackageSchema = z.object({
  buyerName: z.string().trim().min(2, "Your name is required").max(80),
  buyerEmail: z.string().trim().email("Enter a valid email address to receive your quote"),
  buyerPhone: z
    .string()
    .trim()
    .refine((v) => NIGERIAN_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
      message: "Enter a valid Nigerian phone number",
    }),
  occasion: z.string().trim().min(2, "Select an occasion"),
  recipientName: z.string().trim().min(2, "Recipient name is required").max(80),
  recipientPhone: z
    .string()
    .trim()
    .refine((v) => NIGERIAN_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
      message: "Enter recipient's phone number",
    }),
  recipientEmail: z.string().trim().email().optional().or(z.literal("")),
  street: z.string().trim().min(3, "Enter street address").max(100),
  area: z.string().trim().min(2, "Enter area / neighbourhood").max(50),
  city: z.string().trim().min(2, "Enter city").max(40),
  state: z.string().trim().min(2, "Select state").max(40),
  wrapStyle: bespokeWrapStyleEnum.default("SIGNATURE_VELVET_BOX"),
  giftNote: z.string().trim().max(500).optional().or(z.literal("")),
  targetBudgetHint: z.string().trim().max(100).optional().or(z.literal("")),
  items: z.array(bespokeWishItemSchema).min(1, "At least one gift wish item is required").max(10),
});

export type CreateBespokeWishPackageInput = z.infer<typeof createBespokeWishPackageSchema>;

export const provideBespokeQuoteSchema = z.object({
  subtotalKobo: z.coerce.number().int().min(100, "Subtotal must be at least ₦1 (100 kobo)"),
  packagingFeeKobo: z.coerce.number().int().min(0).default(0),
  deliveryFeeKobo: z.coerce.number().int().min(0).default(0),
  adminNote: z.string().trim().min(5, "Include a brief sourcing note for the customer").max(1000),
  estimatedDeliveryDays: z.coerce.number().int().min(1).max(30).optional(),
});

export type ProvideBespokeQuoteInput = z.infer<typeof provideBespokeQuoteSchema>;

export type BespokeWishPackageDetail = {
  id: string;
  orderNumber: string;
  trackingToken: string;
  status: OrderStatus;
  buyerName?: string;
  buyerEmail: string;
  buyerPhone?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  deliveryAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
  };
  wrapStyle?: string;
  giftNote?: string;
  subtotalKobo: number;
  packagingFeeKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  customWishData: {
    isBespokeWish: boolean;
    occasion: string;
    targetBudgetHint?: string;
    items: BespokeWishItem[];
    adminNote?: string;
    quotedAt?: string;
    estimatedDeliveryDays?: number;
  };
  createdAt: string;
  updatedAt: string;
};

