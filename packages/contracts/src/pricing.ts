import { z } from "zod";

export const vendorPricingModeSchema = z.enum([
  "PUBLIC_MARKUP",
  "RESELLER_DISCOUNT",
  "COMMISSION",
  "FIXED_MARKUP",
]);

export type VendorPricingMode = z.infer<typeof vendorPricingModeSchema>;

export const vendorPricingTierSchema = z.object({
  maxCostKobo: z.number().int().positive().nullable(),
  markupBps: z.number().int().min(0).max(20000),
});

export type VendorPricingTier = z.infer<typeof vendorPricingTierSchema>;

export const DEFAULT_PUBLIC_MARKUP_TIERS: VendorPricingTier[] = [
  { maxCostKobo: 1_999_900, markupBps: 1800 }, // < ₦20,000 -> 18%
  { maxCostKobo: 4_999_900, markupBps: 1500 }, // ₦20,000 - ₦49,999 -> 15%
  { maxCostKobo: null, markupBps: 1200 }, // ₦50,000+ -> 12%
];

export const vendorPricingRuleSchema = z.object({
  pricingMode: vendorPricingModeSchema.default("PUBLIC_MARKUP"),
  markupBps: z.number().int().min(0).max(20000).default(1500),
  discountBps: z.number().int().min(0).max(9500).default(0),
  commissionBps: z.number().int().min(0).max(9500).default(0),
  roundingStepKobo: z.number().int().min(0).max(1_000_000).default(50_000),
  pricingTiers: z.array(vendorPricingTierSchema).nullable().optional(),
});

export type VendorPricingRule = z.infer<typeof vendorPricingRuleSchema>;

export type PricingCalculationResult = {
  costPriceKobo: number;
  rawSellingPriceKobo: number;
  sellingPriceKobo: number;
  appliedMarkupBps: number;
  grossProfitKobo: number;
  grossMarginPct: number;
  estimatedPaystackFeeKobo: number;
  netContributionKobo: number;
  netMarginPct: number;
  pricingMode: VendorPricingMode;
};

/**
 * Standard Nigeria Paystack local transaction fee estimate:
 * 1.5% + ₦100 (₦100 waived for transactions under ₦2,500), capped at ₦2,000.
 */
export function estimatePaystackFeeKobo(amountKobo: number): number {
  if (amountKobo <= 0) return 0;
  const percentageFee = Math.round(amountKobo * 0.015);
  if (amountKobo < 250_000) {
    return percentageFee;
  }
  return Math.min(200_000, percentageFee + 10_000);
}

/**
 * Round a kobo amount up to the nearest step (e.g. ₦500 = 50_000 kobo).
 */
export function roundUpToStepKobo(amountKobo: number, stepKobo: number): number {
  if (amountKobo <= 0) return 0;
  if (!stepKobo || stepKobo <= 0) return Math.round(amountKobo);
  return Math.ceil(amountKobo / stepKobo) * stepKobo;
}

/**
 * Resolve the markup in basis points for a given cost price and vendor rule.
 */
export function resolveTieredMarkupBps(
  costPriceKobo: number,
  tiers?: VendorPricingTier[] | null,
  fallbackMarkupBps = 1500
): number {
  const activeTiers =
    tiers && tiers.length > 0 ? tiers : DEFAULT_PUBLIC_MARKUP_TIERS;

  const sorted = [...activeTiers].sort((a, b) => {
    if (a.maxCostKobo === null) return 1;
    if (b.maxCostKobo === null) return -1;
    return a.maxCostKobo - b.maxCostKobo;
  });

  for (const tier of sorted) {
    if (tier.maxCostKobo === null || costPriceKobo <= tier.maxCostKobo) {
      return tier.markupBps;
    }
  }

  return fallbackMarkupBps;
}

/**
 * Calculate Givvly's recommended selling price and margin breakdown
 * from a vendor's cost/buying price and pricing rule.
 */
export function calculateVendorSellingPrice(
  costPriceKobo: number,
  rule?: Partial<VendorPricingRule> | null
): PricingCalculationResult {
  const pricingMode: VendorPricingMode = rule?.pricingMode ?? "PUBLIC_MARKUP";
  const markupBps = rule?.markupBps ?? 1500;
  const discountBps = rule?.discountBps ?? 0;
  const commissionBps = rule?.commissionBps ?? 0;
  const roundingStepKobo = rule?.roundingStepKobo ?? 50_000;

  if (costPriceKobo <= 0) {
    return {
      costPriceKobo: 0,
      rawSellingPriceKobo: 0,
      sellingPriceKobo: 0,
      appliedMarkupBps: 0,
      grossProfitKobo: 0,
      grossMarginPct: 0,
      estimatedPaystackFeeKobo: 0,
      netContributionKobo: 0,
      netMarginPct: 0,
      pricingMode,
    };
  }

  let rawSellingPriceKobo = costPriceKobo;
  let appliedMarkupBps = 0;

  switch (pricingMode) {
    case "PUBLIC_MARKUP": {
      appliedMarkupBps = resolveTieredMarkupBps(
        costPriceKobo,
        rule?.pricingTiers,
        markupBps
      );
      rawSellingPriceKobo = Math.round(
        costPriceKobo * (1 + appliedMarkupBps / 10_000)
      );
      break;
    }
    case "FIXED_MARKUP": {
      appliedMarkupBps = markupBps;
      rawSellingPriceKobo = Math.round(
        costPriceKobo * (1 + appliedMarkupBps / 10_000)
      );
      break;
    }
    case "RESELLER_DISCOUNT": {
      // Vendor gives Givvly a reseller discount off their public price.
      // Buying cost = publicPrice * (1 - discount), so publicPrice = cost / (1 - discount).
      const clampedDiscount = Math.min(9500, Math.max(0, discountBps));
      const factor = 1 - clampedDiscount / 10_000;
      rawSellingPriceKobo =
        factor > 0 ? Math.round(costPriceKobo / factor) : costPriceKobo;
      appliedMarkupBps = Math.round(
        ((rawSellingPriceKobo - costPriceKobo) / costPriceKobo) * 10_000
      );
      break;
    }
    case "COMMISSION": {
      // Givvly sells at the vendor's listed price and earns commissionBps from the vendor.
      rawSellingPriceKobo = costPriceKobo;
      appliedMarkupBps = 0;
      break;
    }
  }

  const sellingPriceKobo =
    pricingMode === "COMMISSION"
      ? rawSellingPriceKobo
      : roundUpToStepKobo(rawSellingPriceKobo, roundingStepKobo);

  const grossProfitKobo =
    pricingMode === "COMMISSION"
      ? Math.round(sellingPriceKobo * (commissionBps / 10_000))
      : sellingPriceKobo - costPriceKobo;

  const grossMarginPct =
    sellingPriceKobo > 0
      ? Number(((grossProfitKobo / sellingPriceKobo) * 100).toFixed(2))
      : 0;

  const estimatedPaystackFeeKobo = estimatePaystackFeeKobo(sellingPriceKobo);
  const netContributionKobo = grossProfitKobo - estimatedPaystackFeeKobo;
  const netMarginPct =
    sellingPriceKobo > 0
      ? Number(((netContributionKobo / sellingPriceKobo) * 100).toFixed(2))
      : 0;

  return {
    costPriceKobo,
    rawSellingPriceKobo,
    sellingPriceKobo,
    appliedMarkupBps,
    grossProfitKobo,
    grossMarginPct,
    estimatedPaystackFeeKobo,
    netContributionKobo,
    netMarginPct,
    pricingMode,
  };
}
