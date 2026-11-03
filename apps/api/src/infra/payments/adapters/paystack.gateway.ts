import { Injectable, Logger } from "@nestjs/common";
import {
  NormalizedWebhookEvent,
  PaymentGateway,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
} from "../payment-gateway.interface";
import { PaystackService } from "@/infra/paystack/paystack.service";

@Injectable()
export class PaystackGateway implements PaymentGateway {
  private readonly logger = new Logger(PaystackGateway.name);

  readonly providerName = "PAYSTACK";
  readonly supportedCurrencies = ["NGN", "USD", "GHS", "KES"];
  readonly supportsPayouts = true;

  constructor(private readonly paystackService: PaystackService) {}

  supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const res = await this.paystackService.initializeTransaction({
      email: params.customerEmail,
      amountKobo: params.amountSubunits,
      reference: params.reference,
      callbackUrl: params.callbackUrl,
      metadata: {
        ...params.metadata,
        currency: params.currency,
        customerName: params.customerName,
      },
    });

    return {
      authorizationUrl: res.authorizationUrl,
      accessCode: res.accessCode,
      reference: res.reference,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const res = await this.paystackService.verifyTransaction(reference);

    return {
      status: res.status,
      amountSubunits: res.amountKobo,
      currency: res.currency,
      channel: res.channel,
      feesSubunits: res.feesKobo,
      paidAt: res.paidAt,
      gatewayResponse: res.gatewayResponse,
      raw: res,
    };
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean {
    const signature = headers["x-paystack-signature"];
    const sigString = Array.isArray(signature) ? signature[0] : signature;
    return this.paystackService.verifyWebhookSignature(sigString, rawBody);
  }

  parseWebhookEvent(
    _headers: Record<string, string | string[] | undefined>,
    payload: any
  ): NormalizedWebhookEvent {
    const event = payload?.event as string;
    const data = payload?.data as any;

    if (!data) {
      return {
        eventType: "UNKNOWN",
        reference: "unknown",
        raw: payload,
      };
    }

    const reference = data.reference || data.id || "unknown";

    switch (event) {
      case "charge.success":
        return {
          eventType: "PAYMENT_SUCCESS",
          reference,
          amountSubunits: data.amount,
          currency: data.currency || "NGN",
          channel: data.channel,
          feesSubunits: data.fees,
          paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
          raw: data,
        };

      case "transfer.success":
        return {
          eventType: "TRANSFER_SUCCESS",
          reference,
          amountSubunits: data.amount,
          currency: data.currency || "NGN",
          paidAt: data.transferred_at ? new Date(data.transferred_at) : new Date(),
          raw: data,
        };

      case "transfer.failed":
        return {
          eventType: "TRANSFER_FAILED",
          reference,
          amountSubunits: data.amount,
          currency: data.currency || "NGN",
          failureReason: data.reason || "Transfer failed",
          raw: data,
        };

      case "transfer.reversed":
        return {
          eventType: "TRANSFER_REVERSED",
          reference,
          amountSubunits: data.amount,
          currency: data.currency || "NGN",
          failureReason: data.reason || "Transfer reversed",
          raw: data,
        };

      default:
        return {
          eventType: "UNKNOWN",
          reference,
          raw: payload,
        };
    }
  }

  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }): Promise<{ recipientCode: string }> {
    return this.paystackService.createTransferRecipient(params);
  }

  async initiatePayout(params: {
    amountSubunits: number;
    recipientCode: string;
    reference: string;
    reason: string;
    currency?: string;
  }): Promise<{ transferCode: string; status: string }> {
    return this.paystackService.initiateTransfer({
      amountKobo: params.amountSubunits,
      recipientCode: params.recipientCode,
      reference: params.reference,
      reason: params.reason,
    });
  }
}

