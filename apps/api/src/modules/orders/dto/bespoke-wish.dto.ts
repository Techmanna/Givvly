import { z } from "zod";

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
    .url("Enter a valid URL")
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
  buyerPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  occasion: z.string().trim().min(2, "Select an occasion"),
  recipientName: z.string().trim().min(2, "Recipient name is required").max(80),
  recipientPhone: z.string().trim().min(7, "Enter recipient's phone number").max(20),
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
  status: string;
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
