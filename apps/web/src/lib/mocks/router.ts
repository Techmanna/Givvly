import {
  getNextValidOrderStatus,
  hasProfanityWarning,
  type AdminPayoutRecord,
  type ApiSuccess,
  type CreateDirectOrderRequest,
  type CreateEventRequest,
  type DisputeType,
  type EventDetail,
  type EventStats,
  type EventSummary,
  type Gift,
  type InviteTemplateData,
  type Order,
  type OrderStatus,
  type PayoutAccount,
  type PoolItem,
  type PresignUploadResponse,
  type RegistryItem,
  type ResolvedBankAccount,
  type Role,
  type User,
  type WallPost,
  type WallPostStatus,
} from "@givvly/contracts";
import {
  buildPublicEventFromDetail,
  INITIAL_DISPUTES,
  INITIAL_EVENTS,
  INITIAL_GIFTS_BY_EVENT,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_MODERATION_QUEUE,
  INITIAL_NOTIFICATION_PREFS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PAYOUT_ACCOUNT,
  INITIAL_RSVPS_BY_EVENT,
  INITIAL_WALL_POSTS_BY_EVENT,
  MOCK_BANKS,
  MOCK_BILLSPOT_PLANS,
  MOCK_BILLSPOT_PROVIDERS,
  MOCK_CATALOG_COLLECTIONS,
  MOCK_CATALOG_PRODUCTS,
  MOCK_EVENT_STATS,
  MOCK_POOLS_BY_EVENT,
  MOCK_REGISTRY_BY_EVENT,
  MOCK_USERS,
  type MockAdminModerationItem,
  type MockCatalogProduct,
  type MockDispute,
  type MockLedgerEntry,
  type MockNotification,
  type MockNotificationPreferences,
  type MockPaymentRecord,
  type MockRsvp,
} from "./data";

type MockDatabase = {
  currentUser: User | null;
  events: EventDetail[];
  payoutAccount: PayoutAccount | null;
  registryByEvent: Record<string, RegistryItem[]>;
  poolsByEvent: Record<string, PoolItem[]>;
  giftsByEvent: Record<string, Gift[]>;
  wallByEvent: Record<string, WallPost[]>;
  rsvpsByEvent: Record<string, MockRsvp[]>;
  unlockedSlugs: Set<string>;
  paymentsByRef: Record<string, MockPaymentRecord>;
  idempotencyCache: Record<string, unknown>;
  products: MockCatalogProduct[];
  orders: Order[];
  notifications: MockNotification[];
  notificationPrefs: MockNotificationPreferences;
  moderationQueue: MockAdminModerationItem[];
  ledger: MockLedgerEntry[];
  disputes: MockDispute[];
};

function createInitialDb(): MockDatabase {
  return {
    currentUser: { ...MOCK_USERS.user! },
    events: INITIAL_EVENTS.map((e) => ({ ...e })),
    payoutAccount: { ...INITIAL_PAYOUT_ACCOUNT },
    registryByEvent: structuredClone(MOCK_REGISTRY_BY_EVENT),
    poolsByEvent: structuredClone(MOCK_POOLS_BY_EVENT),
    giftsByEvent: structuredClone(INITIAL_GIFTS_BY_EVENT),
    wallByEvent: structuredClone(INITIAL_WALL_POSTS_BY_EVENT),
    rsvpsByEvent: structuredClone(INITIAL_RSVPS_BY_EVENT),
    unlockedSlugs: new Set<string>(),
    paymentsByRef: {},
    idempotencyCache: {},
    products: structuredClone(MOCK_CATALOG_PRODUCTS),
    orders: structuredClone(INITIAL_ORDERS),
    notifications: structuredClone(INITIAL_NOTIFICATIONS),
    notificationPrefs: { ...INITIAL_NOTIFICATION_PREFS },
    moderationQueue: structuredClone(INITIAL_MODERATION_QUEUE),
    ledger: structuredClone(INITIAL_LEDGER_ENTRIES),
    disputes: structuredClone(INITIAL_DISPUTES),
  };
}

let db: MockDatabase = createInitialDb();

export function resetMockDatabase(): void {
  db = createInitialDb();
}

export function getMockDatabase(): MockDatabase {
  return db;
}

function encodeBase64Url(input: string): string {
  let base64: string;
  if (typeof Buffer !== "undefined") {
    try {
      base64 = Buffer.from(input, "utf8").toString("base64");
    } catch {
      base64 = btoa(unescape(encodeURIComponent(input)));
    }
  } else {
    base64 = btoa(unescape(encodeURIComponent(input)));
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createMockJwt(user: User): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 86_400,
    })
  );
  return `${header}.${payload}.mock`;
}

function setBrowserMockCookie(name: string, value: string, maxAge = 86_400): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearBrowserMockCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(padded, "base64").toString("utf8");
    } catch {
      // fallback to atob below
    }
  }
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function resolveUserFromCookie(cookieHeader?: string): User | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/givvly_at=([^;]+)/);
  if (!match || !match[1]) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    const parts = raw.split(".");
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const jsonStr = decodeBase64Url(payloadPart);
    const payload = JSON.parse(jsonStr) as { sub?: string; role?: Role };
    if (payload.role === "ADMIN" || payload.sub?.includes("admin") || payload.sub?.includes("vendor")) {
      return { ...MOCK_USERS.admin! };
    }
    return { ...MOCK_USERS.user! };
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "celebration"
  );
}

function wrapSuccess<T>(data: T): ApiSuccess<T> {
  return { data };
}

export class MockApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly requestId: string;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

function throwMockError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
): never {
  throw new MockApiError({
    status,
    code,
    message,
    details,
    requestId: `mock_req_${Math.random().toString(36).slice(2, 10)}`,
  });
}

