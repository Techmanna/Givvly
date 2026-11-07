import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AccountStatus, Direction, OrderStatus, PaymentStatus, PayoutStatus, PoolStatus, Role } from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { RedisService } from "../../infra/redis/redis.service";
import { PaymentGatewayRegistry } from "../../infra/payments/payment-gateway.registry";
import { LedgerService } from "../ledger/ledger.service";
import { PayoutsService } from "../payouts/payouts.service";
import { DigitalGiftsService } from "../digital-gifts/digital-gifts.service";
import {
  CBN_KYC_POLICIES,
  CbnKycTier,
  CbnTierPolicy,
  SetWalletPinDto,
  WalletBalanceTransferDto,
  WalletPayOrderDto,
  WalletTopUpDto,
  WalletUpgradeKycDto,
  WalletWithdrawDto,
} from "./dto/wallet.dto";

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_SECONDS = 1800; // 30 minutes

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ledger: LedgerService,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistry,
    private readonly payouts: PayoutsService,
    @Optional() private readonly digitalGifts?: DigitalGiftsService
  ) {}

  private walletAccountCode(userId: string): string {
    return `OWNER_PAYABLE:${userId}`;
  }

  private reserveAccountCode(userId: string): string {
    return `WALLET_RESERVE:${userId}`;
  }

  /**
   * Determine the user's CBN KYC Tier based on verification level
   */
  async resolveCbnTier(userId: string): Promise<{
    policy: CbnTierPolicy;
    verifiedBank: {
      id: string;
      bankName: string;
      accountLast4: string;
      accountName: string;
    } | null;
  }> {
    const [user, verifiedAccount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          emailVerifiedAt: true,
          kycTier: true,
          bvnLast4: true,
        },
      }),
      this.prisma.payoutAccount.findFirst({
        where: { userId, status: AccountStatus.VERIFIED },
        select: {
          id: true,
          bankName: true,
          accountLast4: true,
          accountName: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    let tier: CbnKycTier = "TIER_1";
    if (user.role === Role.ADMIN || (user.kycTier ?? 1) >= 3) {
      tier = "TIER_3";
    } else if (verifiedAccount || (user.kycTier ?? 1) >= 2) {
      tier = "TIER_2";
    }

    return {
      policy: CBN_KYC_POLICIES[tier],
      verifiedBank: verifiedAccount,
    };
  }

  /**
   * Upgrade User Wallet to CBN Tier 3 (Enhanced KYC: BVN + Residential Address)
   */
  async upgradeToTier3(userId: string, dto: WalletUpgradeKycDto) {
    const verifiedAccount = await this.prisma.payoutAccount.findFirst({
      where: { userId, status: AccountStatus.VERIFIED },
    });

    if (!verifiedAccount) {
      throw new BadRequestException(
        "Please connect and verify your Nigerian NUBAN bank account (CBN Tier 2) first before upgrading to CBN Tier 3."
      );
    }

    const bvnLast4 = dto.bvn.slice(-4);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycTier: 3,
        bvnLast4,
        kycUpgradedAt: new Date(),
      },
    });

    return {
      ok: true,
      tier: "TIER_3" as CbnKycTier,
      policy: CBN_KYC_POLICIES.TIER_3,
      bvnLast4,
      message:
        "Congratulations! Your wallet has been upgraded to CBN Tier 3 (Unlimited Max Balance & ₦5,000,000 Single/Daily Limits).",
    };
  }

  /**
   * Compute cumulative wallet outflows since 00:00 WAT (Africa/Lagos) today
   */
  async getDailyCumulativeOutflowKobo(userId: string): Promise<number> {
    const code = this.walletAccountCode(userId);
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!account) return 0;

    // Start of current day in WAT (UTC+1)
    const now = new Date();
    const watOffsetMs = 60 * 60 * 1000;
    const watNow = new Date(now.getTime() + watOffsetMs);
    const startOfWatDay = new Date(
      Date.UTC(
        watNow.getUTCFullYear(),
        watNow.getUTCMonth(),
        watNow.getUTCDate(),
        0,
        0,
        0
      ) - watOffsetMs
    );

    const [debits, cancels] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: {
          accountId: account.id,
          direction: Direction.DEBIT,
          createdAt: { gte: startOfWatDay },
        },
        _sum: { amountKobo: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          accountId: account.id,
          direction: Direction.CREDIT,
          createdAt: { gte: startOfWatDay },
          transaction: {
            kind: "WALLET_TCC_CANCEL",
          },
        },
        _sum: { amountKobo: true },
      }),
    ]);

    const totalDebit = Number(debits._sum.amountKobo ?? BigInt(0));
    const totalCancelled = Number(cancels._sum.amountKobo ?? BigInt(0));
    return Math.max(0, totalDebit - totalCancelled);
  }

  /**
   * Enforce Nigerian CBN Single Transaction & Daily Cumulative Outflow Limits
   */
  async enforceCbnOutflowPolicy(userId: string, amountKobo: number) {
    if (amountKobo <= 0) {
      throw new BadRequestException("Transaction amount must be positive");
    }

    const [{ policy }, dailyUsedKobo] = await Promise.all([
      this.resolveCbnTier(userId),
      this.getDailyCumulativeOutflowKobo(userId),
    ]);

    if (amountKobo > policy.singleTransactionLimitKobo) {
      const limitNaira = (policy.singleTransactionLimitKobo / 100).toLocaleString();
      const upgradeHint =
        policy.tier === "TIER_1"
          ? "Link and verify your Nigerian bank account below to upgrade to CBN Tier 2 (₦200,000 single limit)."
          : policy.tier === "TIER_2"
            ? "Click 'Upgrade Tier' in your Wallet to complete CBN Tier 3 Enhanced KYC (₦5,000,000 single limit)."
            : "";
      throw new ForbiddenException(
        `Amount exceeds your ${policy.label} single transaction limit of ₦${limitNaira}. ${upgradeHint}`.trim()
      );
    }

    if (dailyUsedKobo + amountKobo > policy.dailyCumulativeLimitKobo) {
      const dailyLimitNaira = (policy.dailyCumulativeLimitKobo / 100).toLocaleString();
      const remainingNaira = Math.max(
        0,
        (policy.dailyCumulativeLimitKobo - dailyUsedKobo) / 100
      ).toLocaleString();
      throw new ForbiddenException(
        `Transaction exceeds your ${policy.label} daily cumulative limit of ₦${dailyLimitNaira} (Remaining today: ₦${remainingNaira}).`
      );
    }

    return { policy, dailyUsedKobo };
  }

  /**
   * Transaction PIN Management (Permanent PostgreSQL Storage + Argon2id + Brute-Force Lockout)
   */
  async hasTransactionPin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletPinHash: true },
    });
    return Boolean(user?.walletPinHash);
  }

  async setTransactionPin(userId: string, dto: SetWalletPinDto) {
    if (!/^\d{4}$/.test(dto.pin)) {
      throw new BadRequestException("Wallet Transaction PIN must be exactly 4 digits");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletPinHash: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.walletPinHash) {
      if (!dto.currentPin) {
        throw new BadRequestException("Current PIN is required to change your Wallet PIN");
      }
      await this.verifyTransactionPin(userId, dto.currentPin);
      if (dto.currentPin === dto.pin) {
        throw new BadRequestException("New PIN must be different from your current PIN");
      }
    }

    const newHash = await argon2.hash(dto.pin, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletPinHash: newHash,
        walletPinSetAt: new Date(),
        walletPinFailedAttempts: 0,
        walletPinLockedUntil: null,
      },
    });

    return {
      ok: true,
      message: user.walletPinHash
        ? "Wallet 4-digit Transaction PIN updated permanently"
        : "Wallet 4-digit Transaction PIN configured permanently",
    };
  }

  async verifyTransactionPin(userId: string, pin?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletPinHash: true,
        walletPinFailedAttempts: true,
        walletPinLockedUntil: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const now = new Date();
    if (user.walletPinLockedUntil && user.walletPinLockedUntil > now) {
      const minutesLeft = Math.max(
        1,
        Math.ceil((user.walletPinLockedUntil.getTime() - now.getTime()) / 60_000)
      );
      throw new ForbiddenException(
        `Wallet outflows are temporarily locked for ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} due to 5 failed PIN attempts.`
      );
    }

    if (!user.walletPinHash) {
      throw new ForbiddenException(
        "Please set your 4-digit Wallet Transaction PIN first before performing any wallet transfer, withdrawal, or order payment."
      );
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      throw new ForbiddenException(
        "Your 4-digit Wallet Transaction PIN is required to authorize this transaction."
      );
    }

    const isLockExpired =
      user.walletPinLockedUntil && user.walletPinLockedUntil <= now;
    const baseFailures = isLockExpired ? 0 : user.walletPinFailedAttempts;

    const valid = await argon2.verify(user.walletPinHash, pin);
    if (!valid) {
      const nextFails = baseFailures + 1;
      const shouldLock = nextFails >= PIN_MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + PIN_LOCKOUT_SECONDS * 1000)
        : null;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletPinFailedAttempts: nextFails,
          walletPinLockedUntil: lockedUntil,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          "Wallet outflows are temporarily locked for 30 minutes due to 5 failed PIN attempts."
        );
      }

      const attemptsLeft = Math.max(0, PIN_MAX_ATTEMPTS - nextFails);
      throw new ForbiddenException(
        `Invalid Wallet Transaction PIN (${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before temporary lockout).`
      );
    }

    if (user.walletPinFailedAttempts > 0 || user.walletPinLockedUntil !== null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          walletPinFailedAttempts: 0,
          walletPinLockedUntil: null,
        },
      });
    }
  }

  /**
   * CQRS Read Model: Get comprehensive Wallet Summary, CBN Tier Status, and Paginated Ledger History
   */
  async getWalletSummary(userId: string, page = 1, limit = 20) {
    const walletCode = this.walletAccountCode(userId);
    const reserveCode = this.reserveAccountCode(userId);

    const [
      walletBal,
      reserveBal,
      { policy, verifiedBank },
      dailyUsedKobo,
      hasPin,
      userEvents,
      walletAccount,
    ] = await Promise.all([
      this.ledger.getAccountBalance(walletCode),
      this.ledger.getAccountBalance(reserveCode),
      this.resolveCbnTier(userId),
      this.getDailyCumulativeOutflowKobo(userId),
      this.hasTransactionPin(userId),
      this.prisma.event.findMany({
        where: { ownerId: userId },
        include: {
          pools: { where: { status: PoolStatus.OPEN } },
        },
      }),
      this.prisma.ledgerAccount.findUnique({
        where: { code: walletCode },
      }),
    ]);

    const escrowBalanceKobo = userEvents.reduce(
      (sum, ev: any) =>
        sum +
        (ev.pools ?? []).reduce(
          (pSum: number, pool: any) => pSum + Number(pool.raisedKobo ?? 0),
          0
        ),
      0
    );

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    let totalEntries = 0;
    let transactions: Array<{
      id: string;
      reference: string;
      kind: string;
      direction: "CREDIT" | "DEBIT";
      amountKobo: number;
      description: string;
      createdAt: string;
      metadata?: Record<string, any> | null;
    }> = [];
    const recentRecipientsMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        lastSentAt: string;
      }
    >();

    if (walletAccount) {
      const [count, entries, recentTransferEntries] = await Promise.all([
        this.prisma.ledgerEntry.count({
          where: { accountId: walletAccount.id },
        }),
        this.prisma.ledgerEntry.findMany({
          where: { accountId: walletAccount.id },
          orderBy: { createdAt: "desc" },
          skip,
          take: safeLimit,
          include: {
            transaction: true,
          },
        }),
        this.prisma.ledgerEntry.findMany({
          where: {
            accountId: walletAccount.id,
            direction: Direction.DEBIT,
            transaction: { kind: "WALLET_TRANSFER" },
          },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            transaction: true,
          },
        }),
      ]);

      totalEntries = count;
      transactions = entries.map((e) => ({
        id: e.id,
        reference: e.transaction.reference,
        kind: e.transaction.kind,
        direction: e.direction,
        amountKobo: Number(e.amountKobo),
        description: e.transaction.description,
        createdAt: e.createdAt.toISOString(),
        metadata: (e.transaction.metadata as Record<string, any> | null) ?? null,
      }));

      for (const entry of recentTransferEntries ?? []) {
        const meta = (entry.transaction?.metadata as Record<string, any> | null) || {};
        const recipientId = String(meta.to_account || meta.recipientEmail || "");
        if (recipientId && !recentRecipientsMap.has(recipientId)) {
          recentRecipientsMap.set(recipientId, {
            id: String(meta.to_account || recipientId),
            name: String(meta.recipientName || meta.recipientEmail || recipientId),
            email: String(meta.recipientEmail || ""),
            phone: meta.recipientPhone ? String(meta.recipientPhone) : null,
            lastSentAt: entry.createdAt.toISOString(),
          });
        }
      }
    }

    const availableBalanceKobo = Number(walletBal.balanceKobo);
    const reservedBalanceKobo = Number(reserveBal.balanceKobo);

    return {
      availableBalanceKobo,
      reservedBalanceKobo,
      escrowBalanceKobo,
      currency: "NGN",
      cbnPolicy: {
        ...policy,
        dailyUsedKobo,
        dailyRemainingKobo: Math.max(
          0,
          policy.dailyCumulativeLimitKobo - dailyUsedKobo
        ),
      },
      security: {
        hasPin,
        verifiedBankLinked: Boolean(verifiedBank),
        bankName: verifiedBank?.bankName,
        accountLast4: verifiedBank?.accountLast4,
        accountName: verifiedBank?.accountName,
      },
      recentRecipients: Array.from(recentRecipientsMap.values()).slice(0, 8),
      transactions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalEntries,
      },
    };
  }

  /**
   * Event Sourcing Reproducibility & Historical Replay (Chapter 27):
   * Reconstruct the wallet balance at any point in time from the immutable event log.
   */
  async auditAndReplayWallet(userId: string, asOfIso?: string) {
    const asOf = asOfIso ? new Date(asOfIso) : new Date();
    if (isNaN(asOf.getTime())) {
      throw new BadRequestException("Invalid ISO timestamp for historical replay");
    }

    const walletCode = this.walletAccountCode(userId);
    const [replayed, current] = await Promise.all([
      this.ledger.getAccountBalanceAt(walletCode, asOf),
      this.ledger.getAccountBalance(walletCode),
    ]);

    return {
      userId,
      accountCode: walletCode,
      asOf: replayed.asOf,
      replayedEventCount: replayed.eventCount,
      replayedDebitKobo: Number(replayed.debitTotal),
      replayedCreditKobo: Number(replayed.creditTotal),
      replayedBalanceKobo: Number(replayed.balanceKobo),
      currentBalanceKobo: Number(current.balanceKobo),
      reconciled:
        !asOfIso || asOf >= new Date(Date.now() - 1000)
          ? replayed.balanceKobo === current.balanceKobo
          : true,
    };
  }

  /**
   * Initialize Wallet Funding via Paystack
   */
  async initializeTopUp(
    user: { id: string; email: string; name?: string },
    dto: WalletTopUpDto
  ) {
    const [{ policy }, currentBal] = await Promise.all([
      this.resolveCbnTier(user.id),
      this.ledger.getAccountBalance(this.walletAccountCode(user.id)),
    ]);

    const projectedBalance = Number(currentBal.balanceKobo) + dto.amountKobo;
    if (policy.maxBalanceKobo !== null && projectedBalance > policy.maxBalanceKobo) {
      const maxBalNaira = (policy.maxBalanceKobo / 100).toLocaleString();
      const upgradeHint =
        policy.tier === "TIER_1"
          ? "Verify your Nigerian bank account below to upgrade to CBN Tier 2 (₦500,000 max balance)."
          : "Click 'Upgrade to Tier 3' in your Wallet card to complete Enhanced KYC (BVN + Address) and unlock unlimited wallet balance.";
      throw new ForbiddenException(
        `This top-up would exceed your ${policy.label} maximum wallet balance limit of ₦${maxBalNaira}. ${upgradeHint}`
      );
    }

    const reference = `wal_topup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const payment = await this.prisma.payment.create({
      data: {
        reference,
        currency: "NGN",
        amountKobo: dto.amountKobo,
        feeKobo: 0,
        status: PaymentStatus.INITIATED,
        payerEmail: user.email,
        provider: "PAYSTACK",
        metadata: {
          kind: "WALLET_TOPUP",
          userId: user.id,
          payerName: user.name,
        },
      },
    });

    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    const initRes = await gateway.initializePayment({
      reference: payment.reference,
      amountSubunits: payment.amountKobo,
      customerEmail: user.email,
      customerName: user.name,
      currency: "NGN",
      metadata: {
        kind: "WALLET_TOPUP",
        userId: user.id,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { accessCode: initRes.accessCode },
    });

    return {
      reference: payment.reference,
      accessCode: initRes.accessCode,
      authorizationUrl: initRes.authorizationUrl,
      amountKobo: dto.amountKobo,
      currency: "NGN",
    };
  }

  /**
   * Verify Wallet Top-Up & Credit User's Ledger Account Idempotently
   */
  async verifyTopUp(userId: string, reference: string, simulateDev?: boolean) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException(`Top-up payment '${reference}' not found`);
    }

    const meta = (payment.metadata as Record<string, any>) || {};
    if (meta.userId && meta.userId !== userId) {
      throw new ForbiddenException("This top-up belongs to a different user");
    }

    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    let verifiedChannel = "card";
    const isDevSandboxAllowed =
      Boolean(simulateDev) && process.env.NODE_ENV !== "production";

    if (isDevSandboxAllowed) {
      verifiedChannel = "dev_sandbox";
    } else {
      const verifyRes = await gateway.verifyPayment(reference);
      if (verifyRes.status !== "success") {
        throw new BadRequestException(
          "Payment has not been completed on Paystack yet. Please complete payment in the Paystack window first."
        );
      }
      verifiedChannel = verifyRes.channel || "card";
    }

    const walletCode = this.walletAccountCode(userId);

    await this.prisma.$transaction(async (tx) => {
      if (payment.status !== PaymentStatus.SUCCESS) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            channel: verifiedChannel,
          },
        });
      }

      await this.ledger.postTransaction(
        {
          reference: `wallet:topup:${payment.reference}`,
          kind: "WALLET_TOPUP",
          description: `Wallet funded via ${gateway.providerName} (${payment.reference})`,
          paymentId: payment.id,
          entries: [
            {
              accountCode: "PROVIDER_CLEARING:NGN",
              direction: Direction.DEBIT,
              amountKobo: payment.amountKobo,
            },
            {
              accountCode: walletCode,
              ownerId: userId,
              direction: Direction.CREDIT,
              amountKobo: payment.amountKobo,
            },
          ],
        },
        tx
      );
    });

    const updatedBalance = await this.ledger.getAccountBalance(walletCode);
    return {
      status: "success",
      reference: payment.reference,
      creditedKobo: payment.amountKobo,
      availableBalanceKobo: Number(updatedBalance.balanceKobo),
    };
  }

  /**
   * Peer-to-Peer Wallet Balance Transfer (Chapter 27: POST /v1/wallet/balance_transfer)
   * Executes with deterministic lock ordering and atomic double-entry ledger entries.
   */
  async transferBalance(senderUserId: string, dto: WalletBalanceTransferDto) {
    const amountKobo = Number(dto.amount);
    if (!Number.isSafeInteger(amountKobo) || amountKobo < 10_000) {
      throw new BadRequestException(
        "Minimum wallet transfer is ₦100 (10000 kobo)"
      );
    }

    await this.verifyTransactionPin(senderUserId, dto.pin);
    await this.enforceCbnOutflowPolicy(senderUserId, amountKobo);

    const rawTarget = dto.to_account.trim();
    const digitsOnly = rawTarget.replace(/\D/g, "");
    const phoneVariants = new Set<string>([rawTarget]);
    if (digitsOnly.length >= 10) {
      phoneVariants.add(digitsOnly);
      if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
        phoneVariants.add(`+234${digitsOnly.slice(1)}`);
        phoneVariants.add(`234${digitsOnly.slice(1)}`);
      } else if (digitsOnly.startsWith("234") && digitsOnly.length === 13) {
        phoneVariants.add(`0${digitsOnly.slice(3)}`);
        phoneVariants.add(`+${digitsOnly}`);
      }
    }

    const recipient = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: rawTarget.toLowerCase() },
          { id: rawTarget },
          ...Array.from(phoneVariants).map((p) => ({ phone: p })),
        ],
      },
      select: { id: true, email: true, name: true, phone: true },
    });

    if (!recipient) {
      throw new NotFoundException(
        `Recipient account '${dto.to_account}' not found on Givvly (search by email, phone number, or user ID)`
      );
    }

    if (recipient.id === senderUserId) {
      throw new BadRequestException("Cannot transfer balance to the same wallet");
    }

    // Check recipient's CBN maximum balance policy
    const [{ policy: recipientPolicy }, recipientBal] = await Promise.all([
      this.resolveCbnTier(recipient.id),
      this.ledger.getAccountBalance(this.walletAccountCode(recipient.id)),
    ]);

    if (
      recipientPolicy.maxBalanceKobo !== null &&
      Number(recipientBal.balanceKobo) + amountKobo >
        recipientPolicy.maxBalanceKobo
    ) {
      throw new ConflictException(
        "Transfer exceeds the recipient's CBN KYC Tier maximum balance limit"
      );
    }

    // Deterministic lock ordering to prevent deadlocks
    const [firstId, secondId] = [senderUserId, recipient.id].sort();
    const lock1 = await this.redis.acquireLock(`wallet:lock:${firstId}`, 10_000);
    const lock2 = await this.redis.acquireLock(`wallet:lock:${secondId}`, 10_000);

    if (!lock1 || !lock2) {
      if (lock1) await this.redis.releaseLock(`wallet:lock:${firstId}`, lock1);
      if (lock2) await this.redis.releaseLock(`wallet:lock:${secondId}`, lock2);
      throw new ConflictException(
        "Another wallet transaction is currently in progress. Please retry."
      );
    }

    try {
      const senderCode = this.walletAccountCode(senderUserId);
      const recipientCode = this.walletAccountCode(recipient.id);
      const txReference = `wallet:transfer:${dto.transaction_id}`;

      await this.prisma.$transaction(async (tx) => {
        const currentSenderBal = await this.ledger.getAccountBalance(senderCode);
        if (Number(currentSenderBal.balanceKobo) < amountKobo) {
          throw new BadRequestException("Insufficient wallet balance");
        }

        await this.ledger.postTransaction(
          {
            reference: txReference,
            kind: "WALLET_TRANSFER",
            description:
              dto.note?.trim() ||
              `P2P Wallet transfer to ${recipient.name} (${recipient.phone || recipient.email})`,
            metadata: {
              from_account: senderUserId,
              to_account: recipient.id,
              recipientName: recipient.name,
              recipientEmail: recipient.email,
              recipientPhone: recipient.phone || null,
              transaction_id: dto.transaction_id,
            },
            entries: [
              {
                accountCode: senderCode,
                ownerId: senderUserId,
                direction: Direction.DEBIT,
                amountKobo,
              },
              {
                accountCode: recipientCode,
                ownerId: recipient.id,
                direction: Direction.CREDIT,
                amountKobo,
              },
            ],
          },
          tx
        );
      });

      return {
        status: "success",
        transaction_id: dto.transaction_id,
        amount: String(amountKobo),
        currency: dto.currency || "NGN",
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone || null,
        },
      };
    } finally {
      await this.redis.releaseLock(`wallet:lock:${secondId}`, lock2);
      await this.redis.releaseLock(`wallet:lock:${firstId}`, lock1);
    }
  }

  /**
   * Try-Confirm/Cancel (TC/C) Distributed Order & VTU Payment via Wallet:
   * - Phase 1 (Try): Reserve funds by debiting OWNER_PAYABLE:{userId} -> crediting WALLET_RESERVE:{userId}.
   * - Phase 2a (Confirm): Confirm order, fulfill digital/VTU items via BillSpot, and move WALLET_RESERVE:{userId} -> PLATFORM_REVENUE:NGN.
   * - Phase 2b (Cancel): If order/VTU fulfillment fails, execute compensating transaction WALLET_RESERVE:{userId} -> OWNER_PAYABLE:{userId}.
   */
  async payOrderWithWallet(userId: string, dto: WalletPayOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${dto.orderId}' not found`);
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.DELIVERED
    ) {
      return {
        status: "success",
        orderId: order.id,
        orderNumber: order.number,
        orderStatus: order.status,
      };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order cannot be paid in status '${order.status}'`
      );
    }

    const amountKobo = order.totalKobo;
    await this.verifyTransactionPin(userId, dto.pin);
    await this.enforceCbnOutflowPolicy(userId, amountKobo);

    const lockToken = await this.redis.acquireLock(`wallet:lock:${userId}`, 15_000);
    if (!lockToken) {
      throw new ConflictException(
        "Another wallet transaction is in progress. Please wait a moment."
      );
    }

    const walletCode = this.walletAccountCode(userId);
    const reserveCode = this.reserveAccountCode(userId);
    const idempId = dto.transaction_id || order.id;
    const tryRef = `wallet:tcc:try:order:${idempId}`;
    const confirmRef = `wallet:tcc:confirm:order:${idempId}`;
    const cancelRef = `wallet:tcc:cancel:order:${idempId}`;

    try {
      // PHASE 1: TRY (Deduction prior to downstream execution)
      await this.prisma.$transaction(async (tx) => {
        const bal = await this.ledger.getAccountBalance(walletCode);
        if (Number(bal.balanceKobo) < amountKobo) {
          throw new BadRequestException("Insufficient wallet balance for this order");
        }

        await this.ledger.postTransaction(
          {
            reference: tryRef,
            kind: "WALLET_TCC_TRY",
            description: `[TC/C Try] Reserved funds for Order ${order.number}`,
            entries: [
              {
                accountCode: walletCode,
                ownerId: userId,
                direction: Direction.DEBIT,
                amountKobo,
              },
              {
                accountCode: reserveCode,
                ownerId: userId,
                direction: Direction.CREDIT,
                amountKobo,
              },
            ],
          },
          tx
        );
      });

      // PHASE 2a: CONFIRM (Downstream Order Confirmation + BillSpot VTU Fulfillment)
      try {
        if (this.digitalGifts) {
          await this.digitalGifts.fulfillDigitalOrder(order.id);
        }

        await this.prisma.$transaction(async (tx) => {
          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: {
                status: PaymentStatus.SUCCESS,
                paidAt: new Date(),
                channel: "givvly_wallet",
              },
            });
          }

          const freshOrder = await tx.order.findUnique({
            where: { id: order.id },
          });

          if (freshOrder && freshOrder.status === OrderStatus.PENDING_PAYMENT) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: OrderStatus.CONFIRMED,
                history: {
                  create: [
                    {
                      status: OrderStatus.CONFIRMED,
                      note: "Paid instantly via Givvly Digital Wallet",
                      actorId: userId,
                    },
                  ],
                },
              },
            });
          }

          await this.ledger.postTransaction(
            {
              reference: confirmRef,
              kind: "WALLET_TCC_CONFIRM",
              description: `Paid Order ${order.number} via Givvly Wallet`,
              paymentId: order.payment?.id,
              entries: [
                {
                  accountCode: reserveCode,
                  ownerId: userId,
                  direction: Direction.DEBIT,
                  amountKobo,
                },
                {
                  accountCode: "PLATFORM_REVENUE:NGN",
                  direction: Direction.CREDIT,
                  amountKobo,
                },
              ],
            },
            tx
          );
        });

        const updatedOrder = await this.prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true, history: true },
        });

        return {
          status: "success",
          transaction_id: confirmRef,
          orderId: order.id,
          orderNumber: order.number,
          orderStatus: updatedOrder?.status || OrderStatus.CONFIRMED,
          order: updatedOrder,
        };
      } catch (downstreamErr: any) {
        // PHASE 2b: CANCEL (Compensating Transaction to restore user's wallet balance)
        this.logger.warn(
          `[TC/C CANCEL] Downstream order/VTU fulfillment failed for ${order.number}. Reversing wallet reservation: ${downstreamErr.message}`
        );

        await this.ledger.postTransaction({
          reference: cancelRef,
          kind: "WALLET_TCC_CANCEL",
          description: `[TC/C Cancel] Refunded reservation for failed Order ${order.number}`,
          entries: [
            {
              accountCode: reserveCode,
              ownerId: userId,
              direction: Direction.DEBIT,
              amountKobo,
            },
            {
              accountCode: walletCode,
              ownerId: userId,
              direction: Direction.CREDIT,
              amountKobo,
            },
          ],
        });

        throw new BadRequestException(
          `Order fulfillment failed and your wallet balance has been restored: ${downstreamErr.message}`
        );
      }
    } finally {
      await this.redis.releaseLock(`wallet:lock:${userId}`, lockToken);
    }
  }

  /**
   * Try-Confirm/Cancel (TC/C) Closed-Loop Bank Withdrawal:
   * Disburses wallet funds exclusively to the user's verified Nigerian PayoutAccount.
   */
  async withdrawToBank(userId: string, dto: WalletWithdrawDto) {
    await this.verifyTransactionPin(userId, dto.pin);
    const { policy } = await this.enforceCbnOutflowPolicy(userId, dto.amountKobo);

    const verifiedAccount = await this.prisma.payoutAccount.findFirst({
      where: { userId, status: AccountStatus.VERIFIED },
    });

    if (!verifiedAccount) {
      throw new BadRequestException(
        "Closed-Loop Policy: Please link and verify your Nigerian bank account before withdrawing."
      );
    }

    const lockToken = await this.redis.acquireLock(`wallet:lock:${userId}`, 15_000);
    if (!lockToken) {
      throw new ConflictException(
        "Another wallet operation is in progress. Please wait."
      );
    }

    const walletCode = this.walletAccountCode(userId);
    const reserveCode = this.reserveAccountCode(userId);
    const idempKey =
      dto.transaction_id ||
      `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const tryRef = `wallet:tcc:try:wd:${idempKey}`;
    const confirmRef = `wallet:tcc:confirm:wd:${idempKey}`;
    const cancelRef = `wallet:tcc:cancel:wd:${idempKey}`;

    try {
      // PHASE 1: TRY (Reserve withdrawal amount from available balance)
      await this.prisma.$transaction(async (tx) => {
        const bal = await this.ledger.getAccountBalance(walletCode);
        if (Number(bal.balanceKobo) < dto.amountKobo) {
          throw new BadRequestException("Insufficient available wallet balance");
        }

        await this.ledger.postTransaction(
          {
            reference: tryRef,
            kind: "WALLET_TCC_TRY",
            description: `[TC/C Try] Reserved withdrawal to ${verifiedAccount.bankName} (••••${verifiedAccount.accountLast4})`,
            entries: [
              {
                accountCode: walletCode,
                ownerId: userId,
                direction: Direction.DEBIT,
                amountKobo: dto.amountKobo,
              },
              {
                accountCode: reserveCode,
                ownerId: userId,
                direction: Direction.CREDIT,
                amountKobo: dto.amountKobo,
              },
            ],
          },
          tx
        );
      });

      // PHASE 2a: CONFIRM (Create Payout record & initiate transfer via PayoutsService)
      try {
        const payout = await this.prisma.payout.create({
          data: {
            userId,
            payoutAccountId: verifiedAccount.id,
            reference: `po_wal_${idempKey}`,
            amountKobo: dto.amountKobo,
            transferFeeKobo: 0,
            status: PayoutStatus.QUEUED,
          },
        });

        const processed = await this.payouts.processPayout(payout.id);
        if (processed.status === PayoutStatus.FAILED) {
          throw new Error(processed.failureReason || "Bank transfer initiation failed");
        }

        await this.ledger.postTransaction({
          reference: confirmRef,
          kind: "WALLET_WITHDRAWAL",
          description: `Wallet withdrawal to ${verifiedAccount.bankName} (••••${verifiedAccount.accountLast4})`,
          payoutId: payout.id,
          entries: [
            {
              accountCode: reserveCode,
              ownerId: userId,
              direction: Direction.DEBIT,
              amountKobo: dto.amountKobo,
            },
            {
              accountCode: "PROVIDER_CLEARING:NGN",
              direction: Direction.CREDIT,
              amountKobo: dto.amountKobo,
            },
          ],
        });

        const nextBal = await this.ledger.getAccountBalance(walletCode);

        return {
          status: "success",
          transaction_id: idempKey,
          payoutId: payout.id,
          amountKobo: dto.amountKobo,
          availableBalanceKobo: Number(nextBal.balanceKobo),
          tier: policy.tier,
          destination: {
            bankName: verifiedAccount.bankName,
            accountLast4: verifiedAccount.accountLast4,
            accountName: verifiedAccount.accountName,
          },
        };
      } catch (err: any) {
        // PHASE 2b: CANCEL (Compensating Transaction)
        this.logger.warn(
          `[TC/C CANCEL] Bank withdrawal failed for user ${userId}, restoring reserved balance: ${err.message}`
        );

        await this.ledger.postTransaction({
          reference: cancelRef,
          kind: "WALLET_TCC_CANCEL",
          description: `[TC/C Cancel] Reversed failed withdrawal to ${verifiedAccount.bankName}`,
          entries: [
            {
              accountCode: reserveCode,
              ownerId: userId,
              direction: Direction.DEBIT,
              amountKobo: dto.amountKobo,
            },
            {
              accountCode: walletCode,
              ownerId: userId,
              direction: Direction.CREDIT,
              amountKobo: dto.amountKobo,
            },
          ],
        });

        throw new BadRequestException(
          `Withdrawal could not be completed and your wallet balance has been restored: ${err.message}`
        );
      }
    } finally {
      await this.redis.releaseLock(`wallet:lock:${userId}`, lockToken);
    }
  }
}
