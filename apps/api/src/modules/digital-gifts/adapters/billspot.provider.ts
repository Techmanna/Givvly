import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../../infra/redis/redis.service";
import {
  BillSpotDataPlan,
  BillSpotPlansResponse,
  BillSpotProviderInfo,
  BillSpotProvidersResponse,
  BillSpotPurchaseRequest,
  BillSpotPurchaseResponse,
  BillSpotVtuType,
  DigitalTopUpParams,
  DigitalTopUpProvider,
  DigitalTopUpResult,
} from "../digital-provider.interface";

const VTU_CACHE_TTL_SECONDS = 86_400; // 24 hours

const FALLBACK_VTU_PROVIDERS: BillSpotProviderInfo[] = [
  {
    id: 1,
    name: "MTN",
    slug: "mtn",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839210304125856595365919707",
  },
  {
    id: 2,
    name: "Airtel",
    slug: "airtel",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011971210304130554599549680517",
  },
  {
    id: 3,
    name: "Glo",
    slug: "glo",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011360210304130041596415277062",
  },
  {
    id: 4,
    name: "T2mobile",
    slug: "t2mobile",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839260317172647652078968234",
  },
];

const FALLBACK_DATA_PLANS: Record<string, BillSpotDataPlan[]> = {
  mtn: [
    { name: "1GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-008", amount: 1000 },
    { name: "2.5GB Daily Data Plan (1 Day)", bill_item_identifier: "KUD-DAT-MTND-065", amount: 750 },
    { name: "5GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-032", amount: 2500 },
    { name: "14.5GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-041", amount: 5000 },
    { name: "34GB For 30 Days", bill_item_identifier: "KUD-DAT-MTND-070", amount: 10000 },
  ],
  airtel: [
    { name: "1GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRD-001", amount: 1000 },
    { name: "2GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRD-002", amount: 1500 },
    { name: "5GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRD-005", amount: 2500 },
    { name: "10GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRD-010", amount: 4000 },
  ],
  glo: [
    { name: "1.25GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-001", amount: 1000 },
    { name: "2.5GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-002", amount: 1500 },
    { name: "5.8GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-005", amount: 2500 },
  ],
  t2mobile: [
    { name: "1GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MD-001", amount: 1000 },
    { name: "2GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MD-002", amount: 1500 },
    { name: "4.5GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MD-004", amount: 2500 },
  ],
};

@Injectable()
export class BillSpotProvider implements DigitalTopUpProvider {
  private readonly logger = new Logger(BillSpotProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService
  ) {
    this.apiKey = this.config.get<string>("BILLSPOT_API_KEY", "").trim();
    this.baseUrl = this.config
      .get<string>("BILLSPOT_BASE_URL", "https://app.billspot.co/api/v1")
      .replace(/\/+$/, "");

    if (!this.apiKey) {
      this.logger.warn(
        "BILLSPOT_API_KEY is not configured. Safe measure active: outgoing HTTP requests to the BillSpot server endpoint are disabled."
      );
    }
  }

  /**
   * Safe measure check: returns true only if a valid, non-empty API key is present.
   */
  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * GET https://app.billspot.co/api/v1/partner/vtu/providers?type=airtime|data
   */
  async getProviders(
    type: BillSpotVtuType = "airtime"
  ): Promise<BillSpotProvidersResponse> {
    if (!this.isConfigured) {
      this.logger.warn(
        `[SAFE MEASURE] BILLSPOT_API_KEY is not configured. Skipping request to ${this.baseUrl} and returning fallback ${type} providers.`
      );
      return {
        message: "providers fetched (safe fallback mode)",
        type,
        providers: FALLBACK_VTU_PROVIDERS,
      };
    }

    const cacheKey = `billspot:vtu:providers:${type}`;

    return this.redis.getOrSet<BillSpotProvidersResponse>(
      cacheKey,
      VTU_CACHE_TTL_SECONDS,
      async () => {
        const endpoint = `${this.baseUrl}/partner/vtu/providers?type=${encodeURIComponent(type)}`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Api-Key": this.apiKey,
          },
        });

