import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
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
      product.title.toLowerCase().includes("combo") ||
      product.title.toLowerCase().includes("box") ||
      product.title.toLowerCase().includes("hamper");

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
      imageUrl: firstImage,
      vendorName: product.vendor?.name ?? "Givvly Curated",
      inStock: product.stock === null || product.stock > 0,
      rating: product.ratingAvg ?? 5.0,
      reviewCount: product.ratingCount ?? 0,
      isCombo,
      comboItems: isCombo
        ? [
            { name: "Luxury Keepsake Item", qty: 1, tag: "Signature" },
            { name: "Handmade Scented Candle", qty: 1 },
            { name: "Gourmet Chocolates", qty: 1 },
          ]
        : undefined,
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
    if (
      normalizedSlug === "airtime" ||
      normalizedSlug === "data" ||
      normalizedSlug === "billspot-vtu-airtime-gift" ||
      normalizedSlug === "billspot-vtu-data-bundle-gift"
    ) {
      const isData = normalizedSlug.includes("data");
      return {
        id: isData ? "prod_vtu_data_01" : "prod_vtu_airtime_01",
        slug: isData ? "data" : "airtime",
        name: isData
          ? "Instant Mobile Data Bundle Gift (1GB – 1.5TB Plans)"
          : "Instant Airtime Top-Up Gift (MTN, Airtel, Glo, T2mobile)",
        description: isData
          ? "Gift daily, weekly, monthly, or broadband data bundles across MTN, Airtel, Glo, and T2mobile with instant activation."
          : "Send instant mobile airtime top-up directly to one or up to 50 Nigerian phone numbers via BillSpot VTU.",
        priceKobo: 500_000,
        category: "Airtime & Data",
        giftType: "DIGITAL",
        occasions: ["BIRTHDAY", "OTHER"],
        relationships: ["FRIEND", "COLLEAGUE", "FAMILY"],
        imageUrl:
          "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop",
        vendorName: "Instant VTU",
        inStock: true,
        rating: 5.0,
        reviewCount: 64,
        isCombo: false,
        isDigital: true,
        digitalKind: isData ? "DATA" : "AIRTIME",
      };
    }

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!product || !product.active) {
      throw new NotFoundException(`Product with slug '${slug}' was not found`);
    }

    return this.formatProduct(product);
  }

  /**
   * List curated collections
   */
  async getCollections(): Promise<CatalogCollectionResponseDto[]> {
    const collections = await this.prisma.collection.findMany();

    if (collections.length === 0) {
      // Default curated collections if none in DB
      return [
        {
          id: "col-anniversary",
          slug: "anniversary-specials",
          title: "Romantic Keepsakes & Hampers",
          description: "Curated gifts to celebrate timeless romance and anniversaries.",
          productSlugs: [],
        },
        {
          id: "col-birthday",
          slug: "birthday-bestsellers",
          title: "Birthday Bestsellers",
          description: "Our most beloved birthday gifts, luxury boxes, and celebration packages.",
          productSlugs: [],
        },
        {
          id: "col-budget-friendly",
          slug: "thoughtful-under-30k",
          title: "Thoughtful Gifts Under ₦30,000",
          description: "Premium and memorable gifts that bring joy within budget.",
          productSlugs: [],
        },
      ];
    }

    // Resolve product slugs for each collection
    const allProductIds = Array.from(new Set(collections.flatMap((c) => c.productIds)));
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: allProductIds },
        active: true,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const idToSlugMap = new Map(products.map((p) => [p.id, p.slug]));

    return collections.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.name,
      description: `Curated ${c.name} collection`,
      productSlugs: c.productIds
        .map((id) => idToSlugMap.get(id))
        .filter((slug): slug is string => Boolean(slug)),
    }));
  }
}

