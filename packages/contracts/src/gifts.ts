import { z } from "zod";
import type { GiftStatus, GiftType, WallPostStatus } from "./index";

const SOFT_PROFANITY_WORDS = [
  "idiot",
  "stupid",
  "fool",
  "bastard",
  "scam",
  "fraud",
  "hate",
  "trash",
  "useless",
];

/**
 * Soft client-side check for potentially inappropriate words (Section 8.1).
 * Does not block submission on its own unless user chooses to edit,
 * and alerts the guest that flagged messages may be held for moderation.
 */
export function hasProfanityWarning(text?: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return SOFT_PROFANITY_WORDS.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(normalized);
  });
}

export const wallPostSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "Enter your name (at least 2 characters)")
    .max(60, "Name must be 60 characters or fewer"),
  text: z
    .string()
    .trim()
    .min(1, "Write a short message (1 to 500 characters)")
    .max(500, "Message must be 500 characters or fewer"),
});

export type WallPostFormInput = z.infer<typeof wallPostSchema>;

export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "SCAM",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const reportContentSchema = z.object({
  reason: z.enum(REPORT_REASONS, {
    errorMap: () => ({ message: "Select a reason for reporting" }),
  }),
  note: z
    .string()
    .trim()
    .max(300, "Additional note must be 300 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type ReportContentInput = z.infer<typeof reportContentSchema>;

export const bulkThankYouSchema = z.object({
  giftIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one gift to send a thank-you note"),
  message: z
    .string()
    .trim()
    .min(3, "Enter a thank-you message (at least 3 characters)")
    .max(500, "Thank-you message must be 500 characters or fewer"),
});

export type BulkThankYouInput = z.infer<typeof bulkThankYouSchema>;

export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  whatsappOrSms: z.boolean(),
  inApp: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export type GiftFilters = {
  type?: GiftType | "ALL";
  status?: GiftStatus | "ALL";
  thanked?: "ALL" | "THANKED" | "UNTHANKED";
};

export type GiveMoneyRequest = {
  amountKobo: number;
  name?: string;
  email: string;
  message?: string;
  anonymous: boolean;
};

export type PaymentInitResponse = {
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  amountKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
};

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export type PaymentStatusResponse = PaymentInitResponse & {
  status: PaymentStatus;
  eventSlug?: string;
  giverName: string | null;
  anonymous: boolean;
  message?: string;
  createdAt: string;
};

export type CreateWallPostRequest = {
  authorName: string;
  text: string;
  media?: { url: string; type: "IMAGE" | "VIDEO" }[];
};

export type WallModerationPatch = {
  status: Extract<WallPostStatus, "VISIBLE" | "HIDDEN" | "REMOVED">;
};

export type CreateReportRequest = {
  targetType: "WALL_POST" | "EVENT";
  targetId: string;
  reason: ReportReason;
  note?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
};

