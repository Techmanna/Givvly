import { EmailRecommendationService } from "./email-recommendation.service";

describe("EmailRecommendationService", () => {
  let service: EmailRecommendationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notificationPref: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      event: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new EmailRecommendationService(mockPrisma);
  });

  it("blocks recommendations for security, wallet, and auth emails", async () => {
    for (const type of [
      "SECURITY_ALERT",
      "WALLET_TOPUP",
      "WALLET_TRANSFER_OUT",
      "PAYOUT_INITIATED",
      "AUTH_VERIFY_EMAIL",
    ]) {
      const res = await service.getRecommendationsForEmail({
        userId: "u1",
        type,
        data: { eventId: "ev1", orderNumber: "GV-1" },
      });
      expect(res).toBeNull();
    }
  });

  it("suppresses recommendations when user opted out of MARKETING emails", async () => {
    mockPrisma.notificationPref.findUnique.mockResolvedValueOnce({
      enabled: false,
    });

    const res = await service.getRecommendationsForEmail({
      userId: "u1",
      type: "ORDER_CONFIRMED",
      data: { orderNumber: "GV-1" },
    });
    expect(res).toBeNull();
  });

  it("returns null when no product candidate meets the 50% relevance threshold", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      totalKobo: 5_000_000,
      items: [{ productId: "p-ordered" }],
    });
    mockPrisma.product.findMany
      .mockResolvedValueOnce([
        {
          occasions: ["WEDDING"],
          relationships: ["COUPLE"],
          isDigital: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p-unrelated",
          slug: "baby-bib",
          title: "Baby Bib",
          priceKobo: 200_000,
          occasions: ["BABY_SHOWER"],
          relationships: ["BABY"],
          isDigital: false,
          digitalKind: null,
          ratingAvg: 3.5,
          stock: 10,
          active: true,
        },
      ]);

    const res = await service.getRecommendationsForEmail({
      userId: "u1",
      type: "ORDER_CONFIRMED",
      data: { orderNumber: "GV-WED-1" },
    });
    expect(res).toBeNull();
  });

  it("recommends matching products when relevance score >= 50%", async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      totalKobo: 2_500_000,
      items: [{ productId: "p-ordered" }],
    });
    mockPrisma.product.findMany
      .mockResolvedValueOnce([
        {
          occasions: ["WEDDING"],
          relationships: ["COUPLE"],
          isDigital: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "p-ordered",
          slug: "ordered-hamper",
          title: "Ordered Hamper",
          priceKobo: 2_500_000,
          occasions: ["WEDDING"],
          relationships: ["COUPLE"],
          isDigital: false,
          digitalKind: null,
          ratingAvg: 4.8,
          stock: 5,
          active: true,
        },
        {
          id: "p-match",
          slug: "wedding-champagne-set",
          title: "Wedding Champagne Flute Set",
          priceKobo: 2_000_000,
          occasions: ["WEDDING", "ANNIVERSARY"],
          relationships: ["COUPLE"],
          isDigital: false,
          digitalKind: null,
          ratingAvg: 4.9,
          stock: 8,
          active: true,
        },
      ]);

    const res = await service.getRecommendationsForEmail({
      userId: "u1",
      type: "ORDER_CONFIRMED",
      data: { orderNumber: "GV-WED-1" },
    });

    expect(res).not.toBeNull();
    expect(res!.items).toHaveLength(1);
    expect(res!.items[0].title).toBe("Wedding Champagne Flute Set");
    expect(res!.items[0].relevanceScore).toBeGreaterThanOrEqual(0.5);
  });

  it("recommends unused event features (Pool / Registry) to hosts when >= 50% relevant", async () => {
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      id: "ev-1",
      slug: "amaka-wedding",
      name: "Amaka's Wedding",
      type: "WEDDING",
      status: "PUBLISHED",
      _count: {
        pools: 0,
        registry: 0,
        rsvps: 10,
      },
    });

    const res = await service.getRecommendationsForEmail({
      userId: "host-1",
      type: "HOST_GIFT_RECEIVED",
      data: { eventId: "ev-1" },
    });

    expect(res).not.toBeNull();
    expect(res!.items.map((i: { title: string }) => i.title)).toEqual([
      "Launch a Group Gift Pool",
      "Add a Curated Gift Registry",
    ]);
  });
});
