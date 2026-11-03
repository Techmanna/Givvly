import { api } from "@/lib/api-client";
import type {
  BulkThankYouInput,
  Gift,
  GiftFilters,
  GiveMoneyRequest,
  PaymentInitResponse,
  PaymentStatusResponse,
} from "./types";

function toGiftFilterQuery(filters: GiftFilters): string {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "ALL") {
    params.set("type", filters.type);
  }
  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }
  if (filters.thanked && filters.thanked !== "ALL") {
    params.set("thanked", filters.thanked);
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function initiateMoneyGift(
  slug: string,
  payload: GiveMoneyRequest,
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/money`,
    {
      method: "POST",
      body: payload,
      idempotencyKey,
    }
  );
}

export function fetchPaymentStatus(
  reference: string
): Promise<PaymentStatusResponse> {
  return api<PaymentStatusResponse>(
    `/payments/${encodeURIComponent(reference)}`
  );
}

export function fetchEventGifts(
  eventId: string,
  filters: GiftFilters = {}
): Promise<Gift[]> {
  return api<Gift[]>(
    `/events/${encodeURIComponent(eventId)}/gifts${toGiftFilterQuery(filters)}`
  );
}

export function fetchThankYouList(eventId: string): Promise<Gift[]> {
  return api<Gift[]>(`/events/${encodeURIComponent(eventId)}/thank-you`);
}

export function toggleGiftThanked(
  giftId: string,
  thanked: boolean
): Promise<Gift> {
  return api<Gift>(`/gifts/${encodeURIComponent(giftId)}/thanked`, {
    method: "PATCH",
    body: { thanked },
  });
}

export function sendBulkThankYou(
  eventId: string,
  payload: BulkThankYouInput
): Promise<{ updatedCount: number; message: string }> {
  return api<{ updatedCount: number; message: string }>(
    `/events/${encodeURIComponent(eventId)}/thank-you/bulk`,
    {
      method: "POST",
      body: payload,
    }
  );
}

