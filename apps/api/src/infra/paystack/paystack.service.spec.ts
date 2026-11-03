import { PaystackService } from "./paystack.service";
import * as crypto from "node:crypto";

describe("PaystackService", () => {
  let service: PaystackService;
  const secretKey = "sk_test_mock_paystack_secret_key";

  beforeEach(() => {
    const mockConfig: any = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === "PAYSTACK_SECRET_KEY") return secretKey;
        if (key === "PAYSTACK_BASE_URL") return "https://api.paystack.co";
        return defaultValue;
      }),
    };

    service = new PaystackService(mockConfig);
  });

  describe("verifyWebhookSignature", () => {
    it("returns true for a valid HMAC-SHA512 signature", () => {
      const rawBody = JSON.stringify({
        event: "charge.success",
        data: { reference: "pay_12345", amount: 100000 },
      });

      const validSignature = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      expect(service.verifyWebhookSignature(validSignature, rawBody)).toBe(true);
    });

    it("returns false for an invalid or tampered signature", () => {
      const rawBody = JSON.stringify({
        event: "charge.success",
        data: { reference: "pay_12345", amount: 100000 },
      });

      const invalidSignature = crypto
        .createHmac("sha512", "different_secret_key")
        .update(rawBody)
        .digest("hex");

      expect(service.verifyWebhookSignature(invalidSignature, rawBody)).toBe(false);
    });

    it("returns false if signature or body is empty", () => {
      expect(service.verifyWebhookSignature(undefined, "some_body")).toBe(false);
      expect(service.verifyWebhookSignature("abc", "")).toBe(false);
    });
  });

  describe("initializeTransaction", () => {
    it("returns mock checkout data in test/mock mode", async () => {
      const res = await service.initializeTransaction({
        email: "guest@example.com",
        amountKobo: 500000,
        reference: "ref_test_1",
      });

      expect(res.reference).toBe("ref_test_1");
      expect(res.authorizationUrl).toContain("checkout.paystack.com");
      expect(res.accessCode).toBe("acc_ref_test_1");
    });
  });
});

