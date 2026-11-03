import { Test, TestingModule } from "@nestjs/testing";
import { DigitalGiftsService } from "./digital-gifts.service";
import { StandardDigitalProvider } from "./adapters/standard-digital-provider";
import { BillSpotProvider } from "./adapters/billspot.provider";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { OrderStatus } from "@prisma/client";
import { BadRequestException } from "@nestjs/common";

describe("DigitalGiftsService", () => {
  let service: DigitalGiftsService;
  let vouchers: any;
  let billspot: any;
  let notifications: any;
  let prisma: any;

  const mockDigitalProduct = {
    id: "prod-dig-1",
    title: "₦10,000 Luxury Spa Gift Card",
    isDigital: true,
    digitalKind: "GIFT_CARD",
    priceKobo: 1000000,
  };

  const mockAirtimeProduct = {
    id: "prod-airtime-1",
    title: "MTN ₦2,000 Airtime",
    isDigital: true,
    digitalKind: "AIRTIME",
    priceKobo: 200000,
    occasions: ["mtn"],
  };

  const mockDigitalOrder = {
    id: "ord-dig-1",
    number: "GV-2026-DIG001",
    buyerEmail: "buyer@example.com",
    recipientEmail: "recipient@example.com",
    recipientPhone: "08031234567",
    status: OrderStatus.CONFIRMED,
    items: [
      {
        id: "item-1",
        productId: mockDigitalProduct.id,
        title: mockDigitalProduct.title,
        unitPriceKobo: 1000000,
        qty: 1,
      },
    ],
  };

  beforeEach(async () => {
    vouchers = {
      generateVoucher: jest.fn().mockResolvedValue({
        success: true,
        voucherCode: "GV-A1B2-C3D4-E5F6",
        pin: "1234",
        expiresAt: new Date(),
        instructions: "Redeem online",
      }),
    };

    billspot = {
      fulfillTopUp: jest.fn().mockResolvedValue({
        success: true,
        operatorReference: "txt_bspot_998811",
        deliveredTo: "08031234567",
        deliveredAt: new Date(),
      }),
    };

    notifications = {
      notify: jest.fn().mockResolvedValue({ id: "notif-1" }),
    };

    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(mockDigitalOrder),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ ...mockDigitalOrder, ...data })
        ),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([mockDigitalProduct]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalGiftsService,
        { provide: StandardDigitalProvider, useValue: vouchers },
        { provide: BillSpotProvider, useValue: billspot },
        { provide: NotificationsService, useValue: notifications },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DigitalGiftsService>(DigitalGiftsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("fulfillDigitalOrder", () => {
    it("generates voucher and automatically transitions order to DELIVERED", async () => {
      const result = await service.fulfillDigitalOrder("ord-dig-1");

      expect(result.fulfilled).toBe(true);
      expect(result.allDigital).toBe(true);
      expect(vouchers.generateVoucher).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-dig-1" },
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
          }),
        })
      );
    });

    it("fulfills airtime via BillSpot partner VTU and advances order to DELIVERED", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        ...mockDigitalOrder,
        items: [
          {
            id: "item-airtime",
            productId: mockAirtimeProduct.id,
            title: mockAirtimeProduct.title,
            unitPriceKobo: mockAirtimeProduct.priceKobo,
            qty: 1,
          },
        ],
      });
      prisma.product.findMany.mockResolvedValueOnce([mockAirtimeProduct]);

      const result = await service.fulfillDigitalOrder("ord-dig-1");

      expect(result.fulfilled).toBe(true);
      expect(result.allDigital).toBe(true);
      expect(billspot.fulfillTopUp).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: "08031234567",
          type: "airtime",
          amountSubunits: 200000,
        })
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-dig-1" },
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
          }),
        })
      );
    });

    it("returns fulfilled false if no digital items in order", async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        { ...mockDigitalProduct, isDigital: false },
      ]);

      const result = await service.fulfillDigitalOrder("ord-dig-1");
      expect(result.fulfilled).toBe(false);
      expect(vouchers.generateVoucher).not.toHaveBeenCalled();
      expect(billspot.fulfillTopUp).not.toHaveBeenCalled();
    });
  });

  describe("verifyVoucher", () => {
    it("validates well-formed voucher codes", async () => {
      const verified = await service.verifyVoucher("gv-a1b2-c3d4-e5f6");
      expect(verified.valid).toBe(true);
      expect(verified.code).toBe("GV-A1B2-C3D4-E5F6");
    });

    it("rejects invalid voucher codes", async () => {
      await expect(service.verifyVoucher("invalid-code")).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
