import { ConfigService } from "@nestjs/config";
import { BillSpotProvider } from "./billspot.provider";
import { RedisService } from "../../../infra/redis/redis.service";

describe("BillSpotProvider", () => {
  let provider: BillSpotProvider;
  let config: any;
  let redis: any;
  let cacheStore: Map<string, any>;

  beforeEach(() => {
    cacheStore = new Map();
    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === "BILLSPOT_API_KEY") return "test_billspot_key_12345";
        if (key === "BILLSPOT_BASE_URL") return "https://app.billspot.co/api/v1";
        return defaultValue;
      }),
    };
    redis = {
      getOrSet: jest.fn(async (key: string, _ttl: number, fetcher: () => Promise<any>) => {
        if (cacheStore.has(key)) {
          return cacheStore.get(key);
        }
        const val = await fetcher();
        cacheStore.set(key, val);
        return val;
      }),
    };
    provider = new BillSpotProvider(
      config as unknown as ConfigService,
      redis as unknown as RedisService
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getProviders & getDataPlans with RedisService caching", () => {
    it("fetches VTU providers and caches them for 24 hours via RedisService", async () => {
      const mockResponse = {
        message: "providers fetched",
        type: "airtime" as const,
        providers: [
          {
            id: 1,
            name: "MTN",
            slug: "mtn",
            logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839210304125856595365919707",
          },
          {
            id: 4,
            name: "T2mobile",
            slug: "t2mobile",
            logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839260317172647652078968234",
          },
        ],
      };

      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const first = await provider.getProviders("airtime");
      expect(first).toEqual(mockResponse);
      expect(redis.getOrSet).toHaveBeenCalledWith(
        "billspot:vtu:providers:airtime",
        86400,
        expect.any(Function)
      );

      // Second call hits Redis cache without invoking fetch again
      const second = await provider.getProviders("airtime");
      expect(second).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("fetches data plans for a provider and caches them for 24 hours via RedisService", async () => {
      const mockPlansResponse = {
        message: "plans fetched",
        provider: {
          id: 1,
          name: "MTN",
          slug: "mtn",
          logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839210304125856595365919707",
        },
        plans: [
          {
            name: "1GB Monthly Plan (30 Days)",
            bill_item_identifier: "KUD-DAT-MTND-008",
            amount: 1000,
          },
        ],
      };

      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlansResponse,
      } as any);

      const res = await provider.getDataPlans("mtn");
      expect(res).toEqual(mockPlansResponse);
      expect(redis.getOrSet).toHaveBeenCalledWith(
        "billspot:vtu:plans:mtn",
        86400,
        expect.any(Function)
      );

      await provider.getDataPlans("mtn");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("purchase & fulfillTopUp", () => {
    it("dispatches HTTP POST to BillSpot VTU endpoint matching the exact docs specification", async () => {
      const mockPurchaseResponse = {
        message: "Airtime purchase successful",
        txt_ref: "BillSpotINVjYTT3nK2YQJ8L",
        purchase: {
          txt_ref: "BillSpotINVjYTT3nK2YQJ8L",
          phone: "08166551496",
          amount: "100",
          provider: "MTN",
          type: "airtime" as const,
          status: "paid",
          currency: "NGN",
        },
      };

      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPurchaseResponse,
      } as any);

      const result = await provider.fulfillTopUp({
        phoneNumber: "08166551496",
        operator: "mtn",
        amountSubunits: 10000, // ₦100
        reference: "req-abc-001",
        type: "airtime",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toBe("BillSpotINVjYTT3nK2YQJ8L");
      expect(result.deliveredTo).toBe("08166551496");
      expect(result.details).toEqual(mockPurchaseResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.billspot.co/api/v1/partner/vtu",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": "test_billspot_key_12345",
            "Idempotency-Key": "req-abc-001",
          },
          body: JSON.stringify({
            phone: "08166551496",
            amount: 100,
            provider: "mtn",
            type: "airtime",
          }),
        }
      );
    });

    it("supports multi-number VTU purchase via phones array", async () => {
      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Airtime purchase successful",
          txt_ref: "BillSpotMulti123",
          purchase: {
            txt_ref: "BillSpotMulti123",
            phones: ["08166551496", "08012345678"],
            amount: "1000",
            provider: "MTN",
            type: "airtime",
            status: "paid",
            currency: "NGN",
          },
        }),
      } as any);

      const result = await provider.fulfillTopUp({
        phoneNumber: "08166551496",
        phoneNumbers: ["08166551496", "08012345678"],
        operator: "mtn",
        amountSubunits: 100000, // ₦1,000 each
        reference: "req-multi-001",
        type: "airtime",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toBe("BillSpotMulti123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.billspot.co/api/v1/partner/vtu",
        expect.objectContaining({
          body: JSON.stringify({
            phones: ["08166551496", "08012345678"],
            amount: 1000,
            provider: "mtn",
            type: "airtime",
          }),
        })
      );
    });

    it("supports data type VTU purchase with bill_item_identifier", async () => {
      const mockFetch = jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Data purchase successful",
          txt_ref: "BillSpotData998877",
          purchase: {
            txt_ref: "BillSpotData998877",
            phone: "08012345678",
            amount: "1000",
            provider: "MTN",
            type: "data",
            status: "paid",
            currency: "NGN",
          },
        }),
      } as any);

      const result = await provider.fulfillTopUp({
        phoneNumber: "08012345678",
        operator: "mtn",
        amountSubunits: 100000, // ₦1,000
        reference: "req-data-001",
        type: "data",
        billItemIdentifier: "KUD-DAT-MTND-008",
      });

      expect(result.success).toBe(true);
      expect(result.operatorReference).toBe("BillSpotData998877");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.billspot.co/api/v1/partner/vtu",
        expect.objectContaining({
          body: JSON.stringify({
            phone: "08012345678",
            amount: 1000,
            provider: "mtn",
            type: "data",
            bill_item_identifier: "KUD-DAT-MTND-008",
          }),
        })
      );
    });

    it("throws error when BillSpot responds with failure", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
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

  describe("Safe measure when BILLSPOT_API_KEY is not configured", () => {
    let unconfiguredProvider: BillSpotProvider;
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = jest.spyOn(global, "fetch" as any);
      const emptyConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === "BILLSPOT_API_KEY") return "";
          if (key === "BILLSPOT_BASE_URL") return "https://app.billspot.co/api/v1";
          return defaultValue;
        }),
      };
      unconfiguredProvider = new BillSpotProvider(
        emptyConfig as unknown as ConfigService,
        redis as unknown as RedisService
      );
    });

    it("does NOT make outbound HTTP request to Billspot when fetching providers and returns fallback providers", async () => {
      const result = await unconfiguredProvider.getProviders("airtime");
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.providers.some((p) => p.slug === "mtn")).toBe(true);
      expect(result.type).toBe("airtime");
    });

    it("does NOT make outbound HTTP request to Billspot when fetching data plans and returns fallback plans", async () => {
      const result = await unconfiguredProvider.getDataPlans("mtn");
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.plans.length).toBeGreaterThan(0);
      expect(result.provider.slug).toBe("mtn");
    });

    it("does NOT make outbound HTTP request to Billspot on purchase or fulfillTopUp and safely simulates success", async () => {
      const result = await unconfiguredProvider.fulfillTopUp({
        phoneNumber: "08166551496",
        operator: "mtn",
        amountSubunits: 50000,
        reference: "safe-mock-ref-001",
        type: "airtime",
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.operatorReference).toMatch(/^BillSpotMOCK_/);
      expect(result.deliveredTo).toBe("08166551496");
    });
  });
});
