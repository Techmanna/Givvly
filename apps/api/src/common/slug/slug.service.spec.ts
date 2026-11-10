import { Test, TestingModule } from "@nestjs/testing";
import { SlugService } from "./slug.service";
import { PrismaService } from "../../infra/prisma/prisma.service";

describe("SlugService", () => {
  let service: SlugService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      event: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      collection: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlugService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SlugService>(SlugService);
  });

  describe("slugify helper", () => {
    it("converts title to clean lowercase slug and strips enumeration", () => {
      expect(service.slugify("1. How to get rich quick?")).toBe("how-to-get-rich-quick");
      expect(service.slugify("How to get rich quick?")).toBe("how-to-get-rich-quick");
      expect(service.slugify("Royal Celebration Champagne & Artisan Chocolate")).toBe(
        "royal-celebration-champagne-artisan-chocolate"
      );
    });

    it("normalizes unicode accents and special symbols", () => {
      expect(service.slugify("Moët & Chandon Rosé Impérial")).toBe("moet-chandon-rose-imperial");
    });
  });

  describe("type: 'title' (default)", () => {
    it("uses title as slug first when it does not exist in database", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug({
        title: "1. How to get rich quick?",
        model: "product",
      });

      expect(slug).toBe("how-to-get-rich-quick");
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { slug: "how-to-get-rich-quick" },
        select: { id: true },
      });
    });

    it("appends random string when title slug already exists in database", async () => {
      // First call (base slug) exists in DB
      mockPrisma.product.findUnique
        .mockResolvedValueOnce({ id: "prod-existing-1" })
        // Second call (with random suffix) is free
        .mockResolvedValueOnce(null);

      const slug = await service.generateSlug({
        title: "1. How to get rich quick?",
        model: "product",
      });

      expect(slug).toMatch(/^how-to-get-rich-quick-[a-z0-9]{5}$/);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledTimes(2);
    });

    it("defaults to title type when type option is omitted", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug("Chidi & Amaka Wedding Celebration", "event");

      expect(slug).toBe("chidi-amaka-wedding-celebration");
    });

    it("allows the same slug if excludeId matches the existing entity id", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "prod-current" });

      const slug = await service.generateSlug({
        title: "Classic Leather Journal",
        model: "product",
        excludeId: "prod-current",
      });

      expect(slug).toBe("classic-leather-journal");
    });

    it("supports custom isUnique callback within transactions", async () => {
      const isUniqueMock = jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const slug = await service.generateSlug({
        title: "Exclusive Dinner",
        isUnique: isUniqueMock,
      });

      expect(slug).toMatch(/^exclusive-dinner-[a-z0-9]{5}$/);
      expect(isUniqueMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("type: 'random'", () => {
    it("generates random unique string of 6-10 characters (mixed case)", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug({
        type: "random",
        model: "event",
        randomLength: 8,
      });

      expect(slug).toHaveLength(8);
      expect(slug).toMatch(/^[a-zA-Z0-9]{8}$/);
    });

    it("clamps random length between 6 and 10", async () => {
      const slugShort = await service.generateSlug({
        type: "random",
        randomLength: 3,
      });
      expect(slugShort.length).toBe(6);

      const slugLong = await service.generateSlug({
        type: "random",
        randomLength: 20,
      });
      expect(slugLong.length).toBe(10);
    });

    it("retries if random slug collides in database until a unique one is found", async () => {
      mockPrisma.event.findUnique
        .mockResolvedValueOnce({ id: "ev-1" })
        .mockResolvedValueOnce(null);

      const slug = await service.generateSlug({
        type: "random",
        model: "event",
        randomLength: 9,
      });

      expect(slug).toHaveLength(9);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
