import { Injectable } from "@nestjs/common";
import {
  NormalizedWebhookEvent,
  NormalizedWebhookEventType,
  PaymentGateway,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "../payment-gateway.interface";
import { getCurrencyConfig } from "@/common/currency/currency.types";
import { FlutterwaveService } from "@/infra/flutterwave/flutterwave.service";

@Injectable()
export class FlutterwaveGateway implements PaymentGateway {
  readonly providerName = "FLUTTERWAVE";
  readonly supportedCurrencies = ["NGN", "USD", "GBP", "EUR", "GHS", "KES"];
  readonly supportsPayouts = true;

  constructor(private readonly flutterwaveService: FlutterwaveService) {}

  supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  async initializePayment(
    params: PaymentInitParams
  ): Promise<PaymentInitResult> {
    const currency = (params.currency || "NGN").toUpperCase();
    const factor = getCurrencyConfig(currency).subunitFactor || 100;
    const amountMajor = Number((params.amountSubunits / factor).toFixed(2));
    const description =
      typeof params.metadata?.description === "string"
        ? params.metadata.description
        : "Givvly payment";

    const res = await this.flutterwaveService.initializeTransaction({
      txRef: params.reference,
      amountMajor,
      currency,
      customerEmail: params.customerEmail,
      customerName: params.customerName || "Givvly Guest",
      redirectUrl: params.callbackUrl,
      description,
      metadata: params.metadata,
    });

    return {
      authorizationUrl: res.link,
      accessCode: params.reference,
      reference: params.reference,
      providerReference: res.txRef,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const res = await this.flutterwaveService.verifyTransaction(reference);

    const rawStatus = String(res.status || "").toLowerCase();
    let status: PaymentVerifyResult["status"] = "abandoned";
    if (rawStatus === "successful") {
      status = "success";
    } else if (rawStatus === "failed") {
      status = "failed";
    } else if (rawStatus === "reversed") {
      status = "reversed";
    }

    const currency = String(res.currency || "NGN").toUpperCase();
    const factor = getCurrencyConfig(currency).subunitFactor || 100;
    const amountMajor = Number(res.charged_amount ?? res.amount ?? 0);
    const feeMajor = Number(res.app_fee ?? 0);

    return {
      status,
      amountSubunits: Math.round(amountMajor * factor),
      currency,
      channel: res.payment_type,
      feesSubunits: feeMajor > 0 ? Math.round(feeMajor * factor) : undefined,
      paidAt: res.created_at ? new Date(res.created_at) : undefined,
      gatewayResponse: res.status,
      raw: res,
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    _rawBody: Buffer | string
  ): boolean {
    const signature = headers["verif-hash"];
    const sigString = Array.isArray(signature) ? signature[0] : signature;
    return this.flutterwaveService.verifyWebhookSignature(sigString);
  }

  parseWebhookEvent(
    _headers: Record<string, string | string[] | undefined>,
    payload: any
  ): NormalizedWebhookEvent {
    const rawEvent = String(
      payload?.event || payload?.["event.type"] || ""
    ).toLowerCase();
    const data = payload?.data ?? payload ?? {};

    const currency = String(data.currency || "NGN").toUpperCase();
    const factor = getCurrencyConfig(currency).subunitFactor || 100;

    let eventType: NormalizedWebhookEventType = "UNKNOWN";
    let reference = "unknown";
    let amountSubunits: number | undefined;
    let feesSubunits: number | undefined;
    let paidAt: Date | undefined;
    let failureReason: string | undefined;

    if (rawEvent === "charge.completed") {
      const status = String(data.status || "").toLowerCase();
      eventType = status === "successful" ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED";
      reference = String(data.tx_ref || data.flw_ref || data.id || "unknown");
      const amountMajor = Number(data.charged_amount ?? data.amount ?? 0);
      amountSubunits =
        amountMajor > 0 ? Math.round(amountMajor * factor) : undefined;
      const feeMajor = Number(data.app_fee ?? 0);
      feesSubunits = feeMajor > 0 ? Math.round(feeMajor * factor) : undefined;
      paidAt = data.created_at ? new Date(data.created_at) : undefined;
      failureReason =
        eventType === "PAYMENT_FAILED"
          ? data.processor_response || data.status
          : undefined;
    } else if (rawEvent === "transfer.completed") {
      const status = String(data.status || "").toUpperCase();
      if (status === "SUCCESSFUL") {
        eventType = "TRANSFER_SUCCESS";
      } else if (status === "FAILED") {
        eventType = "TRANSFER_FAILED";
      } else {
        eventType = "UNKNOWN";
      }
      reference = String(data.reference || data.id || "unknown");
      const amountMajor = Number(data.amount ?? 0);
      amountSubunits =
        amountMajor > 0 ? Math.round(amountMajor * factor) : undefined;
      const feeMajor = Number(data.fee ?? 0);
      feesSubunits = feeMajor > 0 ? Math.round(feeMajor * factor) : undefined;
      paidAt = data.created_at ? new Date(data.created_at) : undefined;
      failureReason =
        eventType === "TRANSFER_FAILED"
          ? data.complete_message || "Transfer failed"
          : undefined;
    } else {
      reference = String(
        data.tx_ref || data.reference || data.id || "unknown"
      );
    }

    return {
      eventType,
      reference,
      amountSubunits,
      currency,
      channel: data.payment_type,
      feesSubunits,
      paidAt,
      failureReason,
      raw: payload,
    };
  }

  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }): Promise<{ recipientCode: string }> {
    return {
      recipientCode: `${params.bankCode}:${params.accountNumber}`,
    };
  }

  async initiatePayout(params: {
    amountSubunits: number;
    recipientCode: string;
    reference: string;
    reason: string;
    currency?: string;
  }): Promise<{ transferCode: string; status: string }> {
    const [destinationBankCode = "", destinationAccountNumber = ""] =
      params.recipientCode.split(":");
    const currency = (params.currency || "NGN").toUpperCase();
    const factor = getCurrencyConfig(currency).subunitFactor || 100;
    const amountMajor = Number((params.amountSubunits / factor).toFixed(2));

    const res = await this.flutterwaveService.initiateTransfer({
      amountMajor,
      reference: params.reference,
      narration: params.reason,
      destinationBankCode,
      destinationAccountNumber,
      currency,
    });

    return {
      transferCode: String(res.id || res.reference),
      status: res.status,
    };
  }
}
