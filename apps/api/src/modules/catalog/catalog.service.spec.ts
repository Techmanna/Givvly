import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { RequestUser } from "../../common/decorators/auth.decorator";

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

  const mockReview = {
    id: "rev-1",
    productId: "prod-1",
    authorName: "Vanessa O.",
    verified: true,
    rating: 5,
    title: "Exquisitely packaged & on-time",
    comment: "Impeccable presentation and genuine attention to detail.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  };

  const mockCollection = {
    id: "col-1",
    slug: "anniversary-specials",
    name: "Romantic Keepsakes & Hampers",
    kind: "CURATED",
    description: "Curated gifts to celebrate timeless romance and anniversaries.",
    productIds: ["prod-1"],
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.slug === "luxury-perfume-box" || where.id === "prod-1") {
            return Promise.resolve(mockProduct);
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (
            where?.slug === "luxury-perfume-box" ||
            where?.OR?.some((cond: any) => cond.slug === "luxury-perfume-box")
          ) {
            return Promise.resolve(mockProduct);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue(mockProduct),
      },
      collection: {
        findMany: jest.fn().mockResolvedValue([mockCollection]),
      },
      review: {
        findMany: jest.fn().mockResolvedValue([mockReview]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: "rev-new-1",
            createdAt: new Date(),
            ...data,
          })
        ),
      },
      order: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (
            where?.items?.some?.productId === "prod-1" &&
            (where?.OR?.[0]?.buyerUserId === "usr-1" ||
              where?.OR?.[1]?.buyerEmail?.equals === "tunde@givvly.store")
          ) {
            return Promise.resolve({
              id: "order-1",
              number: "GV-2026-TEST01",
            });
          }
          return Promise.resolve(null);
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "usr-1",
          name: "Tunde O.",
          email: "tunde@givvly.store",
        }),
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
    it("should return dynamic collections from database", async () => {
      const collections = await service.getCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].slug).toBe("anniversary-specials");
      expect(collections[0].title).toBe("Romantic Keepsakes & Hampers");
      expect(collections[0].productSlugs).toContain("luxury-perfume-box");
    });

    it("should return empty array if no collections exist in database", async () => {
      prisma.collection.findMany = jest.fn().mockResolvedValue([]);
      const collections = await service.getCollections();
      expect(collections).toEqual([]);
    });
  });

  const mockUser: RequestUser = {
    id: "usr-1",
    email: "tunde@givvly.store",
    role: "USER" as any,
  };

  describe("getProductReviews & createProductReview", () => {
    it("should return reviews for a product from database", async () => {
      const reviews = await service.getProductReviews("luxury-perfume-box");
      expect(reviews).toHaveLength(1);
      expect(reviews[0].authorName).toBe("Vanessa O.");
      expect(reviews[0].rating).toBe(5);
    });

    it("should check review eligibility: returns UNAUTHENTICATED if user is not provided", async () => {
      const result = await service.checkReviewEligibility("luxury-perfume-box", undefined);
      expect(result.canReview).toBe(false);
      expect(result.reason).toBe("UNAUTHENTICATED");
    });

    it("should check review eligibility: returns NOT_PURCHASED if user has not purchased", async () => {
      prisma.order.findFirst = jest.fn().mockResolvedValue(null);
      const result = await service.checkReviewEligibility("luxury-perfume-box", mockUser);
      expect(result.canReview).toBe(false);
      expect(result.reason).toBe("NOT_PURCHASED");
    });

    it("should check review eligibility: returns ALREADY_REVIEWED if user already reviewed", async () => {
      prisma.review.findFirst = jest.fn().mockResolvedValue(mockReview);
      const result = await service.checkReviewEligibility("luxury-perfume-box", mockUser);
      expect(result.canReview).toBe(false);
      expect(result.reason).toBe("ALREADY_REVIEWED");
    });

    it("should check review eligibility: returns canReview=true if verified purchaser", async () => {
      const result = await service.checkReviewEligibility("luxury-perfume-box", mockUser);
      expect(result.canReview).toBe(true);
      expect(result.orderId).toBe("order-1");
    });

    it("should throw ForbiddenException if unpurchased user attempts to submit review", async () => {
      prisma.order.findFirst = jest.fn().mockResolvedValue(null);
      await expect(
        service.createProductReview(
          "luxury-perfume-box",
          {
            rating: 5,
            title: "Nice",
            comment: "Great scent",
          },
          mockUser
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException if user has already reviewed the product", async () => {
      prisma.review.findFirst = jest.fn().mockResolvedValue(mockReview);
      await expect(
        service.createProductReview(
          "luxury-perfume-box",
          {
            rating: 5,
            title: "Nice",
            comment: "Great scent",
          },
          mockUser
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("should add a new review and return it when user has purchased the product", async () => {
      const newReview = await service.createProductReview(
        "luxury-perfume-box",
        {
          authorName: "Tunde O.",
          rating: 5,
          title: "Spectacular Presentation",
          comment: "The packaging and promptness was outstanding.",
        },
        mockUser
      );

      expect(newReview.id).toBeDefined();
      expect(newReview.authorName).toBe("Tunde O.");
      expect(newReview.rating).toBe(5);
      expect(newReview.verified).toBe(true);
      expect(prisma.review.create).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });
});

