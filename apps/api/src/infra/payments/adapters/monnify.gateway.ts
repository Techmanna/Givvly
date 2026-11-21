import { Injectable } from "@nestjs/common";
import {
  NormalizedWebhookEvent,
  NormalizedWebhookEventType,
  PaymentGateway,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "../payment-gateway.interface";
import { MonnifyService } from "@/infra/monnify/monnify.service";

@Injectable()
export class MonnifyGateway implements PaymentGateway {
  readonly providerName = "MONNIFY";
  readonly supportedCurrencies = ["NGN"];
  readonly supportsPayouts = true;

  constructor(private readonly monnifyService: MonnifyService) {}

  supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  async initializePayment(
    params: PaymentInitParams
  ): Promise<PaymentInitResult> {
    const amountNaira = Number((params.amountSubunits / 100).toFixed(2));
    const description =
      typeof params.metadata?.description === "string"
        ? params.metadata.description
        : "Givvly payment";

    const res = await this.monnifyService.initializeTransaction({
      amountNaira,
      customerName: params.customerName || "Givvly Guest",
      customerEmail: params.customerEmail,
      paymentReference: params.reference,
      paymentDescription: description,
      currencyCode: params.currency || "NGN",
      redirectUrl: params.callbackUrl,
      metadata: params.metadata,
    });

    return {
      authorizationUrl: res.checkoutUrl,
      accessCode: res.transactionReference,
      reference: res.paymentReference || params.reference,
      providerReference: res.transactionReference,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const res = await this.monnifyService.verifyTransaction(reference);

    const rawStatus = String(res.paymentStatus || "").toUpperCase();
    let status: PaymentVerifyResult["status"] = "abandoned";
    if (rawStatus === "PAID" || rawStatus === "OVERPAID") {
      status = "success";
    } else if (rawStatus === "FAILED" || rawStatus === "CANCELLED") {
      status = "failed";
    } else if (rawStatus === "REVERSED") {
      status = "reversed";
    }

    const amountNaira = Number(res.amountPaid ?? res.totalPayable ?? 0);
    const feeNaira = Number(res.fee ?? 0);

    return {
      status,
      amountSubunits: Math.round(amountNaira * 100),
      currency: String(res.currencyCode || "NGN").toUpperCase(),
      channel: res.paymentMethod,
      feesSubunits: feeNaira > 0 ? Math.round(feeNaira * 100) : undefined,
      paidAt: res.paidOn ? new Date(res.paidOn) : undefined,
      gatewayResponse: res.paymentStatus,
      raw: res,
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean {
    const signature = headers["monnify-signature"];
    const sigString = Array.isArray(signature) ? signature[0] : signature;
    return this.monnifyService.verifyWebhookSignature(sigString, rawBody);
  }

  parseWebhookEvent(
    _headers: Record<string, string | string[] | undefined>,
    payload: any
  ): NormalizedWebhookEvent {
    const rawEvent = String(payload?.eventType || "").toUpperCase();
    const data = payload?.eventData ?? payload ?? {};

    let eventType: NormalizedWebhookEventType = "UNKNOWN";
    if (rawEvent === "SUCCESSFUL_TRANSACTION") {
      eventType = "PAYMENT_SUCCESS";
    } else if (
      rawEvent === "FAILED_TRANSACTION" ||
      rawEvent === "CANCELLED_TRANSACTION"
    ) {
      eventType = "PAYMENT_FAILED";
    } else if (rawEvent === "SUCCESSFUL_DISBURSEMENT") {
      eventType = "TRANSFER_SUCCESS";
    } else if (rawEvent === "FAILED_DISBURSEMENT") {
      eventType = "TRANSFER_FAILED";
    } else if (rawEvent === "REVERSED_DISBURSEMENT") {
      eventType = "TRANSFER_REVERSED";
    }

    const reference = String(
      data.paymentReference ||
        data.reference ||
        data.transactionReference ||
        ""
    );
    const amountNaira = Number(
      data.amountPaid ?? data.totalPayable ?? data.amount ?? 0
    );
    const feeNaira = Number(data.fee ?? 0);

    return {
      eventType,
      reference,
      amountSubunits: amountNaira > 0 ? Math.round(amountNaira * 100) : undefined,
      currency: data.currency
        ? String(data.currency).toUpperCase()
        : data.currencyCode
          ? String(data.currencyCode).toUpperCase()
          : "NGN",
      channel: data.paymentMethod,
      feesSubunits: feeNaira > 0 ? Math.round(feeNaira * 100) : undefined,
      paidAt: data.paidOn ? new Date(data.paidOn) : undefined,
      failureReason: data.paymentDescription || data.responseMessage,
      raw: payload,
    };
  }

  async listBanks(): Promise<Array<{ code: string; name: string }>> {
    return this.monnifyService.listBanks();
  }

  async resolveBankAccount(params: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{ accountNumber: string; accountName: string }> {
    return this.monnifyService.resolveAccount(params);
  }

  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }): Promise<{ recipientCode: string }> {
    // Monnify disbursements take bankCode + accountNumber directly; encode as recipientCode
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

    const res = await this.monnifyService.initiateTransfer({
      amountNaira: Number((params.amountSubunits / 100).toFixed(2)),
      reference: params.reference,
      narration: params.reason,
      destinationBankCode,
      destinationAccountNumber,
      currency: params.currency || "NGN",
    });

    return {
      transferCode: res.transactionReference || res.reference,
      status: res.status,
    };
  }
}
