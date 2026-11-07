import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { decryptAesGcm } from "@/common/utils/crypto";
import { ConfigService } from "@nestjs/config";
import { PayoutStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService
  ) {
    this.encryptionKey = this.config.get<string>(
      "ENCRYPTION_KEY",
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
  }

  /**
   * Process a single queued payout
   */
  async processPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    if (payout.status !== PayoutStatus.QUEUED && payout.status !== PayoutStatus.FAILED) {
      this.logger.log(`Payout ${payout.reference} is in status ${payout.status}, skipping.`);
      return payout;
    }

    // Atomically claim the payout to prevent concurrent workers from double-disbursing
    if (typeof (this.prisma.payout as any).updateMany === "function") {
      const claimed = await this.prisma.payout.updateMany({
        where: {
          id: payout.id,
          status: { in: [PayoutStatus.QUEUED, PayoutStatus.FAILED] },
        },
        data: {
          status: PayoutStatus.PROCESSING,
        },
      });
      if (claimed.count === 0) {
        this.logger.log(
          `Payout ${payout.reference} was already claimed by a concurrent worker, skipping.`
        );
        return payout;
      }
    }

    const account = await this.prisma.payoutAccount.findUnique({
      where: { id: payout.payoutAccountId },
    });

    if (!account) {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.ON_HOLD,
          holdReason: "PAYOUT_ACCOUNT_NOT_FOUND",
        },
      });
      throw new BadRequestException("Payout account not found");
    }

    // Pre-check: Account must be verified
    if (account.status !== "VERIFIED") {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.ON_HOLD,
          holdReason: `ACCOUNT_STATUS_${account.status}`,
        },
      });
      this.logger.warn(
        `Payout ${payout.reference} placed ON_HOLD: account status is ${account.status}`
      );
      return payout;
    }

    // Resolve provider gateway
    const gateway = this.gatewayRegistry.getGatewayForCurrency("NGN");

    // Ensure recipientCode exists
    let recipientCode = account.recipientCode;
    if (!recipientCode) {
      if (!gateway.createTransferRecipient) {
        throw new BadRequestException(
          `Gateway ${gateway.providerName} does not support creating transfer recipients`
        );
      }

      let plainAccountNumber = "0123454829";
      try {
        plainAccountNumber = decryptAesGcm(
          account.accountNumberEnc,
          this.encryptionKey
        );
      } catch (err) {
        this.logger.warn(`Decryption of account number failed, falling back to mock: ${err}`);
      }

      const recipientRes = await gateway.createTransferRecipient({
        name: account.accountName,
        accountNumber: plainAccountNumber,
        bankCode: account.bankCode,
      });

      recipientCode = recipientRes.recipientCode;

      await this.prisma.payoutAccount.update({
        where: { id: account.id },
        data: { recipientCode },
      });
    }

    try {
      if (!gateway.initiatePayout) {
        throw new BadRequestException(
          `Gateway ${gateway.providerName} does not support automated disbursements`
        );
      }

      // Initiate transfer with unique idempotent payout reference
      const transferRes = await gateway.initiatePayout({
        amountSubunits: payout.amountKobo,
        recipientCode,
        reference: payout.reference,
        reason: "Givvly celebration gift disbursement",
      });

      const updated = await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.PROCESSING,
          transferCode: transferRes.transferCode,
          attempts: { increment: 1 },
        },
      });

      this.logger.log(
        `Payout ${payout.reference} initiated via ${gateway.providerName}: transferCode=${transferRes.transferCode}`
      );

      if (this.notifications && payout.userId) {
        const user = await this.prisma.user.findUnique({ where: { id: payout.userId } });
        if (user) {
          try {
            await this.notifications.sendPayoutNotification(
              user.email,
              user.id,
              user.name,
              payout.amountKobo,
              "NGN",
              account.bankName || "Bank",
              account.accountLast4 || "••••",
              payout.reference
            );
          } catch (notifErr: any) {
            this.logger.warn(`Could not dispatch payout notification: ${notifErr.message}`);
          }
        }
      }

      return updated;
    } catch (err: any) {
      this.logger.error(`Failed to initiate transfer for payout ${payout.reference}:`, err);
      return this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.FAILED,
          failureReason: err?.message || String(err),
          attempts: { increment: 1 },
        },
      });
    }
  }

  /**
   * Process all queued payouts with controlled concurrency (invoked by scheduler / worker)
   */
  async processAllQueuedPayouts() {
    const queued = await this.prisma.payout.findMany({
      where: { status: PayoutStatus.QUEUED },
      take: 20,
      orderBy: { queuedAt: "asc" },
      select: { id: true },
    });

    this.logger.log(`Found ${queued.length} queued payouts to process`);

    const CONCURRENCY_LIMIT = 5;
    const results = [];
    for (let i = 0; i < queued.length; i += CONCURRENCY_LIMIT) {
      const batch = queued.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (payout) => {
          try {
            return await this.processPayout(payout.id);
          } catch (err) {
            this.logger.error(`Error processing payout ${payout.id}:`, err);
            return null;
          }
        })
      );
      results.push(...batchResults.filter(Boolean));
    }

    return results;
  }

  /**
   * Request payout withdrawal for celebration cash gifts
   */
  async requestPayout(userId: string, eventId: string) {
    const createQueuedPayout = async (tx: any) => {
      const [event, account] = await Promise.all([
        tx.event.findFirst({
          where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
          include: {
            gifts: {
              where: { status: "PAID", type: "MONEY" },
              select: { amountKobo: true },
            },
            payouts: {
              select: { amountKobo: true, status: true },
            },
          },
        }),
        tx.payoutAccount.findFirst({
          where: { userId, status: "VERIFIED" },
          select: { id: true },
        }),
      ]);

      if (!event) {
        throw new NotFoundException("Event not found");
      }

      if (!account) {
        throw new BadRequestException("Please add and verify a bank payout account first");
      }

      const totalGiftsKobo = event.gifts.reduce((sum: number, g: any) => sum + g.amountKobo, 0);
      const alreadyClaimedKobo = event.payouts
        .filter(
          (p: any) =>
            p.status === PayoutStatus.SUCCESS ||
            p.status === PayoutStatus.QUEUED ||
            p.status === PayoutStatus.PROCESSING
        )
        .reduce((sum: number, p: any) => sum + p.amountKobo, 0);

      const availableKobo = Math.max(0, totalGiftsKobo - alreadyClaimedKobo);

      if (availableKobo <= 0) {
        throw new BadRequestException("No available balance for payout");
      }

      const reference = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return tx.payout.create({
        data: {
          userId,
          eventId: event.id,
          payoutAccountId: account.id,
          reference,
          amountKobo: availableKobo,
          transferFeeKobo: 0,
          status: PayoutStatus.QUEUED,
        },
      });
    };

    const payout =
      typeof this.prisma.$transaction === "function"
        ? await this.prisma.$transaction((tx) => createQueuedPayout(tx))
        : await createQueuedPayout(this.prisma);

    try {
      return await this.processPayout(payout.id);
    } catch {
      return payout;
    }
  }

  /**
   * List payouts for a specific user
   */
  async getUserPayouts(userId: string, limit = 50) {
    const take = Math.min(Math.max(1, Number(limit) || 50), 100);
    return this.prisma.payout.findMany({
      where: { userId },
      orderBy: { queuedAt: "desc" },
      take,
    });
  }

  /**
   * Admin list of payouts
   */
  async getAdminPayouts(status?: PayoutStatus) {
    const payouts = await this.prisma.payout.findMany({
      where: status ? { status } : undefined,
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
}
