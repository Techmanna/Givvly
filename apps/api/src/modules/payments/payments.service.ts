import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { getCurrencyConfig } from "@/common/currency/currency.types";
import { calculateGiftFee, FeeConfig } from "@/common/utils/fees";
import { CreateMoneyGiftDto } from "./dto/create-money-gift.dto";
import {
  EventStatus,
  GiftStatus,
  GiftType,
  ItemStatus,
  PaymentStatus,
  PostStatus,
} from "@prisma/client";
import * as crypto from "node:crypto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly feeConfig: FeeConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService
  ) {
    this.feeConfig = {
      feeMode: this.config.get("FEE_MODE", "GUEST_PAYS"),
      feeBps: this.config.get<number>("FEE_BPS", 150),
      feeFlatKobo: this.config.get<number>("FEE_FLAT_KOBO", 0),
      feeCapKobo: this.config.get<number>("FEE_CAP_KOBO", 200000),
    };
  }

  /**
   * Initialize a money gift payment for an event
   */
  async initializeMoneyGift(
    slug: string,
    dto: CreateMoneyGiftDto,
    giverUserId?: string
  ) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        status: true,
        date: true,
        currency: true,
        ownerId: true,
        owner: { select: { email: true } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with slug '${slug}' not found`);
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
        "You cannot send a gift to your own celebration"
      );
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This event is not currently accepting gifts");
    }

    // Check if event is past grace period (default 30 days after event date)
    const now = new Date();
    const graceCutoff = new Date(event.date.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (now > graceCutoff) {
      throw new BadRequestException("The gifting window for this celebration has closed");
    }

    // Decoupled Currency Handling: Default to event currency or NGN
    const currency = (dto.currency || event.currency || "NGN").toUpperCase();
    const currencyConfig = getCurrencyConfig(currency);

    // Validate min/max limits for selected currency
    if (
      dto.amountKobo < currencyConfig.minGiftSubunits ||
      dto.amountKobo > currencyConfig.maxGiftSubunits
    ) {
      throw new BadRequestException(
        `Gift amount must be between ${currencyConfig.symbol}${(
          currencyConfig.minGiftSubunits / currencyConfig.subunitFactor
        ).toLocaleString()} and ${currencyConfig.symbol}${(
          currencyConfig.maxGiftSubunits / currencyConfig.subunitFactor
        ).toLocaleString()} ${currency}`
      );
    }

    // Calculate fee & totals for currency
    const feeResult = calculateGiftFee(dto.amountKobo, this.feeConfig, currency);

    // Resolve Payment Gateway Adapter for currency
    const gateway = this.gatewayRegistry.getGatewayForCurrency(
      currency,
      dto.provider
    );

    // Generate unique payment reference
    const reference = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const giverEmail = (dto.giverEmail || (dto as any).email)?.trim() || "";
    const isAnonymous = Boolean(dto.isAnonymous ?? (dto as any).anonymous);
    const giverName = isAnonymous
      ? "Anonymous"
      : (dto.giverName || (dto as any).name)?.trim() || "A Friend";

    // Initialize checkout with gateway
    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const callbackUrl = dto.callbackUrl ?? `${appUrl}/events/${slug}?payment_ref=${reference}`;

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
        kind: "MONEY",
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
            kind: "MONEY",
            currency,
            provider: gateway.providerName,
            isAnonymous,
            showOnWall: dto.showOnWall,
          },
        },
      });

      const giftRecord = await tx.gift.create({
        data: {
          type: GiftType.MONEY,
          eventId: event.id,
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
      `Money gift initialized: provider=${gateway.providerName}, currency=${currency}, ref=${reference}, giftId=${gift.id}, total=${feeResult.totalKobo}`
    );

    return {
      giftId: gift.id,
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
   * Get payment status by reference (for guest polling)
   */
  async getPaymentByReference(reference: string) {
    let payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        gift: {
          include: {
            event: {
              select: {
                id: true,
                slug: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with reference '${reference}' not found`);
    }

    // If still INITIATED or PENDING, attempt on-demand verification with the gateway
    if (payment.status === PaymentStatus.INITIATED || payment.status === PaymentStatus.PENDING) {
      try {
        const currency = payment.currency || "NGN";
        const gateway = this.gatewayRegistry.getGatewayForCurrency(currency, payment.provider);
        const verifyRes = await gateway.verifyPayment(payment.reference);
        if (verifyRes.status === "success") {
          if (verifyRes.amountSubunits === undefined || verifyRes.amountSubunits === payment.amountKobo) {
            await this.prisma.$transaction(async (tx) => {
              await tx.payment.update({
                where: { id: payment!.id },
                data: {
                  status: PaymentStatus.SUCCESS,
                  paidAt: verifyRes.paidAt ?? new Date(),
                  channel: verifyRes.channel || "card",
                  providerFeeKobo: verifyRes.feesSubunits,
                },
              });
              if (payment!.gift) {
                const gift = payment!.gift;
                await tx.gift.update({
                  where: { id: gift.id },
                  data: { status: GiftStatus.PAID },
                });

                const meta = (payment!.metadata as any) || {};
                const metaItemIds = Array.isArray(meta.registryItemIds)
                  ? (meta.registryItemIds as string[])
                  : [];
                const targetRegistryItemIds =
                  metaItemIds.length > 0
                    ? metaItemIds
                    : gift.registryItemId
                      ? [gift.registryItemId]
                      : [];

                if (gift.type === GiftType.PRODUCT && targetRegistryItemIds.length > 0) {
                  await tx.registryItem.updateMany({
                    where: {
                      id: { in: targetRegistryItemIds },
                      status: { in: [ItemStatus.AVAILABLE, ItemStatus.RESERVED] },
                    },
                    data: {
                      status: ItemStatus.CLAIMED,
                      claimedGiftId: gift.id,
                      reservationToken: null,
                      reservedUntil: null,
                    },
                  });
                }

                if (gift.event?.id) {
                  const existingPost = await tx.wallPost.findUnique({
                    where: { giftId: gift.id },
                    select: { id: true },
                  });
                  if (!existingPost) {
                    const itemTitle = meta.itemTitle as string | undefined;
                    const poolTitle = meta.poolTitle as string | undefined;
                    const defaultActivityText =
                      gift.type === GiftType.PRODUCT
                        ? itemTitle
                          ? `Gifted ${itemTitle} from the registry`
                          : "Gifted an item from the registry"
                        : gift.type === GiftType.POOL
                          ? poolTitle
                            ? `Contributed to ${poolTitle}`
                            : "Contributed to a group gift"
                          : "Sent a cash gift to celebrate!";
                    await tx.wallPost.create({
                      data: {
                        eventId: gift.event.id,
                        authorName: gift.anonymous
                          ? "Anonymous"
                          : gift.giverName ?? "A Friend",
                        authorEmail: gift.giverEmail,
                        text: gift.message?.trim() || defaultActivityText,
                        giftId: gift.id,
                        status: PostStatus.VISIBLE,
                      },
                    });
                  }
                }
              }
            });
            const refreshed = await this.prisma.payment.findUnique({
              where: { reference },
              include: {
                gift: {
                  include: {
                    event: {
                      select: {
                        id: true,
                        slug: true,
                        name: true,
                        owner: {
                          select: {
                            id: true,
                            email: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            });
            if (refreshed) {
              payment = refreshed;
            }

            if (this.notifications && payment.gift) {
              const settledGift = payment.gift;
              const giverDisplayName = settledGift.anonymous
                ? "A Friend"
                : settledGift.giverName || "A Friend";
              const eventName = settledGift.event?.name || "Celebration";
              const eventSlug = settledGift.event?.slug;
              const eventId = settledGift.event?.id;
              const owner = settledGift.event?.owner;
              const currencyCode = payment.currency || "NGN";

              void Promise.allSettled([
                ...(payment.payerEmail
                  ? [
                      this.notifications.sendGiftReceiptEmail(
                        payment.payerEmail,
                        giverDisplayName,
                        eventName,
                        settledGift.amountKobo,
                        currencyCode,
                        payment.reference
                      ),
                    ]
                  : []),
                ...(owner?.email
                  ? [
                      this.notifications.sendHostGiftReceivedEmail(
                        owner.email,
                        owner.id,
                        owner.name || "Host",
                        giverDisplayName,
                        settledGift.amountKobo,
                        currencyCode,
                        settledGift.message || undefined,
                        eventName,
                        eventSlug,
                        eventId
                      ),
                    ]
                  : []),
              ]).catch((err) => {
                this.logger.warn(
                  `Failed to dispatch gift notification emails for ${payment?.reference}: ${err?.message ?? err}`
                );
              });
            }
          }
        } else if (verifyRes.status === "failed") {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.FAILED },
          });
          payment.status = PaymentStatus.FAILED;
        }
      } catch (err) {
        // Verification call error or not yet paid, retain current status
      }
    }

    // Idempotent repair: if payment already succeeded via on-demand verify before webhook, ensure registry items & wall post are settled
    if (payment.status === PaymentStatus.SUCCESS && payment.gift) {
      const meta = (payment.metadata as any) || {};
      const metaItemIds = Array.isArray(meta.registryItemIds)
        ? (meta.registryItemIds as string[])
        : [];
      const targetRegistryItemIds =
        metaItemIds.length > 0
          ? metaItemIds
          : payment.gift.registryItemId
            ? [payment.gift.registryItemId]
            : [];

      if (payment.gift.type === GiftType.PRODUCT && targetRegistryItemIds.length > 0) {
        await this.prisma.registryItem.updateMany({
          where: {
            id: { in: targetRegistryItemIds },
            status: { in: [ItemStatus.AVAILABLE, ItemStatus.RESERVED] },
          },
          data: {
            status: ItemStatus.CLAIMED,
            claimedGiftId: payment.gift.id,
            reservationToken: null,
            reservedUntil: null,
          },
        });
      }
    }

    const giftAmountKobo =
      payment.gift?.amountKobo ?? Math.max(0, payment.amountKobo - payment.feeKobo);
    const serviceFeeKobo = payment.feeKobo;
    const totalKobo = payment.amountKobo;

    const mappedStatus =
      payment.status === PaymentStatus.SUCCESS
        ? "SUCCESS"
        : payment.status === PaymentStatus.FAILED
        ? "FAILED"
        : "PENDING";

    const isAnonymous = Boolean(payment.gift?.anonymous);
    const giverName = isAnonymous
      ? null
      : payment.gift?.giverName ?? (payment.metadata as any)?.giverName ?? null;

    const meta = (payment.metadata as any) || {};
    const itemTitles: string[] | undefined = Array.isArray(meta.itemTitles)
      ? meta.itemTitles
      : meta.itemTitle
        ? [String(meta.itemTitle)]
        : undefined;

    return {
      reference: payment.reference,
      accessCode: payment.accessCode ?? "",
      authorizationUrl: payment.authorizationUrl ?? "",
      status: mappedStatus,
      amountKobo: giftAmountKobo,
      serviceFeeKobo,
      totalKobo,
      feeKobo: serviceFeeKobo,
      currency: payment.currency,
      channel: payment.channel,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: (payment.createdAt ?? payment.paidAt ?? new Date()).toISOString(),
      eventSlug: payment.gift?.event?.slug,
      eventName: payment.gift?.event?.name,
      giverName,
      anonymous: isAnonymous,
      message: payment.gift?.message ?? meta.message ?? null,
      giftType: payment.gift?.type ?? null,
      itemTitle: (meta.itemTitle as string | undefined) ?? itemTitles?.[0] ?? null,
      itemTitles: itemTitles ?? null,
      poolTitle: (meta.poolTitle as string | undefined) ?? null,
      gift: payment.gift
        ? {
            id: payment.gift.id,
            status: payment.gift.status,
            amountKobo: payment.gift.amountKobo,
            eventSlug: payment.gift.event?.slug,
            eventName: payment.gift.event?.name,
          }
        : null,
    };
  }
}
