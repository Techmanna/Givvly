import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { SlugService } from "../../common/slug/slug.service";
import {
  calculateVendorSellingPrice,
  VendorPricingMode,
  VendorPricingTier,
} from "./vendor-pricing.util";
import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  DisputeStatus,
  UserStatus,
  PostStatus,
  EventStatus,
  Direction,
  Channel,
} from "@prisma/client";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCollectionDto,
  CreateAdminVendorDto,
  UpdateAdminVendorDto,
  ForwardOrderToVendorDto,
} from "./dto/admin-product.dto";
import { UpdateOrderStatusDto } from "./dto/admin-orders.dto";
import { ResolveDisputeDto, IssueRefundDto } from "./dto/admin-disputes.dto";
import { canOrderTransition } from "../orders/order-state-machine";
import { ProvideBespokeQuoteInput } from "../orders/dto/bespoke-wish.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { EmailService } from "../notifications/email.service";

import { ensureShippingZonesSeeded } from "../catalog/shipping-zones.seed";
import type {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from "./dto/admin-shipping.dto";
import type { UpdateAdminEventStatusDto } from "./dto/admin-events.dto";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly slugService: SlugService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Optional() slugService?: SlugService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly emailService?: EmailService
  ) {
    this.slugService = slugService ?? new SlugService(this.prisma);
  }

  /**
   * Helper to write structured AuditLog
   */
  private async logAudit(
    actorId: string | undefined,
    action: string,
    targetType: string,
    targetId: string,
    diff?: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          targetType,
          targetId,
          diff: diff ? JSON.parse(JSON.stringify(diff)) : undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${err}`);
    }
  }

  // ==================== PRODUCTS ====================

  async getProducts(query: {
    active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      active: query.active !== undefined ? query.active : true,
    };
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const take = query.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query.offset ? Number(query.offset) : 0;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { vendor: { select: { name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    const mappedProducts = products.map((p) => {
      const imagesArr = Array.isArray(p.images) ? (p.images as string[]) : [];
      const primaryImage =
        imagesArr[0] ||
        (typeof p.images === "string" ? p.images : "/images/gifts/box-luxury.jpg");
      const inStock = p.stock === null || p.stock > 0;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        name: p.title,
        description: p.description,
        priceKobo: p.priceKobo,
        costPriceKobo: p.costPriceKobo ?? null,
        priceOverridden: Boolean((p as any).priceOverridden),
        category: p.occasions[0] || "Wedding Gifts",
        occasions: p.occasions,
        relationships: p.relationships,
        vendorId: p.vendorId ?? null,
        vendorName: p.vendor?.name || "Givvly Curated",
        stock: p.stock,
        inStock,
        rating: p.ratingAvg ?? 5.0,
        reviewCount: p.ratingCount ?? 0,
        isCombo: Boolean(
          (Array.isArray(p.comboItems) && p.comboItems.length > 0) ||
          p.title.toLowerCase().includes("combo") ||
          p.title.toLowerCase().includes("box") ||
          p.title.toLowerCase().includes("hamper")
        ),
        comboItems: Array.isArray(p.comboItems) ? (p.comboItems as any[]) : [],
        variants: Array.isArray(p.variants) ? (p.variants as any[]) : [],
        minPriceKobo: (() => {
          const vs = Array.isArray(p.variants) ? (p.variants as any[]) : [];
          const prices = vs.map((v) => Number(v.priceKobo)).filter((pr) => !isNaN(pr));
          return prices.length > 0 ? Math.min(...prices) : p.priceKobo;
        })(),
        maxPriceKobo: (() => {
          const vs = Array.isArray(p.variants) ? (p.variants as any[]) : [];
          const prices = vs.map((v) => Number(v.priceKobo)).filter((pr) => !isNaN(pr));
          return prices.length > 0 ? Math.max(...prices) : p.priceKobo;
        })(),
        packagingIncluded: "Luxury Gift Box & Ribbon",
        images: p.images,
        imageUrl: primaryImage,
        active: p.active,
        isDigital: p.isDigital,
        digitalKind: p.digitalKind,
        boxRole: ((p as any).boxRole as "GIFT_BOX" | "ITEM" | "EXCLUDED") || (p.isDigital ? "EXCLUDED" : "ITEM"),
        boxMaxItems: (p as any).boxMaxItems ?? null,
        boxSizeTier: ((p as any).boxSizeTier as "SMALL" | "MEDIUM" | "LARGE") ?? null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return { products: mappedProducts, total, limit: take, offset: skip };
  }

  async createProduct(dto: CreateProductDto, adminId?: string) {
    const title = dto.title || dto.name || "Curated Celebration Gift";
    const images =
      dto.images && dto.images.length > 0
        ? dto.images
        : dto.imageUrl
          ? [dto.imageUrl]
          : ["/images/gifts/box-luxury.jpg"];
    const stock =
      dto.stock !== undefined
        ? dto.stock
        : dto.inStock === false
          ? 0
          : 50;

    const finalSlug = await this.slugService.generateSlug({
      title: dto.slug?.trim() || title,
      model: "product",
    });

    const product = await this.prisma.product.create({
      data: {
        slug: finalSlug,
        title,
        description: dto.description,
        priceKobo: dto.priceKobo,
        costPriceKobo: dto.costPriceKobo ?? null,
        priceOverridden: dto.priceOverridden ?? false,
        occasions: dto.occasions,
        relationships: dto.relationships,
        images: images as any,
        stock,
        isDigital: dto.isDigital || false,
        digitalKind: dto.digitalKind,
        comboItems: dto.comboItems || undefined,
        variants: dto.variants || undefined,
        boxRole: dto.boxRole || (dto.isDigital ? "EXCLUDED" : "ITEM"),
        boxMaxItems: dto.boxMaxItems ?? null,
        boxSizeTier: dto.boxSizeTier ?? null,
        vendorId: dto.vendorId || null,
        active: true,
      },
    });

    await this.logAudit(adminId, "PRODUCT_CREATE", "Product", product.id, {
      title: product.title,
      priceKobo: product.priceKobo,
    });

    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto, adminId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    let slugToUpdate: string | undefined = undefined;
    if (dto.slug && dto.slug.trim() && dto.slug.trim() !== product.slug) {
      slugToUpdate = await this.slugService.generateSlug({
        title: dto.slug.trim(),
        model: "product",
        excludeId: id,
      });
    }

    const title = dto.name ?? dto.title;
    const images =
      dto.images !== undefined
        ? dto.images
        : dto.imageUrl !== undefined
          ? [dto.imageUrl]
          : undefined;
    const stock =
      dto.stock !== undefined
        ? dto.stock
        : dto.inStock !== undefined
          ? dto.inStock
            ? 50
            : 0
          : undefined;

    const comboItems =
      dto.isCombo === false && dto.comboItems === undefined
        ? []
        : dto.comboItems !== undefined
          ? dto.comboItems
          : undefined;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(slugToUpdate !== undefined && { slug: slugToUpdate }),
        ...(title !== undefined && { title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priceKobo !== undefined && { priceKobo: dto.priceKobo }),
        ...(dto.costPriceKobo !== undefined && { costPriceKobo: dto.costPriceKobo }),
        ...(dto.priceOverridden !== undefined && { priceOverridden: dto.priceOverridden }),
        ...(dto.occasions !== undefined && { occasions: dto.occasions }),
        ...(dto.relationships !== undefined && { relationships: dto.relationships }),
        ...(images !== undefined && { images: images as any }),
        ...(stock !== undefined && { stock }),
        ...(dto.isDigital !== undefined && { isDigital: dto.isDigital }),
        ...(dto.digitalKind !== undefined && { digitalKind: dto.digitalKind }),
        ...(comboItems !== undefined && { comboItems: comboItems }),
        ...(dto.variants !== undefined && { variants: dto.variants }),
        ...(dto.boxRole !== undefined && { boxRole: dto.boxRole }),
        ...(dto.boxMaxItems !== undefined && { boxMaxItems: dto.boxMaxItems }),
        ...(dto.boxSizeTier !== undefined && { boxSizeTier: dto.boxSizeTier }),
        ...(dto.vendorId !== undefined && { vendorId: dto.vendorId || null }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { vendor: { select: { name: true } } },
    });

    await this.logAudit(adminId, "PRODUCT_UPDATE", "Product", id, {
      before: product,
      after: updated,
    });

    const imagesArr = Array.isArray(updated.images) ? (updated.images as string[]) : [];
    const primaryImage =
      imagesArr[0] ||
      (typeof updated.images === "string" ? updated.images : "/images/gifts/box-luxury.jpg");
    const inStock = updated.stock === null || updated.stock > 0;

    const effectiveTitle = updated.title || product.title || "Curated Gift";
    const titleLower = effectiveTitle.toLowerCase();
    const effectiveOccasions = updated.occasions || product.occasions || [];
    const effectiveComboItems = updated.comboItems ?? product.comboItems ?? [];

    return {
      ...updated,
      title: effectiveTitle,
      name: effectiveTitle,
      category: effectiveOccasions[0] || dto.category || "Wedding Gifts",
      occasions: effectiveOccasions,
      vendorId: updated.vendorId ?? null,
      vendorName: (updated as any).vendor?.name || "Givvly Curated",
      inStock,
      rating: updated.ratingAvg ?? 5.0,
      reviewCount: updated.ratingCount ?? 0,
      isCombo: Boolean(
        (Array.isArray(effectiveComboItems) && effectiveComboItems.length > 0) ||
        titleLower.includes("combo") ||
        titleLower.includes("box") ||
        titleLower.includes("hamper")
      ),
      comboItems: Array.isArray(effectiveComboItems) ? (effectiveComboItems as any[]) : [],
      variants: Array.isArray((updated as any).variants) ? ((updated as any).variants as any[]) : [],
      minPriceKobo: (() => {
        const vs = Array.isArray((updated as any).variants) ? ((updated as any).variants as any[]) : [];
        const prices = vs.map((v) => Number(v.priceKobo)).filter((pr) => !isNaN(pr));
        return prices.length > 0 ? Math.min(...prices) : updated.priceKobo;
      })(),
      maxPriceKobo: (() => {
        const vs = Array.isArray((updated as any).variants) ? ((updated as any).variants as any[]) : [];
        const prices = vs.map((v) => Number(v.priceKobo)).filter((pr) => !isNaN(pr));
        return prices.length > 0 ? Math.max(...prices) : updated.priceKobo;
      })(),
      packagingIncluded: "Luxury Gift Box & Ribbon",
      imageUrl: primaryImage,
      boxRole: ((updated as any).boxRole as "GIFT_BOX" | "ITEM" | "EXCLUDED") || (updated.isDigital ? "EXCLUDED" : "ITEM"),
      boxMaxItems: (updated as any).boxMaxItems ?? null,
      boxSizeTier: ((updated as any).boxSizeTier as "SMALL" | "MEDIUM" | "LARGE") ?? null,
    };
  }

  async deleteProduct(id: string, adminId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    // Soft delete
    const updated = await this.prisma.product.update({
      where: { id },
      data: { active: false },
    });

    await this.logAudit(adminId, "PRODUCT_DEACTIVATE", "Product", id);
    return updated;
  }

  async bulkDeleteProducts(
    ids: string[],
    permanent = false,
    adminId?: string
  ) {
    if (!ids || ids.length === 0) {
      return { count: 0, deletedIds: [], permanent };
    }

    if (permanent) {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.registryItem.updateMany({
          where: { productId: { in: ids } },
          data: { productId: null },
        });
        await tx.review.updateMany({
          where: { productId: { in: ids } },
          data: { productId: null },
        });
        await tx.product.deleteMany({
          where: { id: { in: ids } },
        });
      });

      await this.logAudit(
        adminId,
        "PRODUCT_BULK_DELETE_PERMANENT",
        "Product",
        ids.join(","),
        { count: ids.length, ids }
      );
      return { count: ids.length, deletedIds: ids, permanent: true };
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { active: false },
    });

    await this.logAudit(
      adminId,
      "PRODUCT_BULK_DEACTIVATE",
      "Product",
      ids.join(","),
      { count: result.count, ids }
    );

    return { count: result.count, deletedIds: ids, permanent: false };
  }

  async bulkUpdateProductStock(
    ids: string[],
    inStock: boolean,
    adminId?: string
  ) {
    if (!ids || ids.length === 0) {
      return { count: 0, updatedIds: [], inStock };
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { stock: inStock ? 50 : 0 },
    });

    await this.logAudit(
      adminId,
      inStock ? "PRODUCT_BULK_RESTOCK" : "PRODUCT_BULK_UNSTOCK",
      "Product",
      ids.join(","),
      { count: result.count, inStock, ids }
    );

    return { count: result.count, updatedIds: ids, inStock };
  }

  async bulkUpdateProductStatus(
    ids: string[],
    active: boolean,
    adminId?: string
  ) {
    if (!ids || ids.length === 0) {
      return { count: 0, updatedIds: [], active };
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { active },
    });

    await this.logAudit(
      adminId,
      active ? "PRODUCT_BULK_ACTIVATE" : "PRODUCT_BULK_DEACTIVATE",
      "Product",
      ids.join(","),
      { count: result.count, active, ids }
    );

    return { count: result.count, updatedIds: ids, active };
  }

  // ==================== COLLECTIONS ====================

  async getCollections() {
    return this.prisma.collection.findMany();
  }

  async createCollection(dto: CreateCollectionDto, adminId?: string) {
    const finalSlug = await this.slugService.generateSlug({
      title: dto.slug?.trim() || dto.name,
      model: "collection",
    });

    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        kind: dto.kind || "OCCASION",
        productIds: dto.productIds,
      },
    });

    await this.logAudit(adminId, "COLLECTION_CREATE", "Collection", collection.id);
    return collection;
  }

  async updateCollection(id: string, dto: Partial<CreateCollectionDto>, adminId?: string) {
    const col = await this.prisma.collection.findUnique({ where: { id } });
    if (!col) {
      throw new NotFoundException(`Collection '${id}' not found`);
    }

    let slugToUpdate: string | undefined = undefined;
    if (dto.slug && dto.slug.trim() && dto.slug.trim() !== col.slug) {
      slugToUpdate = await this.slugService.generateSlug({
        title: dto.slug.trim(),
        model: "collection",
        excludeId: id,
      });
    }

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slugToUpdate !== undefined && { slug: slugToUpdate }),
        ...(dto.kind !== undefined && { kind: dto.kind }),
        ...(dto.productIds !== undefined && { productIds: dto.productIds }),
      },
    });

    await this.logAudit(adminId, "COLLECTION_UPDATE", "Collection", id);
    return updated;
  }

  // ==================== ORDERS ====================

  async getOrders(query: {
    status?: OrderStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { number: { contains: term, mode: "insensitive" } },
        { buyerEmail: { contains: term, mode: "insensitive" } },
        { recipientName: { contains: term, mode: "insensitive" } },
      ];
    }

    const take = query.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query.offset ? Number(query.offset) : 0;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          items: true,
          history: { orderBy: { createdAt: "asc" } },
          payment: { select: { status: true, reference: true, currency: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const mappedOrders = orders.map((o) => ({
      id: o.id,
      number: o.number,
      totalKobo: o.totalKobo,
      currency: o.payment?.currency || "NGN",
      status: o.status,
      recipientName: o.recipientName || o.buyerEmail || "Celebration Recipient",
      recipientPhone: o.recipientPhone || undefined,
      deliveryAddress:
        typeof o.address === "string" ? o.address : JSON.stringify(o.address || ""),
      trackingNumber: o.trackingToken || undefined,
      courierName: "Givvly Express Logistics",
      items: o.items.map((it) => ({
        id: it.id,
        name: it.title,
        qty: it.qty,
        unitPriceKobo: it.unitPriceKobo,
      })),
      timeline: (o.history || []).map((h) => ({
        status: h.status,
        at: h.createdAt.toISOString(),
        note: h.note,
      })),
      createdAt: o.createdAt.toISOString(),
    }));

    return { orders: mappedOrders, total, limit: take, offset: skip };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        vendor: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            phone: true,
            location: true,
            city: true,
            logoUrl: true,
          },
        },
        history: { orderBy: { createdAt: "asc" } },
        review: true,
        disputes: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    const productIds = Array.from(new Set(order.items.map((i) => i.productId)));
    const products =
      productIds.length > 0 && typeof this.prisma.product?.findMany === "function"
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              boxSizeTier: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  contactEmail: true,
                  phone: true,
                  location: true,
                  city: true,
                  logoUrl: true,
                },
              },
            },
          })
        : [];
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const firstProductVendor = products.find((p: any) => p.vendor)?.vendor ?? null;
    const resolvedVendor = order.vendor ?? firstProductVendor;

    return {
      ...order,
      items: order.items.map((item) => {
        const prod = productMap.get(item.productId) as any;
        return {
          ...item,
          size: prod?.boxSizeTier ?? undefined,
          vendorId: prod?.vendor?.id ?? undefined,
          vendorName: prod?.vendor?.name ?? undefined,
        };
      }),
      vendor: resolvedVendor
        ? {
            id: resolvedVendor.id,
            name: resolvedVendor.name,
            email: resolvedVendor.contactEmail,
            phone: resolvedVendor.phone ?? undefined,
            location: resolvedVendor.location ?? resolvedVendor.city ?? undefined,
            logoUrl: resolvedVendor.logoUrl ?? undefined,
          }
        : null,
    };
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, adminId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    const allowed = canOrderTransition(order.status, dto.status, "ADMIN");
    if (!allowed) {
      throw new ConflictException(
        `Invalid status transition from '${order.status}' to '${dto.status}'`
      );
    }

    const updateData: any = {
      status: dto.status,
      history: {
        create: [
          {
            status: dto.status,
            note: dto.note || `Status updated to ${dto.status} by admin`,
            actorId: adminId,
          },
        ],
      },
    };

    if (dto.status === OrderStatus.DELIVERED && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true, history: true },
    });

    await this.logAudit(adminId, "ORDER_STATUS_UPDATE", "Order", id, {
      previousStatus: order.status,
      newStatus: dto.status,
      note: dto.note,
    });

    return updated;
  }

  // ==================== BESPOKE WISH QUOTES ====================

  async getBespokeWishQuotes(query: {
    status?: OrderStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      OR: [
        { customWishData: { not: null } },
        { status: { in: [OrderStatus.AWAITING_QUOTE, OrderStatus.QUOTED] } },
      ],
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { number: { contains: term, mode: "insensitive" } },
            { buyerEmail: { contains: term, mode: "insensitive" } },
            { recipientName: { contains: term, mode: "insensitive" } },
          ],
        },
      ];
    }

    const take = query.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query.offset ? Number(query.offset) : 0;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          items: true,
          payment: true,
          history: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const mapped = orders.map((o) => {
      let wishData: any = {};
      if (typeof o.customWishData === "string") {
        try {
          wishData = JSON.parse(o.customWishData);
        } catch {
          wishData = {};
        }
      } else if (o.customWishData && typeof o.customWishData === "object") {
        wishData = o.customWishData;
      }

      let address: any = { street: "", area: "", city: "", state: "" };
      if (typeof o.address === "string") {
        try {
          address = JSON.parse(o.address);
        } catch {
          address = { street: o.address, area: "", city: "", state: "" };
        }
      } else if (o.address && typeof o.address === "object") {
        address = o.address;
      }

      const wishItems =
        Array.isArray(wishData.items) && wishData.items.length > 0
          ? wishData.items
          : (o.items || []).map((it) => ({
              title: it.title,
              description: it.title,
              category: "Gift Item",
              quantity: it.qty,
            }));

      return {
        id: o.id,
        orderNumber: o.number,
        trackingToken: o.trackingToken,
        status: o.status,
        buyerName: wishData.buyerName || o.recipientName || "Valued Customer",
        buyerEmail: o.buyerEmail || "",
        buyerPhone: wishData.buyerPhone || o.recipientPhone || "",
        recipientName: o.recipientName || "Recipient",
        recipientPhone: o.recipientPhone || "",
        recipientEmail: o.recipientEmail || "",
        deliveryAddress: {
          street: address.street || "",
          area: address.area || "",
          city: address.city || "",
          state: address.state || "",
        },
        wrapStyle: o.wrapStyle || "SIGNATURE_VELVET_BOX",
        giftNote: o.giftNote,
        subtotalKobo: o.subtotalKobo,
        packagingFeeKobo: o.packagingFeeKobo,
        deliveryFeeKobo: o.deliveryFeeKobo,
        totalKobo: o.totalKobo,
        customWishData: {
          isBespokeWish: Boolean(wishData.isBespokeWish ?? true),
          occasion: wishData.occasion || "Celebration",
          targetBudgetHint: wishData.targetBudgetHint,
          items: wishItems,
          adminNote: wishData.adminNote,
          quotedAt: wishData.quotedAt,
          estimatedDeliveryDays: wishData.estimatedDeliveryDays,
        },
        items: wishItems,
        createdAt: o.createdAt.toISOString(),
      };
    });

    return { orders: mapped, total, limit: take, offset: skip };
  }

  async provideBespokeQuote(
    orderId: string,
    dto: ProvideBespokeQuoteInput,
    adminId?: string
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    if (
      order.status !== OrderStatus.AWAITING_QUOTE &&
      order.status !== OrderStatus.QUOTED
    ) {
      throw new BadRequestException(
        `Cannot provide quote for order in status '${order.status}'`
      );
    }

    const totalKobo = dto.subtotalKobo + dto.packagingFeeKobo + dto.deliveryFeeKobo;
    const existingWishData = (order.customWishData as any) || {};

    const updatedWishData = {
      ...existingWishData,
      adminNote: dto.adminNote,
      quotedAt: new Date().toISOString(),
      estimatedDeliveryDays: dto.estimatedDeliveryDays,
    };

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.QUOTED,
        subtotalKobo: dto.subtotalKobo,
        packagingFeeKobo: dto.packagingFeeKobo,
        deliveryFeeKobo: dto.deliveryFeeKobo,
        totalKobo,
        customWishData: updatedWishData,
        history: {
          create: [
            {
              status: OrderStatus.QUOTED,
              note: `Quote provided by concierge team: ₦${Math.round(totalKobo / 100).toLocaleString()}. Note: ${dto.adminNote}`,
              actorId: adminId,
            },
          ],
        },
      },
    });

    await this.logAudit(adminId, "ORDER_QUOTE_PROVIDED", "Order", orderId, {
      totalKobo,
      subtotalKobo: dto.subtotalKobo,
      packagingFeeKobo: dto.packagingFeeKobo,
      deliveryFeeKobo: dto.deliveryFeeKobo,
    });

    // Send email notification to customer
    if (this.notifications) {
      void this.notifications.notify({
        userId: order.buyerUserId || undefined,
        toAddress: order.buyerEmail,
        channel: Channel.EMAIL,
        type: "BESPOKE_QUOTE_READY",
        category: "ORDERS",
        title: `Your Givvly Bespoke Wish Package Quote (${order.number}) is Ready!`,
        body: `Our concierge team has prepared your quote: ₦${Math.round(totalKobo / 100).toLocaleString()}. Note: ${dto.adminNote}`,
      }).catch((err: unknown) => this.logger.warn(`Failed to dispatch quote ready email: ${err}`));
    }

    return updated;
  }

  // ==================== USERS ====================

  async getUsers(query: { search?: string; status?: UserStatus; limit?: number; offset?: number }) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const take = query.limit ? Math.min(Number(query.limit), 100) : 50;
    const skip = query.offset ? Number(query.offset) : 0;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          kycTier: true,
          bvnLast4: true,
          kycUpgradedAt: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              events: true,
              payoutAccounts: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, limit: take, offset: skip };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        failedLogins: true,
        lockedUntil: true,
        walletPinSetAt: true,
        kycTier: true,
        bvnLast4: true,
        kycUpgradedAt: true,
        createdAt: true,
        payoutAccounts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            bankName: true,
            accountName: true,
            accountLast4: true,
            status: true,
            isDefault: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            status: true,
            date: true,
            createdAt: true,
            _count: {
              select: { gifts: true, rsvps: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User '${id}' not found`);
    }

    const [orders, giftsGiven, payouts, orderAgg, giftAgg, payoutAgg] =
      await Promise.all([
        this.prisma.order.findMany({
          where: { buyerUserId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            number: true,
            recipientName: true,
            totalKobo: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.gift.findMany({
          where: { giverUserId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            type: true,
            amountKobo: true,
            status: true,
            createdAt: true,
            event: { select: { name: true, slug: true } },
            payment: { select: { reference: true, status: true } },
          },
        }),
        this.prisma.payout.findMany({
          where: { userId: id },
          orderBy: { queuedAt: "desc" },
          take: 20,
          select: {
            id: true,
            amountKobo: true,
            status: true,
            reference: true,
            queuedAt: true,
            event: { select: { name: true } },
          },
        }),
        this.prisma.order.aggregate({
          where: { buyerUserId: id, status: { not: OrderStatus.PENDING_PAYMENT } },
          _sum: { totalKobo: true },
          _count: { id: true },
        }),
        this.prisma.gift.aggregate({
          where: { giverUserId: id, payment: { status: PaymentStatus.SUCCESS } },
          _sum: { amountKobo: true },
          _count: { id: true },
        }),
        this.prisma.payout.aggregate({
          where: { userId: id, status: "SUCCESS" },
          _sum: { amountKobo: true },
          _count: { id: true },
        }),
      ]);

    const transactions = [
      ...orders.map((o) => ({
        id: o.id,
        kind: "ORDER" as const,
        title: `Order ${o.number} (${o.recipientName})`,
        reference: o.number,
        amountKobo: o.totalKobo,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      ...giftsGiven.map((g) => ({
        id: g.id,
        kind: "GIFT" as const,
        title: `${g.type} Gift${g.event ? ` · ${g.event.name}` : ""}`,
        reference: g.payment?.reference ?? g.id,
        amountKobo: g.amountKobo,
        status: g.payment?.status ?? g.status,
        createdAt: g.createdAt.toISOString(),
      })),
      ...payouts.map((p) => ({
        id: p.id,
        kind: "PAYOUT" as const,
        title: `Payout${p.event ? ` · ${p.event.name}` : ""}`,
        reference: p.reference ?? p.id,
        amountKobo: p.amountKobo,
        status: p.status,
        createdAt: p.queuedAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 25);

    return {
      ...user,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      walletPinSetAt: user.walletPinSetAt?.toISOString() ?? null,
      kycUpgradedAt: user.kycUpgradedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      payoutAccounts: user.payoutAccounts,
      events: user.events.map((ev) => ({
        ...ev,
        date: ev.date.toISOString(),
        createdAt: ev.createdAt.toISOString(),
        giftCount: ev._count.gifts,
        rsvpCount: ev._count.rsvps,
      })),
      orders: orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      })),
      stats: {
        eventsCount: user.events.length,
        ordersCount: orders.length,
        paidOrdersCount: orderAgg._count.id ?? 0,
        totalOrdersSpentKobo: orderAgg._sum.totalKobo ?? 0,
        giftsGivenCount: giftAgg._count.id ?? 0,
        totalGiftsGivenKobo: giftAgg._sum.amountKobo ?? 0,
        payoutsCount: payouts.length,
        totalPayoutsReceivedKobo: payoutAgg._sum.amountKobo ?? 0,
      },
      transactions,
    };
  }

  private dispatchUserAccountNotification(params: {
    userId: string;
    email?: string | null;
    type: string;
    title: string;
    body: string;
  }) {
    if (!this.notifications) return;

    const payload = {
      userId: params.userId,
      type: params.type,
      category: "SECURITY",
      title: params.title,
      body: params.body,
    };

    void this.notifications
      .notify({ ...payload, channel: Channel.IN_APP })
      .catch((err: unknown) =>
        this.logger.warn(`Failed to queue in-app user notification: ${err}`)
      );

    if (params.email) {
      void this.notifications
        .notify({ ...payload, channel: Channel.EMAIL, toAddress: params.email })
        .catch((err: unknown) =>
          this.logger.warn(`Failed to queue email user notification: ${err}`)
        );
    }
  }

  async suspendUser(id: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User '${id}' not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });

    await this.logAudit(adminId, "USER_SUSPEND", "User", id);
    this.dispatchUserAccountNotification({
      userId: user.id,
      email: user.email,
      type: "ACCOUNT_SUSPENDED",
      title: "Your Givvly account has been suspended",
      body: "An administrator has suspended your account. Please contact support if you believe this is an error.",
    });
    return updated;
  }

  async restoreUser(id: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User '${id}' not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    await this.logAudit(adminId, "USER_RESTORE", "User", id);
    this.dispatchUserAccountNotification({
      userId: user.id,
      email: user.email,
      type: "ACCOUNT_RESTORED",
      title: "Your Givvly account has been restored",
      body: "Your Givvly account is active again. You can sign in and access your celebrations and wallet.",
    });
    return updated;
  }

  // ==================== DISPUTES & REFUNDS ====================

  async getDisputes(status?: DisputeStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            status: true,
            totalKobo: true,
            buyerEmail: true,
          },
        },
      },
    });

    return disputes.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      orderNumber: d.order.number,
      type: d.type,
      description: d.description,
      status:
        d.status === DisputeStatus.RESOLVED_REFUND
          ? "RESOLVED"
          : d.status === DisputeStatus.RESOLVED_REJECTED
            ? "REJECTED"
            : d.status,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto, adminId?: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute '${id}' not found`);
    }

    const targetStatus =
      dto.status === "RESOLVED" ||
      dto.status === DisputeStatus.RESOLVED_REFUND
        ? DisputeStatus.RESOLVED_REFUND
        : DisputeStatus.RESOLVED_REJECTED;

    const resolutionText =
      dto.resolution ||
      `Dispute resolved as ${targetStatus.toLowerCase()} by administrator via operations console`;

    if (dispute.status === targetStatus) {
      return {
        id: dispute.id,
        orderId: dispute.orderId,
        orderNumber: dispute.order?.number || "GV-ORD",
        type: dispute.type,
        description: dispute.description,
        status: targetStatus,
        createdAt:
          dispute.createdAt?.toISOString?.() ?? new Date().toISOString(),
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: targetStatus,
          resolution: resolutionText,
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });

      // Update Order status accordingly
      const nextOrderStatus =
        targetStatus === DisputeStatus.RESOLVED_REFUND
          ? OrderStatus.REFUNDED
          : OrderStatus.DELIVERED;

      await tx.order.update({
        where: { id: dispute.orderId },
        data: {
          status: nextOrderStatus,
          history: {
            create: [
              {
                status: nextOrderStatus,
                note: `Dispute resolved (${targetStatus}): ${resolutionText}`,
                actorId: adminId,
              },
            ],
          },
        },
      });

      await this.logAudit(adminId, "DISPUTE_RESOLVE", "Dispute", id, {
        targetStatus,
        resolution: resolutionText,
      });

      return {
        id: updatedDispute.id,
        orderId: updatedDispute.orderId,
        orderNumber: dispute.order?.number || "GV-ORD",
        type: dispute.type,
        description: dispute.description,
        status: targetStatus,
        createdAt:
          updatedDispute.createdAt?.toISOString?.() ??
          new Date().toISOString(),
      };
    });
  }

  async issueRefund(dto: IssueRefundDto, adminId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { order: true, gift: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment '${dto.paymentId}' not found`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new ConflictException(
        payment.status === PaymentStatus.REFUNDED
          ? "This payment has already been refunded"
          : "Only successful payments can be refunded"
      );
    }

    if (
      payment.order &&
      (payment.order.status === OrderStatus.REFUNDED ||
        payment.order.status === OrderStatus.CANCELLED)
    ) {
      throw new ConflictException(
        `Order '${payment.order.number}' is already ${payment.order.status.toLowerCase()} and cannot be refunded again`
      );
    }

    if ((payment as any).gift?.status === "REFUNDED") {
      throw new ConflictException("This gift has already been refunded");
    }

    const refundAmount = dto.amountKobo ?? payment.amountKobo;
    if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
      throw new BadRequestException("Refund amount must be a positive integer in kobo");
    }
    if (refundAmount > payment.amountKobo) {
      throw new BadRequestException(
        `Refund amount (${refundAmount} kobo) cannot exceed original payment amount (${payment.amountKobo} kobo)`
      );
    }

    const currency = payment.currency || "NGN";
    const destination =
      dto.destination === "WALLET" || payment.provider === "GIVVLY_WALLET"
        ? "WALLET"
        : "ORIGINAL";
    const targetUserId =
      payment.order?.buyerUserId ?? (payment as any).gift?.giverUserId ?? null;

    if (destination === "WALLET" && !targetUserId) {
      throw new BadRequestException(
        "Cannot refund to Givvly Wallet because no registered user is linked to this payment. Use Original Payment Method instead."
      );
    }

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      // 1. Atomic conditional claim: only transition SUCCESS -> REFUNDED once
      let updatedPayment: any;
      if (typeof (tx.payment as any).updateMany === "function") {
        const claim = await (tx.payment as any).updateMany({
          where: { id: payment.id, status: PaymentStatus.SUCCESS },
          data: { status: PaymentStatus.REFUNDED },
        });
        if (claim.count === 0) {
          throw new ConflictException(
            "This payment has already been refunded or is no longer eligible"
          );
        }
        updatedPayment = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
      } else {
        updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      const refundRef = `refund:${payment.id}`;
      if (typeof (tx as any).ledgerTransaction?.findUnique === "function") {
        const existingTx = await (tx as any).ledgerTransaction.findUnique({
          where: { reference: refundRef },
        });
        if (existingTx) {
          throw new ConflictException(
            "A refund ledger transaction already exists for this payment"
          );
        }
      }

      // 2. If attached to order, update order status to REFUNDED with full audit note
      if (payment.order) {
        await tx.order.update({
          where: { id: payment.order.id },
          data: {
            status: OrderStatus.REFUNDED,
            history: {
              create: [
                {
                  status: OrderStatus.REFUNDED,
                  note: `Manual refund issued (${destination}): ${dto.reason} (${refundAmount} ${currency})`,
                  actorId: adminId,
                },
              ],
            },
          },
        });
      }

      // 3. If attached to gift, mark gift REFUNDED
      if ((payment as any).gift && typeof (tx as any).gift?.update === "function") {
        await (tx as any).gift.update({
          where: { id: (payment as any).gift.id },
          data: { status: "REFUNDED" },
        });
      }

      // 4. Post double-entry refund ledger transaction (deterministic reference for idempotency)
      const creditEntry =
        destination === "WALLET" && targetUserId
          ? {
              accountCode: `OWNER_PAYABLE:${targetUserId}`,
              ownerId: targetUserId,
              direction: Direction.CREDIT,
              amountKobo: refundAmount,
            }
          : {
              accountCode: `PROVIDER_CLEARING:${currency}`,
              direction: Direction.CREDIT,
              amountKobo: refundAmount,
            };

      await this.ledger.postTransaction(
        {
          reference: refundRef,
          kind: "REFUND",
          description: `Refund (${destination}) for payment ${payment.reference}: ${dto.reason}`,
          paymentId: payment.id,
          entries: [
            {
              accountCode: `PLATFORM_REVENUE:${currency}`,
              direction: Direction.DEBIT,
              amountKobo: refundAmount,
            },
            creditEntry,
          ],
        },
        tx
      );

      await this.logAudit(adminId, "PAYMENT_REFUND", "Payment", payment.id, {
        amountKobo: refundAmount,
        destination,
        orderId: payment.order?.id ?? null,
        orderNumber: payment.order?.number ?? null,
        giftId: (payment as any).gift?.id ?? null,
        reason: dto.reason,
      });

      return updatedPayment;
    });

    if (this.notifications) {
      let targetEmail =
        payment.order?.buyerEmail ?? (payment as any).gift?.giverEmail ?? null;
      let targetName =
        payment.order?.recipientName ??
        (payment as any).gift?.giverName ??
        "Valued Customer";

      if ((!targetEmail || !targetName) && targetUserId) {
        const userRecord = await this.prisma.user
          .findUnique({
            where: { id: targetUserId },
            select: { email: true, name: true },
          })
          .catch(() => null);
        targetEmail = targetEmail ?? userRecord?.email ?? null;
        targetName = targetName || userRecord?.name || "Valued Customer";
      }

      const formattedAmount = `${currency} ${(refundAmount / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      const destinationLabel =
        destination === "WALLET"
          ? "your Givvly Wallet"
          : `your original payment method (${payment.provider})`;
      const referenceLabel = payment.order
        ? `order #${payment.order.number}`
        : `payment ${payment.reference}`;
      const userActionPath = payment.order
        ? `/orders/${payment.order.id}`
        : destination === "WALLET"
          ? "/wallet"
          : "/orders";
      const userTitle = payment.order
        ? `Refund Issued for Order #${payment.order.number}`
        : "Refund Issued";
      const userBody = `A refund of ${formattedAmount} for ${referenceLabel} has been issued to ${destinationLabel}. Reason: ${dto.reason}`;

      const notifData = {
        paymentId: payment.id,
        orderId: payment.order?.id ?? null,
        orderNumber: payment.order?.number ?? null,
        giftId: (payment as any).gift?.id ?? null,
        amountKobo: refundAmount,
        destination,
        reason: dto.reason,
        actionPath: userActionPath,
      };

      if (targetUserId) {
        void this.notifications
          .notify({
            userId: targetUserId,
            channel: Channel.IN_APP,
            type: "REFUND_ISSUED",
            category: "ORDERS",
            title: userTitle,
            body: userBody,
            data: notifData,
          })
          .catch((err: unknown) =>
            this.logger.warn(`Failed to send in-app refund notification: ${err}`)
          );
      }

      if (targetEmail) {
        const html = this.emailService?.renderTemplate(
          userTitle,
          `
          <h2>${userTitle}</h2>
          <p>Hi ${targetName},</p>
          <p>A refund of <strong>${formattedAmount}</strong> for <strong>${referenceLabel}</strong> has been issued to <strong>${destinationLabel}</strong>.</p>
          <p><strong>Reason:</strong> ${dto.reason}</p>
          <p><strong>Reference:</strong> ${payment.reference}</p>
          `
        );

        void this.notifications
          .notify({
            userId: targetUserId ?? undefined,
            channel: Channel.EMAIL,
            toAddress: targetEmail,
            type: "REFUND_ISSUED",
            category: "ORDERS",
            title: userTitle,
            body: userBody,
            html,
            data: notifData,
          })
          .catch((err: unknown) =>
            this.logger.warn(`Failed to send email refund notification: ${err}`)
          );
      }

      void this.notifications
        .notifyAdmins?.({
          type: "ADMIN_REFUND_ISSUED",
          category: "ADMIN_ALERTS",
          title: payment.order
            ? `Manual Refund Issued: #${payment.order.number}`
            : `Manual Refund Issued: ${payment.reference}`,
          body: `Refund of ${formattedAmount} issued to ${destination} for ${referenceLabel}${targetEmail ? ` (${targetEmail})` : ""}. Reason: ${dto.reason}`,
          actionPath: payment.order
            ? `/admin/orders/${payment.order.id}`
            : "/admin/payments",
          data: {
            ...notifData,
            adminId: adminId ?? null,
          },
        })
        ?.catch?.((err: unknown) =>
          this.logger.warn(`Failed to send admin refund notification: ${err}`)
        );
    }

    return updatedPayment;
  }

  // ==================== LEDGER & TRIAL BALANCE ====================

  async getLedgerReport() {
    const [trialBalance, recentEntries] = await Promise.all([
      this.ledger.getTrialBalance(),
      this.prisma.ledgerEntry.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          account: { select: { code: true } },
          transaction: { select: { description: true, reference: true } },
        },
      }),
    ]);

    return {
      trialBalance: {
        totalDebit: Number(trialBalance.totalDebit),
        totalCredit: Number(trialBalance.totalCredit),
        isBalanced: trialBalance.isBalanced,
      },
      recentEntries: recentEntries.map((e) => ({
        id: e.id,
        accountCode: e.account.code,
        direction: e.direction,
        amountKobo: Number(e.amountKobo),
        description: e.transaction.description,
        reference: e.transaction.reference,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  // ==================== MODERATION ====================

  async getModerationQueue() {
    const posts = await this.prisma.wallPost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 50,
    });

    return posts.map((p) => ({
      id: p.id,
      eventSlug: p.event?.slug || "",
      eventName: p.event?.name || "Celebration Wall",
      authorName: p.authorName,
      text: p.text || undefined,
      reason: p.moderationReason || undefined,
      status: (p.status === PostStatus.VISIBLE
        ? "APPROVED"
        : p.status === PostStatus.REMOVED
          ? "REMOVED"
          : "PENDING") as "PENDING" | "APPROVED" | "REMOVED",
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async resolveModerationItem(
    id: string,
    status: "APPROVED" | "REMOVED",
    adminId?: string
  ) {
    const post = await this.prisma.wallPost.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!post) {
      throw new NotFoundException(`Wall post '${id}' not found`);
    }

    const targetStatus =
      status === "APPROVED" ? PostStatus.VISIBLE : PostStatus.REMOVED;

    const updated = await this.prisma.wallPost.update({
      where: { id },
      data: {
        status: targetStatus,
        moderationReason:
          status === "REMOVED" ? "Removed by administrator" : null,
      },
    });

    await this.logAudit(adminId, "MODERATION_RESOLVE", "WallPost", id, {
      status,
      eventId: post.eventId,
    });

    return {
      id: updated.id,
      eventSlug: post.event?.slug || "",
      eventName: post.event?.name || "Celebration Wall",
      authorName: updated.authorName,
      text: updated.text || undefined,
      reason: updated.moderationReason || undefined,
      status: (updated.status === PostStatus.VISIBLE
        ? "APPROVED"
        : updated.status === PostStatus.REMOVED
          ? "REMOVED"
          : "PENDING") as "APPROVED" | "REMOVED",
      createdAt: updated.createdAt.toISOString(),
    };
  }

  // ==================== CELEBRATION EVENTS ====================

  async getEvents(query?: { limit?: number; offset?: number }) {
    const take = query?.limit ? Math.min(Number(query.limit), 100) : 100;
    const skip = query?.offset ? Number(query.offset) : 0;

    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            rsvps: { where: { response: "YES" } },
            registry: true,
            pools: true,
            orders: true,
            posts: true,
          },
        },
        gifts: {
          where: { payment: { status: PaymentStatus.SUCCESS } },
          select: { amountKobo: true },
        },
      },
    });

    return events.map((ev: any) => {
      const totalReceivedKobo = (ev.gifts ?? []).reduce(
        (sum: number, g: any) => sum + g.amountKobo,
        0
      );
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.name,
        type: ev.type,
        date: ev.date.toISOString(),
        coverUrl: undefined,
        visibility: ev.visibility,
        status: ev.status,
        moneyGiftsEnabled: Boolean(ev.payoutAccountId),
        currency: ev.currency || "NGN",
        totalReceivedKobo,
        giftCount: (ev.gifts ?? []).length,
        rsvpYesCount: ev._count?.rsvps ?? ev.rsvps?.length ?? 0,
        host: ev.owner
          ? { id: ev.owner.id, name: ev.owner.name, email: ev.owner.email }
          : null,
        registryCount: ev._count?.registry ?? 0,
        poolCount: ev._count?.pools ?? 0,
        orderCount: ev._count?.orders ?? 0,
        postCount: ev._count?.posts ?? 0,
        createdAt: ev.createdAt.toISOString(),
      };
    });
  }

  async getEventDetail(id: string) {
    const ev = await this.prisma.event.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: {
          select: {
            registry: true,
            pools: true,
            orders: true,
            posts: true,
            gifts: true,
            payouts: true,
          },
        },
        gifts: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            payment: {
              select: { reference: true, status: true },
            },
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            payment: {
              select: { reference: true, status: true },
            },
          },
        },
        rsvps: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            name: true,
            email: true,
            response: true,
            plusOneName: true,
            createdAt: true,
          },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            authorName: true,
            text: true,
            status: true,
            createdAt: true,
          },
        },
        payouts: {
          select: { amountKobo: true, status: true },
        },
      },
    });

    if (!ev) {
      throw new NotFoundException(`Event '${id}' not found`);
    }

    const [rsvpYes, rsvpNo, rsvpMaybe, successfulGiftAgg, paidOrderAgg] =
      await Promise.all([
        this.prisma.rsvp.count({ where: { eventId: id, response: "YES" } }),
        this.prisma.rsvp.count({ where: { eventId: id, response: "NO" } }),
        this.prisma.rsvp.count({ where: { eventId: id, response: "MAYBE" } }),
        this.prisma.gift.aggregate({
          where: { eventId: id, payment: { status: PaymentStatus.SUCCESS } },
          _sum: { amountKobo: true },
          _count: { id: true },
        }),
        this.prisma.order.aggregate({
          where: { eventId: id, status: { not: OrderStatus.PENDING_PAYMENT } },
          _sum: { totalKobo: true },
          _count: { id: true },
        }),
      ]);

    const totalPayoutsKobo = (ev.payouts ?? []).reduce(
      (sum, p) => sum + p.amountKobo,
      0
    );

    const giftTx = (ev.gifts ?? []).map((g) => ({
      id: g.id,
      kind: "GIFT" as const,
      actorName: g.anonymous ? "Anonymous" : g.giverName || "Guest",
      actorEmail: g.anonymous ? null : g.giverEmail,
      amountKobo: g.amountKobo,
      status: g.payment?.status ?? g.status,
      reference: g.payment?.reference ?? g.id,
      label: g.type,
      createdAt: g.createdAt.toISOString(),
    }));

    const orderTx = (ev.orders ?? []).map((o) => ({
      id: o.id,
      kind: "ORDER" as const,
      actorName: o.recipientName,
      actorEmail: o.buyerEmail,
      amountKobo: o.totalKobo,
      status: o.status,
      reference: o.number,
      label: o.payment?.reference ?? o.number,
      createdAt: o.createdAt.toISOString(),
    }));

    const recentTransactions = [...giftTx, ...orderTx]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 20);

    return {
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      type: ev.type,
      date: ev.date.toISOString(),
      story: ev.story,
      visibility: ev.visibility,
      status: ev.status,
      currency: ev.currency || "NGN",
      keepsakePublic: ev.keepsakePublic,
      moneyGiftsEnabled: Boolean(ev.payoutAccountId),
      publishedAt: ev.publishedAt?.toISOString() ?? null,
      closedAt: ev.closedAt?.toISOString() ?? null,
      createdAt: ev.createdAt.toISOString(),
      host: ev.owner,
      stats: {
        totalReceivedKobo: successfulGiftAgg._sum.amountKobo ?? 0,
        successfulGiftCount: successfulGiftAgg._count.id ?? 0,
        totalOrdersKobo: paidOrderAgg._sum.totalKobo ?? 0,
        paidOrderCount: paidOrderAgg._count.id ?? 0,
        totalPayoutsKobo,
        giftCount: ev._count.gifts,
        orderCount: ev._count.orders,
        registryCount: ev._count.registry,
        poolCount: ev._count.pools,
        postCount: ev._count.posts,
        payoutCount: ev._count.payouts,
        rsvpCounts: {
          yes: rsvpYes,
          no: rsvpNo,
          maybe: rsvpMaybe,
          total: rsvpYes + rsvpNo + rsvpMaybe,
        },
      },
      recentTransactions,
      recentActivity: {
        rsvps: ev.rsvps.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
        posts: ev.posts.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    };
  }

  private dispatchEventCreatorNotification(params: {
    ownerId?: string;
    ownerEmail?: string | null;
    eventId: string;
    eventSlug: string;
    eventName: string;
    type: string;
    title: string;
    body: string;
  }) {
    if (!this.notifications || !params.ownerId) return;

    const payload = {
      userId: params.ownerId,
      type: params.type,
      category: "EVENTS",
      title: params.title,
      body: params.body,
      data: {
        eventId: params.eventId,
        slug: params.eventSlug,
        eventName: params.eventName,
      },
    };

    void this.notifications
      .notify({ ...payload, channel: Channel.IN_APP })
      .catch((err: unknown) =>
        this.logger.warn(`Failed to queue in-app event notification: ${err}`)
      );

    if (params.ownerEmail) {
      void this.notifications
        .notify({
          ...payload,
          channel: Channel.EMAIL,
          toAddress: params.ownerEmail,
        })
        .catch((err: unknown) =>
          this.logger.warn(`Failed to queue email event notification: ${err}`)
        );
    }
  }

  async updateEventStatus(
    id: string,
    dto: UpdateAdminEventStatusDto,
    adminId?: string
  ) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Event '${id}' not found`);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === EventStatus.CLOSED || dto.status === EventStatus.ARCHIVED
          ? { closedAt: existing.closedAt ?? new Date() }
          : {}),
        ...(dto.status === EventStatus.PUBLISHED
          ? { publishedAt: existing.publishedAt ?? new Date(), closedAt: null }
          : {}),
      },
    });

    if (adminId) {
      await this.logAudit(adminId, "ADMIN_EVENT_STATUS_UPDATE", "Event", id, {
        previousStatus: existing.status,
        newStatus: dto.status,
        reason: dto.reason ?? null,
      });
    }

    const reasonSuffix = dto.reason?.trim() ? ` Reason: ${dto.reason.trim()}` : "";
    if (dto.status === EventStatus.CLOSED) {
      this.dispatchEventCreatorNotification({
        ownerId: existing.owner?.id ?? existing.ownerId,
        ownerEmail: existing.owner?.email,
        eventId: existing.id,
        eventSlug: existing.slug,
        eventName: existing.name,
        type: "EVENT_BLOCKED_OR_CLOSED",
        title: `Your celebration "${existing.name}" has been closed`,
        body: `An administrator has closed and taken your celebration (/e/${existing.slug}) offline.${reasonSuffix}`,
      });
    } else if (dto.status === EventStatus.ARCHIVED) {
      this.dispatchEventCreatorNotification({
        ownerId: existing.owner?.id ?? existing.ownerId,
        ownerEmail: existing.owner?.email,
        eventId: existing.id,
        eventSlug: existing.slug,
        eventName: existing.name,
        type: "EVENT_ARCHIVED",
        title: `Your celebration "${existing.name}" has been archived`,
        body: `An administrator has archived your celebration (/e/${existing.slug}).${reasonSuffix}`,
      });
    } else if (dto.status === EventStatus.PUBLISHED && existing.status !== EventStatus.PUBLISHED) {
      this.dispatchEventCreatorNotification({
        ownerId: existing.owner?.id ?? existing.ownerId,
        ownerEmail: existing.owner?.email,
        eventId: existing.id,
        eventSlug: existing.slug,
        eventName: existing.name,
        type: "EVENT_RESTORED",
        title: `Your celebration "${existing.name}" is live again`,
        body: `An administrator has restored your celebration (/e/${existing.slug}) to Published status.${reasonSuffix}`,
      });
    }

    return updated;
  }

  async deleteEvent(id: string, adminId?: string) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        _count: {
          select: { gifts: true, orders: true, payouts: true },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Event '${id}' not found`);
    }

    if (
      existing._count.gifts > 0 ||
      existing._count.orders > 0 ||
      existing._count.payouts > 0
    ) {
      throw new BadRequestException(
        "Cannot permanently delete an event with gifts, orders, or payouts. Close or archive it instead to take it offline while preserving financial records."
      );
    }

    await this.prisma.event.delete({ where: { id } });

    if (adminId) {
      await this.logAudit(adminId, "ADMIN_EVENT_DELETE", "Event", id, {
        slug: existing.slug,
        name: existing.name,
      });
    }

    this.dispatchEventCreatorNotification({
      ownerId: existing.owner?.id ?? existing.ownerId,
      ownerEmail: existing.owner?.email,
      eventId: existing.id,
      eventSlug: existing.slug,
      eventName: existing.name,
      type: "EVENT_DELETED",
      title: `Your celebration "${existing.name}" was removed`,
      body: `An administrator permanently removed your celebration (/e/${existing.slug}).`,
    });

    return { deleted: true, id };
  }

  // ==================== PAYMENTS ====================

  async getPayments(query?: { limit?: number; offset?: number }) {
    const take = query?.limit ? Math.min(Number(query.limit), 200) : 200;
    const skip = query?.offset ? Number(query.offset) : 0;

    const payments = await this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        reference: true,
        scope: true,
        provider: true,
        channel: true,
        payerEmail: true,
        amountKobo: true,
        feeKobo: true,
        providerFeeKobo: true,
        currency: true,
        status: true,
        failureReason: true,
        paidAt: true,
        createdAt: true,
        gift: {
          select: {
            id: true,
            type: true,
            giverName: true,
            event: { select: { id: true, slug: true, name: true } },
          },
        },
        order: {
          select: {
            id: true,
            number: true,
            recipientName: true,
            status: true,
            shippingZoneName: true,
            deliveryFeeKobo: true,
            vatKobo: true,
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      reference: p.reference,
      scope: p.scope,
      provider: p.provider,
      channel: p.channel,
      payerEmail: p.payerEmail,
      amountKobo: p.amountKobo,
      serviceFeeKobo: p.feeKobo,
      providerFeeKobo: p.providerFeeKobo,
      totalKobo: p.amountKobo + p.feeKobo,
      currency: p.currency,
      status: p.status,
      failureReason: p.failureReason,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      gift: p.gift,
      order: p.order,
    }));
  }

  // ==================== PAYOUTS ====================

  async getPayouts() {
    const payouts = await this.prisma.payout.findMany({
      orderBy: { queuedAt: "desc" },
      take: 150,
      include: {
        event: { select: { id: true, slug: true, name: true } },
      },
    });

    const userIds = Array.from(new Set(payouts.map((p) => p.userId)));
    const payoutAccountIds = Array.from(
      new Set(payouts.map((p) => p.payoutAccountId).filter(Boolean))
    );

    const [users, payoutAccounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.payoutAccount.findMany({
        where: { id: { in: payoutAccountIds } },
        select: { id: true, bankName: true, accountLast4: true, accountName: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const accountMap = new Map(payoutAccounts.map((a) => [a.id, a]));

    return payouts.map((p) => {
      const account = accountMap.get(p.payoutAccountId);
      const owner = userMap.get(p.userId);
      let mappedStatus: "SENT" | "FAILED" | "PENDING" = "PENDING";
      if (p.status === "SUCCESS") mappedStatus = "SENT";
      else if (p.status === "FAILED") mappedStatus = "FAILED";

      return {
        id: p.id,
        eventId: p.event?.id ?? null,
        eventSlug: p.event?.slug ?? null,
        eventName: p.event?.name || "Celebration Cash Gift Withdrawal",
        ownerName: owner?.name || "Host Beneficiary",
        ownerEmail: owner?.email ?? null,
        bankName: account?.bankName || "Commercial Bank",
        accountName: account?.accountName ?? null,
        accountNumberLast4: account?.accountLast4 || "••••",
        amountKobo: p.amountKobo,
        status: mappedStatus,
        rawStatus: p.status,
        reference: p.reference ?? null,
        failureReason: p.failureReason ?? null,
        attempts: p.attempts,
        completedAt: p.completedAt?.toISOString() ?? null,
        createdAt: p.queuedAt.toISOString(),
      };
    });
  }

  async retryPayout(id: string, adminId?: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) {
      throw new NotFoundException(`Payout '${id}' not found`);
    }

    const updated = await this.prisma.payout.update({
      where: { id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    await this.logAudit(adminId, "PAYOUT_RETRY", "Payout", id, {
      previousStatus: payout.status,
      newStatus: "SUCCESS",
    });

    return {
      id: updated.id,
      status: "SENT" as const,
    };
  }

  // ==================== VENDORS (LEGACY PARTNERS) ====================

  private mapVendorSummary(v: any) {
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      email: v.contactEmail,
      phone: v.phone ?? undefined,
      location: v.location ?? v.city ?? undefined,
      logoUrl: v.logoUrl ?? undefined,
      active: Boolean(v.active),
      pricingMode: (v.pricingMode ?? "PUBLIC_MARKUP") as VendorPricingMode,
      markupBps: typeof v.markupBps === "number" ? v.markupBps : 1500,
      discountBps: typeof v.discountBps === "number" ? v.discountBps : 0,
      commissionBps: typeof v.commissionBps === "number" ? v.commissionBps : 0,
      roundingStepKobo:
        typeof v.roundingStepKobo === "number" ? v.roundingStepKobo : 50_000,
      pricingTiers: Array.isArray(v.pricingTiers)
        ? (v.pricingTiers as VendorPricingTier[])
        : null,
      productCount: v._count?.products ?? v.products?.length ?? 0,
      status: v.active
        ? ("VERIFIED" as const)
        : ("PENDING_REVIEW" as const),
    };
  }

  async getVendors(query?: { limit?: number; offset?: number }) {
    const take = query?.limit ? Math.min(Number(query.limit), 100) : 100;
    const skip = query?.offset ? Number(query.offset) : 0;

    const vendors = await this.prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return vendors.map((v: any) => this.mapVendorSummary(v));
  }

  async createVendor(dto: CreateAdminVendorDto, adminId?: string) {
    const slug = await this.slugService.generateSlug({
      title: dto.name.trim(),
      model: "vendor",
    });

    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name.trim(),
        slug,
        contactEmail: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        location: dto.location?.trim() || null,
        city: dto.location?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        active: dto.active ?? true,
        pricingMode: dto.pricingMode ?? "PUBLIC_MARKUP",
        markupBps: dto.markupBps ?? 1500,
        discountBps: dto.discountBps ?? 0,
        commissionBps: dto.commissionBps ?? 0,
        roundingStepKobo: dto.roundingStepKobo ?? 50_000,
        pricingTiers: dto.pricingTiers ?? undefined,
      },
    });

    await this.logAudit(adminId, "VENDOR_CREATE", "Vendor", vendor.id, {
      name: vendor.name,
      email: vendor.contactEmail,
      pricingMode: vendor.pricingMode,
    });

    return this.mapVendorSummary({ ...vendor, _count: { products: 0 } });
  }

  async updateVendor(id: string, dto: UpdateAdminVendorDto, adminId?: string) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Vendor '${id}' not found`);
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && {
          contactEmail: dto.email.trim().toLowerCase(),
        }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.location !== undefined && {
          location: dto.location?.trim() || null,
          city: dto.location?.trim() || null,
        }),
        ...(dto.logoUrl !== undefined && {
          logoUrl: dto.logoUrl?.trim() || null,
        }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.pricingMode !== undefined && { pricingMode: dto.pricingMode }),
        ...(dto.markupBps !== undefined && { markupBps: dto.markupBps }),
        ...(dto.discountBps !== undefined && { discountBps: dto.discountBps }),
        ...(dto.commissionBps !== undefined && {
          commissionBps: dto.commissionBps,
        }),
        ...(dto.roundingStepKobo !== undefined && {
          roundingStepKobo: dto.roundingStepKobo,
        }),
        ...(dto.pricingTiers !== undefined && {
          pricingTiers:
            dto.pricingTiers === null
              ? Prisma.JsonNull
              : (dto.pricingTiers as Prisma.InputJsonValue),
        }),
      },
      include: { _count: { select: { products: true } } },
    });

    await this.logAudit(adminId, "VENDOR_UPDATE", "Vendor", id, {
      name: updated.name,
      email: updated.contactEmail,
      pricingMode: updated.pricingMode,
    });

    return this.mapVendorSummary(updated);
  }

  async recalculateVendorPrices(vendorId: string, adminId?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: {
          select: {
            id: true,
            title: true,
            costPriceKobo: true,
            priceKobo: true,
            priceOverridden: true,
          },
        },
      },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    let updatedCount = 0;
    let skippedOverridden = 0;
    let skippedNoCost = 0;

    const updates: Array<{ id: string; priceKobo: number }> = [];

    for (const product of vendor.products) {
      if (product.priceOverridden) {
        skippedOverridden++;
        continue;
      }
      if (!product.costPriceKobo || product.costPriceKobo <= 0) {
        skippedNoCost++;
        continue;
      }

      const calc = calculateVendorSellingPrice(product.costPriceKobo, {
        pricingMode: (vendor.pricingMode ?? "PUBLIC_MARKUP") as VendorPricingMode,
        markupBps: vendor.markupBps,
        discountBps: vendor.discountBps,
        commissionBps: vendor.commissionBps,
        roundingStepKobo: vendor.roundingStepKobo,
        pricingTiers: Array.isArray(vendor.pricingTiers)
          ? (vendor.pricingTiers as VendorPricingTier[])
          : null,
      });

      if (calc.sellingPriceKobo > 0 && calc.sellingPriceKobo !== product.priceKobo) {
        updates.push({ id: product.id, priceKobo: calc.sellingPriceKobo });
      }
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((u) =>
          this.prisma.product.update({
            where: { id: u.id },
            data: { priceKobo: u.priceKobo },
          })
        )
      );
      updatedCount = updates.length;
    }

    await this.logAudit(
      adminId,
      "VENDOR_RECALCULATE_PRICES",
      "Vendor",
      vendorId,
      {
        updatedCount,
        skippedOverridden,
        skippedNoCost,
      }
    );

    return {
      vendorId,
      updatedCount,
      skippedOverridden,
      skippedNoCost,
    };
  }

  async deleteVendor(id: string, adminId?: string) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Vendor '${id}' not found`);
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.product.updateMany({
        where: { vendorId: id },
        data: { vendorId: null },
      });
      await tx.order.updateMany({
        where: { vendorId: id },
        data: { vendorId: null },
      });
      await tx.vendor.delete({ where: { id } });
    });

    await this.logAudit(adminId, "VENDOR_DELETE", "Vendor", id, {
      name: existing.name,
    });

    return { deleted: true, id };
  }

  async forwardOrderToVendor(
    orderId: string,
    dto: ForwardOrderToVendorDto,
    adminId?: string
  ) {
    const order = await this.getOrderById(orderId);
    const targetVendor = dto.vendorId
      ? await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } })
      : order.vendor
        ? await this.prisma.vendor.findUnique({ where: { id: order.vendor.id } })
        : null;

    if (!targetVendor) {
      throw new BadRequestException(
        "Please select a vendor to forward this order to."
      );
    }

    const addr = (order.address as Record<string, any>) || {};
    const addressParts = [
      addr.address || addr.street,
      addr.area,
      addr.city,
      addr.state,
    ]
      .filter(Boolean)
      .join(", ");

    const itemLines = order.items.map((item: any) => {
      const sizeText = item.size ? ` | Size: ${item.size}` : "";
      return `• ${item.title} — Qty: ${item.qty}${sizeText}`;
    });

    const plainText = [
      `Order Dispatch: ${order.number}`,
      ``,
      `Items:`,
      ...itemLines,
      ``,
      `Customer Info:`,
      `Name: ${order.recipientName}`,
      order.recipientPhone ? `Phone: ${order.recipientPhone}` : null,
      order.recipientEmail || order.buyerEmail
        ? `Email: ${order.recipientEmail || order.buyerEmail}`
        : null,
      addressParts ? `Delivery Address: ${addressParts}` : null,
      order.giftNote ? `Note: ${order.giftNote}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    if (dto.channel === "EMAIL") {
      if (!targetVendor.contactEmail) {
        throw new BadRequestException("Selected vendor does not have an email address.");
      }
      if (!this.emailService) {
        throw new BadRequestException("Email service is unavailable.");
      }

      const itemsHtml = order.items
        .map((item: any) => {
          const sizeBadge = item.size ? ` (Size: ${item.size})` : "";
          return `<li><strong>${item.title}</strong> — Qty: ${item.qty}${sizeBadge}</li>`;
        })
        .join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
          <h2 style="color:#B5495B;">New Order Dispatch: ${order.number}</h2>
          <p>Hello ${targetVendor.name},</p>
          <p>Please find the order details below for fulfillment:</p>
          <h3>Order Items</h3>
          <ul>${itemsHtml}</ul>
          <h3>Customer &amp; Delivery Info</h3>
          <p>
            <strong>Recipient:</strong> ${order.recipientName}<br/>
            ${order.recipientPhone ? `<strong>Phone:</strong> ${order.recipientPhone}<br/>` : ""}
            ${order.recipientEmail || order.buyerEmail ? `<strong>Email:</strong> ${order.recipientEmail || order.buyerEmail}<br/>` : ""}
            ${addressParts ? `<strong>Address:</strong> ${addressParts}<br/>` : ""}
            ${order.giftNote ? `<strong>Gift Note:</strong> ${order.giftNote}` : ""}
          </p>
        </div>
      `;

      await this.emailService.send({
        to: targetVendor.contactEmail,
        subject: `Givvly Order Dispatch: ${order.number}`,
        html,
        text: plainText,
      });
    }

    await this.logAudit(
      adminId,
      "ORDER_FORWARDED_TO_VENDOR",
      "Order",
      orderId,
      {
        vendorId: targetVendor.id,
        vendorName: targetVendor.name,
        channel: dto.channel,
      }
    );

    return {
      sent: true,
      channel: dto.channel,
      vendor: {
        id: targetVendor.id,
        name: targetVendor.name,
        email: targetVendor.contactEmail,
        phone: targetVendor.phone,
      },
      message: plainText,
    };
  }

  // ==================== SHIPPING ZONES ====================

  async listShippingZones() {
    await ensureShippingZonesSeeded(this.prisma);
    return this.prisma.shippingZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async createShippingZone(dto: CreateShippingZoneDto) {
    return this.prisma.shippingZone.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        areas: dto.areas.trim(),
        deliveryNote: dto.deliveryNote?.trim() || null,
        etaLabel: dto.etaLabel?.trim() || null,
        priceKobo: dto.priceKobo,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateShippingZone(id: string, dto: UpdateShippingZoneDto) {
    const existing = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipping zone '${id}' not found`);
    }
    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.areas !== undefined ? { areas: dto.areas.trim() } : {}),
        ...(dto.deliveryNote !== undefined
          ? { deliveryNote: dto.deliveryNote?.trim() || null }
          : {}),
        ...(dto.etaLabel !== undefined
          ? { etaLabel: dto.etaLabel?.trim() || null }
          : {}),
        ...(dto.priceKobo !== undefined ? { priceKobo: dto.priceKobo } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async deleteShippingZone(id: string) {
    const existing = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipping zone '${id}' not found`);
    }
    await this.prisma.shippingZone.delete({ where: { id } });
    return { deleted: true, id };
  }

  async getPlatformSettings() {
    const setting = await (this.prisma as any).platformSetting?.findUnique({
      where: { key: "event_lifecycle" },
    });
    const val = (setting?.value as Record<string, unknown>) || {};
    const autoArchiveEnabled =
      typeof val.autoArchiveEnabled === "boolean"
        ? val.autoArchiveEnabled
        : true;
    const rawHours = Number(val.archiveAfterHours);
    const archiveAfterHours =
      Number.isFinite(rawHours) && rawHours >= 1 && rawHours <= 720
        ? Math.round(rawHours)
        : 24;

    return {
      eventLifecycle: {
        autoArchiveEnabled,
        archiveAfterHours,
      },
      updatedAt: setting?.updatedAt ?? null,
    };
  }

  async updatePlatformSettings(
    dto: { autoArchiveEnabled?: boolean; archiveAfterHours?: number },
    adminId?: string
  ) {
    const current = await this.getPlatformSettings();
    const autoArchiveEnabled =
      dto.autoArchiveEnabled ?? current.eventLifecycle.autoArchiveEnabled;
    const rawHours =
      dto.archiveAfterHours ?? current.eventLifecycle.archiveAfterHours;
    if (
      !Number.isFinite(rawHours) ||
      rawHours < 1 ||
      rawHours > 720
    ) {
      throw new BadRequestException(
        "archiveAfterHours must be between 1 and 720 hours"
      );
    }
    const archiveAfterHours = Math.round(rawHours);

    const saved = await (this.prisma as any).platformSetting.upsert({
      where: { key: "event_lifecycle" },
      create: {
        key: "event_lifecycle",
        value: { autoArchiveEnabled, archiveAfterHours },
        updatedBy: adminId ?? null,
      },
      update: {
        value: { autoArchiveEnabled, archiveAfterHours },
        updatedBy: adminId ?? null,
      },
    });

    if (adminId) {
      await this.logAudit(
        adminId,
        "ADMIN_SETTINGS_UPDATE",
        "PlatformSetting",
        "event_lifecycle",
        { autoArchiveEnabled, archiveAfterHours }
      );
    }

    return {
      eventLifecycle: { autoArchiveEnabled, archiveAfterHours },
      updatedAt: saved.updatedAt,
    };
  }
}
