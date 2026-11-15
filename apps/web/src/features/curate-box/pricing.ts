import type { BoxSizeTier, CatalogProduct } from "@givvly/contracts";

export const MIN_CURATED_BOX_ITEMS = 3;
export const DEFAULT_BOX_MAX_ITEMS = 6;

export const BOX_SIZE_ORDER: Record<BoxSizeTier, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

export type CuratedBoxSelectionItem = {
  productId: string;
  product: CatalogProduct;
  variantId?: string;
  variantName?: string;
  unitPriceKobo: number;
  qty: number;
};

export type CuratedBoxDiscountRule = {
  minItems: number;
  percentOff: number;
  label?: string;
};

export type CuratedBoxPricingResult = {
  boxPriceKobo: number;
  itemsSubtotalKobo: number;
  subtotalKobo: number;
  discountKobo: number;
  discountPercent: number;
  discountLabel?: string;
  totalKobo: number;
  totalItemCount: number;
  maxItems: number;
  remainingSlots: number;
  meetsMinimum: boolean;
};

/**
 * Returns the maximum number of items a selected gift box can hold.
 */
export function getBoxCapacity(box: CatalogProduct | null | undefined): number {
  if (typeof box?.boxMaxItems === "number" && box.boxMaxItems >= MIN_CURATED_BOX_ITEMS) {
    return box.boxMaxItems;
  }
  return DEFAULT_BOX_MAX_ITEMS;
}

/**
 * Checks whether an item's physical size tier fits inside the selected gift box.
 * Items without a size tier default to fitting any box.
 */
export function doesItemFitBox(
  item: Pick<CatalogProduct, "boxSizeTier">,
  box: Pick<CatalogProduct, "boxSizeTier"> | null | undefined,
): boolean {
  if (!item.boxSizeTier || !box?.boxSizeTier) {
    return true;
  }
  return BOX_SIZE_ORDER[item.boxSizeTier] <= BOX_SIZE_ORDER[box.boxSizeTier];
}

/**
 * Finds the smallest available gift box that can accommodate an item's size tier.
 */
export function findRecommendedBoxUpgrade(
  item: Pick<CatalogProduct, "boxSizeTier">,
  boxes: CatalogProduct[],
): CatalogProduct | null {
  if (!item.boxSizeTier) return null;
  const requiredRank = BOX_SIZE_ORDER[item.boxSizeTier];
  const eligible = boxes
    .filter((b) => b.boxSizeTier && BOX_SIZE_ORDER[b.boxSizeTier] >= requiredRank)
    .sort((a, b) => BOX_SIZE_ORDER[a.boxSizeTier!] - BOX_SIZE_ORDER[b.boxSizeTier!]);
  return eligible[0] ?? null;
}

/**
 * Computes curated box totals and optional automatic bundle discount.
 */
export function calculateCuratedBoxPricing({
  box,
  items,
  discountRule,
}: {
  box: CatalogProduct | null;
  items: CuratedBoxSelectionItem[];
  discountRule?: CuratedBoxDiscountRule | null;
}): CuratedBoxPricingResult {
  const boxPriceKobo = box ? box.priceKobo : 0;
  const totalItemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const itemsSubtotalKobo = items.reduce(
    (sum, item) => sum + item.unitPriceKobo * item.qty,
    0,
  );
  const subtotalKobo = boxPriceKobo + itemsSubtotalKobo;

  const discountApplies =
    Boolean(discountRule) &&
    discountRule!.percentOff > 0 &&
    totalItemCount >= discountRule!.minItems;

  const discountPercent = discountApplies ? discountRule!.percentOff : 0;
  const discountKobo = discountApplies
    ? Math.round((subtotalKobo * discountPercent) / 100)
    : 0;

  const maxItems = getBoxCapacity(box);
  const remainingSlots = Math.max(0, maxItems - totalItemCount);

  return {
    boxPriceKobo,
    itemsSubtotalKobo,
    subtotalKobo,
    discountKobo,
    discountPercent,
    discountLabel: discountApplies ? discountRule?.label : undefined,
    totalKobo: Math.max(0, subtotalKobo - discountKobo),
    totalItemCount,
    maxItems,
    remainingSlots,
    meetsMinimum: totalItemCount >= MIN_CURATED_BOX_ITEMS,
  };
}
