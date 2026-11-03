export type SupportedCurrency = "NGN" | "USD" | "GBP" | "EUR" | "GHS" | "KES";

export interface CurrencyMetadata {
  code: SupportedCurrency | string;
  name: string;
  symbol: string;
  subunitFactor: number;
  subunitName: string;
  minGiftSubunits: number;
  maxGiftSubunits: number;
  defaultFeeCapSubunits: number;
  defaultProvider: string;
}

export const CURRENCY_REGISTRY: Record<string, CurrencyMetadata> = {
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    subunitFactor: 100,
    subunitName: "kobo",
    minGiftSubunits: 50000, // ₦500
    maxGiftSubunits: 100000000, // ₦1,000,000
    defaultFeeCapSubunits: 200000, // ₦2,000
    defaultProvider: "PAYSTACK",
  },
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    subunitFactor: 100,
    subunitName: "cents",
    minGiftSubunits: 500, // $5
    maxGiftSubunits: 500000, // $5,000
    defaultFeeCapSubunits: 1500, // $15
    defaultProvider: "PAYSTACK",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    subunitFactor: 100,
    subunitName: "pence",
    minGiftSubunits: 500, // £5
    maxGiftSubunits: 500000, // £5,000
    defaultFeeCapSubunits: 1500, // £15
    defaultProvider: "PAYSTACK",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    subunitFactor: 100,
    subunitName: "cents",
    minGiftSubunits: 500, // €5
    maxGiftSubunits: 500000, // €5,000
    defaultFeeCapSubunits: 1500, // €15
    defaultProvider: "PAYSTACK",
  },
  GHS: {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    subunitFactor: 100,
    subunitName: "pesewas",
    minGiftSubunits: 5000, // GH₵50
    maxGiftSubunits: 5000000, // GH₵50,000
    defaultFeeCapSubunits: 15000, // GH₵150
    defaultProvider: "PAYSTACK",
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    subunitFactor: 100,
    subunitName: "cents",
    minGiftSubunits: 50000, // KSh 500
    maxGiftSubunits: 50000000, // KSh 500,000
    defaultFeeCapSubunits: 150000, // KSh 1,500
    defaultProvider: "PAYSTACK",
  },
};

export const DEFAULT_CURRENCY: SupportedCurrency = "NGN";

export function getCurrencyConfig(currency?: string): CurrencyMetadata {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return (
    CURRENCY_REGISTRY[code] ?? {
      code,
      name: code,
      symbol: code,
      subunitFactor: 100,
      subunitName: "subunits",
      minGiftSubunits: 50000,
      maxGiftSubunits: 100000000,
      defaultFeeCapSubunits: 200000,
      defaultProvider: "PAYSTACK",
    }
  );
}

