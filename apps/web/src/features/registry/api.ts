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
    productId?: string;
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
    registryItemId?: string;
    reservationToken?: string;
    name?: string;
    giverName?: string;
    email: string;
    giverEmail?: string;
    message?: string;
    anonymous: boolean;
    isAnonymous?: boolean;
  },
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  const body = {
    ...payload,
    registryItemId: payload.registryItemId ?? payload.itemId,
    giverEmail: payload.giverEmail ?? payload.email,
    giverName:
      payload.giverName !== undefined
        ? payload.giverName
        : payload.anonymous || payload.isAnonymous
          ? undefined
          : payload.name,
    isAnonymous: Boolean(payload.isAnonymous ?? payload.anonymous),
  };
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/item`,
    {
      method: "POST",
      body,
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
    giverName?: string;
    email: string;
    giverEmail?: string;
    message?: string;
    anonymous: boolean;
    isAnonymous?: boolean;
  },
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  const body = {
    ...payload,
    giverEmail: payload.giverEmail ?? payload.email,
    giverName:
      payload.giverName !== undefined
        ? payload.giverName
        : payload.anonymous || payload.isAnonymous
          ? undefined
          : payload.name,
    isAnonymous: Boolean(payload.isAnonymous ?? payload.anonymous),
  };
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/pool`,
    {
      method: "POST",
      body,
      idempotencyKey,
    }
  );
}

export function reserveRegistryItemsBatch(
  slug: string,
  itemIds: string[]
): Promise<{
  items: RegistryItem[];
  totalKobo: number;
  reservationToken: string;
  reservedUntil: string;
}> {
  return api(`/public/events/${encodeURIComponent(slug)}/registry/reserve-batch`, {
    method: "POST",
    body: { itemIds },
  });
}

export function purchaseRegistryItemsBatch(
  slug: string,
  payload: {
    itemIds: string[];
    reservationToken: string;
    name?: string;
    email: string;
    message?: string;
    anonymous: boolean;
    showOnWall?: boolean;
  },
  idempotencyKey: string
): Promise<PaymentInitResponse> {
  return api<PaymentInitResponse>(
    `/public/events/${encodeURIComponent(slug)}/gifts/items`,
    {
      method: "POST",
      body: {
        itemIds: payload.itemIds,
        reservationToken: payload.reservationToken,
        giverName: payload.anonymous ? undefined : payload.name,
        giverEmail: payload.email,
        message: payload.message,
        isAnonymous: payload.anonymous,
        showOnWall: payload.showOnWall ?? true,
      },
      idempotencyKey,
    }
  );
}

export function redeemRegistryItems(
  eventId: string,
  payload: {
    itemIds: string[];
    shippingZoneId?: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientArea?: string;
    recipientCity: string;
    recipientState: string;
    deliveryNotes?: string;
    callbackUrl?: string;
  }
): Promise<{
  order: {
    id: string;
    number: string;
    status: string;
    totalKobo: number;
    deliveryFeeKobo: number;
  };
  requiresPayment: boolean;
  paymentDetails: PaymentInitResponse | null;
}> {
  return api(`/events/${encodeURIComponent(eventId)}/registry/redeem`, {
    method: "POST",
    body: payload,
  });
}

