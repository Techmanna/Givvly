import * as crypto from "node:crypto";
import { MonnifyGateway } from "./monnify.gateway";
import { MonnifyService } from "@/infra/monnify/monnify.service";

describe("MonnifyGateway", () => {
  it("initializes payment converting kobo subunits to Naira", async () => {
    const monnifyMock = {
      initializeTransaction: jest.fn().mockResolvedValue({
        transactionReference: "MNFY|TX|123",
        paymentReference: "pay_ref_1",
        checkoutUrl: "https://sandbox.sdk.monnify.com/checkout/123",
        enabledPaymentMethod: ["CARD", "ACCOUNT_TRANSFER"],
      }),
    } as unknown as MonnifyService;

    const gateway = new MonnifyGateway(monnifyMock);
    const res = await gateway.initializePayment({
      reference: "pay_ref_1",
      amountSubunits: 500_000, // ₦5,000
      currency: "NGN",
      customerEmail: "guest@givvly.store",
      customerName: "Tola",
    });

    expect(monnifyMock.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amountNaira: 5000,
        paymentReference: "pay_ref_1",
        currencyCode: "NGN",
      })
    );
    expect(res.authorizationUrl).toBe(
      "https://sandbox.sdk.monnify.com/checkout/123"
    );
    expect(res.reference).toBe("pay_ref_1");
  });

  it("verifies payment and converts Naira amountPaid back to kobo subunits", async () => {
    const monnifyMock = {
      verifyTransaction: jest.fn().mockResolvedValue({
        transactionReference: "MNFY|TX|123",
        paymentReference: "pay_ref_1",
        amountPaid: 2500.5,
        totalPayable: 2500.5,
        paymentStatus: "PAID",
        paymentMethod: "ACCOUNT_TRANSFER",
        currencyCode: "NGN",
      }),
    } as unknown as MonnifyService;

    const gateway = new MonnifyGateway(monnifyMock);
    const res = await gateway.verifyPayment("pay_ref_1");

    expect(res.status).toBe("success");
    expect(res.amountSubunits).toBe(250_050);
    expect(res.channel).toBe("ACCOUNT_TRANSFER");
  });

  it("parses SUCCESSFUL_TRANSACTION webhook event accurately", () => {
    const monnifyMock = {} as MonnifyService;
    const gateway = new MonnifyGateway(monnifyMock);

    const parsed = gateway.parseWebhookEvent(
      {},
      {
        eventType: "SUCCESSFUL_TRANSACTION",
        eventData: {
          paymentReference: "pay_wh_1",
          amountPaid: 10000,
          currency: "NGN",
          paymentMethod: "CARD",
          paidOn: "2026-11-15T12:00:00.000Z",
        },
      }
    );

    expect(parsed.eventType).toBe("PAYMENT_SUCCESS");
    expect(parsed.reference).toBe("pay_wh_1");
    expect(parsed.amountSubunits).toBe(1_000_000);
    expect(parsed.channel).toBe("CARD");
  });

  it("verifies live monnify-signature HMAC-SHA512", () => {
    const secret = "MSK_LIVE_TEST_SECRET";
    const service = new MonnifyService({
      get: (_k: string, def?: string) => {
        if (_k === "MONNIFY_API_KEY") return "MK_LIVE_TEST";
        if (_k === "MONNIFY_SECRET_KEY") return secret;
        return def;
      },
    } as any);
    const gateway = new MonnifyGateway(service);

    const body = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION" });
    const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");

    expect(
      gateway.verifyWebhookSignature({ "monnify-signature": sig }, body)
    ).toBe(true);
    expect(
      gateway.verifyWebhookSignature({ "monnify-signature": "bad_sig" }, body)
    ).toBe(false);
  });
});
