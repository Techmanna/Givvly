import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { calculateGiftFee, FeeConfig } from "@/common/utils/fees";
import {
  PurchaseItemGiftDto,
  PurchaseItemsBatchDto,
  RedeemRegistryItemsDto,
} from "./dto/purchase-item.dto";
import {
  EventStatus,
  GiftStatus,
  GiftType,
  ItemStatus,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import * as crypto from "node:crypto";

const STANDARD_DELIVERY_FEE_KOBO = 250000; // ₦2,500 fallback when no shipping zone is selected

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);
  private readonly feeConfig: FeeConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly config: ConfigService
  ) {
    this.feeConfig = {
      feeMode: this.config.get("FEE_MODE", "GUEST_PAYS"),
      feeBps: this.config.get<number>("FEE_BPS", 150),
      feeFlatKobo: this.config.get<number>("FEE_FLAT_KOBO", 0),
      feeCapKobo: this.config.get<number>("FEE_CAP_KOBO", 200000),
    };
  }

  /**
   * Atomic Reservation of a Registry Item (Section 6.5 & 9.4)
   * Guaranteed concurrency-safe reservation with 10-minute hold
   */
  async reserveItem(slug: string, itemId: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This celebration is not currently accepting gifts");
    }

    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    const reservationToken = `res_${crypto.randomBytes(12).toString("hex")}`;

    // Atomic conditional statement: only updates if AVAILABLE or hold is expired
    const result = await this.prisma.registryItem.updateMany({
      where: {
        id: itemId,
        eventId: event.id,
        OR: [
          { status: ItemStatus.AVAILABLE },
          {
            status: ItemStatus.RESERVED,
            reservedUntil: { lt: now },
          },
          {
            status: ItemStatus.RESERVED,
            reservedUntil: null,
          },
        ],
      },
      data: {
        status: ItemStatus.RESERVED,
        reservedUntil: tenMinutesLater,
        reservationToken,
      },
    });

    if (result.count === 0) {
      // Check if claimed or still actively reserved
      const item = await this.prisma.registryItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new NotFoundException("Registry item not found");
      }

      if (item.status === ItemStatus.CLAIMED) {
        throw new ConflictException("This gift has already been claimed and purchased");
      }

      throw new ConflictException(
        "This gift is currently reserved by another guest. Please try again in a few minutes if their reservation expires."
      );
    }

    const item = await this.prisma.registryItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    this.logger.log(
      `Registry item '${itemId}' successfully reserved by token '${reservationToken}' until ${tenMinutesLater.toISOString()}`
    );

    return {
      itemId: item.id,
      title: item.title,
      priceKobo: item.priceKobo,
      reservationToken,
      reservedUntil: tenMinutesLater,
    };
  }

  /**
   * Atomic Batch Reservation of multiple Registry Items (10-minute shared hold)
   */
  async reserveItemsBatch(slug: string, itemIds: string[]) {
    const uniqueIds = Array.from(new Set(itemIds));
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This celebration is not currently accepting gifts");
    }

    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    const reservationToken = `res_${crypto.randomBytes(12).toString("hex")}`;

    const items = await this.prisma.$transaction(async (tx) => {
      const result = await tx.registryItem.updateMany({
        where: {
          id: { in: uniqueIds },
          eventId: event.id,
          OR: [
            { status: ItemStatus.AVAILABLE },
            {
              status: ItemStatus.RESERVED,
              reservedUntil: { lt: now },
            },
            {
              status: ItemStatus.RESERVED,
              reservedUntil: null,
            },
          ],
        },
        data: {
          status: ItemStatus.RESERVED,
          reservedUntil: tenMinutesLater,
          reservationToken,
        },
      });

      if (result.count !== uniqueIds.length) {
        const existing = await tx.registryItem.findMany({
          where: { id: { in: uniqueIds }, eventId: event.id },
          select: { id: true, title: true, status: true },
        });
        const claimed = existing.find(
          (i) => i.status === ItemStatus.CLAIMED || i.status === ItemStatus.REDEEMED
        );
        if (claimed) {
          throw new ConflictException(
            `'${claimed.title}' has already been claimed and purchased.`
          );
        }
        throw new ConflictException(
          "One or more selected gifts are unavailable or currently reserved by another guest."
        );
      }

      return tx.registryItem.findMany({
        where: { id: { in: uniqueIds }, eventId: event.id },
        orderBy: { position: "asc" },
      });
    });

    const totalKobo = items.reduce((sum, i) => sum + i.priceKobo, 0);

    return {
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        productId: i.productId || undefined,
        priceKobo: i.priceKobo,
        status: i.status,
        reservedUntil: i.reservedUntil?.toISOString(),
      })),
      totalKobo,
      reservationToken,
      reservedUntil: tenMinutesLater,
    };
  }

  /**
   * Purchase multiple reserved registry items in a single checkout
   */
  async purchaseRegistryItems(
    slug: string,
    dto: PurchaseItemsBatchDto,
    giverUserId?: string
  ) {
    const uniqueIds = Array.from(new Set(dto.itemIds));
    const [event, items] = await Promise.all([
      this.prisma.event.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          status: true,
          currency: true,
          ownerId: true,
          owner: { select: { email: true } },
        },
      }),
      this.prisma.registryItem.findMany({
        where: { id: { in: uniqueIds } },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    const giverEmailNormalized =
      (dto.giverEmail || dto.email)?.trim().toLowerCase() || "";
    if (
      (giverUserId && giverUserId === event.ownerId) ||
      (event.owner?.email &&
        giverEmailNormalized &&
        giverEmailNormalized === event.owner.email.toLowerCase())
    ) {
      throw new ForbiddenException(
        "You cannot purchase a registry gift for your own celebration"
      );
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This event is not currently accepting gifts");
    }

    if (items.length !== uniqueIds.length || items.some((i) => i.eventId !== event.id)) {
      throw new NotFoundException("One or more registry items were not found on this celebration");
    }

    const now = new Date();
    const claimed = items.find(
      (i) => i.status === ItemStatus.CLAIMED || i.status === ItemStatus.REDEEMED
    );
    if (claimed) {
      throw new ConflictException(`'${claimed.title}' has already been claimed and purchased`);
    }

    const invalidHold = items.find(
      (i) =>
        i.status !== ItemStatus.RESERVED ||
        i.reservationToken !== dto.reservationToken ||
        !i.reservedUntil ||
        i.reservedUntil < now
    );
    if (invalidHold) {
      throw new ConflictException(
        "Your reservation hold for one or more gifts has expired. Please select and reserve them again."
      );
    }

    const extendedHold = new Date(now.getTime() + 20 * 60 * 1000);
    await this.prisma.registryItem.updateMany({
      where: { id: { in: uniqueIds }, eventId: event.id },
      data: { reservedUntil: extendedHold },
    });

    const subtotalKobo = items.reduce((sum, i) => sum + i.priceKobo, 0);
    const currency = (event.currency || "NGN").toUpperCase();
    const feeResult = calculateGiftFee(subtotalKobo, this.feeConfig, currency);

    const gateway = this.gatewayRegistry.getGatewayForCurrency(currency);
    const reference = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const callbackUrl = dto.callbackUrl ?? `${appUrl}/events/${slug}?payment_ref=${reference}`;

    const giverEmail = (dto.giverEmail || dto.email)?.trim() || "";
    const isAnonymous = Boolean(dto.isAnonymous ?? dto.anonymous);
    const giverName = isAnonymous
      ? "Anonymous"
      : (dto.giverName || dto.name)?.trim() || "A Friend";
    const itemTitles = items.map((i) => i.title);

    const metadata = {
      eventId: event.id,
      eventSlug: event.slug,
      kind: "PRODUCT_BATCH",
      registryItemIds: uniqueIds,
      itemTitles,
      itemTitle:
        itemTitles.length === 1
          ? itemTitles[0]
          : `${itemTitles.length} registry items (${itemTitles.slice(0, 2).join(", ")}${itemTitles.length > 2 ? "..." : ""})`,
      currency,
      provider: gateway.providerName,
      isAnonymous,
      giverName,
      showOnWall: dto.showOnWall ?? true,
    };

    const gatewayResult = await gateway.initializePayment({
      customerEmail: giverEmail,
      customerName: giverName,
      amountSubunits: feeResult.totalKobo,
      currency,
      reference,
      callbackUrl,
      metadata,
    });

    const { payment, gift } = await this.prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          reference,
          provider: gateway.providerName,
          amountKobo: feeResult.totalKobo,
          feeKobo: feeResult.feeKobo,
          currency,
          status: PaymentStatus.INITIATED,
          accessCode: gatewayResult.accessCode,
          authorizationUrl: gatewayResult.authorizationUrl,
          payerEmail: giverEmail,
          metadata,
        },
      });

      const giftRecord = await tx.gift.create({
        data: {
          type: GiftType.PRODUCT,
          eventId: event.id,
          registryItemId: items[0].id,
          giverUserId,
          giverName,
          giverEmail,
          anonymous: isAnonymous,
          currency,
          message: dto.message,
          amountKobo: feeResult.payoutKobo,
          feeKobo: feeResult.feeKobo,
          status: GiftStatus.PENDING,
          paymentId: paymentRecord.id,
        },
      });

      return { payment: paymentRecord, gift: giftRecord };
    });

    this.logger.log(
      `Batch registry gift initialized: count=${items.length}, ref=${reference}, giftId=${gift.id}`
    );

    return {
      giftId: gift.id,
      registryItemIds: uniqueIds,
      reference: payment.reference,
      provider: payment.provider,
      currency: payment.currency,
      accessCode: payment.accessCode,
      authorizationUrl: payment.authorizationUrl,
      amountKobo: feeResult.amountKobo,
      feeKobo: feeResult.feeKobo,
      totalKobo: feeResult.totalKobo,
    };
  }

  /**
   * Purchase a reserved registry item
   */
  async purchaseRegistryItem(
    slug: string,
    dto: PurchaseItemGiftDto,
    giverUserId?: string
  ) {
    const [event, item] = await Promise.all([
      this.prisma.event.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          status: true,
          currency: true,
          ownerId: true,
          owner: { select: { email: true } },
        },
      }),
      this.prisma.registryItem.findUnique({
        where: { id: dto.registryItemId },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    const giverEmailNormalized =
      (dto.giverEmail || (dto as any).email)?.trim().toLowerCase() || "";
    if (
      (giverUserId && giverUserId === event.ownerId) ||
      (event.owner?.email &&
        giverEmailNormalized &&
        giverEmailNormalized === event.owner.email.toLowerCase())
    ) {
      throw new ForbiddenException(
        "You cannot purchase a registry gift for your own celebration"
      );
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This event is not currently accepting gifts");
    }

    const now = new Date();

    if (!item || item.eventId !== event.id) {
      throw new NotFoundException("Registry item not found on this celebration");
    }

    if (item.status === ItemStatus.CLAIMED) {
      throw new ConflictException("This gift has already been claimed and purchased");
    }

    // Verify hold token and expiration
    if (
      item.status !== ItemStatus.RESERVED ||
      item.reservationToken !== dto.reservationToken ||
      !item.reservedUntil ||
      item.reservedUntil < now
    ) {
      throw new ConflictException(
        "Your reservation hold for this gift has expired. Please reserve the item again."
      );
    }

    // Extend reservation window by 20 minutes to cover checkout completion
    const extendedHold = new Date(now.getTime() + 20 * 60 * 1000);
    await this.prisma.registryItem.update({
      where: { id: item.id },
      data: { reservedUntil: extendedHold },
    });

    // Decoupled currency & fee calculation
    const currency = (event.currency || "NGN").toUpperCase();
    const feeResult = calculateGiftFee(item.priceKobo, this.feeConfig, currency);

    // Resolve gateway
    const gateway = this.gatewayRegistry.getGatewayForCurrency(currency);
    const reference = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const callbackUrl = dto.callbackUrl ?? `${appUrl}/events/${slug}?payment_ref=${reference}`;

    const giverEmail = (dto.giverEmail || (dto as any).email)?.trim() || "";
    const isAnonymous = Boolean(dto.isAnonymous ?? (dto as any).anonymous);
    const giverName = isAnonymous
      ? "Anonymous"
      : (dto.giverName || (dto as any).name)?.trim() || "A Friend";

    const gatewayResult = await gateway.initializePayment({
      customerEmail: giverEmail,
      customerName: giverName,
      amountSubunits: feeResult.totalKobo,
      currency,
      reference,
      callbackUrl,
      metadata: {
        eventId: event.id,
        eventSlug: event.slug,
        kind: "PRODUCT",
        registryItemId: item.id,
        itemTitle: item.title,
        currency,
        provider: gateway.providerName,
        isAnonymous,
        giverName,
        showOnWall: dto.showOnWall,
      },
    });

    // In atomic database transaction, record Payment and Gift
    const { payment, gift } = await this.prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          reference,
          provider: gateway.providerName,
          amountKobo: feeResult.totalKobo,
          feeKobo: feeResult.feeKobo,
          currency,
          status: PaymentStatus.INITIATED,
          accessCode: gatewayResult.accessCode,
          authorizationUrl: gatewayResult.authorizationUrl,
          payerEmail: giverEmail,
          metadata: {
            eventId: event.id,
            eventSlug: event.slug,
            kind: "PRODUCT",
            registryItemId: item.id,
            itemTitle: item.title,
            currency,
            provider: gateway.providerName,
            isAnonymous,
            showOnWall: dto.showOnWall,
          },
        },
      });

      const giftRecord = await tx.gift.create({
        data: {
          type: GiftType.PRODUCT,
          eventId: event.id,
          registryItemId: item.id,
          giverUserId,
          giverName,
          giverEmail,
          anonymous: isAnonymous,
          currency,
          message: dto.message,
          amountKobo: feeResult.payoutKobo,
          feeKobo: feeResult.feeKobo,
          status: GiftStatus.PENDING,
          paymentId: paymentRecord.id,
        },
      });

      return { payment: paymentRecord, gift: giftRecord };
    });

    this.logger.log(
      `Registry gift initialized: item=${item.title}, ref=${reference}, giftId=${gift.id}`
    );

    return {
      giftId: gift.id,
      registryItemId: item.id,
      reference: payment.reference,
      provider: payment.provider,
      currency: payment.currency,
      accessCode: payment.accessCode,
      authorizationUrl: payment.authorizationUrl,
      amountKobo: feeResult.amountKobo,
      feeKobo: feeResult.feeKobo,
      totalKobo: feeResult.totalKobo,
    };
  }

  /**
   * Background / Sweeper: Release all expired holds every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations(): Promise<{ releasedCount: number }> {
    const now = new Date();
    const result = await this.prisma.registryItem.updateMany({
      where: {
        status: ItemStatus.RESERVED,
        OR: [{ reservedUntil: { lt: now } }, { reservedUntil: null }],
      },
      data: {
        status: ItemStatus.AVAILABLE,
        reservationToken: null,
        reservedUntil: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Released ${result.count} expired registry item holds`);
    }

    return { releasedCount: result.count };
  }

  // --- Host / Owner Registry Management ---

  async getOwnerRegistry(eventId: string, userId: string, includePools = true) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
      include: {
        registry: {
          include: {
            product: true,
            claimedGift: {
              select: {
                id: true,
                giverName: true,
                anonymous: true,
                message: true,
              },
            },
            redeemedOrder: {
              select: {
                id: true,
                number: true,
                status: true,
                trackingToken: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
        pools: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Reconcile any CLAIMED items that already have a confirmed/paid REGISTRY_REDEMPTION order
    const unlinkedClaimedIds = event.registry
      .filter((i) => i.status === ItemStatus.CLAIMED && !i.redeemedOrderId)
      .map((i) => i.id);

    const reconciledOrderByItemId = new Map<
      string,
      { id: string; number: string; status: OrderStatus; trackingToken: string; createdAt: Date }
    >();

    if (unlinkedClaimedIds.length > 0) {
      const paidRedemptionOrders = await this.prisma.order.findMany({
        where: {
          eventId: event.id,
          status: {
            in: [
              OrderStatus.CONFIRMED,
              OrderStatus.PACKED,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ],
          },
        },
        select: {
          id: true,
          number: true,
          status: true,
          trackingToken: true,
          createdAt: true,
          customWishData: true,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const ord of paidRedemptionOrders) {
        const meta = ord.customWishData as
          | { kind?: string; registryItemIds?: string[] }
          | null
          | undefined;
        if (
          meta?.kind === "REGISTRY_REDEMPTION" &&
          Array.isArray(meta.registryItemIds)
        ) {
          const matchedIds = meta.registryItemIds.filter((id) =>
            unlinkedClaimedIds.includes(id)
          );
          if (matchedIds.length > 0) {
            await this.prisma.registryItem.updateMany({
              where: { id: { in: matchedIds }, status: ItemStatus.CLAIMED },
              data: {
                status: ItemStatus.REDEEMED,
                redeemedOrderId: ord.id,
                redeemedAt: ord.createdAt,
              },
            });
            for (const id of matchedIds) {
              if (!reconciledOrderByItemId.has(id)) {
                reconciledOrderByItemId.set(id, ord);
              }
            }
          }
        }
      }
    }

    const now = new Date();
    const registry = event.registry.map((item) => {
      const isExpiredReserve =
        item.status === ItemStatus.RESERVED &&
        (!item.reservedUntil || item.reservedUntil < now);
      const reconciledOrder = reconciledOrderByItemId.get(item.id);
      const effectiveStatus = reconciledOrder
        ? ItemStatus.REDEEMED
        : isExpiredReserve
          ? ItemStatus.AVAILABLE
          : item.status;

      return {
        id: item.id,
        title: item.title,
        productId: item.productId || undefined,
        priceKobo: item.priceKobo,
        imageUrl:
          item.imageKey ||
          (Array.isArray(item.product?.images)
            ? (item.product?.images[0] as string)
            : undefined),
        status: effectiveStatus,
        reservedUntil: isExpiredReserve
          ? undefined
          : item.reservedUntil?.toISOString() || undefined,
        redeemedOrderId:
          item.redeemedOrderId || reconciledOrder?.id || undefined,
        redeemedOrderNumber:
          item.redeemedOrder?.number || reconciledOrder?.number || undefined,
        redeemedOrderStatus:
          item.redeemedOrder?.status || reconciledOrder?.status || undefined,
        redeemedTrackingToken:
          item.redeemedOrder?.trackingToken ||
          reconciledOrder?.trackingToken ||
          undefined,
        redeemedAt:
          item.redeemedAt?.toISOString() ||
          reconciledOrder?.createdAt.toISOString() ||
          undefined,
        claimedByName: item.claimedGift
          ? item.claimedGift.anonymous
            ? "Anonymous"
            : item.claimedGift.giverName || "A Friend"
          : undefined,
      };
    });

    const pools = event.pools.map((pool) => ({
      id: pool.id,
      title: pool.title,
      productId: pool.productId || undefined,
      priceKobo: pool.targetKobo,
      targetKobo: pool.targetKobo,
      raisedKobo: pool.raisedKobo,
      mode: pool.mode,
      deadline: pool.deadline?.toISOString() || undefined,
      status: pool.status === "OPEN" ? "AVAILABLE" : pool.status,
    }));

    if (includePools) {
      return { eventStatus: event.status, registry, pools };
    }
    return registry;
  }

  async createOwnerRegistryItem(
    eventId: string,
    userId: string,
    payload: {
      title: string;
      priceKobo: number;
      productId?: string;
      isPool?: boolean;
      poolMode?: "PRODUCT" | "CASH";
      deadline?: string;
    }
  ) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (
      event.status === EventStatus.ARCHIVED ||
      event.status === EventStatus.CLOSED
    ) {
      throw new BadRequestException(
        `Registry additions are disabled because this celebration is ${event.status.toLowerCase()}.`
      );
    }

    if (payload.isPool) {
      const pool = await this.prisma.pool.create({
        data: {
          eventId: event.id,
          productId: payload.productId || null,
          title: payload.title.trim(),
          mode: payload.poolMode || "CASH",
          targetKobo: payload.priceKobo,
          raisedKobo: 0,
          deadline: payload.deadline ? new Date(payload.deadline) : null,
          status: "OPEN",
        },
      });

      return {
        id: pool.id,
        title: pool.title,
        productId: pool.productId || undefined,
        priceKobo: pool.targetKobo,
        targetKobo: pool.targetKobo,
        raisedKobo: pool.raisedKobo,
        mode: pool.mode,
        deadline: pool.deadline?.toISOString() || undefined,
        status: "AVAILABLE",
      };
    }

    const count = await this.prisma.registryItem.count({
      where: { eventId: event.id },
    });

    const item = await this.prisma.registryItem.create({
      data: {
        eventId: event.id,
        productId: payload.productId || null,
        title: payload.title.trim(),
        priceKobo: payload.priceKobo,
        position: count + 1,
        status: "AVAILABLE",
      },
    });

    return {
      id: item.id,
      title: item.title,
      productId: item.productId || undefined,
      priceKobo: item.priceKobo,
      status: item.status,
    };
  }

  async updateOwnerRegistryItem(
    eventId: string,
    itemId: string,
    userId: string,
    payload: {
      mode?: "PRODUCT" | "CASH";
      status?: "AVAILABLE" | "RESERVED" | "CLAIMED";
    }
  ) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const [item, pool] = await Promise.all([
      this.prisma.registryItem.findFirst({
        where: { id: itemId, eventId: event.id },
      }),
      this.prisma.pool.findFirst({
        where: { id: itemId, eventId: event.id },
      }),
    ]);

    if (item) {
      const updated = await this.prisma.registryItem.update({
        where: { id: item.id },
        data: {
          status: (payload.status as any) || item.status,
        },
      });
      return {
        id: updated.id,
        title: updated.title,
        productId: updated.productId || undefined,
        priceKobo: updated.priceKobo,
        status: updated.status,
      };
    }

    if (pool) {
      const updatedPool = await this.prisma.pool.update({
        where: { id: pool.id },
        data: {
          mode: payload.mode || pool.mode,
        },
      });
      return {
        id: updatedPool.id,
        title: updatedPool.title,
        productId: updatedPool.productId || undefined,
        priceKobo: updatedPool.targetKobo,
        targetKobo: updatedPool.targetKobo,
        raisedKobo: updatedPool.raisedKobo,
        mode: updatedPool.mode,
        deadline: updatedPool.deadline?.toISOString() || undefined,
        status: updatedPool.status === "OPEN" ? "AVAILABLE" : updatedPool.status,
      };
    }

    throw new NotFoundException("Registry item or pool not found");
  }

  async deleteOwnerRegistryItem(
    eventId: string,
    itemId: string,
    userId: string
  ) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const [item, pool] = await Promise.all([
      this.prisma.registryItem.findFirst({
        where: { id: itemId, eventId: event.id },
      }),
      this.prisma.pool.findFirst({
        where: { id: itemId, eventId: event.id },
      }),
    ]);

    if (item) {
      if (
        item.status === ItemStatus.CLAIMED ||
        item.status === ItemStatus.REDEEMED
      ) {
        throw new ConflictException(
          "Cannot delete a registry item that has already been paid for or redeemed."
        );
      }
      await this.prisma.registryItem.delete({ where: { id: item.id } });
      return { deleted: true };
    }

    if (pool) {
      await this.prisma.pool.delete({ where: { id: pool.id } });
      return { deleted: true };
    }

    throw new NotFoundException("Registry item or pool not found");
  }

  /**
   * Host / Creator Checkout: Redeem claimed registry items, specify delivery address,
   * and pay the applicable delivery fee to create the fulfillment order.
   */
  async redeemRegistryItems(
    eventId: string,
    userId: string,
    dto: RedeemRegistryItemsDto
  ) {
    const uniqueIds = Array.from(new Set(dto.itemIds));
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
      include: {
        owner: {
          select: { id: true, email: true, name: true, phone: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const items = await this.prisma.registryItem.findMany({
      where: {
        id: { in: uniqueIds },
        eventId: event.id,
      },
    });

    if (items.length !== uniqueIds.length) {
      throw new NotFoundException("One or more registry items were not found on this event");
    }

    const unredeemable = items.find(
      (i) => i.status !== ItemStatus.CLAIMED || Boolean(i.redeemedOrderId)
    );
    if (unredeemable) {
      throw new ConflictException(
        `'${unredeemable.title}' is not eligible for redemption (status: ${unredeemable.status}).`
      );
    }

    let selectedShippingZone: { id: string; name: string; priceKobo: number; enabled: boolean } | null = null;
    if (dto.shippingZoneId) {
      selectedShippingZone = await this.prisma.shippingZone.findUnique({
        where: { id: dto.shippingZoneId },
      });
      if (!selectedShippingZone || !selectedShippingZone.enabled) {
        throw new BadRequestException("Selected shipping zone is unavailable.");
      }
    }

    const deliveryFeeKobo = selectedShippingZone
      ? selectedShippingZone.priceKobo
      : STANDARD_DELIVERY_FEE_KOBO;

    const prePaidItemsSubtotalKobo = items.reduce((sum, i) => sum + i.priceKobo, 0);
    const currency = (event.currency || "NGN").toUpperCase();
    const orderYear = new Date().getFullYear();
    const orderHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `GV-${orderYear}-${orderHex}`;
    const trackingToken = `trk_${crypto.randomBytes(12).toString("hex")}`;
    const now = new Date();

    const customWishData = {
      kind: "REGISTRY_REDEMPTION",
      eventId: event.id,
      eventSlug: event.slug,
      registryItemIds: uniqueIds,
      prePaidItemsSubtotalKobo,
    };

    if (deliveryFeeKobo <= 0) {
      const order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            number: orderNumber,
            buyerUserId: userId,
            buyerEmail: event.owner.email,
            eventId: event.id,
            recipientName: dto.recipientName.trim(),
            recipientPhone: dto.recipientPhone.trim(),
            recipientEmail: event.owner.email,
            address: {
              address: dto.recipientAddress.trim(),
              area: dto.recipientArea?.trim() || undefined,
              city: dto.recipientCity.trim(),
              state: dto.recipientState.trim(),
            },
            giftNote: dto.deliveryNotes?.trim() || undefined,
            shippingZoneId: selectedShippingZone?.id ?? null,
            shippingZoneName: selectedShippingZone?.name ?? null,
            status: OrderStatus.CONFIRMED,
            subtotalKobo: 0,
            deliveryFeeKobo: 0,
            totalKobo: 0,
            feeKobo: 0,
            customWishData,
            trackingToken,
            items: {
              create: items.map((item) => ({
                productId: item.productId ?? item.id,
                title: item.title,
                unitPriceKobo: item.priceKobo,
                qty: 1,
              })),
            },
            history: {
              create: [
                {
                  status: OrderStatus.CONFIRMED,
                  note: `Creator redeemed ${items.length} claimed registry item(s) with free delivery`,
                  actorId: userId,
                },
              ],
            },
          },
          include: { items: true },
        });

        await tx.registryItem.updateMany({
          where: { id: { in: uniqueIds }, eventId: event.id },
          data: {
            status: ItemStatus.REDEEMED,
            redeemedOrderId: created.id,
            redeemedAt: now,
          },
        });

        return created;
      });

      this.logger.log(
        `Creator redeemed ${items.length} registry items (free delivery) -> order ${order.number}`
      );

      return {
        order,
        requiresPayment: false,
        paymentDetails: null,
      };
    }

    const gateway = this.gatewayRegistry.getGatewayForCurrency(currency);
    const reference = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const callbackUrl =
      dto.callbackUrl ?? `${appUrl}/dashboard/events/${event.id}?payment_ref=${reference}`;

    const metadata = {
      kind: "REGISTRY_REDEMPTION",
      eventId: event.id,
      eventSlug: event.slug,
      userId,
      registryItemIds: uniqueIds,
      currency,
      provider: gateway.providerName,
    };

    const gatewayResult = await gateway.initializePayment({
      customerEmail: event.owner.email,
      customerName: event.owner.name || dto.recipientName.trim(),
      amountSubunits: deliveryFeeKobo,
      currency,
      reference,
      callbackUrl,
      metadata,
    });

    const { order, payment } = await this.prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          reference,
          provider: gateway.providerName,
          amountKobo: deliveryFeeKobo,
          feeKobo: 0,
          currency,
          status: PaymentStatus.INITIATED,
          accessCode: gatewayResult.accessCode,
          authorizationUrl: gatewayResult.authorizationUrl,
          payerEmail: event.owner.email,
          metadata,
        },
      });

      const orderRecord = await tx.order.create({
        data: {
          number: orderNumber,
          buyerUserId: userId,
          buyerEmail: event.owner.email,
          eventId: event.id,
          recipientName: dto.recipientName.trim(),
          recipientPhone: dto.recipientPhone.trim(),
          recipientEmail: event.owner.email,
          address: {
            address: dto.recipientAddress.trim(),
            city: dto.recipientCity.trim(),
            state: dto.recipientState.trim(),
          },
          giftNote: dto.deliveryNotes?.trim() || undefined,
          shippingZoneId: selectedShippingZone?.id ?? null,
          shippingZoneName: selectedShippingZone?.name ?? null,
          status: OrderStatus.PENDING_PAYMENT,
          subtotalKobo: 0,
          deliveryFeeKobo,
          totalKobo: deliveryFeeKobo,
          feeKobo: 0,
          paymentId: paymentRecord.id,
          customWishData,
          trackingToken,
          items: {
            create: items.map((item) => ({
              productId: item.productId ?? item.id,
              title: item.title,
              unitPriceKobo: item.priceKobo,
              qty: 1,
            })),
          },
          history: {
            create: [
              {
                status: OrderStatus.PENDING_PAYMENT,
                note: `Creator initiated delivery checkout for ${items.length} claimed registry item(s)`,
                actorId: userId,
              },
            ],
          },
        },
        include: { items: true },
      });

      return { order: orderRecord, payment: paymentRecord };
    });

    this.logger.log(
      `Creator initiated registry redemption order ${order.number} (deliveryFee=${deliveryFeeKobo})`
    );

    return {
      order,
      requiresPayment: true,
      paymentDetails: {
        reference: payment.reference,
        provider: payment.provider,
        currency: payment.currency,
        accessCode: payment.accessCode,
        authorizationUrl: payment.authorizationUrl,
        amountKobo: deliveryFeeKobo,
      },
    };
  }
}

