import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { RequestUser } from "../../common/decorators/auth.decorator";
import { PrismaService } from "../../infra/prisma/prisma.service";

export type ReviewEligibilityReason =
  | "UNAUTHENTICATED"
  | "NOT_PURCHASED"
  | "ALREADY_REVIEWED";

export interface ReviewEligibilityResponse {
  canReview: boolean;
  reason?: ReviewEligibilityReason;
  message?: string;
  orderId?: string;
  orderNumber?: string;
}
import {
  CatalogQueryDto,
  CatalogProductResponseDto,
  CatalogCollectionResponseDto,
} from "./dto/catalog-query.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format database Product entity to CatalogProductResponseDto
   */
  private formatProduct(product: any): CatalogProductResponseDto {
    const imagesArray = Array.isArray(product.images)
      ? product.images
      : typeof product.images === "string"
      ? [product.images]
      : [];

    const firstImage =
      imagesArray.length > 0
        ? typeof imagesArray[0] === "string"
          ? imagesArray[0]
          : imagesArray[0]?.url
        : undefined;

    const isCombo =
      Boolean(
        product.comboItems &&
          Array.isArray(product.comboItems) &&
          product.comboItems.length > 0
      ) ||
      product.title.toLowerCase().includes("combo") ||
      product.title.toLowerCase().includes("box") ||
      product.title.toLowerCase().includes("hamper");

    const comboItems =
      Array.isArray(product.comboItems) && product.comboItems.length > 0
        ? product.comboItems
        : undefined;

    const titleLower = product.title.toLowerCase();
    const descLower = (product.description || "").toLowerCase();
    const mainCategories: string[] = [];

    if (isCombo) mainCategories.push("COMBOS");
    if (product.occasions?.includes("WEDDING") || titleLower.includes("wedding")) mainCategories.push("WEDDING");
    if (product.occasions?.includes("BIRTHDAY") || titleLower.includes("birthday")) mainCategories.push("BIRTHDAY");
    if (product.occasions?.includes("CORPORATE") || titleLower.includes("corporate")) mainCategories.push("CORPORATE");
    if (
      product.relationships?.some((r: string) => ["HUSBAND", "BOYFRIEND", "BROTHER", "FATHER"].includes(r)) ||
      titleLower.includes("him") ||
      titleLower.includes("men")
    ) {
      mainCategories.push("FOR_HIM");
    }
    if (
      product.relationships?.some((r: string) => ["WIFE", "GIRLFRIEND", "SISTER", "MOTHER"].includes(r)) ||
      titleLower.includes("her") ||
      titleLower.includes("women")
    ) {
      mainCategories.push("FOR_HER");
    }
    if (titleLower.includes("flower") || titleLower.includes("bouquet") || descLower.includes("rose")) {
      mainCategories.push("FLOWERS");
    }
    if (titleLower.includes("choc") || descLower.includes("chocolate") || descLower.includes("truffle")) {
      mainCategories.push("CHOCOLATES");
    }
    if (titleLower.includes("wine") || titleLower.includes("champagne") || titleLower.includes("food") || titleLower.includes("gourmet")) {
      mainCategories.push("FOOD_DRINKS");
    }
    if (titleLower.includes("luxury") || descLower.includes("luxury") || descLower.includes("gold")) {
      mainCategories.push("LUXURY");
    }
    if (titleLower.includes("custom") || descLower.includes("engraved")) {
      mainCategories.push("CUSTOMIZED");
    }
    if (mainCategories.length === 0) {
      mainCategories.push("WEDDING");
    }

    const gender = product.relationships?.some((r: string) => ["HUSBAND", "BOYFRIEND", "BROTHER", "FATHER"].includes(r))
      ? "MALE"
      : product.relationships?.some((r: string) => ["WIFE", "GIRLFRIEND", "SISTER", "MOTHER"].includes(r))
        ? "FEMALE"
        : "UNISEX";

    return {
      id: product.id,
      slug: product.slug,
      name: product.title,
      description: product.description,
      priceKobo: product.priceKobo,
      category: product.occasions?.[0] ?? "Gift",
      giftType: product.isDigital ? "DIGITAL" : "PHYSICAL",
      occasions: product.occasions ?? [],
      relationships: product.relationships ?? [],
      mainCategories,
      gender,
      imageUrl: firstImage,
      vendorName: product.vendor?.name ?? "Givvly Curated",
      inStock: product.stock === null || product.stock > 0,
      rating: product.ratingAvg ?? 5.0,
      reviewCount: product.ratingCount ?? 0,
      isCombo,
      comboItems,
      isDigital: Boolean(product.isDigital),
      digitalKind: product.digitalKind ?? undefined,
    };
  }

  /**
   * List products with filtering, search, and pagination
   */
  async getProducts(query: CatalogQueryDto = {}): Promise<CatalogProductResponseDto[]> {
    const where: any = {
      active: true,
      slug: {
        notIn: [
          "airtime",
          "data",
          "billspot-vtu-airtime-gift",
          "billspot-vtu-data-bundle-gift",
        ],
      },
      AND: [
        {
          NOT: {
            slug: {
              startsWith: "billspot-vtu-",
            },
          },
        },
        {
          OR: [
            { digitalKind: null },
            { digitalKind: { notIn: ["AIRTIME", "DATA"] } },
          ],
        },
      ],
    };

    // Filter by mainCategory
    if (query.mainCategory && query.mainCategory !== "ALL") {
      const cat = query.mainCategory.toUpperCase();
      if (cat === "COMBOS") {
        where.OR = [
          { title: { contains: "combo", mode: "insensitive" } },
          { title: { contains: "box", mode: "insensitive" } },
          { title: { contains: "hamper", mode: "insensitive" } },
        ];
      } else if (cat === "WEDDING") {
        where.occasions = { has: "WEDDING" };
      } else if (cat === "BIRTHDAY") {
        where.occasions = { has: "BIRTHDAY" };
      } else if (cat === "CORPORATE") {
        where.occasions = { has: "CORPORATE" };
      } else if (cat === "FOR_HIM") {
        where.relationships = { hasSome: ["HUSBAND", "BOYFRIEND", "BROTHER", "FATHER"] };
      } else if (cat === "FOR_HER") {
        where.relationships = { hasSome: ["WIFE", "GIRLFRIEND", "SISTER", "MOTHER"] };
      } else if (cat === "FLOWERS") {
        where.OR = [
          { title: { contains: "flower", mode: "insensitive" } },
          { title: { contains: "bouquet", mode: "insensitive" } },
          { description: { contains: "rose", mode: "insensitive" } },
        ];
      } else if (cat === "CHOCOLATES") {
        where.OR = [
          { title: { contains: "chocolate", mode: "insensitive" } },
          { title: { contains: "truffle", mode: "insensitive" } },
          { description: { contains: "confection", mode: "insensitive" } },
        ];
      } else if (cat === "FOOD_DRINKS") {
        where.OR = [
          { title: { contains: "wine", mode: "insensitive" } },
          { title: { contains: "champagne", mode: "insensitive" } },
          { title: { contains: "gourmet", mode: "insensitive" } },
        ];
      } else if (cat === "LUXURY") {
        where.OR = [
          { title: { contains: "luxury", mode: "insensitive" } },
          { title: { contains: "gold", mode: "insensitive" } },
          { title: { contains: "royal", mode: "insensitive" } },
        ];
      }
    }

    // Filter by max price
    if (query.maxPriceKobo) {
      const maxPrice = Number(query.maxPriceKobo);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        where.priceKobo = { lte: maxPrice };
      }
    }

    // Filter by occasion
    if (query.occasion && query.occasion !== "ALL") {
      where.occasions = {
        has: query.occasion,
      };
    }

    // Filter by relationship
    if (query.relationship && query.relationship !== "ALL") {
      where.relationships = {
        has: query.relationship,
      };
    }

    // Filter by giftType
    if (query.giftType && query.giftType !== "ALL") {
      if (query.giftType === "DIGITAL") {
        where.isDigital = true;
      } else if (query.giftType === "PHYSICAL") {
        where.isDigital = false;
      }
    }

    // Search query
    if (query.q && query.q.trim()) {
      const searchTerm = query.q.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    if (query.sortBy === "price_asc") {
      orderBy = { priceKobo: "asc" };
    } else if (query.sortBy === "price_desc") {
      orderBy = { priceKobo: "desc" };
    } else if (query.sortBy === "popularity") {
      orderBy = { ratingAvg: "desc" };
    }

    const take = query.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query.offset ? Number(query.offset) : 0;

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    let formatted = products.map((p) => this.formatProduct(p));

    // In-memory filter for combo if specified
    if (query.isCombo !== undefined) {
      const wantCombo = query.isCombo === true || query.isCombo === "true";
      formatted = formatted.filter((p) => Boolean(p.isCombo) === wantCombo);
    }

    return formatted;
  }

  /**
   * Get single product detail by slug
   */
  async getProductBySlug(slug: string): Promise<CatalogProductResponseDto> {
    const normalizedSlug = slug.trim().toLowerCase();

    // Map shorthand VTU slugs to database slugs if requested
    const targetSlug =
      normalizedSlug === "airtime"
        ? "billspot-vtu-airtime-gift"
        : normalizedSlug === "data"
        ? "billspot-vtu-data-bundle-gift"
        : normalizedSlug;

    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { slug: normalizedSlug },
          { slug: targetSlug },
        ],
        active: true,
      },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' was not found`);
    }

    return this.formatProduct(product);
  }

  /**
   * List curated collections dynamically from database
   */
  async getCollections(): Promise<CatalogCollectionResponseDto[]> {
    const collections = await this.prisma.collection.findMany();

    if (collections.length === 0) {
      return [];
    }

    // Resolve product slugs for each collection
    const allProductIds = Array.from(new Set(collections.flatMap((c) => c.productIds)));
    const products =
      allProductIds.length > 0
        ? await this.prisma.product.findMany({
            where: {
              id: { in: allProductIds },
              active: true,
            },
            select: {
              id: true,
              slug: true,
            },
          })
        : [];

    const idToSlugMap = new Map(products.map((p) => [p.id, p.slug]));

    return collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.name,
      description: c.description || `Curated ${c.name} collection`,
      productSlugs: c.productIds
        .map((id) => idToSlugMap.get(id))
        .filter((slug): slug is string => Boolean(slug)),
    }));
  }

  /**
   * Get verified reviews for a product directly from database
   */
  async getProductReviews(slug: string): Promise<any[]> {
    const normalized = slug.trim().toLowerCase();

    const product = await this.prisma.product.findUnique({
      where: { slug: normalized },
      select: { id: true, slug: true },
    });

    if (!product) {
      return [];
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
    });

    return reviews.map((r) => {
      const msAgo = Date.now() - r.createdAt.getTime();
      const daysAgo = Math.floor(msAgo / (1000 * 60 * 60 * 24));
      const dateText =
        daysAgo === 0
          ? "Today"
          : daysAgo === 1
          ? "Yesterday"
          : daysAgo < 7
          ? `${daysAgo} days ago`
          : daysAgo < 30
          ? `${Math.floor(daysAgo / 7)} week${Math.floor(daysAgo / 7) > 1 ? "s" : ""} ago`
          : `${Math.floor(daysAgo / 30)} month${Math.floor(daysAgo / 30) > 1 ? "s" : ""} ago`;

      return {
        id: r.id,
        productId: r.productId ?? undefined,
        productSlug: normalized,
        authorName: r.authorName || "Verified Buyer",
        verified: r.verified,
        rating: r.rating,
        title: r.title || "Wonderful Gift Selection",
        comment: r.comment || "",
        date: dateText,
        timestamp: r.createdAt.getTime(),
      };
    });
  }

  /**
   * Check if an authenticated user is eligible to review a product.
   * Rule: Must be logged in and must have purchased the product before.
   */
  async checkReviewEligibility(
    slug: string,
    user?: RequestUser
  ): Promise<ReviewEligibilityResponse> {
    if (!user?.id) {
      return {
        canReview: false,
        reason: "UNAUTHENTICATED",
        message: "Please log in to submit a review.",
      };
    }

    const normalized = slug.trim().toLowerCase();

    let product = await this.prisma.product.findUnique({
      where: { slug: normalized },
      select: { id: true, slug: true, title: true },
    });

    if (!product && (normalized === "airtime" || normalized === "data")) {
      const aliasSlug =
        normalized === "airtime"
          ? "billspot-vtu-airtime-gift"
          : "billspot-vtu-data-bundle-gift";
      product = await this.prisma.product.findUnique({
        where: { slug: aliasSlug },
        select: { id: true, slug: true, title: true },
      });
    }

    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' was not found`);
    }

    // 1. Check if user already reviewed this product
    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: product.id,
        userId: user.id,
      },
      select: { id: true, rating: true, createdAt: true },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: "ALREADY_REVIEWED",
        message: "You have already reviewed this gift.",
      };
    }

    // 2. Check if user has purchased this product before
    const purchasedOrder = await this.prisma.order.findFirst({
      where: {
        OR: [
          { buyerUserId: user.id },
          { buyerEmail: { equals: user.email, mode: "insensitive" } },
        ],
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
        items: {
          some: {
            productId: product.id,
          },
        },
      },
      select: {
        id: true,
        number: true,
      },
    });

    if (!purchasedOrder) {
      return {
        canReview: false,
        reason: "NOT_PURCHASED",
        message: "Only verified customers who have purchased this gift can leave a review.",
      };
    }

    return {
      canReview: true,
      orderId: purchasedOrder.id,
      orderNumber: purchasedOrder.number,
    };
  }

  /**
   * Create and persist a product review directly to database.
   * Rule: User must be logged in and must have purchased the product before.
   */
  async createProductReview(
    slug: string,
    dto: any,
    user: RequestUser
  ): Promise<any> {
    if (!user?.id) {
      throw new UnauthorizedException("You must be logged in to submit a review.");
    }

    const normalized = slug.trim().toLowerCase();

    let product = await this.prisma.product.findUnique({
      where: { slug: normalized },
    });

    if (!product && (normalized === "airtime" || normalized === "data")) {
      const aliasSlug =
        normalized === "airtime"
          ? "billspot-vtu-airtime-gift"
          : "billspot-vtu-data-bundle-gift";
      product = await this.prisma.product.findUnique({
        where: { slug: aliasSlug },
      });
    }

    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' was not found`);
    }

    // 1. Check if user already reviewed this product
    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId: product.id,
        userId: user.id,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        "You have already submitted a review for this product."
      );
    }

    // 2. Verify that user purchased the product
    const purchasedOrder = await this.prisma.order.findFirst({
      where: {
        OR: [
          { buyerUserId: user.id },
          { buyerEmail: { equals: user.email, mode: "insensitive" } },
        ],
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
        items: {
          some: {
            productId: product.id,
          },
        },
      },
      select: {
        id: true,
        number: true,
      },
    });

    if (!purchasedOrder) {
      throw new ForbiddenException(
        "Only verified customers who have purchased this gift can leave a review."
      );
    }

    const rating = Math.max(1, Math.min(5, Number(dto.rating) || 5));
    const title = (dto.title || "Wonderful Gift Selection").trim();
    const comment = (dto.comment || "").trim();

    // Determine author name
    let authorName = (dto.authorName || "").trim();
    if (!authorName) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });
      authorName = dbUser?.name || user.email.split("@")[0] || "Verified Customer";
    }

    // Link orderId if not already taken by another review (unique constraint on orderId)
    let orderIdToLink: string | null = purchasedOrder.id;
    const existingOrderReview = await this.prisma.review.findUnique({
      where: { orderId: purchasedOrder.id },
    });
    if (existingOrderReview) {
      orderIdToLink = null;
    }

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        orderId: orderIdToLink,
        authorName,
        verified: true,
        rating,
        title,
        comment,
      },
    });

    // Recalculate ratingAvg and ratingCount dynamically from real database reviews
    const allReviews = await this.prisma.review.findMany({
      where: { productId: product.id },
      select: { rating: true },
    });

    const ratingCount = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const ratingAvg = ratingCount > 0 ? Number((sum / ratingCount).toFixed(1)) : rating;

    await this.prisma.product.update({
      where: { id: product.id },
      data: { ratingAvg, ratingCount },
    });

    return {
      id: review.id,
      productId: review.productId ?? undefined,
      productSlug: product.slug,
      authorName: review.authorName || authorName,
      verified: review.verified,
      rating: review.rating,
      title: review.title || title,
      comment: review.comment || comment,
      date: "Just now",
      timestamp: review.createdAt.getTime(),
    };
  }
}

