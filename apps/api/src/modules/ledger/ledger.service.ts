import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { Direction, LedgerType, Prisma } from "@prisma/client";

export interface LedgerEntryItem {
  accountCode: string;
  accountType?: LedgerType;
  ownerId?: string;
  direction: Direction;
  amountKobo: number | bigint;
}

export interface PostTransactionParams {
  reference: string;
  kind: string;
  description: string;
  paymentId?: string;
  payoutId?: string;
  metadata?: Record<string, unknown>;
  entries: LedgerEntryItem[];
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determine the default LedgerType for known system account codes
   */
  private inferAccountType(code: string): LedgerType {
    if (code === "PROVIDER_CLEARING") return LedgerType.ASSET;
    if (code === "PLATFORM_REVENUE") return LedgerType.REVENUE;
    if (code === "PROVIDER_FEES") return LedgerType.EXPENSE;
    if (code === "REFUNDS") return LedgerType.EXPENSE;
    if (code.startsWith("OWNER_PAYABLE:") || code.startsWith("VENDOR_PAYABLE:") || code.startsWith("POOL_ESCROW:")) {
      return LedgerType.LIABILITY;
    }
    return LedgerType.LIABILITY;
  }

  /**
   * Ensure account exists in the database
   */
  async ensureAccount(
    code: string,
    type?: LedgerType,
    ownerId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; code: string }> {
    const client = tx ?? this.prisma;
    const inferredType = type ?? this.inferAccountType(code);

    const account = await client.ledgerAccount.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code.replace(/_/g, " "),
        type: inferredType,
        ownerId: ownerId ?? (code.includes(":") ? code.split(":")[1] : null),
        currency: "NGN",
      },
    });

    return account;
  }

  /**
   * Post a balanced double-entry transaction
   * Invariant: sum(DEBIT) === sum(CREDIT)
   */
  async postTransaction(
    params: PostTransactionParams,
    externalTx?: Prisma.TransactionClient
  ) {
    const { reference, kind, description, paymentId, payoutId, metadata, entries } = params;

    if (!entries || entries.length < 2) {
      throw new Error(`Ledger transaction '${reference}' must have at least 2 entries.`);
    }

    let totalDebit = BigInt(0);
    let totalCredit = BigInt(0);

    for (const entry of entries) {
      const amount = BigInt(entry.amountKobo);
      if (amount <= BigInt(0)) {
        throw new Error(`Ledger entry amount must be strictly positive. Got ${amount}`);
      }

      if (entry.direction === Direction.DEBIT) {
        totalDebit += amount;
      } else if (entry.direction === Direction.CREDIT) {
        totalCredit += amount;
      } else {
        throw new Error(`Invalid ledger direction: ${entry.direction}`);
      }
    }

    // Invariant check: Debit must exactly match Credit
    if (totalDebit !== totalCredit) {
      throw new Error(
        `Unbalanced ledger transaction '${reference}': Total DEBIT (${totalDebit}) does not equal Total CREDIT (${totalCredit}).`
      );
    }

    const executeInTx = async (tx: Prisma.TransactionClient) => {
      // Check if already posted (idempotency by unique reference)
      const existing = await tx.ledgerTransaction.findUnique({
        where: { reference },
        include: { entries: true },
      });

      if (existing) {
        this.logger.warn(`Ledger transaction '${reference}' already exists. Returning existing record.`);
        return existing;
      }

      // Ensure all accounts exist
      const accountsByCode: Record<string, string> = {};
      for (const entry of entries) {
        if (!accountsByCode[entry.accountCode]) {
          const acc = await this.ensureAccount(
            entry.accountCode,
            entry.accountType,
            entry.ownerId,
            tx
          );
          accountsByCode[entry.accountCode] = acc.id;
        }
      }

      // Create transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          reference,
          kind,
          description,
          paymentId,
          payoutId,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
          entries: {
            create: entries.map((entry) => ({
              accountId: accountsByCode[entry.accountCode]!,
              direction: entry.direction,
              amountKobo: BigInt(entry.amountKobo),
            })),
          },
        },
        include: { entries: true },
      });

      this.logger.log(
        `Ledger transaction '${reference}' posted successfully. Balanced total: ${totalDebit} kobo.`
      );

      return transaction;
    };

    if (externalTx) {
      return executeInTx(externalTx);
    }

    return this.prisma.$transaction(async (tx) => executeInTx(tx));
  }

  /**
   * Compute total balance of a given account code
   */
  async getAccountBalance(code: string): Promise<{
    code: string;
    type: LedgerType;
    debitTotal: bigint;
    creditTotal: bigint;
    balanceKobo: bigint;
  }> {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { code },
      include: { entries: true },
    });

    if (!account) {
      return {
        code,
        type: this.inferAccountType(code),
        debitTotal: BigInt(0),
        creditTotal: BigInt(0),
        balanceKobo: BigInt(0),
      };
    }

    let debitTotal = BigInt(0);
    let creditTotal = BigInt(0);

    for (const entry of account.entries) {
      if (entry.direction === Direction.DEBIT) {
        debitTotal += entry.amountKobo;
      } else {
        creditTotal += entry.amountKobo;
      }
    }

    // Normal balance conventions:
    // ASSET / EXPENSE: Debit - Credit
    // LIABILITY / REVENUE / EQUITY: Credit - Debit
    const isDebitNormal =
      account.type === LedgerType.ASSET || account.type === LedgerType.EXPENSE;
    const balanceKobo = isDebitNormal
      ? debitTotal - creditTotal
      : creditTotal - debitTotal;

    return {
      code,
      type: account.type,
      debitTotal,
      creditTotal,
      balanceKobo,
    };
  }

  /**
   * System-wide Trial Balance verification
   */
  async getTrialBalance(): Promise<{
    totalDebit: bigint;
    totalCredit: bigint;
    isBalanced: boolean;
  }> {
    const aggregates = await this.prisma.ledgerEntry.groupBy({
      by: ["direction"],
      _sum: {
        amountKobo: true,
      },
    });

    let totalDebit = BigInt(0);
    let totalCredit = BigInt(0);

    for (const agg of aggregates) {
      if (agg.direction === Direction.DEBIT) {
        totalDebit = agg._sum.amountKobo ?? BigInt(0);
      } else if (agg.direction === Direction.CREDIT) {
        totalCredit = agg._sum.amountKobo ?? BigInt(0);
      }
    }

    return {
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
    };
  }
}