        const data = (await response.json()) as BillSpotProvidersResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.message || data.error || `Failed to fetch VTU providers (${response.status})`
          );
        }

        return data;
      }
    );
  }

  /**
   * GET https://app.billspot.co/api/v1/partner/vtu/plans/{provider}
   */
  async getDataPlans(provider: string): Promise<BillSpotPlansResponse> {
    const slug = provider.trim().toLowerCase();

    if (!this.isConfigured) {
      this.logger.warn(
        `[SAFE MEASURE] BILLSPOT_API_KEY is not configured. Skipping request to ${this.baseUrl} and returning fallback data plans for ${slug}.`
      );
      const providerInfo =
        FALLBACK_VTU_PROVIDERS.find((p) => p.slug === slug) ??
        FALLBACK_VTU_PROVIDERS[0]!;

      return {
        message: "plans fetched (safe fallback mode)",
        provider: providerInfo,
        plans: FALLBACK_DATA_PLANS[slug] ?? FALLBACK_DATA_PLANS.mtn ?? [],
      };
    }

    const cacheKey = `billspot:vtu:plans:${slug}`;

    return this.redis.getOrSet<BillSpotPlansResponse>(
      cacheKey,
      VTU_CACHE_TTL_SECONDS,
      async () => {
        const endpoint = `${this.baseUrl}/partner/vtu/plans/${encodeURIComponent(slug)}`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Api-Key": this.apiKey,
          },
        });

        const data = (await response.json()) as BillSpotPlansResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            data.message || data.error || `Failed to fetch data plans for ${slug} (${response.status})`
          );
        }

        return data;
      }
    );
  }

  /**
   * POST https://app.billspot.co/api/v1/partner/vtu
   */
  async purchase(
    request: BillSpotPurchaseRequest
  ): Promise<BillSpotPurchaseResponse> {
    if (!this.isConfigured) {
      const mockRef = `BillSpotMOCK_${Date.now()}`;
      this.logger.warn(
        `[SAFE MEASURE] BILLSPOT_API_KEY is not configured. Skipping request to ${this.baseUrl} and simulating successful purchase for ${request.provider}.`
      );
      return {
        message: "VTU purchase simulated successfully (safe mock mode)",
        txt_ref: mockRef,
        purchase: {
          txt_ref: mockRef,
          phone: request.phone ?? request.phones?.[0] ?? "08000000000",
          phones: request.phones,
          amount: String(request.amount),
          provider: request.provider,
          type: request.type ?? "airtime",
          status: "paid",
          currency: "NGN",
        },
      };
    }

    const endpoint = `${this.baseUrl}/partner/vtu`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Key": this.apiKey,
    };

    if (request.idempotency_key) {
      headers["Idempotency-Key"] = request.idempotency_key;
      request.idempotency_key = undefined;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as BillSpotPurchaseResponse & {
      error?: string;
    };

    if (!response.ok) {
      const errorMsg =
        data.message || data.error || `HTTP ${response.status} ${response.statusText}`;
      this.logger.error(`[BILLSPOT ERROR] VTU purchase failed: ${errorMsg}`);
      throw new Error(`BillSpot VTU failure: ${errorMsg}`);
    }

    return data;
  }

  /**
   * Adapter method used by DigitalGiftsService order fulfillment
   */
  async fulfillTopUp(params: DigitalTopUpParams): Promise<DigitalTopUpResult> {
    const phones =
      params.phoneNumbers && params.phoneNumbers.length > 1
        ? params.phoneNumbers.slice(0, 50)
        : undefined;

    const amount = Math.round(params.amountSubunits / 100);
    const type: BillSpotVtuType = params.type ?? "airtime";
    const provider = params.operator.trim().toLowerCase();

    const payload: BillSpotPurchaseRequest = {
      ...(phones ? { phones } : { phone: params.phoneNumber }),
      amount,
      provider,
      type,
      ...(type === "data" && params.billItemIdentifier
        ? { bill_item_identifier: params.billItemIdentifier }
        : {}),
      idempotency_key: params.reference,
    };

    const data = await this.purchase(payload);

    return {
      success: true,
      operatorReference: data.txt_ref,
      deliveredTo: phones ? phones.join(", ") : params.phoneNumber,
      deliveredAt: new Date(),
      details: data,
    };
  }
}
