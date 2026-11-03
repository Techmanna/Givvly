import { getCurrencyConfig } from "@/common/currency/currency.types";

export type FeeMode = "GUEST_PAYS" | "OWNER_PAYS" | "SPLIT";

export interface FeeConfig {
  feeMode: FeeMode;
  feeBps: number;
  feeFlatKobo: number;
  feeCapKobo: number;
}

export interface CalculatedGiftFee {
  amountKobo: number;
  feeKobo: number;
  totalKobo: number;
  payoutKobo: number;
  currency: string;
}

/**
 * Calculate money gift fees according to Givvly rules (Section 9.1)
 * Supports multiple currencies (defaults to NGN)
 */
export function calculateGiftFee(
  amountSubunits: number,
  config: FeeConfig,
  currency = "NGN"
): CalculatedGiftFee {
  if (amountSubunits <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const currConfig = getCurrencyConfig(currency);
  const effectiveCap =
    config.feeCapKobo > 0 ? config.feeCapKobo : currConfig.defaultFeeCapSubunits;

  // Calculate percentage fee: round(amount * feeBps / 10000)
  const bpsFee = Math.round((amountSubunits * config.feeBps) / 10000);
  const rawFee = Math.max(config.feeFlatKobo, bpsFee);
  const feeSubunits = effectiveCap > 0 ? Math.min(rawFee, effectiveCap) : rawFee;

  let totalSubunits: number;
  let payoutSubunits: number;

  switch (config.feeMode) {
    case "OWNER_PAYS":
      totalSubunits = amountSubunits;
      payoutSubunits = Math.max(0, amountSubunits - feeSubunits);
      break;

    case "SPLIT": {
      const guestFee = Math.round(feeSubunits / 2);
      const ownerFee = feeSubunits - guestFee;
      totalSubunits = amountSubunits + guestFee;
      payoutSubunits = Math.max(0, amountSubunits - ownerFee);
      break;
    }

    case "GUEST_PAYS":
    default:
      totalSubunits = amountSubunits + feeSubunits;
      payoutSubunits = amountSubunits;
      break;
  }

  return {
    amountKobo: amountSubunits,
    feeKobo: feeSubunits,
    totalKobo: totalSubunits,
    payoutKobo: payoutSubunits,
    currency: currConfig.code,
  };
}

