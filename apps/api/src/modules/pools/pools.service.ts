import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { LedgerService } from "@/modules/ledger/ledger.service";
import { calculateGiftFee, FeeConfig } from "@/common/utils/fees";
import { ContributePoolDto } from "./dto/contribute-pool.dto";
import {
  Direction,
  EventStatus,
  GiftStatus,
  GiftType,
  PaymentStatus,
  PayoutStatus,
  PoolMode,
  PoolStatus,
} from "@prisma/client";
import * as crypto from "node:crypto";

@Injectable()
export class PoolsService {
  private readonly logger = new Logger(PoolsService.name);
  private readonly feeConfig: FeeConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly ledger: LedgerService,
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
   * Contribute to a group pool with concurrency & overfunding guards (Section 9.5)
   */
  async contributeToPool(
    slug: string,
    dto: ContributePoolDto,
    giverUserId?: string
  ) {
    const [event, pool] = await Promise.all([
      this.prisma.event.findUnique({
        where: { slug },
        select: { id: true, slug: true, status: true, currency: true },
      }),
      this.prisma.pool.findUnique({
        where: { id: dto.poolId },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This celebration is not currently accepting gifts");
    }

    if (!pool || pool.eventId !== event.id) {
      throw new NotFoundException("Pool not found on this celebration");
    }

    const now = new Date();
    if (pool.status !== PoolStatus.OPEN) {
      throw new BadRequestException(
        `This group gift is no longer accepting contributions (status: ${pool.status})`
      );
    }

    if (pool.deadline && pool.deadline < now) {
      throw new BadRequestException("The deadline for this group gift has passed");
    }

    const currency = (event.currency || "NGN").toUpperCase();
    const pendingCutoff = new Date(now.getTime() - 20 * 60 * 1000);

    const validatePoolCapacity = async (client: any, targetPool: typeof pool) => {
      const pendingAgg = await client.gift.aggregate({
        where: {
          poolId: targetPool.id,
          status: GiftStatus.PENDING,
          createdAt: { gte: pendingCutoff },
        },
        _sum: { amountKobo: true },
      });

      const pendingKobo = pendingAgg._sum.amountKobo ?? 0;
      const totalCommitted = targetPool.raisedKobo + pendingKobo;

      if (!targetPool.allowOverfund) {
        const remainingKobo = targetPool.targetKobo - totalCommitted;
        if (dto.amountKobo > remainingKobo) {
          throw new ConflictException({
            code: "POOL_OVERFUNDED",
            message: `Contribution of ${dto.amountKobo} exceeds remaining target. Maximum acceptable contribution is ${Math.max(
              0,
              remainingKobo
            )}.`,
            remainingKobo: Math.max(0, remainingKobo),
          });
        }
      }
    };

    // Pre-validate capacity before external gateway call
    await validatePoolCapacity(this.prisma, pool);

    const feeResult = calculateGiftFee(
      dto.amountKobo,
      this.feeConfig,
      currency
    );

    const gateway = this.gatewayRegistry.getGatewayForCurrency(currency);
    const reference = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
    const callbackUrl =
      dto.callbackUrl ?? `${appUrl}/events/${slug}?payment_ref=${reference}`;

    const giverEmail = (dto.giverEmail || (dto as any).email)?.trim() || "";
    const isAnonymous = Boolean(dto.isAnonymous ?? (dto as any).anonymous);
    const giverName = isAnonymous
      ? "Anonymous"
      : (dto.giverName || (dto as any).name)?.trim() || "A Friend";

    // Initialize payment outside DB transaction to avoid holding DB connections during network I/O
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
        kind: "POOL",
        poolId: pool.id,
        poolTitle: pool.title,
        poolMode: pool.mode,
        currency,
        provider: gateway.providerName,
        isAnonymous,
        giverName,
        showOnWall: dto.showOnWall,
      },
    });

    // Atomically re-verify overfunding guard and create Payment + Gift in a single transaction
    const { payment, gift } = await this.prisma.$transaction(async (tx) => {
      const freshPool = await tx.pool.findUnique({
        where: { id: pool.id },
      });

      if (!freshPool || freshPool.status !== PoolStatus.OPEN) {
        throw new BadRequestException(
          `This group gift is no longer accepting contributions`
        );
      }

      await validatePoolCapacity(tx, freshPool);

      const paymentRecord = await tx.payment.create({
        data: {
          reference,
          provider: "PAYSTACK",
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
            kind: "POOL",
            poolId: pool.id,
            poolTitle: pool.title,
            poolMode: pool.mode,
            currency,
            isAnonymous,
            showOnWall: dto.showOnWall,
          },
        },
      });

      const giftRecord = await tx.gift.create({
        data: {
          type: GiftType.POOL,
          eventId: event.id,
          poolId: pool.id,
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
      `Pool contribution initialized: pool='${pool.title}', amount=${dto.amountKobo}, ref=${reference}, giftId=${gift.id}`
    );

    return {
      giftId: gift.id,
      poolId: pool.id,
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
   * Get Pool progress & details
   */
  async getPoolDetails(slug: string, poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        event: {
          select: { id: true, slug: true, currency: true },
        },
        _count: {
          select: {
            gifts: {
              where: { status: GiftStatus.PAID },
            },
          },
        },
      },
    });

    if (!pool || pool.event.slug !== slug) {
      throw new NotFoundException("Group gift not found on this celebration");
    }

    const percentage = pool.targetKobo > 0
      ? Math.min(100, Math.round((pool.raisedKobo / pool.targetKobo) * 100))
      : 100;

    return {
      id: pool.id,
      title: pool.title,
      mode: pool.mode,
      targetKobo: pool.targetKobo,
      raisedKobo: pool.raisedKobo,
      percentage,
      allowOverfund: pool.allowOverfund,
      deadline: pool.deadline,
      status: pool.status,
      currency: pool.event.currency,
      orderId: pool.orderId,
      paidContributionsCount: pool._count.gifts,
    };
  }

  /**
   * Host action: Convert an underfunded or expired PRODUCT pool to cash payout
   */
  async convertToCash(slug: string, poolId: string, hostUserId: string) {
    const [event, pool] = await Promise.all([
      this.prisma.event.findUnique({
        where: { slug },
        include: {
          owner: {
            include: {
              payoutAccounts: {
                where: { isDefault: true },
              },
            },
          },
        },
      }),
      this.prisma.pool.findUnique({
        where: { id: poolId },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.ownerId !== hostUserId) {
      throw new ForbiddenException("Only the celebration host can manage pool resolutions");
    }

    if (!pool || pool.eventId !== event.id) {
      throw new NotFoundException("Pool not found");
    }

    if (pool.raisedKobo === 0) {
      throw new BadRequestException("No funds have been contributed to this pool");
    }

    if (pool.status === PoolStatus.CONVERTED || pool.status === PoolStatus.REFUNDED) {
      throw new BadRequestException("This pool has already been resolved");
    }

    const currency = (event.currency || "NGN").toUpperCase();
    const payoutAccount = event.owner.payoutAccounts[0];

    await this.prisma.$transaction(async (tx) => {
      // Mark the pool CONVERTED
      await tx.pool.update({
        where: { id: pool.id },
        data: {
          status: PoolStatus.CONVERTED,
        },
      });

      // Move funds from POOL_ESCROW to OWNER_PAYABLE in ledger
      await this.ledger.postTransaction(
        {
          reference: `pool:${pool.id}:convert-to-cash`,
          kind: "POOL_CONVERT_TO_CASH",
          description: `Converted pool '${pool.title}' escrow to host cash payout`,
          entries: [
            {
              accountCode: `POOL_ESCROW:${pool.id}:${currency}`,
              direction: Direction.DEBIT,
              amountKobo: pool.raisedKobo,
            },
            {
              accountCode: `OWNER_PAYABLE:${event.owner.id}:${currency}`,
              ownerId: event.owner.id,
              direction: Direction.CREDIT,
              amountKobo: pool.raisedKobo,
            },
          ],
        },
        tx
      );

      // Queue payout for host
      if (payoutAccount) {
        const payoutReference = `payout_pool_${pool.id.replace(/-/g, "")}`;
        await tx.payout.create({
          data: {
            reference: payoutReference,
            poolId: pool.id,
            eventId: event.id,
            userId: event.owner.id,
            payoutAccountId: payoutAccount.id,
            amountKobo: pool.raisedKobo,
            status: PayoutStatus.QUEUED,
          },
        });
      }
    });

    this.logger.log(
      `Pool '${pool.title}' successfully converted to cash payout: ${pool.raisedKobo} ${currency}`
    );

    return {
      poolId: pool.id,
      convertedAmountKobo: pool.raisedKobo,
      status: PoolStatus.CONVERTED,
    };
  }

  /**
   * Sweeper: Mark expired pools past deadline
   */
  async checkExpiredPools(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const result = await this.prisma.pool.updateMany({
      where: {
        status: PoolStatus.OPEN,
        deadline: { lt: now },
      },
      data: {
        status: PoolStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} pools as EXPIRED past their deadline`);
    }

    return { expiredCount: result.count };
  }
}
