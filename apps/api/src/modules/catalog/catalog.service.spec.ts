import { Test, TestingModule } from "@nestjs/testing";
import { CatalogService } from "./catalog.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("CatalogService", () => {
  let service: CatalogService;
  let prisma: any;

  const mockProduct = {
    id: "prod-1",
    slug: "luxury-perfume-box",
    title: "Luxury Perfume Box Combo",
    description: "An elegant fragrance combo set",
    priceKobo: 4500000,
    images: ["https://cdn.givvly.com/perfume.jpg"],
    occasions: ["BIRTHDAY", "ANNIVERSARY"],
    relationships: ["PARTNER", "FRIEND"],
    stock: 10,
    isDigital: false,
    active: true,
    ratingAvg: 4.8,
    ratingCount: 12,
    vendor: {
      name: "Scent Sanctuary",
    },
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.slug === "luxury-perfume-box") {
            return Promise.resolve(mockProduct);
          }
          return Promise.resolve(null);
        }),
      },
      collection: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getProducts", () => {
    it("should return formatted products with filters", async () => {
      const results = await service.getProducts({
        occasion: "BIRTHDAY",
        maxPriceKobo: 5000000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe("luxury-perfume-box");
      expect(results[0].name).toBe("Luxury Perfume Box Combo");
      expect(results[0].priceKobo).toBe(4500000);
      expect(results[0].isCombo).toBe(true);
      expect(results[0].vendorName).toBe("Scent Sanctuary");
      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it("should filter combo products", async () => {
      const results = await service.getProducts({ isCombo: false });
      expect(results).toHaveLength(0); // Since mock product is a combo
    });
  });

  describe("getProductBySlug", () => {
    it("should return product by slug", async () => {
      const product = await service.getProductBySlug("luxury-perfume-box");
      expect(product.id).toBe("prod-1");
      expect(product.slug).toBe("luxury-perfume-box");
    });

    it("should throw NotFoundException if product is missing or inactive", async () => {
      await expect(service.getProductBySlug("unknown-slug")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("getCollections", () => {
    it("should return default collections when none exist in DB", async () => {
      const collections = await service.getCollections();
      expect(collections.length).toBeGreaterThanOrEqual(3);
      expect(collections[0].slug).toBe("anniversary-specials");
    });
  });
});

