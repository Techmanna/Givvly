import { LedgerService } from "./ledger.service";
import { Direction, LedgerType } from "@prisma/client";

describe("LedgerService", () => {
  let service: LedgerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      ledgerAccount: {
        upsert: jest.fn().mockImplementation(({ where, create }) =>
          Promise.resolve({
            id: `acc_${where.code}`,
            code: where.code,
            type: create.type,
            name: create.name,
            ownerId: create.ownerId,
            currency: "NGN",
          })
        ),
        findUnique: jest.fn(),
      },
      ledgerTransaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      ledgerEntry: {
        groupBy: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(mockPrisma)),
    };

    service = new LedgerService(mockPrisma);
  });

  it("should throw an error if ledger transaction is unbalanced", async () => {
    await expect(
      service.postTransaction({
        reference: "tx_unbalanced_1",
        kind: "PAYMENT_CAPTURE",
        description: "Unbalanced payment",
        entries: [
          {
            accountCode: "PROVIDER_CLEARING",
            direction: Direction.DEBIT,
            amountKobo: 50000,
          },
          {
            accountCode: "OWNER_PAYABLE:user_1",
            direction: Direction.CREDIT,
            amountKobo: 48000, // missing 2000 kobo!
          },
        ],
      })
    ).rejects.toThrow(/Unbalanced ledger transaction/);
  });

  it("should post a balanced transaction successfully", async () => {
    mockPrisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.ledgerTransaction.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: "ltx_1",
        reference: data.reference,
        kind: data.kind,
        description: data.description,
        entries: data.entries.create,
      })
    );

    const result = await service.postTransaction({
      reference: "tx_balanced_1",
      kind: "PAYMENT_CAPTURE",
      description: "Balanced money gift payment",
      entries: [
        {
          accountCode: "PROVIDER_CLEARING",
          direction: Direction.DEBIT,
          amountKobo: 50750,
        },
        {
          accountCode: "OWNER_PAYABLE:user_1",
          direction: Direction.CREDIT,
          amountKobo: 50000,
        },
        {
          accountCode: "PLATFORM_REVENUE",
          direction: Direction.CREDIT,
          amountKobo: 750,
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.reference).toBe("tx_balanced_1");
    expect(mockPrisma.ledgerTransaction.create).toHaveBeenCalled();
  });

  it("should return existing transaction if already posted (idempotent)", async () => {
    const existingTx = {
      id: "ltx_existing",
      reference: "tx_replay_1",
      kind: "PAYMENT_CAPTURE",
      description: "Replayed tx",
      entries: [],
    };

    mockPrisma.ledgerTransaction.findUnique.mockResolvedValue(existingTx);

    const result = await service.postTransaction({
      reference: "tx_replay_1",
      kind: "PAYMENT_CAPTURE",
      description: "Replayed tx",
      entries: [
        {
          accountCode: "PROVIDER_CLEARING",
          direction: Direction.DEBIT,
          amountKobo: 50000,
        },
        {
          accountCode: "OWNER_PAYABLE:user_1",
          direction: Direction.CREDIT,
          amountKobo: 50000,
        },
      ],
    });

    expect(result).toEqual(existingTx);
    expect(mockPrisma.ledgerTransaction.create).not.toHaveBeenCalled();
  });
});
