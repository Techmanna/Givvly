import { RegistryService } from "./registry.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { EventStatus, ItemStatus, PaymentStatus } from "@prisma/client";

describe("RegistryService", () => {
  let service: RegistryService;
  let mockPrisma: any;
  let mockGateway: any;
  let mockGatewayRegistry: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      event: {
        findUnique: jest.fn(),
      },
      registryItem: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      gift: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrisma)),
    };

    mockGateway = {
      providerName: "PAYSTACK",
      initializePayment: jest.fn().mockResolvedValue({
        authorizationUrl: "https://checkout.paystack.com/mock_ref",
        accessCode: "acc_123",
        reference: "pay_test_item",
      }),
    };

    mockGatewayRegistry = {
      getGatewayForCurrency: jest.fn().mockReturnValue(mockGateway),
    };

    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    };

    service = new RegistryService(mockPrisma, mockGatewayRegistry, mockConfig);
  });

  describe("reserveItem", () => {
    it("reserves an available item atomically and returns reservationToken", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_1",
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.registryItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.registryItem.findUniqueOrThrow.mockResolvedValue({
        id: "item_1",
        title: "Espresso Maker",
        priceKobo: 7500000,
        status: ItemStatus.RESERVED,
      });

      const result = await service.reserveItem("chidi-wedding", "item_1");

      expect(result).toBeDefined();
      expect(result.itemId).toBe("item_1");
      expect(result.reservationToken).toMatch(/^res_/);
      expect(result.reservedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it("throws ConflictException if item is already claimed or actively reserved", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_1",
        status: EventStatus.PUBLISHED,
      });

      mockPrisma.registryItem.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.registryItem.findUnique.mockResolvedValue({
        id: "item_2",
        status: ItemStatus.CLAIMED,
      });

      await expect(
        service.reserveItem("chidi-wedding", "item_2")
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("purchaseRegistryItem", () => {
    it("purchases reserved item and initializes gateway payment", async () => {
      const futureHold = new Date(Date.now() + 8 * 60 * 1000);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_1",
        slug: "chidi-wedding",
        status: EventStatus.PUBLISHED,
        currency: "NGN",
        owner: { id: "usr_owner_1" },
      });

      mockPrisma.registryItem.findUnique.mockResolvedValue({
        id: "item_1",
        eventId: "evt_1",
        title: "Dutch Oven",
        priceKobo: 4500000,
        status: ItemStatus.RESERVED,
        reservationToken: "res_valid_token_1234",
        reservedUntil: futureHold,
      });

      mockPrisma.registryItem.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({
        id: "pay_1",
        reference: "pay_123",
        provider: "PAYSTACK",
        currency: "NGN",
        accessCode: "acc_123",
        authorizationUrl: "https://checkout.paystack.com/acc_123",
      });

      mockPrisma.gift.create.mockResolvedValue({
        id: "gift_1",
      });

      const result = await service.purchaseRegistryItem("chidi-wedding", {
        registryItemId: "item_1",
        reservationToken: "res_valid_token_1234",
        giverName: "Amaka",
        giverEmail: "amaka@example.com",
        message: "Wishing you both a lifetime of happiness!",
        isAnonymous: false,
        showOnWall: true,
      });

      expect(result).toBeDefined();
      expect(result.registryItemId).toBe("item_1");
      expect(result.authorizationUrl).toContain("checkout.paystack.com");
      expect(mockGateway.initializePayment).toHaveBeenCalled();
      expect(mockPrisma.gift.create).toHaveBeenCalled();
    });

    it("throws ConflictException if reservation token does not match", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "evt_1",
        slug: "chidi-wedding",
        status: EventStatus.PUBLISHED,
        currency: "NGN",
      });

      mockPrisma.registryItem.findUnique.mockResolvedValue({
        id: "item_1",
        eventId: "evt_1",
        status: ItemStatus.RESERVED,
        reservationToken: "res_different_token",
        reservedUntil: new Date(Date.now() + 500000),
      });

      await expect(
        service.purchaseRegistryItem("chidi-wedding", {
          registryItemId: "item_1",
          reservationToken: "res_bad_token",
          giverEmail: "guest@example.com",
          isAnonymous: false,
          showOnWall: true,
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("releaseExpiredReservations", () => {
    it("releases expired holds back to AVAILABLE", async () => {
      mockPrisma.registryItem.updateMany.mockResolvedValue({ count: 3 });

      const res = await service.releaseExpiredReservations();
      expect(res.releasedCount).toBe(3);
      expect(mockPrisma.registryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ItemStatus.RESERVED }),
          data: expect.objectContaining({ status: ItemStatus.AVAILABLE }),
        })
      );
    });
  });
});

