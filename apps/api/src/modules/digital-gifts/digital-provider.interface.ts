export type DigitalKind = "AIRTIME" | "DATA" | "VOUCHER" | "GIFT_CARD";

export interface DigitalTopUpParams {
  phoneNumber: string;
  operator: string;
  amountSubunits: number;
  reference: string;
  type?: "airtime" | "data";
}

export interface DigitalTopUpResult {
  success: boolean;
  operatorReference: string;
  deliveredTo: string;
  deliveredAt: Date;
  details?: Record<string, any>;
}

export interface DigitalVoucherParams {
  kind: DigitalKind;
  title: string;
  amountSubunits: number;
  recipientEmail?: string;
  recipientPhone?: string;
  reference: string;
}

export interface DigitalVoucherResult {
  success: boolean;
  voucherCode: string;
  pin?: string;
  expiresAt: Date;
  instructions: string;
}

export interface DigitalFulfillmentProvider {
  fulfillTopUp(params: DigitalTopUpParams): Promise<DigitalTopUpResult>;
  generateVoucher(params: DigitalVoucherParams): Promise<DigitalVoucherResult>;
}

