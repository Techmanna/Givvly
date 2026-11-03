import { api } from "@/lib/api-client";
import type {
  PaymentInitResponse,
  PoolItem,
  RegistryItem,
  RegistryOwnerData,
  ReserveRegistryItemResponse,
} from "./types";

export function fetchOwnerRegistry(eventId: string): Promise<RegistryOwnerData> {
  return api<RegistryOwnerData>(
    `/events/${encodeURIComponent(eventId)}/registry?includePools=true`
  );
}

export function createOwnerRegistryEntry(
  eventId: string,
  payload: {
    title: string;
    priceKobo: number;
    isPool?: boolean;
    poolMode?: "PRODUCT" | "CASH";
    deadline?: string;
  }
): Promise<RegistryItem | PoolItem> {
  return api<RegistryItem | PoolItem>(
    `/events/${encodeURIComponent(eventId)}/registry`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export function deleteOwnerRegistryEntry(
  eventId: string,
  itemId: string
): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>(
    `/events/${encodeURIComponent(eventId)}/registry/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
    }
  );
}

export function updateOwnerRegistryEntry(
  eventId: string,
  itemId: string,
  payload: {
    mode?: "PRODUCT" | "CASH";
    status?: "AVAILABLE" | "RESERVED" | "CLAIMED";
  }
): Promise<RegistryItem | PoolItem> {
  return api<RegistryItem | PoolItem>(
    `/events/${encodeURIComponent(eventId)}/registry/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

export function reserveRegistryItem(
  slug: string,
  itemId: string
): Promise<ReserveRegistryItemResponse> {
  return api<ReserveRegistryItemResponse>(
    `/public/events/${encodeURIComponent(slug)}/registry/${encodeURIComponent(itemId)}/reserve`,
    {
      method: "POST",
    }
  );
}

export function purchaseRegistryItem(
  slug: string,
  payload: {
    itemId: string;
    name?: string;
    email: string;
    message?: string;
    anonymous: boolean;
  },
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/item`,
    {
      method: "POST",
      body: payload,
      idempotencyKey,
    }
  );
}

export function contributeToPool(
  slug: string,
  payload: {
    poolId: string;
    amountKobo: number;
    name?: string;
    email: string;
    message?: string;
    anonymous: boolean;
  },
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/pool`,
    {
      method: "POST",
      body: payload,
      idempotencyKey,
    }
  );
}

