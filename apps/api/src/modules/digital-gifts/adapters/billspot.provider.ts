import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../../infra/redis/redis.service";
import {
  BillSpotPlansResponse,
  BillSpotProvidersResponse,
  BillSpotPurchaseRequest,
  BillSpotPurchaseResponse,
  BillSpotVtuType,
  DigitalTopUpParams,
  DigitalTopUpProvider,
  DigitalTopUpResult,
} from "../digital-provider.interface";

const VTU_CACHE_TTL_SECONDS = 86_400; // 24 hours

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
  }

  /**
   * GET https://app.billspot.co/api/v1/partner/vtu/providers?type=airtime|data
   */
  async getProviders(
    type: BillSpotVtuType = "airtime"
  ): Promise<BillSpotProvidersResponse> {
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
