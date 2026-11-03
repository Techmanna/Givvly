import { z } from "zod";
import type {
  EventStatus,
  EventSummary,
  EventType,
  EventVisibility,
  InviteTemplateData,
  WallPost,
} from "./index";

export const EVENT_TYPES = [
  "BIRTHDAY",
  "WEDDING",
  "BABY_SHOWER",
  "GRADUATION",
  "OTHER",
] as const satisfies readonly EventType[];

export const EVENT_VISIBILITIES = [
  "PUBLIC",
  "PRIVATE",
] as const satisfies readonly EventVisibility[];

/**
 * Computes today's YYYY-MM-DD and +3 years YYYY-MM-DD in Africa/Lagos timezone.
 */
export function getLagosDateBounds(now: Date = new Date()): {
  minDate: string;
  maxDate: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const minDate = formatter.format(now);
  const maxObj = new Date(now);
  maxObj.setFullYear(maxObj.getFullYear() + 3);
  const maxDate = formatter.format(maxObj);
  return { minDate, maxDate };
}

export const eventStep1Schema = z
  .object({
    type: z.enum(EVENT_TYPES, {
      errorMap: () => ({ message: "Choose an event type" }),
    }),
    name: z
      .string()
      .trim()
      .min(3, "Enter an event name (at least 3 characters)")
      .max(80, "Event name must be 80 characters or fewer"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid event date (YYYY-MM-DD)"),
  })
  .refine(
    (data) => {
      const { minDate } = getLagosDateBounds();
      return data.date >= minDate;
    },
    {
      path: ["date"],
      message: "Event date must be today or in the future",
    }
  )
  .refine(
    (data) => {
      const { maxDate } = getLagosDateBounds();
      return data.date <= maxDate;
    },
    {
      path: ["date"],
      message: "Event date can be at most 3 years ahead",
    }
  );

export type EventStep1Input = z.infer<typeof eventStep1Schema>;

export const eventStep2Schema = z.object({
  coverKey: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
  story: z
    .string()
    .max(1500, "Story must be 1,500 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type EventStep2Input = z.infer<typeof eventStep2Schema>;

export const ACCESS_CODE_REGEX = /^[A-Za-z0-9]{6,12}$/;

export const eventStep3Schema = z
  .object({
    visibility: z.enum(EVENT_VISIBILITIES),
    accessCode: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.visibility === "PUBLIC") return true;
      return !!data.accessCode && ACCESS_CODE_REGEX.test(data.accessCode);
    },
    {
      path: ["accessCode"],
      message:
        "Private events require a 6 to 12 character alphanumeric access code",
    }
  );

export type EventStep3Input = z.infer<typeof eventStep3Schema>;

export const wizardRegistryItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(3, "Item title must be at least 3 characters")
    .max(80, "Item title must be 80 characters or fewer"),
  targetPriceNaira: z.coerce
    .number()
    .int("Enter a whole Naira amount")
    .min(500, "Minimum target price is ₦500")
    .max(5_000_000, "Maximum target price is ₦5,000,000"),
});

export type WizardRegistryItemInput = z.infer<typeof wizardRegistryItemSchema>;

export const eventStep4Schema = z.object({
  registryItems: z
    .array(wizardRegistryItemSchema)
    .max(50, "You can add up to 50 registry items"),
});

export type EventStep4Input = z.infer<typeof eventStep4Schema>;

export const unlockEventSchema = z.object({
  accessCode: z
    .string()
    .trim()
    .regex(
      ACCESS_CODE_REGEX,
      "Enter the 6 to 12 character alphanumeric access code"
    ),
});

export type UnlockEventInput = z.infer<typeof unlockEventSchema>;

export const payoutSetupSchema = z.object({
  bankCode: z.string().min(1, "Select your bank"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a 10-digit NUBAN account number"),
  accountName: z.string().min(1, "Verify your account number first"),
  confirmedOwnership: z.boolean().refine((v) => v === true, {
    message: "Tick 'This is my account' to confirm ownership",
  }),
});

export type PayoutSetupInput = z.infer<typeof payoutSetupSchema>;

// API Response Types for Step 3
export type PresignUploadRequest = {
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  purpose: "EVENT_COVER" | "WALL_PHOTO" | "DISPUTE_PHOTO";
};

export type PresignUploadResponse = {
  uploadUrl: string;
  key: string;
  publicUrl?: string;
  fields?: Record<string, string>;
};

export type CreateEventRequest = {
  type: EventType;
  name: string;
  date: string;
  coverKey?: string;
  story?: string;
  visibility: EventVisibility;
  accessCode?: string;
  registryItems?: {
    productId?: string;
    title: string;
    priceKobo: number;
  }[];
};

export type EventDetail = EventSummary & {
  story?: string;
  accessCode?: string;
  allowPlusOne: boolean;
  template?: InviteTemplateData;
  keepsakePublished?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const INVITE_TEMPLATE_IDS = [
  "blush-minimal",
  "royal-gold",
  "lagos-botanical",
  "modern-editorial",
] as const;

export type InviteTemplateId = (typeof INVITE_TEMPLATE_IDS)[number];

export const inviteEditorSchema = z.object({
  templateId: z.enum(INVITE_TEMPLATE_IDS),
  venue: z
    .string()
    .trim()
    .max(120, "Venue must be 120 characters or fewer")
    .optional()
    .or(z.literal("")),
  time: z
    .string()
    .trim()
    .max(60, "Time must be 60 characters or fewer")
    .optional()
    .or(z.literal("")),
  dressCode: z
    .string()
    .trim()
    .max(80, "Dress code must be 80 characters or fewer")
    .optional()
    .or(z.literal("")),
  hostLine: z
    .string()
    .trim()
    .max(120, "Host line must be 120 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type InviteEditorInput = z.infer<typeof inviteEditorSchema>;

export const eventSettingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Event name must be at least 3 characters")
      .max(80, "Event name must be 80 characters or fewer"),
    story: z
      .string()
      .max(1500, "Story must be 1,500 characters or fewer")
      .optional()
      .or(z.literal("")),
    visibility: z.enum(EVENT_VISIBILITIES),
    accessCode: z.string().trim().optional().or(z.literal("")),
    allowPlusOne: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.visibility === "PUBLIC") return true;
      return !!data.accessCode && ACCESS_CODE_REGEX.test(data.accessCode);
    },
    {
      path: ["accessCode"],
      message:
        "Private events require a 6 to 12 character alphanumeric access code",
    }
  );

export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;

export type UpdateEventRequest = {
  name?: string;
  story?: string;
  visibility?: EventVisibility;
  accessCode?: string;
  allowPlusOne?: boolean;
  status?: EventStatus;
};

export type KeepsakeSummary = {
  event: EventDetail;
  totalReceivedKobo: number;
  giftCount: number;
  rsvpYesCount: number;
  thankedCount: number;
  highlights: WallPost[];
  keepsakePublished: boolean;
};

export type EventStats = {
  totalReceivedKobo: number;
  giftCount: number;
  rsvpYesCount: number;
  rsvpMaybeCount: number;
  rsvpNoCount: number;
  payoutStatus: "NOT_SET" | "PENDING_REVIEW" | "VERIFIED" | "SENT";
};

export type Bank = {
  code: string;
  name: string;
};

export type ResolvedBankAccount = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
};

export type PayoutAccountStatus = "VERIFIED" | "PENDING_REVIEW";

export type PayoutAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumberLast4: string;
  accountName: string;
  status: PayoutAccountStatus;
  updatedAt: string;
};

