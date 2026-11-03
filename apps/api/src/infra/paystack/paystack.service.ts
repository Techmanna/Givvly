import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

export interface PaystackInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "abandoned" | "reversed";
  amountKobo: number;
  currency: string;
  channel?: string;
  feesKobo?: number;
  paidAt?: Date;
  gatewayResponse?: string;
}

export interface PaystackRecipientResponse {
  recipientCode: string;
}

export interface PaystackTransferResponse {
  transferCode: string;
  status: string;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly isMockMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>(
      "PAYSTACK_SECRET_KEY",
      "sk_test_mock_paystack_secret_key"
    );
    this.baseUrl = this.config.get<string>(
      "PAYSTACK_BASE_URL",
      "https://api.paystack.co"
    );
    this.isMockMode =
      this.secretKey === "sk_test_mock_paystack_secret_key" ||
      this.secretKey.startsWith("sk_test_mock");
  }

  /**
   * Cryptographically verify Paystack Webhook Signature (HMAC-SHA512)
   */
  verifyWebhookSignature(
    signature: string | undefined,
    rawBody: Buffer | string
  ): boolean {
    if (!signature || !rawBody) {
      return false;
    }

    try {
      const hmac = crypto.createHmac("sha512", this.secretKey);
      const computed = hmac.update(rawBody).digest("hex");

      const sigBuf = Buffer.from(signature, "hex");
      const compBuf = Buffer.from(computed, "hex");

      if (sigBuf.length !== compBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, compBuf);
    } catch (err) {
      this.logger.error("Error computing webhook signature:", err);
      return false;
    }
  }

  /**
   * Initialize Transaction
   */
  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitResponse> {
    if (this.isMockMode) {
      this.logger.log(
        `[MOCK] Paystack initialize for ref=${params.reference}, amount=${params.amountKobo} kobo`
      );
      return {
        authorizationUrl: `https://checkout.paystack.com/mock_${params.reference}`,
        accessCode: `acc_${params.reference}`,
        reference: params.reference,
      };
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(
        data.message || `Paystack initialize failed with status ${res.status}`
      );
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  }

  /**
   * Verify Transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    if (this.isMockMode) {
      this.logger.log(`[MOCK] Paystack verify for ref=${reference}`);
      return {
        status: "success",
        amountKobo: 500000,
        currency: "NGN",
        channel: "card",
        feesKobo: 7500,
        paidAt: new Date(),
        gatewayResponse: "Approved (Mock)",
      };
    }

    const res = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(
        data.message || `Paystack verify failed with status ${res.status}`
      );
    }

    const tx = data.data;
    return {
      status: tx.status as PaystackVerifyResponse["status"],
      amountKobo: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      feesKobo: tx.fees,
      paidAt: tx.paid_at ? new Date(tx.paid_at) : undefined,
      gatewayResponse: tx.gateway_response,
    };
  }

  /**
   * Resolve NUBAN Bank Account
   */
  async resolveAccount(params: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{ accountNumber: string; accountName: string }> {
    if (this.isMockMode) {
      return {
        accountNumber: params.accountNumber,
        accountName: "GIVVLY MOCK ACCOUNT HOLDER",
      };
    }

    const url = `${this.baseUrl}/bank/resolve?account_number=${encodeURIComponent(
      params.accountNumber
    )}&bank_code=${encodeURIComponent(params.bankCode)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(data.message || "Failed to resolve bank account");
    }

    return {
      accountNumber: data.data.account_number,
      accountName: data.data.account_name,
    };
  }

  /**
   * Create Transfer Recipient (for Payouts)
   */
  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<PaystackRecipientResponse> {
    if (this.isMockMode) {
      return {
        recipientCode: `RCP_mock_${params.accountNumber}`,
      };
    }

    const res = await fetch(`${this.baseUrl}/transferrecipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(
        data.message || `Paystack createTransferRecipient failed`
      );
    }

    return {
      recipientCode: data.data.recipient_code,
    };
  }

  /**
   * Initiate Transfer (for Payouts)
   */
  async initiateTransfer(params: {
    amountKobo: number;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<PaystackTransferResponse> {
    if (this.isMockMode) {
      this.logger.log(
        `[MOCK] Paystack initiate transfer ref=${params.reference}, amount=${params.amountKobo} kobo`
      );
      return {
        transferCode: `TRF_mock_${params.reference}`,
        status: "success",
      };
    }

    const res = await fetch(`${this.baseUrl}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: params.amountKobo,
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(data.message || `Paystack initiateTransfer failed`);
    }

    return {
      transferCode: data.data.transfer_code,
      status: data.data.status,
    };
  }
}

