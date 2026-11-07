import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AccountStatus, Direction, OrderStatus, Role } from "@prisma/client";
import * as argon2 from "argon2";
import { WalletService } from "./wallet.service";
import { CBN_KYC_POLICIES } from "./dto/wallet.dto";

describe("WalletService (Chapter 27 Digital Wallet + CBN Regulatory Policy)", () => {
  let service: WalletService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockLedger: any;
  let mockGatewayRegistry: any;
  let mockPayouts: any;
  let mockDigitalGifts: any;
  let defaultPinHash: string;

  const redisStore = new Map<string, any>();

  beforeAll(async () => {
    defaultPinHash = await argon2.hash("4829", { type: argon2.argon2id });
  });

  beforeEach(() => {
    redisStore.clear();

    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      payoutAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      event: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntry: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountKobo: BigInt(0) } }),
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payout: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    mockRedis = {
      get: jest.fn((k: string) => Promise.resolve(redisStore.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        redisStore.set(k, v);
        return Promise.resolve();
      }),
      del: jest.fn((k: string) => {
        redisStore.delete(k);
        return Promise.resolve();
      }),
      getJson: jest.fn((k: string) => Promise.resolve(redisStore.get(k) ?? null)),
      setJson: jest.fn((k: string, v: any) => {
        redisStore.set(k, v);
        return Promise.resolve();
      }),
      acquireLock: jest.fn().mockResolvedValue("lock-token-123"),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    mockLedger = {
      getAccountBalance: jest.fn().mockResolvedValue({
        balanceKobo: BigInt(0),
        debitTotal: BigInt(0),
        creditTotal: BigInt(0),
      }),
      getAccountBalanceAt: jest.fn().mockResolvedValue({
        accountCode: "OWNER_PAYABLE:user_1",
        asOf: new Date().toISOString(),
        eventCount: 0,
        debitTotal: BigInt(0),
        creditTotal: BigInt(0),
        balanceKobo: BigInt(0),
      }),
      postTransaction: jest.fn().mockResolvedValue({ id: "ltx_1" }),
    };

    mockGatewayRegistry = {
      getGateway: jest.fn(),
    };

    mockPayouts = {
      processTransfer: jest.fn(),
    };

    mockDigitalGifts = {
      fulfillDigitalOrder: jest.fn(),
    };

    service = new WalletService(
      mockPrisma,
      mockRedis,
      mockLedger,
      mockGatewayRegistry,
      mockPayouts,
      mockDigitalGifts
    );
  });

  describe("CBN Three-Tiered KYC Resolution & Limits", () => {
    it("resolves TIER_1 for basic users without verified PayoutAccount and enforces ₦300,000 max balance", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_tier1",
        email: "tier1@givvly.com",
        role: Role.USER,
      });
      mockPrisma.payoutAccount.findFirst.mockResolvedValue(null);

      // User already has ₦250,000 (25,000,000 kobo)
      mockLedger.getAccountBalance.mockResolvedValue({
        balanceKobo: BigInt(25_000_000),
        debitTotal: BigInt(0),
        creditTotal: BigInt(25_000_000),
      });

      // Attempting to top up ₦60,000 (6,000,000 kobo) -> ₦310,000 > Tier 1 max balance (₦300,000)
      await expect(
        service.initializeTopUp(
          { id: "user_tier1", email: "tier1@givvly.com" },
          { amountKobo: 6_000_000 }
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it("upgrades user to TIER_2 when a verified Nigerian NUBAN PayoutAccount exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_tier2",
        email: "tier2@givvly.com",
        role: Role.USER,
        walletPinHash: defaultPinHash,
      });
      mockPrisma.payoutAccount.findFirst.mockResolvedValue({
        id: "pa_1",
        bankName: "GTBank",
        accountLast4: "6789",
        accountName: "ADA LOVELACE",
        status: AccountStatus.VERIFIED,
      });

      mockLedger.getAccountBalance.mockResolvedValue({
        balanceKobo: BigInt(10_000_000),
        debitTotal: BigInt(0),
        creditTotal: BigInt(10_000_000),
      });

      const summary = await service.getWalletSummary("user_tier2");
      expect(summary.cbnPolicy.tier).toBe("TIER_2");
      expect(summary.cbnPolicy.singleTransactionLimitKobo).toBe(
        CBN_KYC_POLICIES.TIER_2.singleTransactionLimitKobo
      );
      expect(summary.cbnPolicy.maxBalanceKobo).toBe(
        CBN_KYC_POLICIES.TIER_2.maxBalanceKobo
      );
      expect(summary.security.verifiedBankLinked).toBe(true);
      expect(summary.security.hasPin).toBe(true);
    });
  });

  describe("Permanent 4-Digit Transaction PIN & Lockout Security", () => {
    it("rejects wallet outflows when the user has not set a PIN yet", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_nopin",
        email: "nopin@givvly.com",
        role: Role.USER,
        walletPinHash: null,
        walletPinFailedAttempts: 0,
        walletPinLockedUntil: null,
      });

      await expect(
        service.transferBalance("user_nopin", {
          to_account: "recipient@givvly.com",
          amount: "100000",
          currency: "NGN",
          transaction_id: "tx_no_pin",
          pin: "9999",
        })
      ).rejects.toThrow(/set your 4-digit Wallet Transaction PIN first/i);
    });

    it("persists PIN in PostgreSQL, allows rotation with currentPin, and locks wallet after 5 failed attempts", async () => {
      const dbUser: any = {
        id: "user_sender",
        email: "sender@givvly.com",
        role: Role.USER,
        walletPinHash: null,
        walletPinFailedAttempts: 0,
        walletPinLockedUntil: null,
      };

      mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === "user_sender") return Promise.resolve({ ...dbUser });
        return Promise.resolve({
          id: "user_recipient",
          email: "recipient@givvly.com",
          name: "Recipient",
          role: Role.USER,
        });
      });

      mockPrisma.user.update.mockImplementation(({ data }: any) => {
        Object.assign(dbUser, data);
        return Promise.resolve({ ...dbUser });
      });

      // 1. Set permanent initial PIN
      const setRes = await service.setTransactionPin("user_sender", { pin: "4829" });
      expect(setRes.ok).toBe(true);
      expect(dbUser.walletPinHash).toBeTruthy();

      // 2. Rotate permanent PIN using currentPin
      const rotateRes = await service.setTransactionPin("user_sender", {
        currentPin: "4829",
        pin: "7391",
      });
      expect(rotateRes.message).toMatch(/updated permanently/i);

      mockPrisma.payoutAccount.findFirst.mockResolvedValue({
        id: "pa_1",
        bankName: "GTBank",
        accountLast4: "6789",
        accountName: "SENDER",
        status: AccountStatus.VERIFIED,
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user_recipient",
        email: "recipient@givvly.com",
        name: "Recipient",
      });
      mockLedger.getAccountBalance.mockResolvedValue({
        balanceKobo: BigInt(5_000_000),
        debitTotal: BigInt(0),
        creditTotal: BigInt(5_000_000),
      });

      // 3. 5 wrong PIN attempts trigger 30-minute lockout in PostgreSQL
      for (let i = 0; i < 5; i++) {
        await expect(
          service.transferBalance("user_sender", {
            to_account: "recipient@givvly.com",
            amount: "100000",
            currency: "NGN",
            transaction_id: `tx_wrong_${i}`,
            pin: "0000",
          })
        ).rejects.toThrow(ForbiddenException);
      }

      // 4. 6th attempt even with right PIN is locked out
      await expect(
        service.transferBalance("user_sender", {
          to_account: "recipient@givvly.com",
          amount: "100000",
          currency: "NGN",
          transaction_id: "tx_locked_out",
          pin: "7391",
        })
      ).rejects.toThrow(/temporarily locked/i);
    });
  });

  describe("P2P Balance Transfer (POST /wallet/balance_transfer)", () => {
    it("acquires locks in deterministic sorted order and posts atomic double-entry transfer", async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === "user_b") {
          return Promise.resolve({
            id: "user_b",
            email: "b@givvly.com",
            role: Role.USER,
            walletPinHash: defaultPinHash,
            walletPinFailedAttempts: 0,
            walletPinLockedUntil: null,
          });
        }
        return Promise.resolve({
          id: "user_a",
          email: "a@givvly.com",
          name: "Alice",
          role: Role.USER,
        });
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user_a",
        email: "a@givvly.com",
        name: "Alice",
      });

      mockPrisma.payoutAccount.findFirst.mockResolvedValue({
        id: "pa_1",
        bankName: "GTBank",
        accountLast4: "6789",
        accountName: "VERIFIED USER",
        status: AccountStatus.VERIFIED,
      });

      mockLedger.getAccountBalance.mockImplementation((code: string) => {
        if (code === "OWNER_PAYABLE:user_b") {
          return Promise.resolve({
            balanceKobo: BigInt(2_000_000),
            debitTotal: BigInt(0),
            creditTotal: BigInt(2_000_000),
          });
        }
        return Promise.resolve({
          balanceKobo: BigInt(500_000),
          debitTotal: BigInt(0),
          creditTotal: BigInt(500_000),
        });
      });

      const res = await service.transferBalance("user_b", {
        to_account: "a@givvly.com",
        amount: "500000",
        currency: "NGN",
        transaction_id: "p2p_tx_001",
        pin: "4829",
      });

      // Deterministic lock order: user_a before user_b
      expect(mockRedis.acquireLock.mock.calls[0][0]).toBe("wallet:lock:user_a");
      expect(mockRedis.acquireLock.mock.calls[1][0]).toBe("wallet:lock:user_b");

      expect(mockLedger.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "wallet:transfer:p2p_tx_001",
          kind: "WALLET_TRANSFER",
          entries: [
            {
              accountCode: "OWNER_PAYABLE:user_b",
              ownerId: "user_b",
              direction: Direction.DEBIT,
              amountKobo: 500_000,
            },
            {
              accountCode: "OWNER_PAYABLE:user_a",
              ownerId: "user_a",
              direction: Direction.CREDIT,
              amountKobo: 500_000,
            },
          ],
        }),
        expect.anything()
      );
      expect(res.status).toBe("success");
    });
  });

  describe("Try-Confirm/Cancel (TC/C) Distributed Order Payment", () => {
    it("executes TRY -> CANCEL compensating reversal when downstream BillSpot VTU fulfillment fails", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_1",
        email: "buyer@givvly.com",
        role: Role.USER,
        walletPinHash: defaultPinHash,
        walletPinFailedAttempts: 0,
        walletPinLockedUntil: null,
      });
      mockPrisma.payoutAccount.findFirst.mockResolvedValue({
        id: "pa_1",
        bankName: "GTBank",
        accountLast4: "6789",
        accountName: "BUYER",
        status: AccountStatus.VERIFIED,
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order_vtu_1",
        number: "ORD-VTU-001",
        status: OrderStatus.PENDING_PAYMENT,
        totalKobo: 100_000,
        currency: "NGN",
        customerEmail: "buyer@givvly.com",
        items: [{ id: "item_1", productId: "prod_vtu", qty: 1 }],
        payment: null,
      });

      mockLedger.getAccountBalance.mockResolvedValue({
        balanceKobo: BigInt(500_000),
        debitTotal: BigInt(0),
        creditTotal: BigInt(500_000),
      });
      mockDigitalGifts.fulfillDigitalOrder.mockRejectedValue(
        new Error("BillSpot upstream provider timeout")
      );

      await expect(
        service.payOrderWithWallet("user_1", {
          orderId: "order_vtu_1",
          transaction_id: "idem_vtu_fail_1",
          pin: "4829",
        })
      ).rejects.toThrow(BadRequestException);

      // Phase 1 (TRY): DEBIT OWNER_PAYABLE -> CREDIT WALLET_RESERVE
      expect(mockLedger.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "wallet:tcc:try:order:idem_vtu_fail_1",
          kind: "WALLET_TCC_TRY",
        }),
        expect.anything()
      );

      // Phase 2b (CANCEL compensating reversal): DEBIT WALLET_RESERVE -> CREDIT OWNER_PAYABLE
      expect(mockLedger.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "wallet:tcc:cancel:order:idem_vtu_fail_1",
          kind: "WALLET_TCC_CANCEL",
          entries: [
            {
              accountCode: "WALLET_RESERVE:user_1",
              ownerId: "user_1",
              direction: Direction.DEBIT,
              amountKobo: 100_000,
            },
            {
              accountCode: "OWNER_PAYABLE:user_1",
              ownerId: "user_1",
              direction: Direction.CREDIT,
              amountKobo: 100_000,
            },
          ],
        })
      );
    });
  });

  describe("Event Sourcing Historical Replay & Audit", () => {
    it("verifies replayed balance matches live double-entry balance", async () => {
      mockLedger.getAccountBalance.mockResolvedValue({
        balanceKobo: BigInt(1_250_000),
        debitTotal: BigInt(250_000),
        creditTotal: BigInt(1_500_000),
      });
      mockLedger.getAccountBalanceAt.mockResolvedValue({
        accountCode: "OWNER_PAYABLE:user_1",
        asOf: new Date().toISOString(),
        eventCount: 8,
        debitTotal: BigInt(250_000),
        creditTotal: BigInt(1_500_000),
        balanceKobo: BigInt(1_250_000),
      });

      const report = await service.auditAndReplayWallet("user_1");
      expect(report.reconciled).toBe(true);
      expect(report.replayedBalanceKobo).toBe(1_250_000);
      expect(report.replayedEventCount).toBe(8);
    });
  });
});
