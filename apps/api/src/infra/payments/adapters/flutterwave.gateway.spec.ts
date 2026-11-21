import { FlutterwaveGateway } from "./flutterwave.gateway";
import { FlutterwaveService } from "@/infra/flutterwave/flutterwave.service";

describe("FlutterwaveGateway", () => {
  it("initializes payment converting subunits to major units for NGN and USD", async () => {
    const flwMock = {
      initializeTransaction: jest.fn().mockResolvedValue({
        link: "https://checkout.flutterwave.com/v3/hosted/pay/mock_1",
        txRef: "pay_flw_1",
      }),
    } as unknown as FlutterwaveService;

    const gateway = new FlutterwaveGateway(flwMock);

    const ngnRes = await gateway.initializePayment({
      reference: "pay_flw_1",
      amountSubunits: 500_000, // ₦5,000
      currency: "NGN",
      customerEmail: "guest@givvly.store",
      customerName: "Tola",
      callbackUrl: "https://givvly.store/events/test",
    });

    expect(flwMock.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        txRef: "pay_flw_1",
        amountMajor: 5000,
        currency: "NGN",
        redirectUrl: "https://givvly.store/events/test",
      })
    );
    expect(ngnRes.authorizationUrl).toBe(
      "https://checkout.flutterwave.com/v3/hosted/pay/mock_1"
    );

    await gateway.initializePayment({
      reference: "pay_flw_usd",
      amountSubunits: 2550, // $25.50
      currency: "USD",
      customerEmail: "diaspora@givvly.store",
    });

    expect(flwMock.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        txRef: "pay_flw_usd",
        amountMajor: 25.5,
        currency: "USD",
      })
    );
  });

  it("verifies payment and converts major units back to subunits", async () => {
    const flwMock = {
      verifyTransaction: jest.fn().mockResolvedValue({
        id: 12345,
        tx_ref: "pay_flw_1",
        flw_ref: "FLW-MOCK-1",
        amount: 2500.5,
        charged_amount: 2500.5,
        app_fee: 35.5,
        currency: "NGN",
        status: "successful",
        payment_type: "card",
        created_at: "2026-11-21T12:00:00.000Z",
      }),
    } as unknown as FlutterwaveService;

    const gateway = new FlutterwaveGateway(flwMock);
    const res = await gateway.verifyPayment("pay_flw_1");

    expect(res.status).toBe("success");
    expect(res.amountSubunits).toBe(250_050);
    expect(res.feesSubunits).toBe(3_550);
    expect(res.currency).toBe("NGN");
    expect(res.channel).toBe("card");
  });

  it("parses charge.completed and transfer.completed webhook events", () => {
    const flwMock = {} as FlutterwaveService;
    const gateway = new FlutterwaveGateway(flwMock);

    const chargeSuccess = gateway.parseWebhookEvent(
      {},
      {
        event: "charge.completed",
        data: {
          id: 987,
          tx_ref: "pay_flw_wh_1",
          amount: 100,
          charged_amount: 100,
          app_fee: 3.8,
          currency: "USD",
          status: "successful",
          payment_type: "card",
          created_at: "2026-11-21T12:00:00.000Z",
        },
      }
    );

    expect(chargeSuccess.eventType).toBe("PAYMENT_SUCCESS");
    expect(chargeSuccess.reference).toBe("pay_flw_wh_1");
    expect(chargeSuccess.amountSubunits).toBe(10_000);
    expect(chargeSuccess.feesSubunits).toBe(380);
    expect(chargeSuccess.currency).toBe("USD");

    const transferSuccess = gateway.parseWebhookEvent(
      {},
      {
        event: "transfer.completed",
        data: {
          id: 555,
          reference: "po_flw_1",
          amount: 5000,
          fee: 10,
          currency: "NGN",
          status: "SUCCESSFUL",
          created_at: "2026-11-21T12:05:00.000Z",
        },
      }
    );

    expect(transferSuccess.eventType).toBe("TRANSFER_SUCCESS");
    expect(transferSuccess.reference).toBe("po_flw_1");
    expect(transferSuccess.amountSubunits).toBe(500_000);
  });

  it("verifies verif-hash webhook header using secret hash", () => {
    const secretHash = "flw_live_secret_hash_123";
    const service = new FlutterwaveService({
      get: (_k: string, def?: string) => {
        if (_k === "FLUTTERWAVE_SECRET_KEY") return "FLWSECK-live-test";
        if (_k === "FLUTTERWAVE_WEBHOOK_SECRET_HASH") return secretHash;
        return def;
      },
    } as any);
    const gateway = new FlutterwaveGateway(service);

    const rawBody = JSON.stringify({ event: "charge.completed" });
    expect(
      gateway.verifyWebhookSignature({ "verif-hash": secretHash }, rawBody)
    ).toBe(true);
    expect(
      gateway.verifyWebhookSignature({ "verif-hash": "wrong_hash" }, rawBody)
    ).toBe(false);
    expect(gateway.verifyWebhookSignature({}, rawBody)).toBe(false);
  });
});
