import * as crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface FlutterwaveInitParams {
  txRef: string;
  amountMajor: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  redirectUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface FlutterwaveInitResponse {
  link: string;
  txRef: string;
}

export interface FlutterwaveVerifyResponse {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee?: number;
  status: string;
  payment_type?: string;
  created_at?: string;
}

export interface FlutterwaveTransferParams {
  amountMajor: number;
  reference: string;
  narration: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
  currency?: string;
}

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly webhookSecretHash: string;
  private readonly baseUrl: string;
  private readonly isMock: boolean;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>(
      "FLUTTERWAVE_PUBLIC_KEY",
      "FLWPUBK_TEST-mock_flutterwave_public_key"
    );
    this.secretKey = this.configService.get<string>(
      "FLUTTERWAVE_SECRET_KEY",
      "FLWSECK_TEST-mock_flutterwave_secret_key"
    );
    this.webhookSecretHash = this.configService.get<string>(
      "FLUTTERWAVE_WEBHOOK_SECRET_HASH",
      "mock_flutterwave_webhook_hash"
    );
    this.baseUrl = this.configService
      .get<string>("FLUTTERWAVE_BASE_URL", "https://api.flutterwave.com/v3")
      .replace(/\/$/, "");

    this.isMock = !this.secretKey || this.secretKey.includes("mock_");
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  private async parseJsonResponse(res: Response, endpoint: string): Promise<any> {
    const rawText = await res.text();
    try {
      return rawText ? JSON.parse(rawText) : {};
    } catch {
      const snippet = rawText.replace(/\s+/g, " ").slice(0, 200);
      this.logger.error(
        `Flutterwave ${endpoint} returned non-JSON (HTTP ${res.status}): ${snippet}`
      );
      throw new Error(
        `Flutterwave returned an invalid response (HTTP ${res.status}). Please try again.`
      );
    }
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await this.parseJsonResponse(res, `${method} ${path}`);
    if (!res.ok || json?.status !== "success") {
      const msg = json?.message || `Flutterwave HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json.data as T;
  }

  async initializeTransaction(
    params: FlutterwaveInitParams
  ): Promise<FlutterwaveInitResponse> {
    const currency = (params.currency || "NGN").toUpperCase();

    if (this.isMock) {
      this.logger.log(
        `[MOCK] Flutterwave initialize for ref=${params.txRef}, amount=${params.amountMajor} ${currency}`
      );
      return {
        link: `https://checkout.flutterwave.com/v3/hosted/pay/mock_${encodeURIComponent(params.txRef)}`,
        txRef: params.txRef,
      };
    }

    const data = await this.request<{ link?: string }>("POST", "/payments", {
      tx_ref: params.txRef,
      amount: params.amountMajor,
      currency,
      ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
      customer: {
        email: params.customerEmail,
        name: params.customerName || "Givvly Guest",
      },
      customizations: {
        title: "Givvly",
        description: params.description || "Givvly Payment",
      },
      ...(params.metadata ? { meta: params.metadata } : {}),
    });

    if (!data?.link) {
      throw new Error("Flutterwave initialize response missing checkout link");
    }

    return {
      link: data.link,
      txRef: params.txRef,
    };
  }

  async verifyTransaction(txRef: string): Promise<FlutterwaveVerifyResponse> {
    if (this.isMock) {
      return {
        id: 999999,
        tx_ref: txRef,
        flw_ref: `FLW_MOCK_${txRef}`,
        amount: 5000,
        currency: "NGN",
        charged_amount: 5000,
        app_fee: 70,
        status: "successful",
        payment_type: "card",
        created_at: new Date().toISOString(),
      };
    }

    const data = await this.request<FlutterwaveVerifyResponse>(
      "GET",
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`
    );

    if (data?.tx_ref && data.tx_ref !== txRef) {
      throw new Error("Flutterwave verification reference mismatch");
    }

    return data;
  }

  verifyWebhookSignature(verifHashHeader: string | undefined): boolean {
    if (!verifHashHeader || !this.webhookSecretHash) {
      return false;
    }

    const provided = Buffer.from(verifHashHeader);
    const expected = Buffer.from(this.webhookSecretHash);
    if (provided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  }

  async initiateTransfer(
    params: FlutterwaveTransferParams
  ): Promise<{ id: number; reference: string; status: string }> {
    const currency = (params.currency || "NGN").toUpperCase();

    if (this.isMock) {
      this.logger.log(
        `[MOCK] Flutterwave transfer ref=${params.reference}, amount=${params.amountMajor} ${currency}`
      );
      return {
        id: 10001,
        reference: params.reference,
        status: "NEW",
      };
    }

    const data = await this.request<{
      id?: number;
      reference?: string;
      status?: string;
    }>("POST", "/transfers", {
      account_bank: params.destinationBankCode,
      account_number: params.destinationAccountNumber,
      amount: params.amountMajor,
      narration: params.narration,
      currency,
      reference: params.reference,
      debit_currency: currency,
    });

    return {
      id: Number(data?.id ?? 0),
      reference: data?.reference || params.reference,
      status: String(data?.status || "NEW"),
    };
  }

  private banksCache = new Map<
    string,
    { expiresAt: number; banks: Array<{ code: string; name: string }> }
  >();

  async listBanks(
    country = "NG"
  ): Promise<Array<{ code: string; name: string }>> {
    const normalizedCountry = (country || "NG").toUpperCase();
    const cached = this.banksCache.get(normalizedCountry);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.banks;
    }

    if (this.isMock) {
      return [
        { code: "044", name: "Access Bank" },
        { code: "011", name: "First Bank of Nigeria" },
        { code: "214", name: "First City Monument Bank" },
        { code: "070", name: "Fidelity Bank" },
        { code: "058", name: "Guaranty Trust Bank" },
        { code: "090267", name: "Kuda Microfinance Bank" },
        { code: "305", name: "OPay" },
        { code: "100033", name: "PalmPay" },
        { code: "232", name: "Sterling Bank" },
        { code: "033", name: "United Bank for Africa" },
        { code: "035", name: "Wema Bank" },
        { code: "057", name: "Zenith Bank" },
      ];
    }

    const data = await this.request<
      Array<{ id?: number; code?: string; name?: string }>
    >("GET", `/banks/${encodeURIComponent(normalizedCountry)}`);

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
      this.banksCache.set(normalizedCountry, {
        expiresAt: Date.now() + 60 * 60 * 1000,
        banks,
      });
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

    try {
      const data = await this.request<{
        account_number?: string;
        account_name?: string;
      }>("POST", "/accounts/resolve", {
        account_number: params.accountNumber,
        account_bank: params.bankCode,
      });

      if (!data?.account_name) {
        throw new Error("Could not resolve account name from Flutterwave");
      }

      return {
        accountNumber: data.account_number || params.accountNumber,
        accountName: data.account_name,
      };
    } catch (err: any) {
      const isTestKey = this.secretKey.startsWith("FLWSECK_TEST");
      if (isTestKey && /invalid account/i.test(String(err?.message || ""))) {
        throw new Error(
          "Flutterwave Test Mode (FLWSECK_TEST) only resolves Access Bank (044) with test account numbers (e.g. 0690000031 or 0690000032). Switch to live Flutterwave keys to verify real Nigerian bank accounts."
        );
      }
      throw err;
    }
  }
}
