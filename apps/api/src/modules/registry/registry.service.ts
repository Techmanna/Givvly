import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { calculateGiftFee, FeeConfig } from "@/common/utils/fees";
import { PurchaseItemGiftDto } from "./dto/purchase-item.dto";
import { EventStatus, GiftStatus, GiftType, ItemStatus, PaymentStatus } from "@prisma/client";
import * as crypto from "node:crypto";

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
        select: { id: true, slug: true, status: true, currency: true },
      }),
      this.prisma.registryItem.findUnique({
        where: { id: dto.registryItemId },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
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

    const gatewayResult = await gateway.initializePayment({
      customerEmail: dto.giverEmail,
      customerName: dto.isAnonymous ? "Anonymous" : dto.giverName,
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
        isAnonymous: dto.isAnonymous,
        giverName: dto.isAnonymous ? "Anonymous" : dto.giverName ?? "Anonymous",
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
          payerEmail: dto.giverEmail,
          metadata: {
            eventId: event.id,
            eventSlug: event.slug,
            kind: "PRODUCT",
            registryItemId: item.id,
            itemTitle: item.title,
            currency,
            provider: gateway.providerName,
            isAnonymous: dto.isAnonymous,
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
          giverName: dto.isAnonymous ? "Anonymous" : dto.giverName ?? "A Friend",
          giverEmail: dto.giverEmail,
          anonymous: dto.isAnonymous,
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
   * Background / Sweeper: Release all expired holds
   */
  async releaseExpiredReservations(): Promise<{ releasedCount: number }> {
    const now = new Date();
    const result = await this.prisma.registryItem.updateMany({
      where: {
        status: ItemStatus.RESERVED,
        reservedUntil: { lt: now },
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
          include: { product: true },
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

    const registry = event.registry.map((item) => ({
      id: item.id,
      title: item.title,
      productId: item.productId || undefined,
      priceKobo: item.priceKobo,
      imageUrl:
        item.imageKey ||
        (Array.isArray(item.product?.images)
          ? (item.product?.images[0] as string)
          : undefined),
      status: item.status,
      reservedUntil: item.reservedUntil?.toISOString() || undefined,
    }));

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
      return { registry, pools };
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
      await this.prisma.registryItem.delete({ where: { id: item.id } });
      return { deleted: true };
    }

    if (pool) {
      await this.prisma.pool.delete({ where: { id: pool.id } });
      return { deleted: true };
    }

    throw new NotFoundException("Registry item or pool not found");
  }
}

