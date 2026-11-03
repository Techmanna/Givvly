import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "../../infra/payments/payment-gateway.registry";
import { LedgerService } from "../ledger/ledger.service";
import { OrderStatus, PaymentStatus, DisputeStatus } from "@prisma/client";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

describe("OrdersService", () => {
  let service: OrdersService;
  let prisma: any;
  let gatewayRegistry: any;
  let mockGateway: any;

  const mockProduct = {
    id: "a0000000-0000-0000-0000-000000000001",
    slug: "luxury-watch",
    title: "Luxury Rose Gold Watch",
    priceKobo: 5000000, // ₦50,000
    stock: 5,
    isDigital: false,
    active: true,
  };

  beforeEach(async () => {
    mockGateway = {
      initializePayment: jest.fn().mockResolvedValue({
        reference: "ord_ref_123",
        accessCode: "acc_123",
        authorizationUrl: "https://checkout.paystack.com/acc_123",
      }),
    };

    gatewayRegistry = {
      getGateway: jest.fn().mockReturnValue(mockGateway),
    };

    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockResolvedValue(mockProduct),
        update: jest.fn().mockResolvedValue(mockProduct),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          return Promise.resolve({
            id: "ord-1",
            ...data,
            items: [
              {
                id: "item-1",
                orderId: "ord-1",
                productId: mockProduct.id,
                title: mockProduct.title,
                unitPriceKobo: mockProduct.priceKobo,
                qty: 1,
              },
            ],
            createdAt: new Date(),
          });
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === "ord-1" || where.trackingToken === "trk_test123") {
            return Promise.resolve({
              id: "ord-1",
              number: "GV-2026-ABC123",
              trackingToken: "trk_test123",
              buyerUserId: "user-1",
              buyerEmail: "buyer@example.com",
              recipientName: "Jane Doe",
              status: OrderStatus.PENDING_PAYMENT,
              subtotalKobo: 5000000,
              deliveryFeeKobo: 250000,
              totalKobo: 5250000,
              items: [
                {
                  id: "item-1",
                  productId: mockProduct.id,
                  title: mockProduct.title,
                  unitPriceKobo: 5000000,
                  qty: 1,
                },
              ],
              history: [],
              createdAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "ord-1", ...data })
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "pay-1", ...data })
        ),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "pay-1", ...data })
        ),
      },
      review: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "rev-1", ...data })
        ),
      },
      dispute: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "disp-1", ...data, status: DisputeStatus.OPEN })
        ),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentGatewayRegistry, useValue: gatewayRegistry },
        {
          provide: LedgerService,
          useValue: {
            postTransaction: jest.fn().mockResolvedValue({ id: "tx-1" }),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOrder", () => {
    it("successfully creates order and initializes payment", async () => {
      const result = await service.createOrder(
        {
          productId: mockProduct.id,
          qty: 1,
          recipient: { name: "Jane Doe", phone: "08012345678" },
          address: { street: "123 Main St", area: "Ikeja", city: "Lagos", state: "Lagos" },
          buyerEmail: "buyer@example.com",
          currency: "NGN",
        },
        { id: "user-1", email: "buyer@example.com", name: "John Doe" }
      );

      expect(result).toBeDefined();
      expect(result.order.number).toBeDefined();
      expect(result.payment.authorizationUrl).toBe("https://checkout.paystack.com/acc_123");
      expect(result.whatsappLink).toContain("2348029176372");
    });

    it("throws ConflictException if stock is insufficient", async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        { ...mockProduct, stock: 0 },
      ]);

      await expect(
        service.createOrder(
          {
            productId: mockProduct.id,
            qty: 1,
            recipient: { name: "Jane Doe" },
            buyerEmail: "buyer@example.com",
            currency: "NGN",
          },
          { id: "user-1", email: "buyer@example.com" }
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("trackOrderByToken", () => {
    it("returns sanitized public tracking data", async () => {
      const tracking = await service.trackOrderByToken("trk_test123");
      expect(tracking.orderNumber).toBe("GV-2026-ABC123");
      expect(tracking.whatsappSupportLink).toContain("2348029176372");
    });

    it("throws NotFoundException if tracking token is invalid", async () => {
      await expect(service.trackOrderByToken("trk_unknown")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("cancelOrder", () => {
    it("allows buyer to cancel PENDING_PAYMENT order", async () => {
      const cancelled = await service.cancelOrder(
        "ord-1",
        { id: "user-1", role: "USER" },
        "Changed mind"
      );
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    });

    it("blocks unauthorized cancellation", async () => {
      await expect(
        service.cancelOrder(
          "ord-1",
          { id: "other-user", role: "USER" },
          "Cancel"
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createReview", () => {
    it("allows review on DELIVERED order", async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: "ord-1",
        buyerUserId: "user-1",
        status: OrderStatus.DELIVERED,
        items: [{ productId: mockProduct.id }],
        review: null,
      });

      const review = await service.createReview("ord-1", "user-1", {
        rating: 5,
        comment: "Excellent gift!",
      });

      expect(review).toBeDefined();
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it("rejects review if order is not delivered", async () => {
      await expect(
        service.createReview("ord-1", "user-1", {
          rating: 5,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});