export async function handleMockApiRequest<T>(
  rawPath: string,
  opts: {
    method: string;
    body?: unknown;
    idempotencyKey?: string;
    cookieHeader?: string;
  }
): Promise<ApiSuccess<T>> {
  const method = opts.method.toUpperCase();
  const [pathname = "/", search = ""] = rawPath.split("?");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const searchParams = new URLSearchParams(search);

  // Idempotency replay for payment-creating requests (Section 7.1 & 10.2)
  if (opts.idempotencyKey && db.idempotencyCache[opts.idempotencyKey]) {
    return wrapSuccess(db.idempotencyCache[opts.idempotencyKey] as T);
  }

  // --- AUTH ENDPOINTS ---
  if (method === "GET" && normalizedPath === "/auth/me") {
    if (opts.cookieHeader) {
      const userFromCookie = resolveUserFromCookie(opts.cookieHeader);
      if (userFromCookie) {
        db.currentUser = userFromCookie;
      }
    }
    if (!db.currentUser) {
      throwMockError(401, "UNAUTHENTICATED", "Not signed in");
    }
    setBrowserMockCookie("givvly_at", createMockJwt(db.currentUser));
    return wrapSuccess(db.currentUser as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/auth/register") {
    const body = (opts.body ?? {}) as {
      name?: string;
      email?: string;
      phone?: string;
    };
    const email = (body.email ?? "newuser@givvly.ng").toLowerCase();
    if (email === "taken@givvly.ng") {
      throwMockError(409, "EMAIL_TAKEN", "Email is already registered");
    }
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: body.name ?? "New Givvly User",
      email,
      phone: body.phone,
      role: "USER",
      emailVerified: false,
    };
    db.currentUser = newUser;
    return wrapSuccess({
      user: newUser,
      requiresVerification: true,
    } as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/auth/login") {
    const rawBody = opts.body;
    const body = (
      typeof rawBody === "string"
        ? (JSON.parse(rawBody) as { email?: string; password?: string })
        : (rawBody ?? {})
    ) as { email?: string; password?: string };

    const email = (body.email ?? "").trim().toLowerCase();
    if (body.password === "wrongpassword") {
      throwMockError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password"
      );
    }

    let role: Role = "USER";
    let matchedUser = { ...MOCK_USERS.user! };
    if (email.includes("admin") || email.includes("vendor")) {
      role = "ADMIN";
      matchedUser = { ...MOCK_USERS.admin! };
    } else if (email) {
      matchedUser = {
        ...MOCK_USERS.user!,
        email,
        role,
      };
    }

    db.currentUser = matchedUser;
    setBrowserMockCookie("givvly_at", createMockJwt(matchedUser));
    return wrapSuccess({ user: matchedUser } as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/auth/google/url") {
    const next = searchParams.get("next") ?? "/dashboard";
    return wrapSuccess({
      url: `/auth/google/callback?code=mock_google_code&next=${encodeURIComponent(next)}`,
    } as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/auth/verify-email") {
    const verifiedUser: User = db.currentUser
      ? { ...db.currentUser, emailVerified: true }
      : { ...MOCK_USERS.user!, emailVerified: true };
    db.currentUser = verifiedUser;
    setBrowserMockCookie("givvly_at", createMockJwt(verifiedUser));
    return wrapSuccess({
      user: verifiedUser,
      message: "Email verified",
    } as unknown as T);
  }

  if (
    method === "POST" &&
    (normalizedPath === "/auth/resend-verification" ||
      normalizedPath === "/auth/forgot-password" ||
      normalizedPath === "/auth/reset-password")
  ) {
    return wrapSuccess({ message: "Success" } as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/auth/logout") {
    db.currentUser = null;
    clearBrowserMockCookie("givvly_at");
    clearBrowserMockCookie("givvly_rt");
    return wrapSuccess({ message: "Signed out" } as unknown as T);
  }

  // --- UPLOADS PRESIGN ---
  if (method === "POST" && normalizedPath === "/uploads/presign") {
    const body = (opts.body ?? {}) as { fileName?: string };
    const safeName = (body.fileName ?? "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/mock_${Date.now()}_${safeName}`;
    const res: PresignUploadResponse = {
      uploadUrl: `mock://upload/${key}`,
      key,
    };
    return wrapSuccess(res as unknown as T);
  }

  // --- BANKS & PAYOUT ACCOUNTS ---
  if (method === "GET" && normalizedPath === "/banks") {
    return wrapSuccess(MOCK_BANKS as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/payout-accounts") {
    return wrapSuccess(db.payoutAccount as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/payout-accounts/resolve") {
    const body = (opts.body ?? {}) as {
      bankCode?: string;
      accountNumber?: string;
    };
    if (body.accountNumber === "0000000000") {
      throwMockError(
        422,
        "VALIDATION_FAILED",
        "Could not resolve that account number with the selected bank."
      );
    }
    const resolved: ResolvedBankAccount = {
      bankCode: body.bankCode ?? "058",
      accountNumber: body.accountNumber ?? "0123454829",
      accountName:
        body.accountNumber === "9999999999"
          ? "CHUKWUEMEKA DIFFERENT NAME"
          : (db.currentUser?.name ?? "ADAOBI OKAFOR").toUpperCase(),
    };
    return wrapSuccess(resolved as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/payout-accounts") {
    const body = (opts.body ?? {}) as {
      bankCode: string;
      accountNumber: string;
      accountName: string;
    };
    const bank = MOCK_BANKS.find((b) => b.code === body.bankCode);
    const userFirstName = (db.currentUser?.name ?? "ADAOBI")
      .split(" ")[0]!
      .toUpperCase();
    const isMatch = body.accountName.toUpperCase().includes(userFirstName);

    const saved: PayoutAccount = {
      id: `pa_${Date.now()}`,
      bankCode: body.bankCode,
      bankName: bank?.name ?? "Nigerian Commercial Bank",
      accountNumberLast4: body.accountNumber.slice(-4),
      accountName: body.accountName,
      status: isMatch ? "VERIFIED" : "PENDING_REVIEW",
      updatedAt: new Date().toISOString(),
    };
    db.payoutAccount = saved;

    if (saved.status === "VERIFIED") {
      db.events = db.events.map((ev) => ({ ...ev, moneyGiftsEnabled: true }));
    }
    return wrapSuccess(saved as unknown as T);
  }

  // --- OWNER EVENTS ---
  if (method === "GET" && normalizedPath === "/events") {
    const summaries: EventSummary[] = db.events.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      type: e.type,
      date: e.date,
      coverUrl: e.coverUrl,
      visibility: e.visibility,
      status: e.status,
      moneyGiftsEnabled: e.moneyGiftsEnabled,
      totalReceivedKobo: e.totalReceivedKobo,
      giftCount: e.giftCount,
      rsvpYesCount: e.rsvpYesCount,
    }));
    return wrapSuccess(summaries as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/events") {
    const body = opts.body as CreateEventRequest;
    const id = `evt_${Date.now()}`;
    const slug = `${slugify(body.name)}-${String(Date.now()).slice(-4)}`;
    const payoutReady = db.payoutAccount?.status === "VERIFIED";

    const created: EventDetail = {
      id,
      slug,
      name: body.name,
      type: body.type,
      date: body.date,
      visibility: body.visibility,
      accessCode: body.accessCode,
      status: "DRAFT",
      moneyGiftsEnabled: payoutReady,
      totalReceivedKobo: 0,
      giftCount: 0,
      rsvpYesCount: 0,
      story: body.story,
      allowPlusOne: true,
      createdAt: new Date().toISOString(),
    };

    db.events.unshift(created);
    db.registryByEvent[id] = (body.registryItems ?? []).map((item, idx) => ({
      id: `reg_${Date.now()}_${idx}`,
      title: item.title,
      productId: item.productId,
      priceKobo: item.priceKobo,
      status: "AVAILABLE",
    }));
    db.poolsByEvent[id] = [];
    db.giftsByEvent[id] = [];
    db.wallByEvent[id] = [];
    db.rsvpsByEvent[id] = [];

    return wrapSuccess(created as unknown as T);
  }

  const eventPublishMatch = /^\/events\/([^/]+)\/publish$/.exec(normalizedPath);
  if (method === "POST" && eventPublishMatch) {
    const eventId = decodeURIComponent(eventPublishMatch[1]!);
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    ev.status = "PUBLISHED";
    ev.updatedAt = new Date().toISOString();
    return wrapSuccess({ ...ev } as unknown as T);
  }

  const eventInviteMatch = /^\/events\/([^/]+)\/invite$/.exec(normalizedPath);
  if (method === "PUT" && eventInviteMatch) {
    const eventId = decodeURIComponent(eventInviteMatch[1]!);
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const template = opts.body as InviteTemplateData;
    ev.template = template;
    ev.updatedAt = new Date().toISOString();
    return wrapSuccess({ ...ev } as unknown as T);
  }

  const eventSummaryMatch = /^\/events\/([^/]+)\/summary$/.exec(normalizedPath);
  if (eventSummaryMatch) {
    const eventId = decodeURIComponent(eventSummaryMatch[1]!);
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    if (method === "PATCH") {
      const body = (opts.body ?? {}) as { keepsakePublished?: boolean };
      if (typeof body.keepsakePublished === "boolean") {
        ev.keepsakePublished = body.keepsakePublished;
      }
      ev.updatedAt = new Date().toISOString();
    }
    const gifts = db.giftsByEvent[eventId] ?? [];
    const thankedCount = gifts.filter((g) => g.thanked).length;
    const highlights = (db.wallByEvent[eventId] ?? []).filter(
      (p) => p.status === "VISIBLE"
    );
    return wrapSuccess({
      event: { ...ev },
      totalReceivedKobo: ev.totalReceivedKobo,
      giftCount: ev.giftCount,
      rsvpYesCount: ev.rsvpYesCount,
      thankedCount,
      highlights,
      keepsakePublished: Boolean(ev.keepsakePublished),
    } as unknown as T);
  }

  const eventStatsMatch = /^\/events\/([^/]+)\/stats$/.exec(normalizedPath);
  if (method === "GET" && eventStatsMatch) {
    const eventId = decodeURIComponent(eventStatsMatch[1]!);
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const stats: EventStats = MOCK_EVENT_STATS[eventId] ?? {
      totalReceivedKobo: ev.totalReceivedKobo,
      giftCount: ev.giftCount,
      rsvpYesCount: ev.rsvpYesCount,
      rsvpMaybeCount: 0,
      rsvpNoCount: 0,
      payoutStatus: db.payoutAccount?.status ?? "NOT_SET",
    };
    return wrapSuccess(stats as unknown as T);
  }

  const eventGiftsMatch = /^\/events\/([^/]+)\/gifts$/.exec(normalizedPath);
  if (method === "GET" && eventGiftsMatch) {
    const eventId = decodeURIComponent(eventGiftsMatch[1]!);
    const typeFilter = searchParams.get("type");
    const statusFilter = searchParams.get("status");
    const thankedFilter = searchParams.get("thanked");

    let gifts = [...(db.giftsByEvent[eventId] ?? [])];
    if (typeFilter && typeFilter !== "ALL") {
      gifts = gifts.filter((g) => g.type === typeFilter);
    }
    if (statusFilter && statusFilter !== "ALL") {
      gifts = gifts.filter((g) => g.status === statusFilter);
    }
    if (thankedFilter === "THANKED") {
      gifts = gifts.filter((g) => g.thanked);
    } else if (thankedFilter === "UNTHANKED") {
      gifts = gifts.filter((g) => !g.thanked);
    }

    return wrapSuccess(gifts as unknown as T);
  }

  const eventThankYouMatch = /^\/events\/([^/]+)\/thank-you$/.exec(
    normalizedPath
  );
  if (method === "GET" && eventThankYouMatch) {
    const eventId = decodeURIComponent(eventThankYouMatch[1]!);
    const gifts = (db.giftsByEvent[eventId] ?? []).filter(
      (g) => g.status === "PAID"
    );
    return wrapSuccess(gifts as unknown as T);
  }

  const eventBulkThankYouMatch = /^\/events\/([^/]+)\/thank-you\/bulk$/.exec(
    normalizedPath
  );
  if (method === "POST" && eventBulkThankYouMatch) {
    const eventId = decodeURIComponent(eventBulkThankYouMatch[1]!);
    const body = (opts.body ?? {}) as { giftIds?: string[]; message?: string };
    const targetIds = new Set(body.giftIds ?? []);
    const list = db.giftsByEvent[eventId] ?? [];
    let updatedCount = 0;

    db.giftsByEvent[eventId] = list.map((g) => {
      if (targetIds.has(g.id)) {
        updatedCount += 1;
        return { ...g, thanked: true };
      }
      return g;
    });

    return wrapSuccess({
      updatedCount,
      message: "Thank-you notes queued for delivery",
    } as unknown as T);
  }

  const giftThankedMatch = /^\/gifts\/([^/]+)\/thanked$/.exec(normalizedPath);
  if (method === "PATCH" && giftThankedMatch) {
    const giftId = decodeURIComponent(giftThankedMatch[1]!);
    const body = (opts.body ?? {}) as { thanked?: boolean };

    for (const [evId, giftList] of Object.entries(db.giftsByEvent)) {
      const idx = giftList.findIndex((g) => g.id === giftId);
      if (idx >= 0) {
        const current = giftList[idx]!;
        const updated: Gift = {
          ...current,
          thanked:
            typeof body.thanked === "boolean" ? body.thanked : !current.thanked,
        };
        const nextList = [...giftList];
        nextList[idx] = updated;
        db.giftsByEvent[evId] = nextList;
        return wrapSuccess(updated as unknown as T);
      }
    }

    throwMockError(404, "NOT_FOUND", "Gift not found");
  }

  const ownerWallListMatch = /^\/events\/([^/]+)\/wall$/.exec(normalizedPath);
  if (method === "GET" && ownerWallListMatch) {
    const eventId = decodeURIComponent(ownerWallListMatch[1]!);
    const posts = (db.wallByEvent[eventId] ?? []).filter(
      (p) => p.status !== "REMOVED"
    );
    return wrapSuccess(posts as unknown as T);
  }

  const ownerWallModMatch = /^\/events\/([^/]+)\/wall\/([^/]+)$/.exec(
    normalizedPath
  );
  if (method === "PATCH" && ownerWallModMatch) {
    const eventId = decodeURIComponent(ownerWallModMatch[1]!);
    const postId = decodeURIComponent(ownerWallModMatch[2]!);
    const body = (opts.body ?? {}) as { status?: WallPostStatus };
    const list = db.wallByEvent[eventId] ?? [];
    const idx = list.findIndex((p) => p.id === postId);

    if (idx < 0) {
      throwMockError(404, "NOT_FOUND", "Wall post not found");
    }

    const updated: WallPost = {
      ...list[idx]!,
      status: body.status ?? "HIDDEN",
    };
    const nextList = [...list];
    nextList[idx] = updated;
    db.wallByEvent[eventId] = nextList;
    return wrapSuccess(updated as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/reports") {
    const body = (opts.body ?? {}) as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      note?: string;
    };
    const item: MockAdminModerationItem = {
      id: `mod_${Date.now()}`,
      eventSlug: "reported-content",
      eventName: "Reported Item",
      authorName: body.targetId ?? "Guest",
      text: body.note,
      reason: body.reason ?? "INAPPROPRIATE",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    db.moderationQueue.unshift(item);
    return wrapSuccess({ id: item.id, status: "RECEIVED" } as unknown as T);
  }

  const eventRsvpsExportMatch = /^\/events\/([^/]+)\/rsvps\/export$/.exec(
    normalizedPath
  );
  if (method === "GET" && eventRsvpsExportMatch) {
    const eventId = decodeURIComponent(eventRsvpsExportMatch[1]!);
    const rsvps = db.rsvpsByEvent[eventId] ?? [];
    const header = "Name,Response,PlusOne,Email,Phone,CreatedAt";
    const rows = rsvps.map((r) =>
      [
        `"${(r.name ?? "").replace(/"/g, '""')}"`,
        r.response,
        `"${(r.plusOneName ?? "").replace(/"/g, '""')}"`,
        r.email ?? "",
        r.phone ?? "",
        r.createdAt,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return wrapSuccess({
      csv,
      filename: `givvly-guests-${eventId}.csv`,
    } as unknown as T);
  }

  const eventRsvpsMatch = /^\/events\/([^/]+)\/rsvps$/.exec(normalizedPath);
  if (method === "GET" && eventRsvpsMatch) {
    const eventId = decodeURIComponent(eventRsvpsMatch[1]!);
    return wrapSuccess((db.rsvpsByEvent[eventId] ?? []) as unknown as T);
  }

  const eventRegistryItemMatch = /^\/events\/([^/]+)\/registry\/([^/]+)$/.exec(
    normalizedPath
  );
  if (eventRegistryItemMatch) {
    const eventId = decodeURIComponent(eventRegistryItemMatch[1]!);
    const itemId = decodeURIComponent(eventRegistryItemMatch[2]!);

    if (method === "DELETE") {
      db.registryByEvent[eventId] = (db.registryByEvent[eventId] ?? []).filter(
        (i) => i.id !== itemId
      );
      db.poolsByEvent[eventId] = (db.poolsByEvent[eventId] ?? []).filter(
        (p) => p.id !== itemId
      );
      return wrapSuccess({ deleted: true } as unknown as T);
    }

    if (method === "PATCH") {
      const body = (opts.body ?? {}) as {
        mode?: "PRODUCT" | "CASH";
        status?: "AVAILABLE" | "RESERVED" | "CLAIMED";
      };
      const pools = db.poolsByEvent[eventId] ?? [];
      const pIdx = pools.findIndex((p) => p.id === itemId);
      if (pIdx >= 0) {
        const updatedPool: PoolItem = {
          ...pools[pIdx]!,
          ...(body.mode ? { mode: body.mode } : {}),
          ...(body.status ? { status: body.status } : {}),
        };
        const nextPools = [...pools];
        nextPools[pIdx] = updatedPool;
        db.poolsByEvent[eventId] = nextPools;
        return wrapSuccess(updatedPool as unknown as T);
      }

      const items = db.registryByEvent[eventId] ?? [];
      const iIdx = items.findIndex((i) => i.id === itemId);
      if (iIdx >= 0) {
        const updatedItem: RegistryItem = {
          ...items[iIdx]!,
          ...(body.status ? { status: body.status } : {}),
        };
        const nextItems = [...items];
        nextItems[iIdx] = updatedItem;
        db.registryByEvent[eventId] = nextItems;
        return wrapSuccess(updatedItem as unknown as T);
      }
      throwMockError(404, "NOT_FOUND", "Registry item not found");
    }
  }

  const eventRegistryMatch = /^\/events\/([^/]+)\/registry$/.exec(normalizedPath);
  if (eventRegistryMatch) {
    const eventId = decodeURIComponent(eventRegistryMatch[1]!);
    if (method === "GET") {
      if (searchParams.get("includePools") === "true") {
        return wrapSuccess({
          registry: db.registryByEvent[eventId] ?? [],
          pools: db.poolsByEvent[eventId] ?? [],
        } as unknown as T);
      }
      return wrapSuccess((db.registryByEvent[eventId] ?? []) as unknown as T);
    }
    if (method === "POST") {
      const body = opts.body as {
        title: string;
        priceKobo: number;
        isPool?: boolean;
        poolMode?: "PRODUCT" | "CASH";
        deadline?: string;
      };
      if (body.isPool) {
        const pool: PoolItem = {
          id: `pool_${Date.now()}`,
          title: body.title,
          priceKobo: body.priceKobo,
          targetKobo: body.priceKobo,
          raisedKobo: 0,
          status: "AVAILABLE",
          mode: body.poolMode ?? "CASH",
          deadline: body.deadline || undefined,
        };
        db.poolsByEvent[eventId] = [...(db.poolsByEvent[eventId] ?? []), pool];
        return wrapSuccess(pool as unknown as T);
      }

      const item: RegistryItem = {
        id: `reg_${Date.now()}`,
        title: body.title,
        priceKobo: body.priceKobo,
        status: "AVAILABLE",
      };
      db.registryByEvent[eventId] = [
        ...(db.registryByEvent[eventId] ?? []),
        item,
      ];
      return wrapSuccess(item as unknown as T);
    }
  }

  const eventDetailMatch = /^\/events\/([^/]+)$/.exec(normalizedPath);
  if (eventDetailMatch) {
    const eventId = decodeURIComponent(eventDetailMatch[1]!);
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    if (method === "GET") {
      return wrapSuccess({ ...ev } as unknown as T);
    }
    if (method === "PATCH") {
      const patch = (opts.body ?? {}) as Partial<EventDetail>;
      Object.assign(ev, patch, { updatedAt: new Date().toISOString() });
      return wrapSuccess({ ...ev } as unknown as T);
    }
  }

  // --- PUBLIC EVENT ENDPOINTS ---
  const findEventBySlug = (rawSlug: string) => {
    const normalized =
      rawSlug === "chidada-forever-2026" ? "adaobi-and-chidi-2026" : rawSlug;
    return db.events.find((e) => e.slug === normalized || e.slug === rawSlug);
  };

  if (method === "GET" && normalizedPath === "/public/events") {
    const typeFilter = searchParams.get("type");
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    let publicEvents = db.events
      .filter((e) => e.status === "PUBLISHED" && e.visibility === "PUBLIC")
      .map((e) => buildPublicEventFromDetail(e));

    if (typeFilter && typeFilter !== "ALL") {
      publicEvents = publicEvents.filter((e) => e.type === typeFilter);
    }
    if (q) {
      publicEvents = publicEvents.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.ownerFirstName.toLowerCase().includes(q) ||
          (e.story ?? "").toLowerCase().includes(q)
      );
    }
    return wrapSuccess(publicEvents as unknown as T);
  }

  const publicUnlockMatch = /^\/public\/events\/([^/]+)\/unlock$/.exec(
    normalizedPath
  );
  if (method === "POST" && publicUnlockMatch) {
    const slug = decodeURIComponent(publicUnlockMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const body = (opts.body ?? {}) as { accessCode?: string };
    if (
      ev.visibility === "PRIVATE" &&
      ev.accessCode &&
      body.accessCode?.toUpperCase() !== ev.accessCode.toUpperCase()
    ) {
      throwMockError(403, "INVALID_ACCESS_CODE", "Invalid access code");
    }
    db.unlockedSlugs.add(slug);
    setBrowserMockCookie(`givvly_ev_${slug}`, "unlocked", 7200);
    return wrapSuccess({ unlocked: true } as unknown as T);
  }

  const publicWallMatch = /^\/public\/events\/([^/]+)\/wall$/.exec(
    normalizedPath
  );
  if (publicWallMatch) {
    const slug = decodeURIComponent(publicWallMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    if (method === "GET") {
      const posts = (db.wallByEvent[ev.id] ?? []).filter(
        (p) => p.status === "VISIBLE"
      );
      return wrapSuccess(posts as unknown as T);
    }
    if (method === "POST") {
      const body = opts.body as {
        authorName: string;
        text?: string;
        media?: { url: string; type: "IMAGE" | "VIDEO" }[];
      };
      const hasMedia = Array.isArray(body.media) && body.media.length > 0;
      const isFlagged = hasMedia || hasProfanityWarning(body.text);
      const post: WallPost = {
        id: `wall_${Date.now()}`,
        authorName: body.authorName,
        text: body.text,
        media: body.media ?? [],
        status: isFlagged ? "PENDING" : "VISIBLE",
        createdAt: new Date().toISOString(),
      };
      db.wallByEvent[ev.id] = [post, ...(db.wallByEvent[ev.id] ?? [])];
      if (isFlagged) {
        db.moderationQueue.unshift({
          id: `mod_${post.id}`,
          eventSlug: ev.slug,
          eventName: ev.name,
          authorName: post.authorName,
          text: post.text,
          reason: hasMedia ? "Contains uploaded media" : "Profanity filter match",
          status: "PENDING",
          createdAt: post.createdAt,
        });
      }
      return wrapSuccess(post as unknown as T);
    }
  }

  const publicRsvpMatch = /^\/public\/events\/([^/]+)\/rsvps$/.exec(
    normalizedPath
  );
  if (method === "POST" && publicRsvpMatch) {
    const slug = decodeURIComponent(publicRsvpMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const body = opts.body as Omit<MockRsvp, "id" | "eventId" | "createdAt">;
    const existingList = db.rsvpsByEvent[ev.id] ?? [];
    const existingIdx = existingList.findIndex(
      (r) => body.email && r.email?.toLowerCase() === body.email.toLowerCase()
    );

    const record: MockRsvp = {
      id:
        existingIdx >= 0
          ? existingList[existingIdx]!.id
          : `rsvp_${Date.now()}`,
      eventId: ev.id,
      name: body.name,
      response: body.response,
      plusOneName: body.plusOneName,
      email: body.email,
      phone: body.phone,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      existingList[existingIdx] = record;
    } else {
      existingList.unshift(record);
      if (record.response === "YES") {
        ev.rsvpYesCount += 1;
      }
    }
    db.rsvpsByEvent[ev.id] = existingList;
    return wrapSuccess(record as unknown as T);
  }

  // Guest Registry Reservation & Purchase & Group Gift Pool (Section 7.2, 9.F6, 9.F7)
  const publicReserveMatch =
    /^\/public\/events\/([^/]+)\/registry\/([^/]+)\/reserve$/.exec(
      normalizedPath
    );
  if (method === "POST" && publicReserveMatch) {
    const slug = decodeURIComponent(publicReserveMatch[1]!);
    const itemId = decodeURIComponent(publicReserveMatch[2]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const items = db.registryByEvent[ev.id] ?? [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) {
      throwMockError(404, "NOT_FOUND", "Registry item not found");
    }
    const item = items[idx]!;
    if (item.status === "CLAIMED") {
      throwMockError(
        409,
        "ITEM_ALREADY_CLAIMED",
        "Someone just claimed this registry item."
      );
    }
    const reservedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const updated: RegistryItem = {
      ...item,
      status: "RESERVED",
      reservedUntil,
    };
    const nextItems = [...items];
    nextItems[idx] = updated;
    db.registryByEvent[ev.id] = nextItems;
    return wrapSuccess({ item: updated, reservedUntil } as unknown as T);
  }

  const publicBuyItemMatch = /^\/public\/events\/([^/]+)\/gifts\/item$/.exec(
    normalizedPath
  );
  if (method === "POST" && publicBuyItemMatch) {
    const slug = decodeURIComponent(publicBuyItemMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const body = opts.body as {
      itemId: string;
      name?: string;
      email: string;
      message?: string;
      anonymous?: boolean;
    };
    const items = db.registryByEvent[ev.id] ?? [];
    const idx = items.findIndex((i) => i.id === body.itemId);
    if (idx < 0) {
      throwMockError(404, "NOT_FOUND", "Registry item not found");
    }
    const item = items[idx]!;
    if (item.status === "CLAIMED") {
      throwMockError(
        409,
        "ITEM_ALREADY_CLAIMED",
        "This item has already been claimed by another guest."
      );
    }
    if (
      item.status === "RESERVED" &&
      item.reservedUntil &&
      new Date(item.reservedUntil).getTime() < Date.now()
    ) {
      throwMockError(
        409,
        "RESERVATION_EXPIRED",
        "Your 10-minute reservation expired. Please reserve again."
      );
    }

    const updatedItem: RegistryItem = {
      ...item,
      status: "CLAIMED",
      reservedUntil: undefined,
    };
    const nextItems = [...items];
    nextItems[idx] = updatedItem;
    db.registryByEvent[ev.id] = nextItems;

    const reference = `PAY_ITEM_${Date.now()}`;
    const serviceFeeKobo = Math.round(item.priceKobo * 0.015);
    const payment: MockPaymentRecord = {
      reference,
      accessCode: `acc_${reference}`,
      authorizationUrl: `https://checkout.paystack.com/${reference}`,
      amountKobo: item.priceKobo,
      serviceFeeKobo,
      totalKobo: item.priceKobo + serviceFeeKobo,
      status: "SUCCESS",
      eventSlug: slug,
      giverName: body.anonymous ? null : (body.name ?? "Guest"),
      anonymous: Boolean(body.anonymous),
      message: body.message,
      createdAt: new Date().toISOString(),
    };
    db.paymentsByRef[reference] = payment;

    const newGift: Gift = {
      id: `gft_${Date.now()}`,
      type: "PRODUCT",
      amountKobo: item.priceKobo,
      giverName: payment.giverName,
      anonymous: payment.anonymous,
      message: body.message ?? `Claimed registry item: ${item.title}`,
      status: "PAID",
      thanked: false,
      createdAt: payment.createdAt,
    };
    db.giftsByEvent[ev.id] = [newGift, ...(db.giftsByEvent[ev.id] ?? [])];
    ev.totalReceivedKobo += item.priceKobo;
    ev.giftCount += 1;

    if (opts.idempotencyKey) {
      db.idempotencyCache[opts.idempotencyKey] = payment;
    }

    return wrapSuccess(payment as unknown as T);
  }

  const publicGivePoolMatch = /^\/public\/events\/([^/]+)\/gifts\/pool$/.exec(
    normalizedPath
  );
  if (method === "POST" && publicGivePoolMatch) {
    const slug = decodeURIComponent(publicGivePoolMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    const body = opts.body as {
      poolId: string;
      amountKobo: number;
      name?: string;
      email: string;
      message?: string;
      anonymous?: boolean;
    };
    const pools = db.poolsByEvent[ev.id] ?? [];
    const idx = pools.findIndex((p) => p.id === body.poolId);
    if (idx < 0) {
      throwMockError(404, "NOT_FOUND", "Group gift pool not found");
    }
    const pool = pools[idx]!;
    const remainingKobo = Math.max(0, pool.targetKobo - pool.raisedKobo);
    if (body.amountKobo > remainingKobo) {
      throwMockError(
        409,
        "POOL_OVERFUNDED",
        `Amount exceeds remaining goal of ${Math.floor(remainingKobo / 100)} NGN.`
      );
    }

    const nextRaised = pool.raisedKobo + body.amountKobo;
    const updatedPool: PoolItem = {
      ...pool,
      raisedKobo: nextRaised,
      status: nextRaised >= pool.targetKobo ? "CLAIMED" : pool.status,
    };
    const nextPools = [...pools];
    nextPools[idx] = updatedPool;
    db.poolsByEvent[ev.id] = nextPools;

    const reference = `PAY_POOL_${Date.now()}`;
    const serviceFeeKobo = Math.round(body.amountKobo * 0.015);
    const payment: MockPaymentRecord = {
      reference,
      accessCode: `acc_${reference}`,
      authorizationUrl: `https://checkout.paystack.com/${reference}`,
      amountKobo: body.amountKobo,
      serviceFeeKobo,
      totalKobo: body.amountKobo + serviceFeeKobo,
      status: "SUCCESS",
      eventSlug: slug,
      giverName: body.anonymous ? null : (body.name ?? "Guest"),
      anonymous: Boolean(body.anonymous),
      message: body.message,
      createdAt: new Date().toISOString(),
    };
    db.paymentsByRef[reference] = payment;

    const newGift: Gift = {
      id: `gft_${Date.now()}`,
      type: "POOL",
      amountKobo: body.amountKobo,
      giverName: payment.giverName,
      anonymous: payment.anonymous,
      message: body.message ?? `Contributed to ${pool.title}`,
      status: "PAID",
      thanked: false,
      createdAt: payment.createdAt,
    };
    db.giftsByEvent[ev.id] = [newGift, ...(db.giftsByEvent[ev.id] ?? [])];
    ev.totalReceivedKobo += body.amountKobo;
    ev.giftCount += 1;

    if (opts.idempotencyKey) {
      db.idempotencyCache[opts.idempotencyKey] = payment;
    }

    return wrapSuccess(payment as unknown as T);
  }

  const publicGiveMoneyMatch = /^\/public\/events\/([^/]+)\/gifts\/money$/.exec(
    normalizedPath
  );
  if (method === "POST" && publicGiveMoneyMatch) {
    const slug = decodeURIComponent(publicGiveMoneyMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }
    if (!ev.moneyGiftsEnabled) {
      throwMockError(
        409,
        "PAYOUT_NOT_READY",
        "Money gifts are not enabled for this event yet"
      );
    }

    const body = opts.body as {
      amountKobo: number;
      name?: string;
      email: string;
      message?: string;
      anonymous?: boolean;
    };

    const reference = `PAY_GIV_${Date.now()}`;
    const serviceFeeKobo = Math.round(body.amountKobo * 0.015);
    const payment: MockPaymentRecord = {
      reference,
      accessCode: `acc_${reference}`,
      authorizationUrl: `https://checkout.paystack.com/${reference}`,
      amountKobo: body.amountKobo,
      serviceFeeKobo,
      totalKobo: body.amountKobo + serviceFeeKobo,
      status: "SUCCESS",
      eventSlug: slug,
      giverName: body.anonymous ? null : (body.name ?? "Guest"),
      anonymous: Boolean(body.anonymous),
      message: body.message,
      createdAt: new Date().toISOString(),
    };

    db.paymentsByRef[reference] = payment;

    const newGift: Gift = {
      id: `gft_${Date.now()}`,
      type: "MONEY",
      amountKobo: body.amountKobo,
      giverName: payment.giverName,
      anonymous: payment.anonymous,
      message: body.message,
      status: "PAID",
      thanked: false,
      createdAt: payment.createdAt,
    };
    db.giftsByEvent[ev.id] = [newGift, ...(db.giftsByEvent[ev.id] ?? [])];
    ev.totalReceivedKobo += body.amountKobo;
    ev.giftCount += 1;

    if (body.message) {
      const wallPost: WallPost = {
        id: `wall_${Date.now()}`,
        authorName: payment.anonymous
          ? "Anonymous Well-Wisher"
          : (payment.giverName ?? "Guest"),
        text: body.message,
        media: [],
        status: "VISIBLE",
        createdAt: payment.createdAt,
      };
      db.wallByEvent[ev.id] = [wallPost, ...(db.wallByEvent[ev.id] ?? [])];
    }

    if (opts.idempotencyKey) {
      db.idempotencyCache[opts.idempotencyKey] = payment;
    }

    return wrapSuccess(payment as unknown as T);
  }

  const paymentStatusMatch = /^\/payments\/([^/]+)$/.exec(normalizedPath);
  if (method === "GET" && paymentStatusMatch) {
    const ref = decodeURIComponent(paymentStatusMatch[1]!);
    const payment = db.paymentsByRef[ref] ?? {
      reference: ref,
      accessCode: `acc_${ref}`,
      authorizationUrl: `https://checkout.paystack.com/${ref}`,
      amountKobo: 5_000_000,
      serviceFeeKobo: 75_000,
      totalKobo: 5_075_000,
      status: "SUCCESS" as const,
      giverName: "Adaobi",
      anonymous: false,
      createdAt: new Date().toISOString(),
    };
    return wrapSuccess(payment as unknown as T);
  }

  const publicEventMatch = /^\/public\/events\/([^/]+)$/.exec(normalizedPath);
  if (method === "GET" && publicEventMatch) {
    const slug = decodeURIComponent(publicEventMatch[1]!);
    const ev = findEventBySlug(slug);
    if (!ev) {
      throwMockError(404, "NOT_FOUND", "Event not found");
    }

    const cookieUnlock = opts.cookieHeader?.includes(`givvly_ev_${slug}=`);
    if (
      ev.visibility === "PRIVATE" &&
      !db.unlockedSlugs.has(slug) &&
      !cookieUnlock
    ) {
      throwMockError(
        403,
        "EVENT_LOCKED",
        "This event is private. Enter the access code to view."
      );
    }

    return wrapSuccess(buildPublicEventFromDetail(ev) as unknown as T);
  }

  // --- DIGITAL GIFTS & BILLSPOT VTU ---
  if (method === "GET" && normalizedPath === "/digital-gifts/vtu/providers") {
    const vtuType = searchParams.get("type") === "data" ? "data" : "airtime";
    return wrapSuccess({
      message: "providers fetched",
      type: vtuType,
      providers: MOCK_BILLSPOT_PROVIDERS,
    } as unknown as T);
  }

  const vtuPlansMatch = /^\/digital-gifts\/vtu\/plans\/([^/]+)$/.exec(
    normalizedPath
  );
  if (method === "GET" && vtuPlansMatch) {
    const rawProvider = decodeURIComponent(vtuPlansMatch[1]!).toLowerCase();
    const slug =
      rawProvider.includes("airtel")
        ? "airtel"
        : rawProvider.includes("glo")
          ? "glo"
          : rawProvider.includes("t2") || rawProvider.includes("9mobile")
            ? "t2mobile"
            : "mtn";
    const providerInfo =
      MOCK_BILLSPOT_PROVIDERS.find((p) => p.slug === slug) ??
      MOCK_BILLSPOT_PROVIDERS[0]!;
    return wrapSuccess({
      message: "plans fetched",
      provider: providerInfo,
      plans: MOCK_BILLSPOT_PLANS[slug] ?? MOCK_BILLSPOT_PLANS.mtn ?? [],
    } as unknown as T);
  }

  // --- CATALOG & ORDERS ---
  if (method === "GET" && normalizedPath === "/catalog/products") {
    const mainCategory = searchParams.get("mainCategory");
    const occasion = searchParams.get("occasion");
    const relationship = searchParams.get("relationship");
    const giftType = searchParams.get("giftType");
    const gender = searchParams.get("gender");
    const ageGroup = searchParams.get("ageGroup");
    const isComboParam = searchParams.get("isCombo");
    const maxPriceKobo = Number(searchParams.get("maxPriceKobo") ?? "0");
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    let list = [...db.products];

    if (mainCategory && mainCategory !== "ALL") {
      if (mainCategory === "COMBOS") {
        list = list.filter((p) => p.isCombo);
      } else {
        list = list.filter(
          (p) =>
            p.mainCategories?.includes(mainCategory) ||
            p.category?.toUpperCase() === mainCategory
        );
      }
    }

    if (isComboParam === "true") {
      list = list.filter((p) => p.isCombo);
    } else if (isComboParam === "false") {
      list = list.filter((p) => !p.isCombo);
    }

    if (giftType && giftType !== "ALL") {
      list = list.filter(
        (p) =>
          p.giftType === giftType ||
          p.category.toUpperCase().includes(giftType.replace(/_/g, " "))
      );
    }

    if (gender && gender !== "ALL") {
      list = list.filter(
        (p) => p.gender === gender || p.gender === "UNISEX"
      );
    }

    if (ageGroup && ageGroup !== "ALL") {
      list = list.filter((p) => p.ageGroup === ageGroup);
    }

    if (occasion && occasion !== "ALL") {
      list = list.filter((p) => p.occasions.includes(occasion));
    }

    if (relationship && relationship !== "ALL") {
      list = list.filter((p) => p.relationships.includes(relationship));
    }

    if (maxPriceKobo > 0) {
      list = list.filter((p) => p.priceKobo <= maxPriceKobo);
    }

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.comboItems?.some((c) => c.name.toLowerCase().includes(q))
      );
    }
    return wrapSuccess(list as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/catalog/collections") {
    return wrapSuccess(MOCK_CATALOG_COLLECTIONS as unknown as T);
  }

  const productDetailMatch = /^\/catalog\/products\/([^/]+)$/.exec(
    normalizedPath
  );
  if (method === "GET" && productDetailMatch) {
    const slug = decodeURIComponent(productDetailMatch[1]!);
    const product = db.products.find((p) => p.slug === slug || p.id === slug);
    if (!product) {
      throwMockError(404, "NOT_FOUND", "Product not found");
    }
    return wrapSuccess(product as unknown as T);
  }

  if (normalizedPath === "/orders") {
    if (method === "GET") {
      return wrapSuccess(db.orders as unknown as T);
    }
    if (method === "POST") {
      const body = opts.body as CreateDirectOrderRequest & {
        items?: Array<{ name: string; qty: number; unitPriceKobo: number }>;
        packagingKobo?: number;
      };
      const product =
        db.products.find(
          (p) => p.slug === body.productSlug || p.id === body.productSlug
        ) ?? db.products[0]!;
      const isVtuOrder = Boolean(body.vtuType) || Boolean(product.isDigital);
      const wrappingFeeKobo = isVtuOrder
        ? 0
        : body.wrapping
          ? 250_000
          : (body.packagingKobo ?? 0);

      let resolvedUnitKobo = body.customAmountKobo ?? product.priceKobo;
      let resolvedTitle = product.name;
      if (body.vtuType === "data" && body.billItemIdentifier) {
        const providerSlug = (body.vtuProvider || "mtn").toLowerCase();
        const plan = (MOCK_BILLSPOT_PLANS[providerSlug] ?? MOCK_BILLSPOT_PLANS.mtn ?? []).find(
          (pl) => pl.bill_item_identifier === body.billItemIdentifier
        );
        if (plan) {
          resolvedUnitKobo = plan.amount * 100;
          resolvedTitle = `${providerSlug.toUpperCase()} ${plan.name}`;
        }
      } else if (body.vtuType === "airtime" && body.customAmountKobo) {
        const providerSlug = (body.vtuProvider || "mtn").toUpperCase();
        resolvedTitle = `${providerSlug} ₦${Math.round(body.customAmountKobo / 100).toLocaleString()} Airtime Top-Up`;
      }

      const phonesCount =
        Array.isArray(body.recipientPhones) && body.recipientPhones.length > 0
          ? body.recipientPhones.length
          : 1;

      const itemsList =
        body.items && body.items.length > 0
          ? body.items
          : [
              {
                name: resolvedTitle,
                qty: isVtuOrder ? phonesCount : 1,
                unitPriceKobo: resolvedUnitKobo,
              },
            ];
      const itemsTotalKobo = itemsList.reduce(
        (sum, item) => sum + item.unitPriceKobo * item.qty,
        0
      );
      const totalKobo = itemsTotalKobo + wrappingFeeKobo;
      const now = new Date().toISOString();

      const created: Order = {
        id: `ord_${Date.now()}`,
        number: `GIV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
        items: itemsList,
        totalKobo,
        status: isVtuOrder ? "DELIVERED" : "CONFIRMED",
        timeline: isVtuOrder
          ? [
              { status: "PENDING_PAYMENT", at: now },
              { status: "CONFIRMED", at: now },
              { status: "DELIVERED", at: now },
            ]
          : [
              { status: "PENDING_PAYMENT", at: now },
              { status: "CONFIRMED", at: now },
            ],
        recipientName: body.recipientName,
      };
      db.orders.unshift(created);
      if (opts.idempotencyKey) {
        db.idempotencyCache[opts.idempotencyKey] = created;
      }
      return wrapSuccess(created as unknown as T);
    }
  }

  const orderVerifyMatch = /^\/orders\/([^/]+)\/verify$/.exec(normalizedPath);
  if (method === "POST" && orderVerifyMatch) {
    const id = decodeURIComponent(orderVerifyMatch[1]!);
    const order = db.orders.find((o) => o.id === id || o.number === id);
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Order not found");
    }
    return wrapSuccess({
      order,
      verified: true,
      status: order.status,
    } as unknown as T);
  }

  const orderPayMatch = /^\/orders\/([^/]+)\/pay$/.exec(normalizedPath);
  if (method === "POST" && orderPayMatch) {
    const id = decodeURIComponent(orderPayMatch[1]!);
    const order = db.orders.find((o) => o.id === id || o.number === id);
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Order not found");
    }
    order.status = "CONFIRMED";
    return wrapSuccess({
      order,
      reference: `PAY_ORD_${Date.now()}`,
    } as unknown as T);
  }

  const orderReviewMatch = /^\/orders\/([^/]+)\/review$/.exec(normalizedPath);
  if (method === "POST" && orderReviewMatch) {
    const body = (opts.body ?? {}) as { rating?: number; comment?: string };
    return wrapSuccess({
      ok: true,
      rating: body.rating ?? 5,
    } as unknown as T);
  }

  const orderDisputeMatch = /^\/orders\/([^/]+)\/disputes$/.exec(
    normalizedPath
  );
  if (method === "POST" && orderDisputeMatch) {
    const id = decodeURIComponent(orderDisputeMatch[1]!);
    const order = db.orders.find((o) => o.id === id || o.number === id);
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Order not found");
    }
    const body = opts.body as { type: DisputeType; description: string };
    order.status = "DISPUTED";
    order.timeline.push({ status: "DISPUTED", at: new Date().toISOString() });

    const dispute: MockDispute = {
      id: `disp_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.number,
      type: body.type,
      description: body.description,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    db.disputes.unshift(dispute);
    return wrapSuccess(dispute as unknown as T);
  }

  const orderDetailMatch = /^\/orders\/([^/]+)$/.exec(normalizedPath);
  if (method === "GET" && orderDetailMatch) {
    const id = decodeURIComponent(orderDetailMatch[1]!);
    const order = db.orders.find((o) => o.id === id || o.number === id);
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Order not found");
    }
    return wrapSuccess(order as unknown as T);
  }

  const publicTrackMatch = /^\/public\/track\/([^/]+)$/.exec(normalizedPath);
  if (method === "GET" && publicTrackMatch) {
    const order = db.orders[0];
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Tracking link not found");
    }
    return wrapSuccess(order as unknown as T);
  }

  // --- NOTIFICATIONS ---
  if (method === "GET" && normalizedPath === "/notifications") {
    return wrapSuccess(db.notifications as unknown as T);
  }

  const notifReadMatch = /^\/notifications\/([^/]+)\/read$/.exec(
    normalizedPath
  );
  if (method === "PATCH" && notifReadMatch) {
    const id = decodeURIComponent(notifReadMatch[1]!);
    const target = db.notifications.find((n) => n.id === id);
    if (target) target.read = true;
    return wrapSuccess({ ok: true } as unknown as T);
  }

  if (normalizedPath === "/me/notification-preferences") {
    if (method === "GET") {
      return wrapSuccess(db.notificationPrefs as unknown as T);
    }
    if (method === "PUT") {
      db.notificationPrefs = {
        ...db.notificationPrefs,
        ...(opts.body as Partial<MockNotificationPreferences>),
      };
      return wrapSuccess(db.notificationPrefs as unknown as T);
    }
  }

  if (method === "PATCH" && normalizedPath === "/me/profile") {
    const body = (opts.body ?? {}) as { name?: string; phone?: string };
    const baseUser = db.currentUser ?? MOCK_USERS.user!;
    db.currentUser = {
      ...baseUser,
      ...(body.name ? { name: body.name } : {}),
    };
    return wrapSuccess(db.currentUser as unknown as T);
  }

  if (method === "POST" && normalizedPath === "/me/password") {
    return wrapSuccess({ ok: true } as unknown as T);
  }

  if (method === "DELETE" && normalizedPath === "/me") {
    return wrapSuccess({ deleted: true } as unknown as T);
  }

  // --- VENDOR & ADMIN ---
  if (method === "GET" && normalizedPath === "/vendor/orders") {
    return wrapSuccess(db.orders as unknown as T);
  }

  const vendorStatusMatch =
    /^\/(?:vendor|admin)\/orders\/([^/]+)\/status$/.exec(normalizedPath);
  if (method === "PATCH" && vendorStatusMatch) {
    const orderId = decodeURIComponent(vendorStatusMatch[1]!);
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      throwMockError(404, "NOT_FOUND", "Order not found");
    }
    const body = opts.body as { status: OrderStatus };
    const expectedNext = getNextValidOrderStatus(order.status);
    if (expectedNext !== body.status) {
      throwMockError(
        409,
        "INVALID_STATUS_TRANSITION",
        `Cannot transition order from ${order.status} directly to ${body.status}.`
      );
    }
    order.status = body.status;
    order.timeline.push({ status: body.status, at: new Date().toISOString() });
    return wrapSuccess(order as unknown as T);
  }

  if (
    normalizedPath === "/vendor/products" ||
    normalizedPath === "/admin/products"
  ) {
    if (method === "GET") {
      return wrapSuccess(db.products as unknown as T);
    }
    if (method === "POST") {
      const body = opts.body as {
        name: string;
        description: string;
        priceKobo: number;
        category: string;
        inStock: boolean;
      };
      const created: MockCatalogProduct = {
        id: `prod_${Date.now()}`,
        slug: slugify(body.name),
        name: body.name,
        description: body.description,
        priceKobo: body.priceKobo,
        category: body.category,
        occasions: ["WEDDING", "BIRTHDAY"],
        relationships: ["FRIEND", "PARTNER"],
        vendorName: "Givvly Curated",
        inStock: body.inStock,
        rating: 5.0,
        reviewCount: 1,
      };
      db.products.unshift(created);
      return wrapSuccess(created as unknown as T);
    }
  }

  const vendorProductItemMatch =
    /^\/(?:vendor|admin)\/products\/([^/]+)$/.exec(normalizedPath);
  if (method === "PATCH" && vendorProductItemMatch) {
    const prodId = decodeURIComponent(vendorProductItemMatch[1]!);
    const prod = db.products.find((p) => p.id === prodId || p.slug === prodId);
    if (!prod) {
      throwMockError(404, "NOT_FOUND", "Product not found");
    }
    const patch = (opts.body ?? {}) as Partial<MockCatalogProduct>;
    Object.assign(prod, patch);
    return wrapSuccess({ ...prod } as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/moderation") {
    return wrapSuccess(db.moderationQueue as unknown as T);
  }

  const adminModItemMatch = /^\/admin\/moderation\/([^/]+)$/.exec(
    normalizedPath
  );
  if (method === "PATCH" && adminModItemMatch) {
    const modId = decodeURIComponent(adminModItemMatch[1]!);
    const item = db.moderationQueue.find((m) => m.id === modId);
    if (!item) {
      throwMockError(404, "NOT_FOUND", "Moderation item not found");
    }
    const body = (opts.body ?? {}) as { status?: "APPROVED" | "REMOVED" };
    item.status = body.status ?? "APPROVED";

    for (const [evId, wallList] of Object.entries(db.wallByEvent)) {
      db.wallByEvent[evId] = wallList.map((post) => {
        if (`mod_${post.id}` === modId) {
          return {
            ...post,
            status: item.status === "APPROVED" ? "VISIBLE" : "REMOVED",
          };
        }
        return post;
      });
    }
    return wrapSuccess({ ...item } as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/payments") {
    const payments = Object.values(db.paymentsByRef);
    return wrapSuccess(payments as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/payouts") {
    const payouts: AdminPayoutRecord[] = [
      {
        id: "pout_01",
        eventName: "Adaobi & Chidi's Forever (#ChidAda26)",
        ownerName: "Adaobi Okafor",
        bankName: "Guaranty Trust Bank (GTBank)",
        accountNumberLast4: "4829",
        amountKobo: 285_000_000,
        status: "SENT",
        createdAt: "2026-10-28T06:00:00Z",
      },
      {
        id: "pout_02",
        eventName: "Adaobi's Golden 30th Soirée",
        ownerName: "Adaobi Okafor",
        bankName: "Guaranty Trust Bank (GTBank)",
        accountNumberLast4: "4829",
        amountKobo: 95_000_000,
        status: "FAILED",
        createdAt: "2026-10-28T07:30:00Z",
      },
    ];
    return wrapSuccess(payouts as unknown as T);
  }

  const adminPayoutRetryMatch = /^\/admin\/payouts\/([^/]+)\/retry$/.exec(
    normalizedPath
  );
  if (method === "POST" && adminPayoutRetryMatch) {
    const payoutId = decodeURIComponent(adminPayoutRetryMatch[1]!);
    return wrapSuccess({
      id: payoutId,
      status: "SENT",
    } as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/ledger") {
    return wrapSuccess(db.ledger as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/disputes") {
    return wrapSuccess(db.disputes as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/events") {
    return wrapSuccess(db.events as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/orders") {
    return wrapSuccess(db.orders as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/vendors") {
    return wrapSuccess([
      {
        id: "usr_vendor_01",
        name: "Lagos Luxe Hampers",
        email: "vendor@givvly.ng",
        productCount: db.products.length,
        status: "VERIFIED",
      },
    ] as unknown as T);
  }

  if (method === "GET" && normalizedPath === "/admin/users") {
    return wrapSuccess(Object.values(MOCK_USERS) as unknown as T);
  }

  const adminDisputeItemMatch = /^\/admin\/disputes\/([^/]+)$/.exec(
    normalizedPath
  );
  if (method === "PATCH" && adminDisputeItemMatch) {
    const dispId = decodeURIComponent(adminDisputeItemMatch[1]!);
    const disp = db.disputes.find((d) => d.id === dispId);
    if (!disp) {
      throwMockError(404, "NOT_FOUND", "Dispute not found");
    }
    const body = (opts.body ?? {}) as { status?: "RESOLVED" | "REJECTED" };
    disp.status = body.status ?? "RESOLVED";
    return wrapSuccess({ ...disp } as unknown as T);
  }

  throwMockError(
    404,
    "NOT_FOUND",
    `No mock handler registered for ${method} ${normalizedPath}`
  );
}

