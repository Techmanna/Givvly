import { z } from "zod";
import { NIGERIAN_PHONE_REGEX } from "./auth";
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

export type BoxPackagingOption = {
  id: string;
  name: string;
  description: string;
  extraKobo: number;
};

export const BOX_PACKAGING_OPTIONS: BoxPackagingOption[] = [
  {
    id: "blush-gold",
    name: "Blush & Gold Rigid Keepsake Box",
    description: "Signature satin ribbon, hot-stamped gold foil seal, and embossed greeting card.",
    extraKobo: 0,
  },
  {
    id: "woven-cane",
    name: "Handwoven Northern Cane Hamper",
    description: "Artisanal woven hamper basket tied with raw silk ribbon and botanical sprig.",
    extraKobo: 850_000, // ₦8,500
  },
  {
    id: "midnight-plum",
    name: "Midnight Plum Velvet Ribbon Box",
    description: "Deep plum textured box with wide champagne velvet ribbon and wax seal.",
    extraKobo: 500_000, // ₦5,000
  },
  {
    id: "minimalist-kraft",
    name: "Eco Luxury Kraft Ribbon Box",
    description: "Recycled heavyweight kraft box with grosgrain ribbon and dried floral stem.",
    extraKobo: 0,
  },
];

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
      name: z.string().trim().min(2).max(60).optional(),
      email: z.string().email("Enter a valid email address").max(254),
      message: z.string().max(500).optional(),
      anonymous: z.boolean().default(false),
    })
    .refine((v) => v.anonymous || Boolean(v.name && v.name.trim().length >= 2), {
      path: ["name"],
      message: "Enter your name or give anonymously",
    });
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
      .min(2, "Recipient name must be at least 2 characters")
      .max(60, "Recipient name must be 60 characters or fewer"),
    recipientPhone: z
      .string()
      .trim()
      .refine((v) => NIGERIAN_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
        message: "Enter a valid Nigerian phone number (e.g. 08031234567)",
      }),
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

export type CreateDirectOrderRequest = {
  productSlug: string;
  recipientName: string;
  recipientPhone: string;
  address: {
    street: string;
    area: string;
    city: string;
    state: string;
  };
  giftNote?: string;
  wrapping: boolean;
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
    .array(z.string().url())
    .max(5, "You can attach up to 5 photos")
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

