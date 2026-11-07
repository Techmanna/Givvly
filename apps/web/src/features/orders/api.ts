import { api } from "@/lib/api-client";
import type {
  CreateDirectOrderRequest,
  DisputeFormInput,
  DisputeRecord,
  Order,
  ReviewFormInput,
} from "./types";

function normalizeOrder(raw: any): Order {
  if (!raw) return raw;
  const items = (raw.items || []).map((item: any) => ({
    name: item.name || item.title || "Gift Item",
    qty: item.qty ?? 1,
    unitPriceKobo: Number(item.unitPriceKobo ?? 0),
  }));
  const timeline =
    Array.isArray(raw.timeline) && raw.timeline.length > 0
      ? raw.timeline
      : Array.isArray(raw.history) && raw.history.length > 0
      ? raw.history.map((h: any) => ({
          status: h.status,
          at:
            typeof h.createdAt === "string"
              ? h.createdAt
              : h.createdAt?.toISOString?.() ?? new Date().toISOString(),
        }))
      : [
          {
            status: raw.status || "CONFIRMED",
            at:
              typeof raw.createdAt === "string"
                ? raw.createdAt
                : raw.createdAt?.toISOString?.() ?? new Date().toISOString(),
          },
        ];

  return {
    id: raw.id || raw.number,
    number: raw.number || raw.orderNumber || raw.id,
    items,
    totalKobo: Number(raw.totalKobo ?? 0),
    status: raw.status || "CONFIRMED",
    timeline,
    recipientName: raw.recipientName || raw.recipientPhone || "Recipient",
    recipientPhone: raw.recipientPhone || undefined,
    address:
      typeof raw.address === "string"
        ? raw.address
        : raw.address
          ? [raw.address.street, raw.address.area, raw.address.city, raw.address.state]
              .filter(Boolean)
              .join(", ")
          : raw.deliveryLocation || undefined,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : raw.createdAt?.toISOString?.() ?? timeline[0]?.at,
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await api<any>("/orders");
  const list = Array.isArray(res) ? res : res?.orders || res?.items || [];
  return list.map(normalizeOrder);
}

export async function fetchOrderDetail(id: string): Promise<Order> {
  const res = await api<any>(`/orders/${encodeURIComponent(id)}`);
  return normalizeOrder(res?.order ?? res);
}

export type CreateOrderResult = {
  order: Order;
  payment?: {
    reference: string;
    accessCode: string;
    authorizationUrl: string;
    amountKobo: number;
    currency: string;
  };
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  whatsappLink?: string;
};

export async function createDirectOrder(
  payload: CreateDirectOrderRequest,
  idempotencyKey: string
): Promise<CreateOrderResult> {
  const res = await api<any>("/orders", {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
  const rawOrder = res?.order ?? res;
  return {
    order: normalizeOrder(rawOrder),
    payment: res?.payment,
    reference: res?.reference || res?.payment?.reference || `ref_${Date.now()}`,
    accessCode: res?.accessCode || res?.payment?.accessCode || "",
    authorizationUrl:
      res?.authorizationUrl || res?.payment?.authorizationUrl || "",
    whatsappLink: res?.whatsappLink,
  };
}

export async function verifyOrderPayment(
  orderId: string
): Promise<{ order: Order; verified: boolean; status: string }> {
  const res = await api<any>(`/orders/${encodeURIComponent(orderId)}/verify`, {
    method: "POST",
  });
  return {
    order: normalizeOrder(res?.order ?? res),
    verified: Boolean(res?.verified),
    status: res?.status || "CONFIRMED",
  };
}

export async function payOrder(
  orderId: string,
  idempotencyKey: string
): Promise<{ order: Order; reference: string }> {
  const res = await api<any>(
    `/orders/${encodeURIComponent(orderId)}/pay`,
    {
      method: "POST",
      idempotencyKey,
    }
  );
  const rawOrder = res?.order ?? res;
  return {
    order: normalizeOrder(rawOrder),
    reference: res?.reference ?? `PAY_${Date.now()}`,
  };
}

export function submitOrderReview(orderId: string, payload: ReviewFormInput) {
  return api<{ ok: boolean; rating: number }>(
    `/orders/${encodeURIComponent(orderId)}/review`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export function submitOrderDispute(
  orderId: string,
  payload: DisputeFormInput
) {
  return api<DisputeRecord>(
    `/orders/${encodeURIComponent(orderId)}/disputes`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function fetchOrderTracking(token: string): Promise<Order> {
  const res = await api<any>(`/public/track/${encodeURIComponent(token)}`);
  return normalizeOrder(res?.order ?? res);
}
