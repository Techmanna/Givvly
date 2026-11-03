import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  DigitalFulfillmentProvider,
  DigitalTopUpParams,
  DigitalTopUpResult,
  DigitalVoucherParams,
  DigitalVoucherResult,
} from "../digital-provider.interface";

/**
 * Normalizes phone numbers to standard 11-digit Nigerian format (e.g., 08012345678)
 */
export function normalizeNigerianPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

/**
 * Resolves telco network provider code (mtn, airtel, glo, 9mobile)
 */
export function resolveTelcoProvider(input: {
  operator?: string;
  productTitle?: string;
  phone?: string;
}): "mtn" | "airtel" | "glo" | "9mobile" {
  const combined = `${input.operator || ""} ${input.productTitle || ""}`.toLowerCase();
  if (combined.includes("mtn")) return "mtn";
  if (combined.includes("airtel")) return "airtel";
  if (combined.includes("glo")) return "glo";
  if (combined.includes("9mobile") || combined.includes("etisalat")) return "9mobile";

  // Fallback: detect by Nigerian phone number prefix
  if (input.phone) {
    const clean = normalizeNigerianPhone(input.phone);
    const prefix4 = clean.slice(0, 4);
    if (
      [
        "0803",
        "0806",
        "0703",
        "0706",
        "0813",
        "0816",
        "0810",
        "0814",
        "0903",
        "0906",
        "0913",
        "0916",
      ].includes(prefix4)
    ) {
      return "mtn";
    }
    if (
      [
        "0802",
        "0808",
        "0708",
        "0812",
        "0701",
        "0902",
        "0901",
        "0904",
        "0907",
        "0912",
      ].includes(prefix4)
    ) {
      return "airtel";
    }
    if (
      ["0805", "0807", "0705", "0815", "0811", "0905", "0915"].includes(prefix4)
    ) {
      return "glo";
    }
    if (["0809", "0818", "0817", "0909", "0908"].includes(prefix4)) {
      return "9mobile";
    }
  }

  return "mtn";
}

@Injectable()
export class BillSpotProvider implements DigitalFulfillmentProvider {
  private readonly logger = new Logger(BillSpotProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("BILLSPOT_API_KEY", "").trim();
    this.baseUrl = this.config
      .get<string>("BILLSPOT_BASE_URL", "https://app.billspot.co/api/v1")
      .replace(/\/+$/, "");
  }

  /**
   * Fulfill VTU Airtime or Mobile Data via BillSpot Partner API
   * Endpoint: POST https://app.billspot.co/api/v1/partner/vtu
   */
  async fulfillTopUp(params: DigitalTopUpParams): Promise<DigitalTopUpResult> {
    const normalizedPhone = normalizeNigerianPhone(params.phoneNumber);
    const provider = resolveTelcoProvider({
      operator: params.operator,
      phone: params.phoneNumber,
    });

    // BillSpot expects amount in Naira (whole number)
    const amountNaira = Math.max(1, Math.round(params.amountSubunits / 100));
    const vtuType = params.type === "data" ? "data" : "airtime";
    const idempotencyKey = params.reference || `req-${crypto.randomUUID()}`;

    // Mock mode when API key is not configured (e.g. testing or local dev)
    if (!this.apiKey) {
      const mockRef = `bspot_mock_${crypto.randomBytes(6).toString("hex")}`;
      this.logger.log(
        `[BILLSPOT MOCK] VTU top-up: ${vtuType.toUpperCase()} ₦${amountNaira} -> ${normalizedPhone} (${provider.toUpperCase()}) | txt_ref: ${mockRef}`
      );
      return {
        success: true,
        operatorReference: mockRef,
        deliveredTo: normalizedPhone,
        deliveredAt: new Date(),
        details: {
          mock: true,
          provider,
          amountNaira,
          type: vtuType,
        },
      };
    }

    const payload = {
      phone: normalizedPhone,
      amount: amountNaira,
      provider,
      type: vtuType,
      idempotency_key: idempotencyKey,
    };

    const endpoint = `${this.baseUrl}/partner/vtu`;

    this.logger.log(
      `[BILLSPOT] Dispatching VTU ${vtuType} to ${normalizedPhone} (${provider}, ₦${amountNaira}) via ${endpoint}`
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.status === "error" || data.status === "failed") {
        const errorMsg =
          data.message ||
          data.error ||
          `HTTP ${response.status} ${response.statusText}`;
        this.logger.error(`[BILLSPOT ERROR] VTU fulfillment failed: ${errorMsg}`);
        throw new Error(`BillSpot VTU failure: ${errorMsg}`);
      }

      const txtRef =
        data.txt_ref ||
        data.data?.txt_ref ||
        data.reference ||
        data.id ||
        `bspot_${crypto.randomBytes(6).toString("hex")}`;

      this.logger.log(
        `[BILLSPOT SUCCESS] VTU ${vtuType} successfully delivered to ${normalizedPhone} (txt_ref: ${txtRef})`
      );

      return {
        success: true,
        operatorReference: String(txtRef),
        deliveredTo: normalizedPhone,
        deliveredAt: new Date(),
        details: data,
      };
    } catch (err: any) {
      this.logger.error(`[BILLSPOT EXCEPTION] Error calling BillSpot VTU API: ${err.message}`);
      throw err;
    }
  }

  /**
   * Standard voucher generation fallback
   */
  async generateVoucher(params: DigitalVoucherParams): Promise<DigitalVoucherResult> {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const voucherCode = `GV-${part1}-${part2}-${part3}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      voucherCode,
      pin,
      expiresAt,
      instructions: `Redeem this voucher code at checkout or present upon redemption. Valid for 1 year.`,
    };
  }
}

