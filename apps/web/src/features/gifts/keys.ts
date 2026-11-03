import type { GiftFilters } from "@givvly/contracts";

export const giftKeys = {
  all: ["gifts"] as const,
  byEvent: (id: string, filters: GiftFilters = {}) =>
    [...giftKeys.all, "event", id, filters] as const,
  thankYou: (id: string) => [...giftKeys.all, "thank-you", id] as const,
  payment: (reference: string) => ["payments", reference] as const,
};

