import { ConfigService } from "@nestjs/config";
import {
  BillSpotProvider,
  normalizeNigerianPhone,
  resolveTelcoProvider,
} from "./billspot.provider";

describe("BillSpotProvider", () => {
  let provider: BillSpotProvider;
  let config: any;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === "BILLSPOT_API_KEY") return "test_billspot_key_12345";
        if (key === "BILLSPOT_BASE_URL") return "https://app.billspot.co/api/v1";
        return defaultValue;
      }),
    };
    provider = new BillSpotProvider(config as unknown as ConfigService);
  });

  describe("Utility functions", () => {
    it("normalizes Nigerian phone numbers correctly", () => {
      expect(normalizeNigerianPhone("+2348012345678")).toBe("08012345678");
      expect(normalizeNigerianPhone("2348012345678")).toBe("08012345678");
      expect(normalizeNigerianPhone("08012345678")).toBe("08012345678");
      expect(normalizeNigerianPhone("8012345678")).toBe("08012345678");
    });

    it("resolves telecom providers from operator or title or phone prefix", () => {
      expect(resolveTelcoProvider({ operator: "MTN" })).toBe("mtn");
      expect(resolveTelcoProvider({ productTitle: "Airtel 5GB Data" })).toBe("airtel");
      expect(resolveTelcoProvider({ operator: "Glo" })).toBe("glo");
      expect(resolveTelcoProvider({ productTitle: "9mobile Airtime" })).toBe("9mobile");
      expect(resolveTelcoProvider({ phone: "08031234567" })).toBe("mtn");
      expect(resolveTelcoProvider({ phone: "08021234567" })).toBe("airtel");
      expect(resolveTelcoProvider({ phone: "08051234567" })).toBe("glo");
      expect(resolveTelcoProvider({ phone: "08091234567" })).toBe("9mobile");
    });
  });

  describe("fulfillTopUp", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("dispatches HTTP POST to BillSpot VTU endpoint with proper headers and payload", async () => {
      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          txt_ref: "txt_bspot_abc12345",
          message: "VTU delivered",
        }),
      } as any);

      const result = await provider.fulfillTopUp({
        phoneNumber: "+2348012345678",
        operator: "mtn",
        amountSubunits: 50000, // 50,000 kobo = ₦500
        reference: "ord-test-001",
        type: "airtime",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toBe("txt_bspot_abc12345");
      expect(result.deliveredTo).toBe("08012345678");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.billspot.co/api/v1/partner/vtu",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": "test_billspot_key_12345",
            "Idempotency-Key": "ord-test-001",
          },
          body: JSON.stringify({
            phone: "08012345678",
            amount: 500,
            provider: "mtn",
            type: "airtime",
            idempotency_key: "ord-test-001",
          }),
        })
      );
    });

    it("supports data type VTU top-up", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          txt_ref: "txt_data_998877",
        }),
      } as any);

      const result = await provider.fulfillTopUp({
        phoneNumber: "08021234567",
        operator: "airtel",
        amountSubunits: 200000, // ₦2,000
        reference: "ord-data-001",
        type: "data",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toBe("txt_data_998877");
    });

    it("falls back to mock delivery when API key is missing", async () => {
      const mockConfig = {
        get: jest.fn(() => ""),
      };
      const mockProvider = new BillSpotProvider(mockConfig as unknown as ConfigService);

      const result = await mockProvider.fulfillTopUp({
        phoneNumber: "08031234567",
        operator: "mtn",
        amountSubunits: 100000,
        reference: "ord-mock-001",
        type: "airtime",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toMatch(/^bspot_mock_/);
      expect(result.details?.mock).toBe(true);
    });

    it("throws error when BillSpot responds with failure", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          status: "error",
          message: "Insufficient wallet balance",
        }),
      } as any);

      await expect(
        provider.fulfillTopUp({
          phoneNumber: "08012345678",
          operator: "mtn",
          amountSubunits: 50000,
          reference: "ord-fail-001",
          type: "airtime",
        })
      ).rejects.toThrow("BillSpot VTU failure: Insufficient wallet balance");
    });
  });
});

