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
  { maxCostKobo: 1_999_900, markupBps: 1800 },
  { maxCostKobo: 4_999_900, markupBps: 1500 },
  { maxCostKobo: null, markupBps: 1200 },
];

export interface VendorPricingRule {
  pricingMode?: VendorPricingMode;
  markupBps?: number;
  discountBps?: number;
  commissionBps?: number;
  roundingStepKobo?: number;
  pricingTiers?: VendorPricingTier[] | null;
}

function roundUpToStepKobo(amountKobo: number, stepKobo: number): number {
  if (amountKobo <= 0) return 0;
  if (!stepKobo || stepKobo <= 0) return Math.round(amountKobo);
  return Math.ceil(amountKobo / stepKobo) * stepKobo;
}

function resolveTieredMarkupBps(
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

export function calculateVendorSellingPrice(
  costPriceKobo: number,
  rule?: VendorPricingRule | null
): { sellingPriceKobo: number; appliedMarkupBps: number } {
  const pricingMode: VendorPricingMode = rule?.pricingMode ?? "PUBLIC_MARKUP";
  const markupBps = rule?.markupBps ?? 1500;
  const discountBps = rule?.discountBps ?? 0;
  const roundingStepKobo = rule?.roundingStepKobo ?? 50_000;

  if (costPriceKobo <= 0) {
    return { sellingPriceKobo: 0, appliedMarkupBps: 0 };
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
      rawSellingPriceKobo = costPriceKobo;
      appliedMarkupBps = 0;
      break;
    }
  }

  const sellingPriceKobo =
    pricingMode === "COMMISSION"
      ? rawSellingPriceKobo
      : roundUpToStepKobo(rawSellingPriceKobo, roundingStepKobo);

  return { sellingPriceKobo, appliedMarkupBps };
}
