import { Test, TestingModule } from "@nestjs/testing";
import { EventsService } from "./events.service";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { SlugService } from "../../common/slug/slug.service";

describe("EventsService - Slug Generation Integration", () => {
  let service: EventsService;
  let mockPrisma: any;
  let slugService: SlugService;

  beforeEach(async () => {
    mockPrisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "ev-1", ...data })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: "ev-1" }),
      },
      payoutAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: "pacc-1", status: "VERIFIED" }),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        SlugService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "ENCRYPTION_KEY" || key === "ACCOUNT_HASH_KEY") {
                return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
              }
              return "http://localhost:4000";
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    slugService = module.get<SlugService>(SlugService);
  });

  it("creates an event with a clean slug derived from the celebration name", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    const created = await service.createEvent("user-1", {
      name: "Chidi & Amaka 10th Anniversary Dinner",
      type: "ANNIVERSARY" as any,
      date: new Date().toISOString(),
      visibility: "PUBLIC" as any,
    });

    expect(created.slug).toBe("chidi-amaka-10th-anniversary-dinner");
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "chidi-amaka-10th-anniversary-dinner",
        }),
      })
    );
  });

  it("appends random suffix when an event slug collides in the database", async () => {
    mockPrisma.event.findUnique
      .mockResolvedValueOnce({ id: "ev-existing-1" })
      .mockResolvedValueOnce(null);

    const created = await service.createEvent("user-1", {
      name: "Chidi & Amaka 10th Anniversary Dinner",
      type: "ANNIVERSARY" as any,
      date: new Date().toISOString(),
      visibility: "PUBLIC" as any,
    });

    expect(created.slug).toMatch(/^chidi-amaka-10th-anniversary-dinner-[a-z0-9]{5}$/);
  });

  it("supports user-requested custom slug and ensures uniqueness", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    const created = await service.createEvent("user-1", {
      name: "Baby Shower",
      slug: "chidi-baby-shower-2026",
      type: "BABY_SHOWER" as any,
      date: new Date().toISOString(),
      visibility: "PUBLIC" as any,
    });

    expect(created.slug).toBe("chidi-baby-shower-2026");
  });

  describe("Money Gifts Enablement", () => {
    it("enables money gifts when creator already has a verified payout account", async () => {
      mockPrisma.payoutAccount.findFirst.mockResolvedValue({ id: "pacc-verified-1" });

      const created = await service.createEvent("user-1", {
        name: "Graduation Party",
        type: "GRADUATION" as any,
        date: new Date().toISOString(),
        visibility: "PUBLIC" as any,
      });

      expect(created.moneyGiftsEnabled).toBe(true);
      expect(mockPrisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payoutAccountId: "pacc-verified-1",
          }),
        })
      );
    });

    it("automatically links verified payout account to user's events when saving payout details", async () => {
      mockPrisma.payoutAccount.upsert.mockResolvedValue({
        id: "pacc-new-1",
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountLast4: "5678",
        accountName: "David Enabulele",
        status: "VERIFIED",
      });

      await service.savePayoutAccount("user-1", {
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "David Enabulele",
      });

      expect(mockPrisma.event.updateMany).toHaveBeenCalledWith({
        where: {
          ownerId: "user-1",
          payoutAccountId: null,
        },
        data: {
          payoutAccountId: "pacc-new-1",
        },
      });
    });

    it("resolves moneyGiftsEnabled: true in getPublicEvent when owner has verified payout account", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "ev-public-1",
        slug: "chidi-wedding",
        name: "Chidi Wedding",
        type: "WEDDING",
        date: new Date("2026-12-15T10:00:00Z"),
        status: "PUBLISHED",
        visibility: "PUBLIC",
        payoutAccountId: null,
        ownerId: "user-owner-1",
        currency: "NGN",
        gifts: [],
        _count: { gifts: 0, rsvps: 0 },
        registry: [],
        pools: [],
        templateData: {},
      });

      mockPrisma.payoutAccount.findFirst.mockResolvedValue({ id: "pacc-verified-owner" });

      const publicEv = await service.getPublicEvent("chidi-wedding");

      expect(publicEv.moneyGiftsEnabled).toBe(true);
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: "ev-public-1" },
        data: { payoutAccountId: "pacc-verified-owner" },
      });
    });
  });
});
