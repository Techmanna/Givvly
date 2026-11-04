export type DigitalKind = "AIRTIME" | "DATA" | "VOUCHER" | "GIFT_CARD";

export type BillSpotVtuType = "airtime" | "data";

export interface BillSpotProviderInfo {
  id: number;
  name: string;
  slug: string;
  logo: string;
}

export interface BillSpotProvidersResponse {
  message: string;
  type: BillSpotVtuType;
  providers: BillSpotProviderInfo[];
}

export interface BillSpotDataPlan {
  name: string;
  bill_item_identifier: string;
  amount: number;
}

export interface BillSpotPlansResponse {
  message: string;
  provider: BillSpotProviderInfo;
  plans: BillSpotDataPlan[];
}

export interface BillSpotPurchaseRequest {
  phone?: string;
  phones?: string[];
  amount: number;
  provider: string;
  type?: BillSpotVtuType;
  bill_item_identifier?: string;
  idempotency_key?: string;
}

export interface BillSpotPurchaseResponse {
  message: string;
  txt_ref: string;
  purchase: {
    txt_ref: string;
    phone?: string;
    phones?: string[];
    amount: string;
    provider: string;
    type: BillSpotVtuType;
    status: string;
    currency: string;
  };
}

export interface DigitalTopUpParams {
  phoneNumber: string;
  phoneNumbers?: string[];
  operator: string;
  amountSubunits: number;
  reference: string;
  type?: BillSpotVtuType;
  billItemIdentifier?: string;
}

export interface DigitalTopUpResult {
  success: boolean;
  operatorReference: string;
  deliveredTo: string;
  deliveredAt: Date;
  details?: BillSpotPurchaseResponse;
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

export interface DigitalTopUpProvider {
  getProviders(type?: BillSpotVtuType): Promise<BillSpotProvidersResponse>;
  getDataPlans(provider: string): Promise<BillSpotPlansResponse>;
  purchase(request: BillSpotPurchaseRequest): Promise<BillSpotPurchaseResponse>;
  fulfillTopUp(params: DigitalTopUpParams): Promise<DigitalTopUpResult>;
}

export interface DigitalVoucherProvider {
  generateVoucher(params: DigitalVoucherParams): Promise<DigitalVoucherResult>;
}

export interface DigitalFulfillmentProvider
  extends DigitalTopUpProvider,
    DigitalVoucherProvider {}
