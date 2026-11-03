import { WebhooksService } from "./webhooks.service";
import { UnauthorizedException } from "@nestjs/common";
import { PaymentStatus, GiftStatus, GiftType, ItemStatus, OrderStatus, PoolMode } from "@prisma/client";

describe("WebhooksService (Decoupled Provider Architecture)", () => {
  let service: WebhooksService;
  let mockPrisma: any;
  let mockGateway: any;
  let mockGatewayRegistry: any;
  let mockLedger: any;

  beforeEach(() => {
    mockPrisma = {
      webhookEvent: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gift: {
        update: jest.fn(),
      },
      payout: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      wallPost: {
        create: jest.fn(),
      },
      registryItem: {
        update: jest.fn(),
      },
      order: {
        create: jest.fn(),
      },
      pool: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrisma)),
    };

    mockGateway = {
      providerName: "PAYSTACK",
      supportedCurrencies: ["NGN", "USD", "GHS", "KES"],
      supportsCurrency: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn(),
      parseWebhookEvent: jest.fn(),
    };

    mockGatewayRegistry = {
      getGateway: jest.fn().mockReturnValue(mockGateway),
    };

    mockLedger = {
      postTransaction: jest.fn(),
    };

    service = new WebhooksService(mockPrisma, mockGatewayRegistry, mockLedger);
  });

  it("throws UnauthorizedException if webhook signature is invalid for the provider", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook("PAYSTACK", { "x-paystack-signature": "bad_sig" }, "raw_body", {
        event: "charge.success",
      })
    ).rejects.toThrow(UnauthorizedException);
  });

  it("skips duplicate processing if webhook is already PROCESSED", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(true);
    mockGateway.parseWebhookEvent.mockReturnValue({
      eventType: "PAYMENT_SUCCESS",
      reference: "pay_dup_1",
      amountSubunits: 100000,
      currency: "NGN",
      raw: {},
    });

    mockPrisma.webhookEvent.upsert.mockResolvedValue({
      id: "ev_1",
      status: "PROCESSED",
    });

    const result = await service.handleWebhook(
      "PAYSTACK",
      { "x-paystack-signature": "valid_sig" },
      "raw_body",
      {
        event: "charge.success",
        data: { reference: "pay_dup_1", amount: 100000 },
      }
    );

    expect(result).toEqual({ received: true, alreadyProcessed: true });
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it("processes PAYMENT_SUCCESS across currency and provider seamlessly", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(true);
    mockGateway.parseWebhookEvent.mockReturnValue({
      eventType: "PAYMENT_SUCCESS",
      reference: "pay_ref_success",
      amountSubunits: 51500,
      currency: "NGN",
      channel: "card",
      feesSubunits: 750,
      paidAt: new Date(),
      raw: {},
    });

    mockPrisma.webhookEvent.upsert.mockResolvedValue({
      id: "ev_2",
      status: "PROCESSING",
    });

    const mockPayment = {
      id: "pay_1",
      reference: "pay_ref_success",
      provider: "PAYSTACK",
      currency: "NGN",
      amountKobo: 51500,
      feeKobo: 1500,
      status: PaymentStatus.INITIATED,
      metadata: { showOnWall: true },
      gift: {
        id: "gift_1",
        type: GiftType.MONEY,
        amountKobo: 50000,
        currency: "NGN",
        status: GiftStatus.PENDING,
        giverName: "Chidi",
        giverEmail: "chidi@example.com",
        anonymous: false,
        message: "Happy Birthday!",
        event: {
          id: "event_1",
          name: "Chidi 30th",
          owner: {
            id: "user_owner_1",
            payoutAccounts: [{ id: "pacc_1" }],
          },
        },
      },
    };

    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
    mockPrisma.payout.findUnique.mockResolvedValue(null);

    const payload = {
      event: "charge.success",
      data: {
        reference: "pay_ref_success",
        amount: 51500,
        currency: "NGN",
      },
    };

    const result = await service.handleWebhook(
      "PAYSTACK",
      { "x-paystack-signature": "valid_sig" },
      "raw_body",
      payload
    );

    expect(result).toEqual({ received: true, processed: true });
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay_1" },
        data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
      })
    );
    expect(mockPrisma.gift.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "gift_1" },
        data: expect.objectContaining({ status: GiftStatus.PAID }),
      })
    );
    expect(mockLedger.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "payment:pay_1:capture",
        kind: "PAYMENT_CAPTURE",
      }),
      mockPrisma
    );
    expect(mockPrisma.payout.create).toHaveBeenCalled();
    expect(mockPrisma.wallPost.create).toHaveBeenCalled();
  });

  it("processes PAYMENT_SUCCESS for registry item: claims item and creates order", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(true);
    mockGateway.parseWebhookEvent.mockReturnValue({
      eventType: "PAYMENT_SUCCESS",
      reference: "pay_item_capture",
      amountSubunits: 80000,
      currency: "NGN",
      channel: "card",
      raw: {},
    });

    mockPrisma.webhookEvent.upsert.mockResolvedValue({
      id: "ev_item_1",
      status: "PROCESSING",
    });

    const mockItemPayment = {
      id: "pay_item_1",
      reference: "pay_item_capture",
      currency: "NGN",
      amountKobo: 80000,
      feeKobo: 1200,
      status: PaymentStatus.INITIATED,
      payerEmail: "guest@example.com",
      metadata: { showOnWall: true },
      gift: {
        id: "gift_item_1",
        type: GiftType.PRODUCT,
        registryItemId: "reg_item_123",
        amountKobo: 78800,
        currency: "NGN",
        status: GiftStatus.PENDING,
        giverName: "Amaka",
        giverEmail: "amaka@example.com",
        anonymous: false,
        message: "Enjoy the new espresso maker!",
        event: {
          id: "event_1",
          name: "Chidi 30th",
          owner: {
            id: "user_owner_1",
            name: "Chidi",
            email: "chidi@example.com",
            phone: "+2348011112222",
            payoutAccounts: [],
          },
        },
      },
    };

    mockPrisma.payment.findUnique.mockResolvedValue(mockItemPayment);
    mockPrisma.registryItem.update.mockResolvedValue({
      id: "reg_item_123",
      title: "Espresso Maker",
      productId: "prod_espresso",
    });
    mockPrisma.order.create.mockResolvedValue({
      id: "order_1",
      number: "GV-2026-ABC123",
    });

    const result = await service.handleWebhook(
      "PAYSTACK",
      { "x-paystack-signature": "valid_sig" },
      "raw_body",
      { event: "charge.success", data: { reference: "pay_item_capture", amount: 80000 } }
    );

    expect(result).toEqual({ received: true, processed: true });
    expect(mockPrisma.registryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "reg_item_123" },
        data: expect.objectContaining({ status: ItemStatus.CLAIMED }),
      })
    );
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          recipientName: "Chidi",
          subtotalKobo: 78800,
        }),
      })
    );
  });

  it("processes PAYMENT_SUCCESS for group pool in PRODUCT mode and holds funds in escrow", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(true);
    mockGateway.parseWebhookEvent.mockReturnValue({
      eventType: "PAYMENT_SUCCESS",
      reference: "pay_pool_capture",
      amountSubunits: 101500,
      currency: "NGN",
      channel: "card",
      raw: {},
    });

    mockPrisma.webhookEvent.upsert.mockResolvedValue({
      id: "ev_pool_1",
      status: "PROCESSING",
    });

    const mockPoolPayment = {
      id: "pay_pool_1",
      reference: "pay_pool_capture",
      currency: "NGN",
      amountKobo: 101500,
      feeKobo: 1500,
      status: PaymentStatus.INITIATED,
      payerEmail: "guest@example.com",
      metadata: { showOnWall: true },
      gift: {
        id: "gift_pool_1",
        type: GiftType.POOL,
        poolId: "pool_tv_1",
        amountKobo: 100000,
        currency: "NGN",
        status: GiftStatus.PENDING,
        giverName: "Kemi",
        giverEmail: "kemi@example.com",
        anonymous: false,
        message: "Enjoy the Smart TV!",
        event: {
          id: "event_1",
          name: "Chidi 30th",
          owner: {
            id: "user_owner_1",
            name: "Chidi",
            email: "chidi@example.com",
            phone: "+2348011112222",
            payoutAccounts: [],
          },
        },
      },
    };

    mockPrisma.payment.findUnique.mockResolvedValue(mockPoolPayment);
    mockPrisma.pool.findUnique.mockResolvedValue({
      id: "pool_tv_1",
      title: "Smart TV Fund",
      mode: PoolMode.PRODUCT,
      targetKobo: 50000000,
      raisedKobo: 20000000, // not yet funded
      orderId: null,
    });

    const result = await service.handleWebhook(
      "PAYSTACK",
      { "x-paystack-signature": "valid_sig" },
      "raw_body",
      { event: "charge.success", data: { reference: "pay_pool_capture", amount: 101500 } }
    );

    expect(result).toEqual({ received: true, processed: true });
    expect(mockPrisma.pool.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pool_tv_1" },
        data: expect.objectContaining({
          raisedKobo: { increment: 100000 },
        }),
      })
    );
    expect(mockLedger.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "payment:pay_pool_1:capture",
        entries: expect.arrayContaining([
          expect.objectContaining({ accountCode: "POOL_ESCROW:pool_tv_1:NGN" }),
        ]),
      }),
      mockPrisma
    );
  });

  it("fails and throws error if charged amount or currency is tampered", async () => {
    mockGateway.verifyWebhookSignature.mockReturnValue(true);
    mockGateway.parseWebhookEvent.mockReturnValue({
      eventType: "PAYMENT_SUCCESS",
      reference: "pay_tampered",
      amountSubunits: 1000, // tampered!
      currency: "NGN",
      raw: {},
    });

    mockPrisma.webhookEvent.upsert.mockResolvedValue({
      id: "ev_3",
      status: "PROCESSING",
    });

    const mockPayment = {
      id: "pay_2",
      reference: "pay_tampered",
      currency: "NGN",
      amountKobo: 50000,
      status: PaymentStatus.INITIATED,
    };

    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

    const payload = {
      event: "charge.success",
      data: { reference: "pay_tampered", amount: 1000 },
    };

    await expect(
      service.handleWebhook(
        "PAYSTACK",
        { "x-paystack-signature": "valid_sig" },
        "raw_body",
        payload
      )
    ).rejects.toThrow(/Security invariant violation: amount mismatch/);
  });
});
