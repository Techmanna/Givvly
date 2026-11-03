import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import {
  OrderStatus,
  PaymentStatus,
  DisputeStatus,
  UserStatus,
  PostStatus,
  Direction,
} from "@prisma/client";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCollectionDto,
} from "./dto/admin-product.dto";
import { UpdateOrderStatusDto } from "./dto/admin-orders.dto";
import { ResolveDisputeDto, IssueRefundDto } from "./dto/admin-disputes.dto";
import { canOrderTransition } from "../orders/order-state-machine";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService
  ) {}

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
    const where: any = {};
    if (query.active !== undefined) {
      where.active = query.active;
    }
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
        category: p.occasions[0] || "Wedding Gifts",
        occasions: p.occasions,
        relationships: p.relationships,
        vendorName: p.vendor?.name || "Givvly Curated",
        stock: p.stock,
        inStock,
        rating: p.ratingAvg || 4.9,
        reviewCount: p.ratingCount || 16,
        isCombo: false,
        comboItems: [],
        packagingIncluded: "Luxury Gift Box & Ribbon",
        images: p.images,
        imageUrl: primaryImage,
        active: p.active,
        isDigital: p.isDigital,
        digitalKind: p.digitalKind,
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

    const slugBase =
      dto.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const finalSlug = dto.slug || `${slugBase}-${randomSuffix}`;

    const existing = await this.prisma.product.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      throw new ConflictException(`Product slug '${finalSlug}' already exists`);
    }

    const product = await this.prisma.product.create({
      data: {
        slug: finalSlug,
        title,
        description: dto.description,
        priceKobo: dto.priceKobo,
        occasions: dto.occasions,
        relationships: dto.relationships,
        images: images as any,
        stock,
        isDigital: dto.isDigital || false,
        digitalKind: dto.digitalKind,
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

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priceKobo !== undefined && { priceKobo: dto.priceKobo }),
        ...(dto.occasions !== undefined && { occasions: dto.occasions }),
        ...(dto.relationships !== undefined && { relationships: dto.relationships }),
        ...(images !== undefined && { images: images as any }),
        ...(stock !== undefined && { stock }),
        ...(dto.isDigital !== undefined && { isDigital: dto.isDigital }),
        ...(dto.digitalKind !== undefined && { digitalKind: dto.digitalKind }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    await this.logAudit(adminId, "PRODUCT_UPDATE", "Product", id, {
      before: product,
      after: updated,
    });

    return updated;
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

  // ==================== COLLECTIONS ====================

  async getCollections() {
    return this.prisma.collection.findMany();
  }

  async createCollection(dto: CreateCollectionDto, adminId?: string) {
    const existing = await this.prisma.collection.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Collection slug '${dto.slug}' already exists`);
    }

    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        slug: dto.slug,
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

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
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
        history: { orderBy: { createdAt: "asc" } },
        review: true,
        disputes: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    return order;
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
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, limit: take, offset: skip };
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
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment '${dto.paymentId}' not found`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException("Only successful payments can be refunded");
    }

    const refundAmount = dto.amountKobo || payment.amountKobo;
    const currency = payment.currency || "NGN";

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      // 2. If attached to order, update order status to REFUNDED
      if (payment.order) {
        await tx.order.update({
          where: { id: payment.order.id },
          data: {
            status: OrderStatus.REFUNDED,
            history: {
              create: [
                {
                  status: OrderStatus.REFUNDED,
                  note: `Refund issued: ${dto.reason} (${refundAmount} ${currency})`,
                  actorId: adminId,
                },
              ],
            },
          },
        });
      }

      // 3. Post double-entry refund ledger transaction
      await this.ledger.postTransaction(
        {
          reference: `refund:${payment.id}:${Date.now()}`,
          kind: "REFUND",
          description: `Refund for payment ${payment.reference}: ${dto.reason}`,
          paymentId: payment.id,
          entries: [
            {
              accountCode: `PLATFORM_REVENUE:${currency}`,
              direction: Direction.DEBIT,
              amountKobo: refundAmount,
            },
            {
              accountCode: `PROVIDER_CLEARING:${currency}`,
              direction: Direction.CREDIT,
              amountKobo: refundAmount,
            },
          ],
        },
        tx
      );

      await this.logAudit(adminId, "PAYMENT_REFUND", "Payment", payment.id, {
        amountKobo: refundAmount,
        reason: dto.reason,
      });

      return updatedPayment;
    });
  }

  // ==================== LEDGER & TRIAL BALANCE ====================

  async getLedgerReport() {
    const trialBalance = await this.ledger.getTrialBalance();
    const recentEntries = await this.prisma.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        account: true,
        transaction: true,
      },
    });

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
        createdAt: e.createdAt,
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

  async getEvents() {
    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        gifts: {
          where: { payment: { status: PaymentStatus.SUCCESS } },
          select: { amountKobo: true },
        },
        rsvps: {
          where: { response: "YES" },
          select: { id: true },
        },
      },
    });

    return events.map((ev) => {
      const totalReceivedKobo = ev.gifts.reduce(
        (sum, g) => sum + g.amountKobo,
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
        giftCount: ev.gifts.length,
        rsvpYesCount: ev.rsvps.length,
      };
    });
  }

  // ==================== PAYMENTS ====================

  async getPayments() {
    const payments = await this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return payments.map((p) => ({
      reference: p.reference,
      amountKobo: p.amountKobo,
      serviceFeeKobo: p.feeKobo,
      totalKobo: p.amountKobo + p.feeKobo,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  // ==================== PAYOUTS ====================

  async getPayouts() {
    const payouts = await this.prisma.payout.findMany({
      orderBy: { queuedAt: "desc" },
      take: 100,
      include: {
        event: { select: { name: true } },
      },
    });

    const userIds = Array.from(new Set(payouts.map((p) => p.userId)));
    const payoutAccountIds = Array.from(
      new Set(payouts.map((p) => p.payoutAccountId).filter(Boolean))
    );

    const [users, payoutAccounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      this.prisma.payoutAccount.findMany({
        where: { id: { in: payoutAccountIds } },
        select: { id: true, bankName: true, accountLast4: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const accountMap = new Map(payoutAccounts.map((a) => [a.id, a]));

    return payouts.map((p) => {
      const account = accountMap.get(p.payoutAccountId);
      let mappedStatus: "SENT" | "FAILED" | "PENDING" = "PENDING";
      if (p.status === "SUCCESS") mappedStatus = "SENT";
      else if (p.status === "FAILED") mappedStatus = "FAILED";

      return {
        id: p.id,
        eventName: p.event?.name || "Celebration Cash Gift Withdrawal",
        ownerName: userMap.get(p.userId) || "Host Beneficiary",
        bankName: account?.bankName || "Commercial Bank",
        accountNumberLast4: account?.accountLast4 || "••••",
        amountKobo: p.amountKobo,
        status: mappedStatus,
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

  async getVendors() {
    const vendors = await this.prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        products: { select: { id: true } },
      },
    });

    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.contactEmail,
      productCount: v.products.length,
      status: v.active
        ? ("VERIFIED" as const)
        : ("PENDING_REVIEW" as const),
    }));
  }
}
