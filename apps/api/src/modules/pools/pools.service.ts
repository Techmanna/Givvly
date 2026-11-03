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
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { owner: true },
    });

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException("This celebration is not currently accepting gifts");
    }

    const now = new Date();
    const currency = (event.currency || "NGN").toUpperCase();

    // In a transaction, lock and validate pool capacity
    const { pool, feeResult, reference, gatewayResult } = await this.prisma.$transaction(
      async (tx) => {
        const poolRecord = await tx.pool.findUnique({
          where: { id: dto.poolId },
        });

        if (!poolRecord || poolRecord.eventId !== event.id) {
          throw new NotFoundException("Pool not found on this celebration");
        }

        if (poolRecord.status !== PoolStatus.OPEN) {
          throw new BadRequestException(
            `This group gift is no longer accepting contributions (status: ${poolRecord.status})`
          );
        }

        if (poolRecord.deadline && poolRecord.deadline < now) {
          throw new BadRequestException("The deadline for this group gift has passed");
        }

        // Overfunding guard: sum active contributions in payment window (last 20 mins)
        const pendingCutoff = new Date(now.getTime() - 20 * 60 * 1000);
        const pendingAgg = await tx.gift.aggregate({
          where: {
            poolId: poolRecord.id,
            status: GiftStatus.PENDING,
            createdAt: { gte: pendingCutoff },
          },
          _sum: { amountKobo: true },
        });

        const pendingKobo = pendingAgg._sum.amountKobo ?? 0;
        const totalCommitted = poolRecord.raisedKobo + pendingKobo;

        if (!poolRecord.allowOverfund) {
          const remainingKobo = poolRecord.targetKobo - totalCommitted;
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

        const calculatedFees = calculateGiftFee(
          dto.amountKobo,
          this.feeConfig,
          currency
        );

        const gateway = this.gatewayRegistry.getGatewayForCurrency(currency);
        const ref = `pay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

        const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
        const callbackUrl =
          dto.callbackUrl ?? `${appUrl}/events/${slug}?payment_ref=${ref}`;

        const initResult = await gateway.initializePayment({
          customerEmail: dto.giverEmail,
          customerName: dto.isAnonymous ? "Anonymous" : dto.giverName,
          amountSubunits: calculatedFees.totalKobo,
          currency,
          reference: ref,
          callbackUrl,
          metadata: {
            eventId: event.id,
            eventSlug: event.slug,
            kind: "POOL",
            poolId: poolRecord.id,
            poolTitle: poolRecord.title,
            poolMode: poolRecord.mode,
            currency,
            provider: gateway.providerName,
            isAnonymous: dto.isAnonymous,
            giverName: dto.isAnonymous ? "Anonymous" : dto.giverName ?? "Anonymous",
            showOnWall: dto.showOnWall,
          },
        });

        return {
          pool: poolRecord,
          feeResult: calculatedFees,
          reference: ref,
          gatewayResult: initResult,
        };
      }
    );

    // Atomically create Payment and Gift
    const { payment, gift } = await this.prisma.$transaction(async (tx) => {
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
          payerEmail: dto.giverEmail,
          metadata: {
            eventId: event.id,
            eventSlug: event.slug,
            kind: "POOL",
            poolId: pool.id,
            poolTitle: pool.title,
            poolMode: pool.mode,
            currency,
            isAnonymous: dto.isAnonymous,
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
    const event = await this.prisma.event.findUnique({
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
    });

    if (!event) {
      throw new NotFoundException(`Event '${slug}' not found`);
    }

    if (event.ownerId !== hostUserId) {
      throw new ForbiddenException("Only the celebration host can manage pool resolutions");
    }

    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
    });

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
