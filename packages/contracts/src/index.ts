import { z } from "zod";

// API Envelope Types (Section 7)
export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  nextCursor?: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId: string;
};

export type ApiError = {
  error: ApiErrorPayload;
};

// Client Data Model Types (Section 12)
export type Role = "USER" | "ADMIN";

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR" | "GHS" | "KES" | string;

export type PaymentProvider = "PAYSTACK" | "STRIPE" | "FLUTTERWAVE" | string;

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  emailVerified: boolean;
  avatarUrl?: string;
};

export type EventType =
  | "BIRTHDAY"
  | "WEDDING"
  | "HOUSEWARMING"
  | "ANNIVERSARY"
  | "BRIDAL_SHOWER"
  | "BABY_SHOWER"
  | "NAMING_CEREMONY"
  | "GRADUATION"
  | "SEND_OFF"
  | "RETIREMENT"
  | "MEMORIAL"
  | "OTHER";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type EventVisibility = "PUBLIC" | "PRIVATE";

export type EventSummary = {
  id: string;
  slug: string;
  name: string;
  hostName?: string;
  type: EventType;
  date: string;
  coverUrl?: string;
  visibility: EventVisibility;
  status: EventStatus;
  moneyGiftsEnabled: boolean;
  currency?: CurrencyCode;
  totalReceivedKobo: number;
  giftCount: number;
  rsvpYesCount: number;
};

export type RegistryItemStatus = "AVAILABLE" | "RESERVED" | "CLAIMED";

export type RegistryItem = {
  id: string;
  title: string;
  productId?: string;
  priceKobo: number;
  imageUrl?: string;
  status: RegistryItemStatus;
  reservedUntil?: string;
};

export type PoolItem = RegistryItem & {
  targetKobo: number;
  raisedKobo: number;
  deadline?: string;
  mode: "PRODUCT" | "CASH";
};

export type InviteTemplateData = {
  templateId: string;
  fields: Record<string, string>;
};

export type PublicEvent = EventSummary & {
  story?: string;
  ownerFirstName: string;
  allowPlusOne: boolean;
  registry: RegistryItem[];
  pools: PoolItem[];
  template?: InviteTemplateData;
};

export type GiftType = "MONEY" | "PRODUCT" | "POOL" | "DIGITAL";

export type GiftStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type Gift = {
  id: string;
  type: GiftType;
  amountKobo: number;
  currency?: CurrencyCode;
  giverName: string | null;
  anonymous: boolean;
  message?: string;
  status: GiftStatus;
  thanked: boolean;
  createdAt: string;
};

export type WallPostStatus = "PENDING" | "VISIBLE" | "HIDDEN" | "REMOVED";

export type WallPost = {
  id: string;
  authorName: string;
  text?: string;
  media: { url: string; type: "IMAGE" | "VIDEO" }[];
  status: WallPostStatus;
  createdAt: string;
};

export type OrderStatus =
  | "AWAITING_QUOTE"
  | "QUOTED"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "DISPUTED"
  | "REFUNDED";

export type Order = {
  id: string;
  number: string;
  buyerUserId?: string;
  buyerEmail?: string;
  items: {
    productId?: string;
    title?: string;
    name?: string;
    qty: number;
    quantity?: number;
    unitPriceKobo: number;
    priceKobo?: number;
  }[];
  totalKobo: number;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: string }[];
  recipientName: string;
  recipientPhone?: string;
  trackingToken?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Shared Example Schema (Section 8.2)
export const giveMoneySchema = z
  .object({
    amountNaira: z.coerce.number().int().min(500).max(1_000_000),
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
      (typeof v.name === "string" && v.name.trim().length >= 2),
    {
      path: ["name"],
      message: "Enter your name (at least 2 characters) or give anonymously",
    }
  );

export type GiveMoneyInput = z.infer<typeof giveMoneySchema>;

export * from "./auth";
export * from "./events";
export * from "./gifts";
export * from "./rsvp";
export * from "./commerce";






