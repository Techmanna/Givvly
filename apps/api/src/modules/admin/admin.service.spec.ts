import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import {
  OrderStatus,
  PaymentStatus,
  DisputeStatus,
  UserStatus,
  Role,
} from "@prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";

describe("AdminService", () => {
  let service: AdminService;
  let prisma: any;
  let ledger: any;

  const mockProduct = {
    id: "prod-1",
    slug: "classic-leather-journal",
    title: "Classic Leather Journal",
    description: "Handcrafted vintage leather journal",
    priceKobo: 2500000,
    occasions: ["BIRTHDAY"],
    relationships: ["FRIEND"],
    images: ["https://cdn.givvly.com/journal.jpg"],
    stock: 20,
    isDigital: false,
    active: true,
  };

  const mockOrder = {
    id: "ord-1",
    number: "GV-2026-ADM001",
    status: OrderStatus.CONFIRMED,
    items: [{ productId: "prod-1", qty: 1 }],
  };

  const mockUser = {
    id: "user-1",
    email: "user@example.com",
    name: "Regular User",
    role: Role.USER,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    ledger = {
      getTrialBalance: jest.fn().mockResolvedValue({
        isBalanced: true,
        totalDebit: BigInt(5000000),
        totalCredit: BigInt(5000000),
      }),
      postTransaction: jest.fn().mockResolvedValue({
        id: "tx-1",
        reference: "refund:123",
      }),
    };

    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === "prod-1" || where.slug === "classic-leather-journal") {
            return Promise.resolve(mockProduct);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "prod-new", ...data })
        ),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "prod-1", ...data })
        ),
      },
      collection: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "col-1", ...data })
        ),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "col-1", ...data })
        ),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([mockOrder]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === "ord-1") return Promise.resolve(mockOrder);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ ...mockOrder, ...data })
        ),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([mockUser]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === "user-1") return Promise.resolve(mockUser);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ ...mockUser, ...data })
        ),
      },
      dispute: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          id: "disp-1",
          orderId: "ord-1",
          status: DisputeStatus.OPEN,
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "disp-1", ...data })
        ),
      },
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pay-1",
          status: PaymentStatus.SUCCESS,
          amountKobo: 2500000,
          currency: "NGN",
          reference: "gv_pay_123",
          order: mockOrder,
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "pay-1", ...data })
        ),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Products Management", () => {
    it("creates a product and records an audit log", async () => {
      const created = await service.createProduct(
        {
          title: "New Silk Scarf",
          description: "100% Pure Mulberry Silk Scarf",
          priceKobo: 1500000,
          occasions: ["BIRTHDAY"],
          relationships: ["MOTHER"],
          images: ["https://cdn.givvly.com/scarf.jpg"],
          stock: 15,
          isDigital: false,
        },
        "admin-1"
      );

      expect(created).toBeDefined();
      expect(prisma.product.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("creates a product with clean title slug when no collision occurs", async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      const created = await service.createProduct(
        {
          title: "1. How to get rich quick?",
          description: "Essential finance guide book",
          priceKobo: 500000,
          occasions: ["GRADUATION"],
          relationships: ["FRIEND"],
        },
        "admin-1"
      );

      expect(created.slug).toBe("how-to-get-rich-quick");
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "how-to-get-rich-quick",
          }),
        })
      );
    });

    it("appends random suffix when product slug already exists in database", async () => {
      // First findUnique for base slug returns existing product
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: "prod-existing", slug: "how-to-get-rich-quick" })
        .mockResolvedValueOnce(null);

      const created = await service.createProduct(
        {
          title: "1. How to get rich quick?",
          description: "Second edition finance guide book",
          priceKobo: 550000,
          occasions: ["GRADUATION"],
          relationships: ["FRIEND"],
        },
        "admin-1"
      );

      expect(created.slug).toMatch(/^how-to-get-rich-quick-[a-z0-9]{5}$/);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^how-to-get-rich-quick-[a-z0-9]{5}$/),
          }),
        })
      );
    });

    it("updates product attributes", async () => {
      const updated = await service.updateProduct(
        "prod-1",
        { priceKobo: 2800000, stock: 25 },
        "admin-1"
      );

      expect(updated).toBeDefined();
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it("soft-deactivates product", async () => {
      const deactivated = await service.deleteProduct("prod-1", "admin-1");
      expect(deactivated.active).toBe(false);
    });
  });

  describe("Collections Management", () => {
    it("generates a clean slug from collection name when not provided", async () => {
      prisma.collection.findUnique.mockResolvedValueOnce(null);

      const col = await service.createCollection(
        {
          name: "Valentine's Luxury Hampers",
          kind: "OCCASION",
          productIds: ["prod-1"],
        } as any,
        "admin-1"
      );

      expect(col.slug).toBe("valentines-luxury-hampers");
      expect(prisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "valentines-luxury-hampers",
          }),
        })
      );
    });

    it("appends random suffix when collection slug collides", async () => {
      prisma.collection.findUnique
        .mockResolvedValueOnce({ id: "col-existing", slug: "anniversary-specials" })
        .mockResolvedValueOnce(null);

      const col = await service.createCollection(
        {
          name: "Anniversary Specials",
          kind: "OCCASION",
          productIds: [],
        } as any,
        "admin-1"
      );

      expect(col.slug).toMatch(/^anniversary-specials-[a-z0-9]{5}$/);
    });
  });

  describe("Order Management & State Machine", () => {
    it("allows ADMIN to advance CONFIRMED order to PACKED", async () => {
      const updated = await service.updateOrderStatus(
        "ord-1",
        { status: OrderStatus.PACKED, note: "Items packed into Keepsake box" },
        "admin-1"
      );

      expect(updated.status).toBe(OrderStatus.PACKED);
    });

    it("rejects illegal status transitions", async () => {
      await expect(
        service.updateOrderStatus(
          "ord-1",
          { status: OrderStatus.DELIVERED }, // Cannot jump directly from CONFIRMED to DELIVERED
          "admin-1"
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("User Management", () => {
    it("suspends user account and logs audit", async () => {
      const suspended = await service.suspendUser("user-1", "admin-1");
      expect(suspended.status).toBe(UserStatus.SUSPENDED);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("restores user account", async () => {
      const restored = await service.restoreUser("user-1", "admin-1");
      expect(restored.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe("Disputes & Refunds", () => {
    it("resolves dispute with refund and sets order status to REFUNDED", async () => {
      const resolved = await service.resolveDispute(
        "disp-1",
        {
          status: DisputeStatus.RESOLVED_REFUND,
          resolution: "Item arrived damaged during transit, full refund granted",
        },
        "admin-1"
      );

      expect(resolved.status).toBe(DisputeStatus.RESOLVED_REFUND);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-1" },
          data: expect.objectContaining({ status: OrderStatus.REFUNDED }),
        })
      );
    });

    it("issues refund and posts balanced ledger entries", async () => {
      const refund = await service.issueRefund(
        {
          paymentId: "pay-1",
          amountKobo: 2500000,
          reason: "Customer requested cancellation prior to packing",
        },
        "admin-1"
      );

      expect(refund.status).toBe(PaymentStatus.REFUNDED);
      expect(ledger.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "REFUND",
          entries: expect.arrayContaining([
            expect.objectContaining({ accountCode: "PLATFORM_REVENUE:NGN" }),
            expect.objectContaining({ accountCode: "PROVIDER_CLEARING:NGN" }),
          ]),
        }),
        expect.anything()
      );
    });
  });

  describe("Ledger Inspector", () => {
    it("verifies double-entry ledger balance", async () => {
      const report = await service.getLedgerReport();
      expect(report.trialBalance.isBalanced).toBe(true);
      expect(report.trialBalance.totalDebit).toBe(5000000);
    });
  });
});
