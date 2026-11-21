import * as crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MonnifyInitParams {
  amountNaira: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface MonnifyInitResponse {
  transactionReference: string;
  paymentReference: string;
  checkoutUrl: string;
  enabledPaymentMethod: string[];
}

export interface MonnifyVerifyResponse {
  transactionReference: string;
  paymentReference: string;
  amountPaid: number;
  totalPayable: number;
  settlementAmount?: number;
  paidOn?: string;
  paymentStatus: "PAID" | "OVERPAID" | "PARTIALLY_PAID" | "PENDING" | "ABANDONED" | "CANCELLED" | "FAILED" | "REVERSED" | "EXPIRED" | string;
  paymentMethod?: string;
  currencyCode: string;
  fee?: number;
}

export interface MonnifyTransferParams {
  amountNaira: number;
  reference: string;
  narration: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
  currency?: string;
}

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly contractCode: string;
  private readonly baseUrl: string;
  private readonly sourceAccount: string;
  private readonly isMock: boolean;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>(
      "MONNIFY_API_KEY",
      "MK_TEST_mock_monnify_api_key"
    );
    this.secretKey = this.configService.get<string>(
      "MONNIFY_SECRET_KEY",
      "MSK_TEST_mock_monnify_secret_key"
    );
    this.contractCode = this.configService.get<string>(
      "MONNIFY_CONTRACT_CODE",
      "0000000000"
    );
    this.baseUrl = this.configService
      .get<string>("MONNIFY_BASE_URL", "https://sandbox.monnify.com")
      .replace(/\/$/, "");
    this.sourceAccount = this.configService.get<string>(
      "MONNIFY_SOURCE_ACCOUNT",
      ""
    );

    this.isMock =
      !this.apiKey ||
      !this.secretKey ||
      this.apiKey.startsWith("MK_TEST_mock_") ||
      this.secretKey.startsWith("MSK_TEST_mock_");
  }

  private async parseJsonResponse(res: Response, endpoint: string): Promise<any> {
    const rawText = await res.text();
    try {
      return rawText ? JSON.parse(rawText) : {};
    } catch {
      const snippet = rawText.replace(/\s+/g, " ").slice(0, 200);
      this.logger.error(
        `Monnify ${endpoint} returned non-JSON (HTTP ${res.status}): ${snippet}`
      );
      throw new Error(
        `Monnify returned an invalid response (HTTP ${res.status}). Please try again.`
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.isMock) {
      return "mock_monnify_access_token";
    }

    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const basicAuth = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString(
      "base64"
    );

    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    const json = await this.parseJsonResponse(res, "POST /api/v1/auth/login");
    if (!res.ok || !json?.requestSuccessful || !json?.responseBody?.accessToken) {
      const msg = json?.responseMessage || `HTTP ${res.status}`;
      throw new Error(`Monnify auth failed: ${msg}`);
    }

    const expiresInSec = Number(json.responseBody.expiresIn || 3600);
    this.cachedToken = json.responseBody.accessToken;
    // Refresh 60 seconds early to avoid race-condition expiry
    this.tokenExpiresAt = now + Math.max(30, expiresInSec - 60) * 1000;
    return this.cachedToken!;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await this.parseJsonResponse(res, `${method} ${path}`);
    if (!res.ok || !json?.requestSuccessful) {
      const msg = json?.responseMessage || `Monnify HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json.responseBody as T;
  }

  async initializeTransaction(
    params: MonnifyInitParams
  ): Promise<MonnifyInitResponse> {
    if (this.isMock) {
      const txRef = `MNFY|MOCK|${params.paymentReference}`;
      this.logger.log(
        `[MOCK] Monnify initialize for ref=${params.paymentReference}, amount=${params.amountNaira} NGN`
      );
      return {
        transactionReference: txRef,
        paymentReference: params.paymentReference,
        checkoutUrl: `https://sandbox.sdk.monnify.com/checkout/${encodeURIComponent(txRef)}`,
        enabledPaymentMethod: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
      };
    }

    // Monnify's Cloudflare WAF blocks http://localhost / non-HTTPS redirectUrl values with HTTP 403
    const safeRedirectUrl =
      params.redirectUrl &&
      /^https:\/\//i.test(params.redirectUrl) &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(params.redirectUrl)
        ? params.redirectUrl
        : undefined;

    return this.request<MonnifyInitResponse>(
      "POST",
      "/api/v1/merchant/transactions/init-transaction",
      {
        amount: params.amountNaira,
        customerName: params.customerName || "Givvly Guest",
        customerEmail: params.customerEmail,
        paymentReference: params.paymentReference,
        paymentDescription: params.paymentDescription,
        currencyCode: params.currencyCode || "NGN",
        contractCode: this.contractCode,
        ...(safeRedirectUrl ? { redirectUrl: safeRedirectUrl } : {}),
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
        metaData: params.metadata,
      }
    );
  }

  async verifyTransaction(
    paymentReference: string
  ): Promise<MonnifyVerifyResponse> {
    if (this.isMock) {
      return {
        transactionReference: `MNFY|MOCK|${paymentReference}`,
        paymentReference,
        amountPaid: 500,
        totalPayable: 500,
        paymentStatus: "PAID",
        paymentMethod: "CARD",
        currencyCode: "NGN",
        paidOn: new Date().toISOString(),
      };
    }

    return this.request<MonnifyVerifyResponse>(
      "GET",
      `/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(paymentReference)}`
    );
  }

  verifyWebhookSignature(
    signature: string | undefined,
    rawBody: Buffer | string
  ): boolean {
    if (this.isMock) {
      return true;
    }

    if (!signature) {
      return false;
    }

    const expected = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  async initiateTransfer(params: MonnifyTransferParams): Promise<{
    reference: string;
    status: string;
    transactionReference?: string;
  }> {
    if (this.isMock) {
      this.logger.log(
        `[MOCK] Monnify disbursement ref=${params.reference}, amount=${params.amountNaira} NGN`
      );
      return {
        reference: params.reference,
        status: "SUCCESS",
        transactionReference: `MNFY_DISB_${Date.now()}`,
      };
    }

    if (!this.sourceAccount) {
      throw new Error(
        "MONNIFY_SOURCE_ACCOUNT is required to initiate Monnify disbursements"
      );
    }

    const res = await this.request<any>("POST", "/api/v2/disbursements/single", {
      amount: params.amountNaira,
      reference: params.reference,
      narration: params.narration,
      destinationBankCode: params.destinationBankCode,
      destinationAccountNumber: params.destinationAccountNumber,
      currency: params.currency || "NGN",
      sourceAccountNumber: this.sourceAccount,
    });

    return {
      reference: res?.reference || params.reference,
      status: res?.status || "PENDING",
      transactionReference: res?.transactionReference,
    };
  }

  private banksCache?: {
    expiresAt: number;
    banks: Array<{ code: string; name: string }>;
  };

  async listBanks(): Promise<Array<{ code: string; name: string }>> {
    if (this.banksCache && this.banksCache.expiresAt > Date.now()) {
      return this.banksCache.banks;
    }

    if (this.isMock) {
      return [
        { code: "044", name: "Access Bank" },
        { code: "011", name: "First Bank of Nigeria" },
        { code: "058", name: "Guaranty Trust Bank" },
        { code: "033", name: "United Bank for Africa" },
        { code: "057", name: "Zenith Bank" },
      ];
    }

    const data = await this.request<Array<{ code?: string; name?: string }>>(
      "GET",
      "/api/v1/banks"
    );

    const seen = new Set<string>();
    const banks: Array<{ code: string; name: string }> = [];
    for (const item of Array.isArray(data) ? data : []) {
      const code = String(item?.code || "").trim();
      const name = String(item?.name || "").trim();
      if (!code || !name || seen.has(code)) continue;
      seen.add(code);
      banks.push({ code, name });
    }
    banks.sort((a, b) => a.name.localeCompare(b.name));

    if (banks.length > 0) {
      this.banksCache = {
        expiresAt: Date.now() + 60 * 60 * 1000,
        banks,
      };
    }

    return banks;
  }

  async resolveAccount(params: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{ accountNumber: string; accountName: string }> {
    if (this.isMock) {
      return {
        accountNumber: params.accountNumber,
        accountName: "GIVVLY MOCK ACCOUNT HOLDER",
      };
    }

    const data = await this.request<{
      accountNumber?: string;
      accountName?: string;
    }>(
      "GET",
      `/api/v1/disbursements/account/validate?accountNumber=${encodeURIComponent(
        params.accountNumber
      )}&bankCode=${encodeURIComponent(params.bankCode)}`
    );

    if (!data?.accountName) {
      throw new Error("Could not resolve account name from Monnify");
    }

    return {
      accountNumber: data.accountNumber || params.accountNumber,
      accountName: data.accountName,
    };
  }
}
