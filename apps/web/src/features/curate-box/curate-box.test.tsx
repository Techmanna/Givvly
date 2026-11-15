import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CatalogProduct } from "@givvly/contracts";
import { useCartStore } from "@/stores/cart-store";
import {
  CurateBoxWizard,
  calculateCuratedBoxPricing,
  doesItemFitBox,
} from "./index";

const smallBox: CatalogProduct = {
  id: "box_small",
  slug: "petite-blush-box",
  name: "Petite Blush Keepsake Box",
  description: "Small keepsake box",
  priceKobo: 1_200_000,
  category: "Gift Boxes",
  occasions: ["BIRTHDAY"],
  relationships: ["FRIEND"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 5,
  reviewCount: 10,
  boxRole: "GIFT_BOX",
  boxMaxItems: 4,
  boxSizeTier: "SMALL",
};

const largeBox: CatalogProduct = {
  id: "box_large",
  slug: "grand-leather-trunk",
  name: "Grand Leather Hamper Trunk",
  description: "Large leather hamper trunk",
  priceKobo: 4_800_000,
  category: "Gift Boxes",
  occasions: ["WEDDING"],
  relationships: ["COUPLE"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 5,
  reviewCount: 8,
  boxRole: "GIFT_BOX",
  boxMaxItems: 10,
  boxSizeTier: "LARGE",
};

const itemCandle: CatalogProduct = {
  id: "item_candle",
  slug: "soy-candle",
  name: "Amber Soy Candle",
  description: "Hand-poured candle",
  priceKobo: 1_500_000,
  category: "Home & Decor",
  occasions: ["BIRTHDAY"],
  relationships: ["FRIEND"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 4.9,
  reviewCount: 12,
  boxRole: "ITEM",
  boxSizeTier: "SMALL",
};

const itemPerfume: CatalogProduct = {
  id: "item_perfume",
  slug: "oud-perfume",
  name: "Signature Oud Perfume",
  description: "Luxury fragrance",
  priceKobo: 3_000_000,
  category: "Beauty & Fragrance",
  occasions: ["ANNIVERSARY"],
  relationships: ["PARTNER"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 5,
  reviewCount: 15,
  boxRole: "ITEM",
  boxSizeTier: "SMALL",
  variants: [
    { id: "var_50ml", name: "50ml Bottle", priceKobo: 3_000_000, active: true },
    { id: "var_100ml", name: "100ml Bottle", priceKobo: 5_000_000, active: true },
  ],
};

const itemChocolate: CatalogProduct = {
  id: "item_choc",
  slug: "artisan-chocolates",
  name: "Artisan Dark Chocolates",
  description: "Single-origin cocoa truffles",
  priceKobo: 1_000_000,
  category: "Gourmet & Treats",
  occasions: ["BIRTHDAY"],
  relationships: ["FRIEND"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 4.8,
  reviewCount: 20,
  boxRole: "ITEM",
};

const itemLargeThrow: CatalogProduct = {
  id: "item_throw",
  slug: "cashmere-throw",
  name: "Cashmere Knit Throw",
  description: "Oversized luxury throw blanket",
  priceKobo: 6_500_000,
  category: "Home & Decor",
  occasions: ["HOUSEWARMING"],
  relationships: ["FAMILY"],
  vendorName: "Givvly Atelier",
  inStock: true,
  rating: 5,
  reviewCount: 5,
  boxRole: "ITEM",
  boxSizeTier: "LARGE",
};

const testProducts: CatalogProduct[] = [
  smallBox,
  largeBox,
  itemCandle,
  itemPerfume,
  itemChocolate,
  itemLargeThrow,
];

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurateBoxWizard initialProducts={testProducts} />
    </QueryClientProvider>,
  );
}

describe("Curate Your Box pricing & fit helpers", () => {
  it("calculates box + items total, minimum check, and optional bundle discount", () => {
    const underMin = calculateCuratedBoxPricing({
      box: smallBox,
      items: [
        {
          productId: itemCandle.id,
          product: itemCandle,
          unitPriceKobo: itemCandle.priceKobo,
          qty: 2,
        },
      ],
    });
    expect(underMin.meetsMinimum).toBe(false);
    expect(underMin.remainingSlots).toBe(2);
    expect(underMin.totalKobo).toBe(1_200_000 + 3_000_000);

    const withDiscount = calculateCuratedBoxPricing({
      box: smallBox,
      items: [
        {
          productId: itemCandle.id,
          product: itemCandle,
          unitPriceKobo: itemCandle.priceKobo,
          qty: 2,
        },
        {
          productId: itemChocolate.id,
          product: itemChocolate,
          unitPriceKobo: itemChocolate.priceKobo,
          qty: 1,
        },
      ],
      discountRule: { minItems: 3, percentOff: 10, label: "Bundle Save 10%" },
    });
    expect(withDiscount.meetsMinimum).toBe(true);
    expect(withDiscount.subtotalKobo).toBe(5_200_000);
    expect(withDiscount.discountKobo).toBe(520_000);
    expect(withDiscount.totalKobo).toBe(4_680_000);
  });

  it("checks box size fit accurately", () => {
    expect(doesItemFitBox(itemLargeThrow, smallBox)).toBe(false);
    expect(doesItemFitBox(itemLargeThrow, largeBox)).toBe(true);
    expect(doesItemFitBox(itemChocolate, smallBox)).toBe(true);
  });
});

describe("CurateBoxWizard", () => {
  beforeEach(() => {
    useCartStore.getState().clearBag();
    useCartStore.getState().closeBag();
  });

  it("enforces min 3 items, supports variants and box upgrade, and adds curated box to Shopping Bag", async () => {
    const user = userEvent.setup();
    renderWizard();

    // Step 1: Select Petite Blush Keepsake Box
    expect(screen.getByText("Select your gift box")).toBeInTheDocument();
    const selectButtons = screen.getAllByRole("button", { name: /Select This Box/i });
    await user.click(selectButtons[0]!);

    // Step 2: Review button disabled until >= 3 items
    expect(screen.getByText("Choose your gift items")).toBeInTheDocument();
    const reviewBtn = screen.getByRole("button", { name: /Review Your Box/i });
    expect(reviewBtn).toBeDisabled();

    // Oversized item shows Upgrade Box & Add when small box is selected
    expect(screen.getByText(/Best suited for Grand Leather Hamper Trunk/i)).toBeInTheDocument();

    // Select 100ml variant on Signature Oud Perfume before adding
    const variantTrigger = screen.getByLabelText(/Select variant for Signature Oud Perfume/i);
    await user.click(variantTrigger);
    await user.click(screen.getByRole("option", { name: "100ml Bottle" }));

    // Add 3 items (Candle, Perfume 100ml, Chocolate)
    const addButtons = screen.getAllByRole("button", { name: /^Add to Box$/i });
    await user.click(addButtons[0]!); // Candle
    await user.click(addButtons[1]!); // Perfume 100ml
    await user.click(addButtons[2]!); // Chocolate

    expect(reviewBtn).toBeEnabled();
    await user.click(reviewBtn);

    // Step 3: Enter gift note and add curated box to Shopping Bag
    expect(screen.getByText("Review your curated box")).toBeInTheDocument();
    const noteInput = screen.getByLabelText(/Gift Note/i);
    await user.type(noteInput, "Happy Birthday!");

    const addToBagBtn = screen.getByRole("button", {
      name: /Add Curated Box to Shopping Bag/i,
    });
    await user.click(addToBagBtn);

    const bagState = useCartStore.getState();
    expect(bagState.isOpen).toBe(true);
    expect(bagState.items).toHaveLength(1);
    expect(bagState.items[0]?.curatedBox?.boxProductId).toBe("box_small");
    expect(bagState.items[0]?.curatedBox?.giftNote).toBe("Happy Birthday!");
    expect(bagState.items[0]?.curatedBox?.items).toHaveLength(3);
    // 1,200,000 + 1,500,000 + 5,000,000 + 1,000,000 = 8,700,000
    expect(bagState.items[0]?.priceKobo).toBe(8_700_000);
  });

  it("upgrades box in 1 click when adding an oversized item", async () => {
    const user = userEvent.setup();
    renderWizard();

    const selectButtons = screen.getAllByRole("button", { name: /Select This Box/i });
    await user.click(selectButtons[0]!); // Petite box (SMALL)

    const upgradeBtn = screen.getByRole("button", { name: /Upgrade Box & Add/i });
    await user.click(upgradeBtn);

    expect(screen.getByText(/0 of 10 items|1 of 10 items/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 10 items")).toBeInTheDocument();
  });
});
