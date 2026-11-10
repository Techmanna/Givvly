import type {
  Bank,
  EventDetail,
  EventStats,
  EventSummary,
  Gift,
  Order,
  PayoutAccount,
  PoolItem,
  PublicEvent,
  RegistryItem,
  User,
  WallPost,
} from "@givvly/contracts";
import type {
  MockCatalogProduct,
  MockNotification,
  MockRsvp,
} from "./data";

let seq = 1;
function nextId(prefix: string): string {
  const id = `${prefix}_${seq}`;
  seq += 1;
  return id;
}

export function resetFactorySequence(): void {
  seq = 1;
}

export function buildUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId("usr");
  return {
    id,
    name: "Adaobi Okafor",
    email: "adaobi@givvly.store",
    phone: "+2348031234567",
    role: "USER",
    emailVerified: true,
    ...overrides,
  };
}

export function buildBank(overrides: Partial<Bank> = {}): Bank {
  return {
    code: "058",
    name: "Guaranty Trust Bank (GTBank)",
    ...overrides,
  };
}

export function buildPayoutAccount(
  overrides: Partial<PayoutAccount> = {}
): PayoutAccount {
  return {
    id: overrides.id ?? nextId("pa"),
    bankCode: "058",
    bankName: "Guaranty Trust Bank (GTBank)",
    accountNumberLast4: "4829",
    accountName: "ADAOBI OKAFOR",
    status: "VERIFIED",
    updatedAt: "2026-10-28T10:00:00Z",
    ...overrides,
  };
}

export function buildRegistryItem(
  overrides: Partial<RegistryItem> = {}
): RegistryItem {
  return {
    id: overrides.id ?? nextId("reg"),
    title: "Kenwood Stand Mixer",
    priceKobo: 38_500_000,
    status: "AVAILABLE",
    ...overrides,
  };
}

export function buildPoolItem(overrides: Partial<PoolItem> = {}): PoolItem {
  return {
    id: overrides.id ?? nextId("pool"),
    title: "Zanzibar Honeymoon Fund",
    priceKobo: 250_000_000,
    targetKobo: 250_000_000,
    raisedKobo: 125_000_000,
    status: "AVAILABLE",
    deadline: "2026-12-10T23:59:59Z",
    mode: "CASH",
    ...overrides,
  };
}

export function buildEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  const id = overrides.id ?? nextId("evt");
  return {
    id,
    slug: overrides.slug ?? `event-${id}`,
    name: "Adaobi & Chidi's Wedding",
    type: "WEDDING",
    date: "2026-12-12",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 150_000_000,
    giftCount: 10,
    rsvpYesCount: 35,
    story: "Celebrate our special day with us in Lagos!",
    allowPlusOne: true,
    createdAt: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

export function buildEventSummary(
  overrides: Partial<EventSummary> = {}
): EventSummary {
  const detail = buildEvent(overrides);
  return {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    type: detail.type,
    date: detail.date,
    coverUrl: detail.coverUrl,
    visibility: detail.visibility,
    status: detail.status,
    moneyGiftsEnabled: detail.moneyGiftsEnabled,
    totalReceivedKobo: detail.totalReceivedKobo,
    giftCount: detail.giftCount,
    rsvpYesCount: detail.rsvpYesCount,
  };
}

export function buildPublicEvent(
  overrides: Partial<PublicEvent> = {}
): PublicEvent {
  const base = buildEventSummary(overrides);
  return {
    ...base,
    story: "Celebrate our special day with us in Lagos!",
    ownerFirstName: "Adaobi",
    allowPlusOne: true,
    registry: [buildRegistryItem()],
    pools: [buildPoolItem()],
    ...overrides,
  };
}

export function buildEventStats(
  overrides: Partial<EventStats> = {}
): EventStats {
  return {
    totalReceivedKobo: 150_000_000,
    giftCount: 10,
    rsvpYesCount: 35,
    rsvpMaybeCount: 4,
    rsvpNoCount: 2,
    payoutStatus: "VERIFIED",
    ...overrides,
  };
}

export function buildGift(overrides: Partial<Gift> = {}): Gift {
  return {
    id: overrides.id ?? nextId("gft"),
    type: "MONEY",
    amountKobo: 25_000_000,
    giverName: "Kemi Adesanya",
    anonymous: false,
    message: "Congratulations to you both!",
    status: "PAID",
    thanked: false,
    createdAt: "2026-10-28T10:00:00Z",
    ...overrides,
  };
}

export function buildWallPost(overrides: Partial<WallPost> = {}): WallPost {
  return {
    id: overrides.id ?? nextId("wall"),
    authorName: "Kemi Adesanya",
    text: "Wishing you a lifetime of happiness!",
    media: [],
    status: "VISIBLE",
    createdAt: "2026-10-28T10:00:00Z",
    ...overrides,
  };
}

export function buildRsvp(overrides: Partial<MockRsvp> = {}): MockRsvp {
  return {
    id: overrides.id ?? nextId("rsvp"),
    eventId: "evt_wedding_01",
    name: "Ifeanyi Eze",
    response: "YES",
    email: "ifeanyi@example.com",
    phone: "+2348065550199",
    createdAt: "2026-10-28T10:00:00Z",
    ...overrides,
  };
}

export function buildProduct(
  overrides: Partial<MockCatalogProduct> = {}
): MockCatalogProduct {
  const id = overrides.id ?? nextId("prod");
  return {
    id,
    slug: overrides.slug ?? `product-${id}`,
    name: "Royal Celebration Champagne Hamper",
    description: "Curated luxury hamper delivered in Lagos.",
    priceKobo: 18_500_000,
    category: "Food & Wine",
    occasions: ["WEDDING", "BIRTHDAY"],
    relationships: ["COUPLE", "FRIEND"],
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 4.9,
    reviewCount: 24,
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? nextId("ord");
  return {
    id,
    number: `GIV-2026-${1000 + seq}`,
    items: [
      {
        name: "Royal Celebration Champagne Hamper",
        qty: 1,
        unitPriceKobo: 18_500_000,
      },
    ],
    totalKobo: 18_500_000,
    status: "CONFIRMED",
    timeline: [
      { status: "PENDING_PAYMENT", at: "2026-10-28T09:00:00Z" },
      { status: "CONFIRMED", at: "2026-10-28T09:01:00Z" },
    ],
    recipientName: "Chidi Okafor",
    ...overrides,
  };
}

export function buildNotification(
  overrides: Partial<MockNotification> = {}
): MockNotification {
  return {
    id: overrides.id ?? nextId("notif"),
    title: "New gift received",
    body: "You received a ₦50,000 gift on your event.",
    read: false,
    createdAt: "2026-10-28T10:00:00Z",
    href: "/dashboard",
    ...overrides,
  };
}

