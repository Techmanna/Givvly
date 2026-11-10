import { api } from "@/lib/api-client";
import type {
  AdminModerationItem,
  AdminOrderDetail,
  AdminPaymentRecord,
  AdminPayoutRecord,
  AdminProduct,
  AdminVendorSummary,
  CreateProductInput,
  DisputeRecord,
  EventSummary,
  LedgerEntry,
  Order,
  User,
} from "./types";

export async function fetchAdminModerationQueue(): Promise<AdminModerationItem[]> {
  const res = await api<any>("/admin/moderation");
  return Array.isArray(res) ? res : (res?.items ?? []);
}

export function resolveAdminModerationItem(
  itemId: string,
  status: "APPROVED" | "REMOVED"
) {
  return api<AdminModerationItem>(
    `/admin/moderation/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );
}

export async function fetchAdminPayouts(): Promise<AdminPayoutRecord[]> {
  const res = await api<any>("/admin/payouts");
  return Array.isArray(res) ? res : (res?.payouts ?? []);
}

export function retryAdminPayout(payoutId: string) {
  return api<{ id: string; status: "SENT" }>(
    `/admin/payouts/${encodeURIComponent(payoutId)}/retry`,
    {
      method: "POST",
    }
  );
}

export async function fetchAdminLedger(): Promise<LedgerEntry[]> {
  const res = await api<any>("/admin/ledger");
  const rawEntries = Array.isArray(res) ? res : (res?.recentEntries ?? []);
  return rawEntries.map((e: any) => ({
    id: e.id,
    type: e.type ?? (e.direction === "CREDIT" ? "CREDIT" : "DEBIT"),
    description: e.description ?? e.accountCode ?? "Platform Transaction",
    amountKobo: e.amountKobo ?? 0,
    reference: e.reference ?? e.id,
    createdAt: typeof e.createdAt === "string" ? e.createdAt : (e.createdAt?.toISOString?.() ?? new Date().toISOString()),
  }));
}

export async function fetchAdminDisputes(): Promise<DisputeRecord[]> {
  const res = await api<any>("/admin/disputes");
  return Array.isArray(res) ? res : (res?.disputes ?? []);
}

export function resolveAdminDispute(
  disputeId: string,
  status: "RESOLVED" | "REJECTED"
) {
  return api<DisputeRecord>(
    `/admin/disputes/${encodeURIComponent(disputeId)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );
}

export async function fetchAdminEvents(): Promise<EventSummary[]> {
  const res = await api<any>("/admin/events");
  return Array.isArray(res) ? res : (res?.events ?? []);
}

export async function fetchAdminPayments(): Promise<AdminPaymentRecord[]> {
  const res = await api<any>("/admin/payments");
  return Array.isArray(res) ? res : (res?.payments ?? []);
}

export async function fetchAdminOrders(): Promise<Order[]> {
  const res = await api<any>("/admin/orders");
  const items = Array.isArray(res) ? res : (res?.orders ?? []);
  return items.map((o: any) => ({
    id: o.id,
    number: o.number,
    items: (o.items ?? []).map((it: any) => ({
      name: it.name ?? it.title ?? "Gift Item",
      qty: it.qty ?? it.quantity ?? 1,
      unitPriceKobo: it.unitPriceKobo ?? it.priceKobo ?? 0,
    })),
    totalKobo: o.totalKobo,
    status: o.status,
    timeline: (o.timeline ?? o.history ?? []).map((h: any) => ({
      status: h.status,
      at: typeof h.at === "string" ? h.at : (h.createdAt ?? new Date().toISOString()),
    })),
    recipientName: o.recipientName ?? "Celebration Recipient",
  }));
}

export async function fetchAdminOrderDetail(id: string): Promise<AdminOrderDetail> {
  const res = await api<any>(`/admin/orders/${encodeURIComponent(id)}`);
  const o = res?.data ?? res;
  return {
    id: o.id,
    number: o.number,
    buyerUserId: o.buyerUserId ?? null,
    buyerEmail: o.buyerEmail ?? "",
    recipientName: o.recipientName ?? "Celebration Recipient",
    recipientPhone: o.recipientPhone ?? null,
    recipientEmail: o.recipientEmail ?? null,
    address: o.address ?? null,
    giftNote: o.giftNote ?? null,
    wrapStyle: o.wrapStyle ?? null,
    status: o.status,
    subtotalKobo: o.subtotalKobo ?? o.totalKobo ?? 0,
    deliveryFeeKobo: o.deliveryFeeKobo ?? 0,
    feeKobo: o.feeKobo ?? 0,
    totalKobo: o.totalKobo ?? 0,
    trackingToken: o.trackingToken ?? o.number,
    deliveredAt: o.deliveredAt ?? null,
    createdAt:
      typeof o.createdAt === "string"
        ? o.createdAt
        : o.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt:
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : o.updatedAt?.toISOString?.() ?? undefined,
    items: (o.items ?? []).map((it: any) => {
      const price = it.unitPriceKobo ?? it.priceKobo ?? 0;
      const qty = it.qty ?? it.quantity ?? 1;
      return {
        id: it.id ?? String(Math.random()),
        productId: it.productId ?? null,
        name: it.name ?? it.title ?? "Gift Item",
        qty,
        unitPriceKobo: price,
        totalPriceKobo: it.totalPriceKobo ?? price * qty,
        vtuMetadata: it.vtuMetadata ?? null,
      };
    }),
    payment: o.payment
      ? {
          id: o.payment.id,
          reference: o.payment.reference,
          currency: o.payment.currency ?? "NGN",
          amountKobo: o.payment.amountKobo,
          status: o.payment.status,
          provider: o.payment.provider,
          payerEmail: o.payment.payerEmail,
          authorizationUrl: o.payment.authorizationUrl,
          createdAt:
            typeof o.payment.createdAt === "string"
              ? o.payment.createdAt
              : o.payment.createdAt?.toISOString?.() ?? new Date().toISOString(),
        }
      : null,
    history: (o.history ?? o.timeline ?? []).map((h: any) => ({
      id: h.id ?? String(Math.random()),
      status: h.status,
      actorId: h.actorId ?? null,
      note: h.note ?? null,
      createdAt:
        typeof h.createdAt === "string"
          ? h.createdAt
          : h.at ?? new Date().toISOString(),
    })),
    review: o.review ?? null,
    disputes: o.disputes ?? [],
  };
}

export async function fetchAdminVendors(): Promise<AdminVendorSummary[]> {
  const res = await api<any>("/admin/vendors");
  return Array.isArray(res) ? res : (res?.vendors ?? []);
}

export async function fetchAdminUsers(): Promise<User[]> {
  const res = await api<any>("/admin/users");
  return Array.isArray(res) ? res : (res?.users ?? []);
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const res = await api<any>("/admin/products");
  const items = Array.isArray(res) ? res : (res?.products ?? []);
  return items.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name ?? p.title ?? "Gift Item",
    description: p.description ?? "",
    priceKobo: p.priceKobo ?? 0,
    category: p.category ?? (Array.isArray(p.occasions) && p.occasions[0]) ?? "Wedding Gifts",
    giftType: p.giftType,
    mainCategories: p.mainCategories ?? [],
    occasions: p.occasions ?? [],
    relationships: p.relationships ?? [],
    gender: p.gender,
    vendorName: p.vendorName ?? p.vendor?.name ?? "Givvly Curated",
    inStock: typeof p.inStock === "boolean" ? p.inStock : (p.stock === null || p.stock > 0),
    rating: p.rating ?? p.ratingAvg ?? 4.9,
    reviewCount: p.reviewCount ?? p.ratingCount ?? 16,
    isCombo: p.isCombo ?? false,
    comboItems: p.comboItems ?? [],
    packagingIncluded: p.packagingIncluded ?? "Luxury Gift Box & Ribbon",
    imageUrl:
      p.imageUrl ??
      (Array.isArray(p.images) && p.images[0] ? p.images[0] : typeof p.images === "string" ? p.images : "/images/gifts/box-luxury.jpg"),
  }));
}

export function createAdminProduct(payload: CreateProductInput) {
  return api<AdminProduct>("/admin/products", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminProduct(
  productId: string,
  patch: Partial<AdminProduct>
) {
  return api<AdminProduct>(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: patch,
    }
  );
}

export function deleteAdminProduct(productId: string) {
  return api<{ success: boolean; id: string }>(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    }
  );
}

export function updateAdminOrderStatus(
  orderId: string,
  status: Order["status"]
) {
  return api<Order>(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: { status },
  });
}
