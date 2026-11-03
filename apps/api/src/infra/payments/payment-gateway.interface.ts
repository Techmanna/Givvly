export interface PaymentInitParams {
  reference: string;
  amountSubunits: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
  providerReference?: string;
}

export interface PaymentVerifyResult {
  status: "success" | "failed" | "abandoned" | "reversed";
  amountSubunits: number;
  currency: string;
  channel?: string;
  feesSubunits?: number;
  paidAt?: Date;
  gatewayResponse?: string;
  raw?: any;
}

export type NormalizedWebhookEventType =
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "TRANSFER_SUCCESS"
  | "TRANSFER_FAILED"
  | "TRANSFER_REVERSED"
  | "UNKNOWN";

export interface NormalizedWebhookEvent {
  eventType: NormalizedWebhookEventType;
  reference: string;
  amountSubunits?: number;
  currency?: string;
  channel?: string;
  feesSubunits?: number;
  paidAt?: Date;
  failureReason?: string;
  raw: any;
}

export interface PaymentGateway {
  readonly providerName: string;
  readonly supportedCurrencies: string[];

  supportsCurrency(currency: string): boolean;

  initializePayment(params: PaymentInitParams): Promise<PaymentInitResult>;

  verifyPayment(reference: string): Promise<PaymentVerifyResult>;

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string
  ): boolean;

  parseWebhookEvent(
    headers: Record<string, string | string[] | undefined>,
    payload: any
  ): NormalizedWebhookEvent;

  // Disbursement / Payouts capabilities
  readonly supportsPayouts: boolean;

  createTransferRecipient?(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency?: string;
  }): Promise<{ recipientCode: string }>;

  initiatePayout?(params: {
    amountSubunits: number;
    recipientCode: string;
    reference: string;
    reason: string;
    currency?: string;
  }): Promise<{ transferCode: string; status: string }>;
}

