import { api } from "@/lib/api-client";
import type {
  AdminLedgerReport,
  AdminModerationItem,
  AdminOrderDetail,
  AdminPaymentRecord,
  AdminPayoutDetail,
  AdminProduct,
  AdminUserDetail,
  AdminUserListItem,
  AdminVendorSummary,
  CreateAdminVendorInput,
  CreateProductInput,
  DisputeRecord,
  EventSummary,
  LedgerEntry,
  Order,
  UpdateAdminVendorInput,
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

export async function fetchAdminPayouts(): Promise<AdminPayoutDetail[]> {
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

function mapLedgerEntries(rawEntries: any[]) {
  return rawEntries.map((e: any) => ({
    id: e.id,
    type: e.type ?? (e.direction === "CREDIT" ? "CREDIT" : "DEBIT"),
    accountCode: e.accountCode ?? "PLATFORM",
    description: e.description ?? e.accountCode ?? "Platform Transaction",
    amountKobo: e.amountKobo ?? 0,
    reference: e.reference ?? e.id,
    createdAt:
      typeof e.createdAt === "string"
        ? e.createdAt
        : (e.createdAt?.toISOString?.() ?? new Date().toISOString()),
  }));
}

export async function fetchAdminLedger(): Promise<LedgerEntry[]> {
  const res = await api<any>("/admin/ledger");
  const rawEntries = Array.isArray(res) ? res : (res?.recentEntries ?? []);
  return mapLedgerEntries(rawEntries);
}

export async function fetchAdminLedgerReport(): Promise<AdminLedgerReport> {
  const res = await api<any>("/admin/ledger");
  const rawEntries = Array.isArray(res) ? res : (res?.recentEntries ?? []);
  const entries = mapLedgerEntries(rawEntries);
  const totalDebit =
    res?.trialBalance?.totalDebit ??
    entries
      .filter((e) => e.type === "DEBIT")
      .reduce((s, e) => s + e.amountKobo, 0);
  const totalCredit =
    res?.trialBalance?.totalCredit ??
    entries
      .filter((e) => e.type === "CREDIT")
      .reduce((s, e) => s + e.amountKobo, 0);
  return {
    trialBalance: {
      totalDebit,
      totalCredit,
      isBalanced: res?.trialBalance?.isBalanced ?? totalDebit === totalCredit,
    },
    entries,
  };
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

export type AdminEventListItem = EventSummary & {
  host?: { id: string; name: string; email: string } | null;
  registryCount?: number;
  poolCount?: number;
  orderCount?: number;
  postCount?: number;
  createdAt?: string;
};

export type AdminEventDetail = {
  id: string;
  slug: string;
  name: string;
  type: string;
  date: string;
  story: string | null;
  visibility: string;
  status: string;
  currency: string;
  keepsakePublic: boolean;
  moneyGiftsEnabled: boolean;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  host: { id: string; name: string; email: string; phone: string | null } | null;
  stats: {
    totalReceivedKobo: number;
    successfulGiftCount: number;
    totalOrdersKobo: number;
    paidOrderCount: number;
    totalPayoutsKobo: number;
    giftCount: number;
    orderCount: number;
    registryCount: number;
    poolCount: number;
    postCount: number;
    payoutCount: number;
    rsvpCounts: {
      yes: number;
      no: number;
      maybe: number;
      total: number;
    };
  };
  recentTransactions: Array<{
    id: string;
    kind: "GIFT" | "ORDER";
    actorName: string;
    actorEmail: string | null;
    amountKobo: number;
    status: string;
    reference: string;
    label: string;
    createdAt: string;
  }>;
  recentActivity: {
    rsvps: Array<{
      id: string;
      name: string;
      email: string | null;
      response: string;
      plusOneName: string | null;
      createdAt: string;
    }>;
    posts: Array<{
      id: string;
      authorName: string;
      text: string | null;
      status: string;
      createdAt: string;
    }>;
  };
};

export async function fetchAdminEvents(): Promise<AdminEventListItem[]> {
  const res = await api<any>("/admin/events");
  return Array.isArray(res) ? res : (res?.events ?? []);
}

export function fetchAdminEventDetail(id: string): Promise<AdminEventDetail> {
  return api<AdminEventDetail>(`/admin/events/${encodeURIComponent(id)}`);
}

export function updateAdminEventStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED",
  reason?: string
) {
  return api(`/admin/events/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status, ...(reason ? { reason } : {}) },
  });
}

export function deleteAdminEvent(id: string): Promise<{ deleted: boolean; id: string }> {
  return api<{ deleted: boolean; id: string }>(
    `/admin/events/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
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
        size: it.size ?? undefined,
        vendorId: it.vendorId ?? undefined,
        vendorName: it.vendorName ?? undefined,
        unitPriceKobo: price,
        totalPriceKobo: it.totalPriceKobo ?? price * qty,
        vtuMetadata: it.vtuMetadata ?? null,
      };
    }),
    vendor: o.vendor ?? null,
    payment: o.payment
      ? {
          id: o.payment.id,
          reference: o.payment.reference,
          currency: o.payment.currency ?? "NGN",
          amountKobo: o.payment.amountKobo,
          status: o.payment.status,
          provider:
            o.payment.channel === "givvly_wallet" ||
            o.payment.provider === "GIVVLY_WALLET"
              ? "GIVVLY WALLET"
              : o.payment.provider,
          channel: o.payment.channel ?? null,
          failureReason: o.payment.failureReason ?? null,
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

export function createAdminVendor(
  payload: CreateAdminVendorInput
): Promise<AdminVendorSummary> {
  return api<AdminVendorSummary>("/admin/vendors", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminVendor(
  vendorId: string,
  payload: UpdateAdminVendorInput
): Promise<AdminVendorSummary> {
  return api<AdminVendorSummary>(
    `/admin/vendors/${encodeURIComponent(vendorId)}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

export function deleteAdminVendor(
  vendorId: string
): Promise<{ deleted: boolean; id: string }> {
  return api<{ deleted: boolean; id: string }>(
    `/admin/vendors/${encodeURIComponent(vendorId)}`,
    {
      method: "DELETE",
    }
  );
}

export function forwardOrderToVendor(
  orderId: string,
  payload: { vendorId?: string; channel: "EMAIL" | "WHATSAPP" }
): Promise<{
  sent: boolean;
  channel: "EMAIL" | "WHATSAPP";
  vendor: { id: string; name: string; email: string; phone?: string };
  message: string;
}> {
  return api(`/admin/orders/${encodeURIComponent(orderId)}/forward-vendor`, {
    method: "POST",
    body: payload,
  });
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const res = await api<any>("/admin/users");
  return Array.isArray(res) ? res : (res?.users ?? []);
}

export function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  return api<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
}

export function suspendAdminUser(id: string) {
  return api(`/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: "PATCH",
  });
}

export function restoreAdminUser(id: string) {
  return api(`/admin/users/${encodeURIComponent(id)}/restore`, {
    method: "PATCH",
  });
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
    costPriceKobo: p.costPriceKobo ?? null,
    category: p.category ?? (Array.isArray(p.occasions) && p.occasions[0]) ?? "Wedding Gifts",
    giftType: p.giftType,
    mainCategories: p.mainCategories ?? [],
    occasions: p.occasions ?? [],
    relationships: p.relationships ?? [],
    gender: p.gender,
    vendorId: p.vendorId ?? null,
    vendorName: p.vendorName ?? p.vendor?.name ?? "Givvly Curated",
    inStock: typeof p.inStock === "boolean" ? p.inStock : (p.stock === null || p.stock > 0),
    rating: p.rating ?? p.ratingAvg ?? 4.9,
    reviewCount: p.reviewCount ?? p.ratingCount ?? 16,
    isCombo: p.isCombo ?? false,
    comboItems: p.comboItems ?? [],
    variants: p.variants ?? [],
    minPriceKobo: p.minPriceKobo ?? p.priceKobo,
    maxPriceKobo: p.maxPriceKobo ?? p.priceKobo,
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

export function bulkDeleteAdminProducts(ids: string[], permanent = false) {
  return api<{ count: number; deletedIds: string[]; permanent: boolean }>(
    "/admin/products/bulk-delete",
    {
      method: "POST",
      body: { ids, permanent },
    }
  );
}

export function bulkUpdateAdminProductStock(ids: string[], inStock: boolean) {
  return api<{ count: number; updatedIds: string[]; inStock: boolean }>(
    "/admin/products/bulk-stock",
    {
      method: "POST",
      body: { ids, inStock },
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

export async function fetchAdminBespokeQuotes(): Promise<import("@givvly/contracts").BespokeWishPackageDetail[]> {
  const res = await api<any>("/admin/orders/quotes");
  return Array.isArray(res) ? res : (res?.orders ?? res?.quotes ?? res?.data ?? []);
}

export function provideAdminBespokeQuote(
  orderId: string,
  payload: import("@givvly/contracts").ProvideBespokeQuoteInput
) {
  return api<{ ok: boolean; orderId: string; status: string; totalKobo: number }>(
    `/admin/orders/${encodeURIComponent(orderId)}/provide-quote`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export function fetchAdminShippingZones(): Promise<import("@givvly/contracts").ShippingZone[]> {
  return api<import("@givvly/contracts").ShippingZone[]>("/admin/shipping-zones");
}

export function createAdminShippingZone(
  payload: Omit<import("@givvly/contracts").ShippingZone, "id">
): Promise<import("@givvly/contracts").ShippingZone> {
  return api<import("@givvly/contracts").ShippingZone>("/admin/shipping-zones", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminShippingZone(
  id: string,
  payload: Partial<Omit<import("@givvly/contracts").ShippingZone, "id">>
): Promise<import("@givvly/contracts").ShippingZone> {
  return api<import("@givvly/contracts").ShippingZone>(
    `/admin/shipping-zones/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

export function deleteAdminShippingZone(id: string): Promise<{ deleted: boolean; id: string }> {
  return api<{ deleted: boolean; id: string }>(
    `/admin/shipping-zones/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

