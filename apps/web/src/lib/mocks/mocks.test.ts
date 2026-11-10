import { beforeEach, describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api-client";
import {
  buildEvent,
  buildGift,
  buildOrder,
  buildPoolItem,
  buildProduct,
  buildPublicEvent,
  buildRegistryItem,
  buildRsvp,
  buildUser,
  buildWallPost,
  handleMockApiRequest,
  resetFactorySequence,
  resetMockDatabase,
} from "@/lib/mocks";
import type {
  Bank,
  EventDetail,
  EventSummary,
  Gift,
  Order,
  PayoutAccount,
  PublicEvent,
  User,
} from "@givvly/contracts";

describe("test data factories (Section 13.3)", () => {
  beforeEach(() => {
    resetFactorySequence();
  });

  it("builds valid domain objects with integer kobo and overrides", () => {
    const user = buildUser({ name: "Chidi Okafor" });
    expect(user.id).toBe("usr_1");
    expect(user.name).toBe("Chidi Okafor");

    const event = buildEvent({ totalReceivedKobo: 50_000_000 });
    expect(Number.isSafeInteger(event.totalReceivedKobo)).toBe(true);

    const publicEvent = buildPublicEvent({ slug: "custom-slug" });
    expect(publicEvent.slug).toBe("custom-slug");
    expect(publicEvent.registry.length).toBe(1);
    expect(publicEvent.pools.length).toBe(1);

    const gift = buildGift({ amountKobo: 10_000_000 });
    expect(gift.amountKobo).toBe(10_000_000);

    const reg = buildRegistryItem();
    const pool = buildPoolItem();
    const wall = buildWallPost();
    const rsvp = buildRsvp();
    const prod = buildProduct();
    const order = buildOrder();

    expect(reg.status).toBe("AVAILABLE");
    expect(pool.mode).toBe("CASH");
    expect(wall.status).toBe("VISIBLE");
    expect(rsvp.response).toBe("YES");
    expect(prod.inStock).toBe(true);
    expect(order.status).toBe("CONFIRMED");
  });
});

describe("stateful mock API router", () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  it("serves initial events, banks, payout account, and user session", async () => {
    const me = await handleMockApiRequest<User>("/auth/me", { method: "GET" });
    expect(me.data.email).toBe("adaobi@givvly.store");

    const events = await handleMockApiRequest<EventSummary[]>("/events", {
      method: "GET",
    });
    expect(events.data.length).toBeGreaterThanOrEqual(3);

    const banks = await handleMockApiRequest<Bank[]>("/banks", {
      method: "GET",
    });
    expect(banks.data.length).toBeGreaterThanOrEqual(10);

    const payout = await handleMockApiRequest<PayoutAccount>(
      "/payout-accounts",
      { method: "GET" }
    );
    expect(payout.data.status).toBe("VERIFIED");
  });

  it("locks private events until unlocked with the correct accessCode", async () => {
    await expect(
      handleMockApiRequest<PublicEvent>("/public/events/adaobi-golden-30th", {
        method: "GET",
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "EVENT_LOCKED",
    } satisfies Partial<ApiClientError>);

    await expect(
      handleMockApiRequest("/public/events/adaobi-golden-30th/unlock", {
        method: "POST",
        body: { accessCode: "WRONGCODE" },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "INVALID_ACCESS_CODE",
    } satisfies Partial<ApiClientError>);

    await handleMockApiRequest("/public/events/adaobi-golden-30th/unlock", {
      method: "POST",
      body: { accessCode: "GOLD2026" },
    });

    const unlocked = await handleMockApiRequest<PublicEvent>(
      "/public/events/adaobi-golden-30th",
      { method: "GET" }
    );
    expect(unlocked.data.name).toContain("Adaobi's Golden 30th");
  });

  it("creates and publishes a new event and records money gifts with idempotency", async () => {
    const created = await handleMockApiRequest<EventDetail>("/events", {
      method: "POST",
      body: {
        type: "GRADUATION",
        name: "Tunde's MSc Graduation",
        date: "2026-12-20",
        visibility: "PUBLIC",
        registryItems: [{ title: "Kindle Scribe", priceKobo: 45_000_000 }],
      },
    });
    expect(created.data.status).toBe("DRAFT");

    const published = await handleMockApiRequest<EventDetail>(
      `/events/${created.data.id}/publish`,
      { method: "POST" }
    );
    expect(published.data.status).toBe("PUBLISHED");

    const give1 = await handleMockApiRequest<{ reference: string }>(
      `/public/events/${created.data.slug}/gifts/money`,
      {
        method: "POST",
        idempotencyKey: "idem_key_99",
        body: {
          amountKobo: 5_000_000,
          name: "Uncle Segun",
          email: "segun@example.com",
          message: "So proud of you!",
        },
      }
    );

    const giveReplay = await handleMockApiRequest<{ reference: string }>(
      `/public/events/${created.data.slug}/gifts/money`,
      {
        method: "POST",
        idempotencyKey: "idem_key_99",
        body: {
          amountKobo: 5_000_000,
          name: "Uncle Segun",
          email: "segun@example.com",
        },
      }
    );

    expect(giveReplay.data.reference).toBe(give1.data.reference);

    const gifts = await handleMockApiRequest<Gift[]>(
      `/events/${created.data.id}/gifts`,
      { method: "GET" }
    );
    expect(gifts.data.length).toBe(1);
    expect(gifts.data[0]?.amountKobo).toBe(5_000_000);
  });

  it("serves catalog products and allows vendor order status transitions", async () => {
    const orders = await handleMockApiRequest<Order[]>("/vendor/orders", {
      method: "GET",
    });
    const firstOrder = orders.data[0]!;
    const updated = await handleMockApiRequest<Order>(
      `/vendor/orders/${firstOrder.id}/status`,
      {
        method: "PATCH",
        body: { status: "DELIVERED" },
      }
    );
    expect(updated.data.status).toBe("DELIVERED");
  });

  it("handles mock login and sets browser mock cookie without base64url encoding failure", async () => {
    const res = await handleMockApiRequest<{ user: User }>("/auth/login", {
      method: "POST",
      body: {
        email: "adaobi@givvly.store",
        password: "anypassword",
      },
    });
    expect(res.data.user.email).toBe("adaobi@givvly.store");
    expect(document.cookie).toContain("givvly_at=");
  });
});

