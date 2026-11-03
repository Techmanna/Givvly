import { PoolsService } from "./pools.service";
import { ConflictException, BadRequestException } from "@nestjs/common";
import { EventStatus, PoolMode, PoolStatus } from "@prisma/client";

describe("PoolsService", () => {
  let service: PoolsService;
  let mockPrisma: any;
  let mockGateway: any;
  let mockGatewayRegistry: any;
  let mockLedger: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      event: {
        findUnique: jest.fn(),
      },
      pool: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      gift: {
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      payout: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrisma)),
    };

    mockGateway = {
      providerName: "PAYSTACK",
      initializePayment: jest.fn().mockResolvedValue({
        authorizationUrl: "https://checkout.paystack.com/mock_pool_ref",
        accessCode: "acc_pool_123",
        reference: "pay_test_pool",
      }),
    };

    mockGatewayRegistry = {
      getGatewayForCurrency: jest.fn().mockReturnValue(mockGateway),
    };

    mockLedger = {
      postTransaction: jest.fn(),
    };

    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    };

    service = new PoolsService(
      mockPrisma,
      mockGatewayRegistry,
      mockLedger,
      mockConfig
    );
  });

  describe("contributeToPool", () => {
    it("successfully creates contribution and returns payment checkout", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_pool_1",
        slug: "ada-birthday",
        status: EventStatus.PUBLISHED,
        currency: "NGN",
        owner: { id: "user_owner_1" },
      });

      mockPrisma.pool.findUnique.mockResolvedValue({
        id: "pool_1",
        eventId: "evt_pool_1",
        title: "MacBook Pro M3 Fund",
        mode: PoolMode.PRODUCT,
        targetKobo: 250000000,
        raisedKobo: 100000000,
        allowOverfund: false,
        status: PoolStatus.OPEN,
      });

      mockPrisma.gift.aggregate.mockResolvedValue({
        _sum: { amountKobo: 0 },
      });

      mockPrisma.payment.create.mockResolvedValue({
        id: "pay_1",
        reference: "pay_test_pool",
        provider: "PAYSTACK",
        currency: "NGN",
        accessCode: "acc_pool_123",
        authorizationUrl: "https://checkout.paystack.com/mock_pool_ref",
      });

      mockPrisma.gift.create.mockResolvedValue({
        id: "gift_pool_1",
      });

      const result = await service.contributeToPool("ada-birthday", {
        poolId: "pool_1",
        amountKobo: 5000000, // ₦50,000
        giverName: "Emeka",
        giverEmail: "emeka@example.com",
        message: "Enjoy the new laptop!",
        isAnonymous: false,
        showOnWall: true,
      });

      expect(result).toBeDefined();
      expect(result.poolId).toBe("pool_1");
      expect(result.authorizationUrl).toContain("checkout.paystack.com");
      expect(mockGateway.initializePayment).toHaveBeenCalled();
    });

    it("throws ConflictException (POOL_OVERFUNDED) when amount exceeds remaining target on non-overfundable pool", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_pool_1",
        slug: "ada-birthday",
        status: EventStatus.PUBLISHED,
        currency: "NGN",
      });

      mockPrisma.pool.findUnique.mockResolvedValue({
        id: "pool_1",
        eventId: "evt_pool_1",
        title: "Coffee Machine",
        mode: PoolMode.PRODUCT,
        targetKobo: 10000000, // ₦100,000
        raisedKobo: 9000000,  // ₦90,000 raised -> ₦10,000 remaining
        allowOverfund: false,
        status: PoolStatus.OPEN,
      });

      mockPrisma.gift.aggregate.mockResolvedValue({
        _sum: { amountKobo: 0 },
      });

      await expect(
        service.contributeToPool("ada-birthday", {
          poolId: "pool_1",
          amountKobo: 2000000, // ₦20,000 -> exceeds ₦10,000 remaining!
          giverEmail: "guest@example.com",
          isAnonymous: false,
          showOnWall: true,
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("convertToCash", () => {
    it("converts escrow funds to host cash payout and closes the pool", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_1",
        ownerId: "user_owner_1",
        currency: "NGN",
        owner: {
          id: "user_owner_1",
          payoutAccounts: [{ id: "pacc_1" }],
        },
      });

      mockPrisma.pool.findUnique.mockResolvedValue({
        id: "pool_1",
        eventId: "evt_1",
        title: "Camera Lens",
        raisedKobo: 12000000,
        status: PoolStatus.OPEN,
      });

      const res = await service.convertToCash("ada-birthday", "pool_1", "user_owner_1");

      expect(res.status).toBe(PoolStatus.CONVERTED);
      expect(res.convertedAmountKobo).toBe(12000000);
      expect(mockLedger.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "pool:pool_1:convert-to-cash",
          kind: "POOL_CONVERT_TO_CASH",
        }),
        mockPrisma
      );
      expect(mockPrisma.payout.create).toHaveBeenCalled();
    });
  });

  describe("checkExpiredPools", () => {
    it("marks past-deadline pools as EXPIRED", async () => {
      mockPrisma.pool.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.checkExpiredPools();
      expect(res.expiredCount).toBe(2);
      expect(mockPrisma.pool.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PoolStatus.EXPIRED },
        })
      );
    });
  });
});
