"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gift,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import type { CatalogProduct, ProductVariant } from "@givvly/contracts";
import { useCatalogProducts } from "@/features/catalog/hooks/useCatalog";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/cn";
import {
  MIN_CURATED_BOX_ITEMS,
  calculateCuratedBoxPricing,
  doesItemFitBox,
  findRecommendedBoxUpgrade,
  getBoxCapacity,
  type CuratedBoxDiscountRule,
  type CuratedBoxSelectionItem,
} from "./pricing";

type CurateStep = 1 | 2 | 3;

const STEPS: Array<{ id: CurateStep; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 1, label: "Select a Gift Box", icon: Package },
  { id: 2, label: "Choose Gift Items", icon: Gift },
  { id: 3, label: "Review & Personalize", icon: Check },
];

const SIZE_TIER_LABEL: Record<string, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
};

function getSelectionKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

function getActiveVariants(product: CatalogProduct): ProductVariant[] {
  return (product.variants ?? []).filter((v) => v.active !== false);
}

export function CurateBoxWizard({
  initialProducts,
  discountRule = null,
}: {
  initialProducts?: CatalogProduct[];
  discountRule?: CuratedBoxDiscountRule | null;
}) {
  const { data: queriedProducts, isLoading } = useCatalogProducts();
  const products = initialProducts ?? queriedProducts ?? [];

  const addCuratedBox = useCartStore((s) => s.addCuratedBox);
  const openBag = useCartStore((s) => s.openBag);

  const [step, setStep] = React.useState<CurateStep>(1);
  const [selectedBox, setSelectedBox] = React.useState<CatalogProduct | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<CuratedBoxSelectionItem[]>([]);
  const [giftNote, setGiftNote] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("ALL");
  const [selectedVariants, setSelectedVariants] = React.useState<Record<string, string>>({});
  const [addedBanner, setAddedBanner] = React.useState(false);

  const giftBoxes = React.useMemo(
    () => products.filter((p) => p.inStock && p.boxRole === "GIFT_BOX"),
    [products],
  );

  const giftItems = React.useMemo(
    () =>
      products.filter(
        (p) => p.inStock && p.boxRole !== "GIFT_BOX" && !p.isDigital,
      ),
    [products],
  );

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of giftItems) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [giftItems]);

  const filteredGiftItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return giftItems.filter((item) => {
      const matchesCategory =
        activeCategory === "ALL" || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [giftItems, activeCategory, searchQuery]);

  const pricing = React.useMemo(
    () =>
      calculateCuratedBoxPricing({
        box: selectedBox,
        items: selectedItems,
        discountRule,
      }),
    [selectedBox, selectedItems, discountRule],
  );

  const isOverCapacity =
    selectedBox !== null && pricing.totalItemCount > pricing.maxItems;

  const canProceedToReview =
    selectedBox !== null && pricing.meetsMinimum && !isOverCapacity;

  const handleSelectBox = (box: CatalogProduct) => {
    setSelectedBox(box);
    setAddedBanner(false);
    setStep(2);
  };

  const getChosenVariant = (product: CatalogProduct): ProductVariant | undefined => {
    const active = getActiveVariants(product);
    if (active.length === 0) return undefined;
    const chosenId = selectedVariants[product.id];
    return active.find((v) => v.id === chosenId) ?? active[0];
  };

  const handleAddItem = (product: CatalogProduct) => {
    if (!selectedBox) return;
    const maxItems = getBoxCapacity(selectedBox);
    if (pricing.totalItemCount >= maxItems) return;

    const variant = getChosenVariant(product);
    const unitPriceKobo = variant ? variant.priceKobo : product.priceKobo;

    setSelectedItems((prev) => {
      const targetKey = getSelectionKey(product.id, variant?.id);
      const existing = prev.find(
        (i) => getSelectionKey(i.productId, i.variantId) === targetKey,
      );
      if (existing) {
        return prev.map((i) =>
          getSelectionKey(i.productId, i.variantId) === targetKey
            ? { ...i, qty: i.qty + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          variantId: variant?.id,
          variantName: variant?.name,
          unitPriceKobo,
          qty: 1,
        },
      ];
    });
    setAddedBanner(false);
  };

  const handleUpgradeBoxAndAdd = (
    product: CatalogProduct,
    upgradeBox: CatalogProduct,
  ) => {
    setSelectedBox(upgradeBox);
    const maxItems = getBoxCapacity(upgradeBox);
    if (pricing.totalItemCount >= maxItems) return;

    const variant = getChosenVariant(product);
    const unitPriceKobo = variant ? variant.priceKobo : product.priceKobo;

    setSelectedItems((prev) => {
      const targetKey = getSelectionKey(product.id, variant?.id);
      const existing = prev.find(
        (i) => getSelectionKey(i.productId, i.variantId) === targetKey,
      );
      if (existing) {
        return prev.map((i) =>
          getSelectionKey(i.productId, i.variantId) === targetKey
            ? { ...i, qty: i.qty + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          variantId: variant?.id,
          variantName: variant?.name,
          unitPriceKobo,
          qty: 1,
        },
      ];
    });
  };

  const handleUpdateQty = (productId: string, variantId: string | undefined, nextQty: number) => {
    const key = getSelectionKey(productId, variantId);
    if (nextQty <= 0) {
      setSelectedItems((prev) =>
        prev.filter((i) => getSelectionKey(i.productId, i.variantId) !== key),
      );
      return;
    }

    const currentItem = selectedItems.find(
      (i) => getSelectionKey(i.productId, i.variantId) === key,
    );
    if (!currentItem) return;

    const delta = nextQty - currentItem.qty;
    if (delta > 0 && pricing.totalItemCount + delta > pricing.maxItems) {
      return;
    }

    setSelectedItems((prev) =>
      prev.map((i) =>
        getSelectionKey(i.productId, i.variantId) === key
          ? { ...i, qty: nextQty }
          : i,
      ),
    );
  };

  const handleAddCuratedBoxToBag = () => {
    if (!selectedBox || !canProceedToReview) return;

    addCuratedBox(
      {
        boxProductId: selectedBox.id,
        boxName: selectedBox.name,
        boxSlug: selectedBox.slug,
        boxPriceKobo: selectedBox.priceKobo,
        boxImageUrl: selectedBox.imageUrl,
        items: selectedItems.map((i) => ({
          productId: i.productId,
          slug: i.product.slug,
          name: i.product.name,
          priceKobo: i.unitPriceKobo,
          qty: i.qty,
          imageUrl: i.product.imageUrl,
          variantId: i.variantId,
          variantName: i.variantName,
        })),
        giftNote: giftNote.trim() || undefined,
      },
      pricing.totalKobo,
    );

    setAddedBanner(true);
    openBag();
  };

  const handleStartFresh = () => {
    setSelectedBox(null);
    setSelectedItems([]);
    setGiftNote("");
    setAddedBanner(false);
    setStep(1);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Header & Stepper */}
      <div className="mb-8 space-y-6 text-center">
       
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Curate Your Box
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
          Handpick a signature keepsake box, fill it with at least{" "}
          {MIN_CURATED_BOX_ITEMS} thoughtful gifts, and add a personal note.
        </p>

        {/* 3-Step Indicator */}
        <nav
          aria-label="Curate your box steps"
          className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 sm:px-8"
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted =
              (s.id === 1 && selectedBox !== null && step > 1) ||
              (s.id === 2 && canProceedToReview && step > 2);
            const isClickable =
              s.id === 1 ||
              (s.id === 2 && selectedBox !== null) ||
              (s.id === 3 && canProceedToReview);

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(s.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 text-center transition-opacity sm:flex-row sm:gap-2.5",
                    !isClickable && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCompleted
                          ? "border-emerald-600/30 bg-emerald-600/15 text-emerald-700"
                          : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="mx-2 hidden h-px flex-1 bg-border sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && products.length === 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-80 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : null}

      {/* STEP 1: SELECT A GIFT BOX */}
      {step === 1 && (
        <section className="space-y-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Select your gift box
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose the signature packaging that will hold your curated gift.
              </p>
            </div>
            {selectedBox && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="self-start sm:self-auto"
              >
                Continue with {selectedBox.name}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>

          {giftBoxes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 font-medium text-foreground">
                No gift boxes available right now
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Please check back soon or browse our pre-curated Gift Atelier.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {giftBoxes.map((box) => {
                const isSelected = selectedBox?.id === box.id;
                const capacity = getBoxCapacity(box);
                return (
                  <div
                    key={box.id}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-2xl border bg-card transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/80 hover:border-primary/40",
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30">
                      {box.imageUrl ? (
                        <img
                          src={box.imageUrl}
                          alt={box.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {box.boxSizeTier && (
                          <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur">
                            {SIZE_TIER_LABEL[box.boxSizeTier] ?? box.boxSizeTier}
                          </span>
                        )}
                        <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur">
                          Up to {capacity} items
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div className="space-y-2">
                        <h3 className="font-serif text-lg font-semibold text-foreground">
                          {box.name}
                        </h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {box.description}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <Money
                          amountKobo={box.priceKobo}
                          className="text-base font-bold text-foreground"
                        />
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => handleSelectBox(box)}
                          className="rounded-full"
                        >
                          {isSelected ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Selected
                            </>
                          ) : (
                            "Select This Box"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* STEP 2: CHOOSE GIFT ITEMS */}
      {step === 2 && selectedBox && (
        <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  Choose your gift items
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select at least {MIN_CURATED_BOX_ITEMS} items (up to{" "}
                  {pricing.maxItems}) for your{" "}
                  <span className="font-medium text-foreground">
                    {selectedBox.name}
                  </span>
                  .
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="self-start text-xs sm:self-auto"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Change Box
              </Button>
            </div>

            {isOverCapacity && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                Your selected box holds up to {pricing.maxItems} items, and you
                currently have {pricing.totalItemCount}. Remove{" "}
                {pricing.totalItemCount - pricing.maxItems} item(s) or switch to
                a larger box to continue.
              </div>
            )}

            {/* Search & Category Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search gift items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("ALL")}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === "ALL"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      activeCategory === cat
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Items Grid */}
            {filteredGiftItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-medium text-foreground">
                  No matching gift items found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try clearing your search or selecting another category.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredGiftItems.map((item) => {
                  const activeVariants = getActiveVariants(item);
                  const chosenVariant = getChosenVariant(item);
                  const displayPrice = chosenVariant
                    ? chosenVariant.priceKobo
                    : item.priceKobo;

                  const key = getSelectionKey(item.id, chosenVariant?.id);
                  const inBoxItem = selectedItems.find(
                    (s) => getSelectionKey(s.productId, s.variantId) === key,
                  );

                  const fits = doesItemFitBox(item, selectedBox);
                  const upgradeBox = !fits
                    ? findRecommendedBoxUpgrade(item, giftBoxes)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card transition-all hover:border-primary/40"
                    >
                      <div>
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Gift className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                            <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
                              {item.category}
                            </span>
                            {item.boxSizeTier && (
                              <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
                                {SIZE_TIER_LABEL[item.boxSizeTier] ??
                                  item.boxSizeTier}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 p-4">
                          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                            {item.name}
                          </h3>
                          <Money
                            amountKobo={displayPrice}
                            className="text-sm font-bold text-foreground"
                          />

                          {activeVariants.length > 0 && (
                            <div className="pt-1">
                              <Select
                                value={chosenVariant?.id ?? ""}
                                onValueChange={(val) =>
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [item.id]: val,
                                  }))
                                }
                              >
                                <SelectTrigger
                                  aria-label={`Select variant for ${item.name}`}
                                  className="h-8 w-full rounded-lg text-xs"
                                >
                                  <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeVariants.map((v) => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs">
                                      {v.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border/60 p-4 pt-3">
                        {!fits ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                              Best suited for{" "}
                              {upgradeBox ? upgradeBox.name : "a larger box"}
                            </p>
                            {upgradeBox && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpgradeBoxAndAdd(item, upgradeBox)
                                }
                                className="w-full rounded-full text-xs"
                              >
                                Upgrade Box & Add
                              </Button>
                            )}
                          </div>
                        ) : inBoxItem ? (
                          <div className="flex items-center justify-between rounded-full border border-primary/30 bg-primary/5 px-2 py-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() =>
                                handleUpdateQty(
                                  item.id,
                                  chosenVariant?.id,
                                  inBoxItem.qty - 1,
                                )
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs font-semibold text-foreground">
                              {inBoxItem.qty} in box
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              disabled={pricing.remainingSlots === 0}
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() =>
                                handleUpdateQty(
                                  item.id,
                                  chosenVariant?.id,
                                  inBoxItem.qty + 1,
                                )
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={pricing.remainingSlots === 0}
                            onClick={() => handleAddItem(item)}
                            className="w-full rounded-full text-xs"
                          >
                            {pricing.remainingSlots === 0
                              ? "Box Full"
                              : "Add to Box"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Live Box Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected Packaging
                  </p>
                  <p className="font-serif text-base font-semibold text-foreground">
                    {selectedBox.name}
                  </p>
                  <Money
                    amountKobo={selectedBox.priceKobo}
                    className="text-xs font-medium text-muted-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {pricing.totalItemCount} of {pricing.maxItems} items
                  </span>
                  <span className="text-muted-foreground">
                    {pricing.meetsMinimum
                      ? "Minimum met"
                      : `${MIN_CURATED_BOX_ITEMS - pricing.totalItemCount} more required`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isOverCapacity
                        ? "bg-amber-500"
                        : pricing.meetsMinimum
                          ? "bg-emerald-600"
                          : "bg-primary",
                    )}
                    style={{
                      width: `${Math.min(100, (pricing.totalItemCount / pricing.maxItems) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Selected Items List */}
              {selectedItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Start adding items from the catalog to fill your box.
                </p>
              ) : (
                <ul className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  {selectedItems.map((item) => {
                    const key = getSelectionKey(item.productId, item.variantId);
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {item.product.name}
                          </p>
                          {item.variantName && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            Qty {item.qty} ·{" "}
                            <Money
                              amountKobo={item.unitPriceKobo * item.qty}
                              className="font-medium text-foreground"
                            />
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${item.product.name}`}
                          onClick={() =>
                            handleUpdateQty(item.productId, item.variantId, 0)
                          }
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Totals & CTA */}
              <div className="space-y-3 border-t border-border/70 pt-4">
                {pricing.discountKobo > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>
                      {pricing.discountLabel ??
                        `Bundle Discount (${pricing.discountPercent}%)`}
                    </span>
                    <span>
                      -<Money amountKobo={pricing.discountKobo} />
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Curated Box Total
                  </span>
                  <Money
                    amountKobo={pricing.totalKobo}
                    className="text-lg font-bold text-foreground"
                  />
                </div>
                <Button
                  type="button"
                  disabled={!canProceedToReview}
                  onClick={() => setStep(3)}
                  className="w-full rounded-full"
                >
                  Review Your Box
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>
        </section>
      )}

      {/* STEP 3: REVIEW & PERSONALIZE */}
      {step === 3 && selectedBox && (
        <section className="mx-auto max-w-4xl space-y-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Review your curated box
              </h2>
              <p className="text-sm text-muted-foreground">
                Confirm your packaging, gift items, and optional handwritten note.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(2)}
              className="self-start text-xs sm:self-auto"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Add More Items
            </Button>
          </div>

          {addedBanner && (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-600/30 bg-emerald-600/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-900 dark:text-emerald-600">
                <Check className="h-4 w-4 shrink-0" />
                <span>Your curated box has been added to your Shopping Bag!</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartFresh}
                className="rounded-full text-xs"
              >
                Curate Another Box
              </Button>
            </div>
          )}

          {/* Packaging Section */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Packaging
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                  {selectedBox.imageUrl ? (
                    <img
                      src={selectedBox.imageUrl}
                      alt={selectedBox.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-foreground">
                    {selectedBox.name}
                  </h3>
                  <Money
                    amountKobo={selectedBox.priceKobo}
                    className="text-sm font-medium text-muted-foreground"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="rounded-full text-xs"
              >
                Change Box
              </Button>
            </div>
          </div>

          {/* Gift Items Section */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gift Items ({pricing.totalItemCount} / {pricing.maxItems})
              </p>
              {!pricing.meetsMinimum && (
                <span className="text-xs font-medium text-amber-700">
                  At least {MIN_CURATED_BOX_ITEMS} items required
                </span>
              )}
            </div>

            <div className="divide-y divide-border/70">
              {selectedItems.map((item) => {
                const key = getSelectionKey(item.productId, item.variantId);
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gift className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {item.product.name}
                        </p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">
                            Variant: {item.variantName}
                          </p>
                        )}
                        <Money
                          amountKobo={item.unitPriceKobo * item.qty}
                          className="text-sm font-semibold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="flex items-center rounded-full border border-border bg-background px-1.5 py-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          aria-label={`Decrease quantity of ${item.product.name}`}
                          onClick={() =>
                            handleUpdateQty(
                              item.productId,
                              item.variantId,
                              item.qty - 1,
                            )
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-7 text-center text-xs font-semibold">
                          {item.qty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          disabled={pricing.remainingSlots === 0}
                          aria-label={`Increase quantity of ${item.product.name}`}
                          onClick={() =>
                            handleUpdateQty(
                              item.productId,
                              item.variantId,
                              item.qty + 1,
                            )
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${item.product.name}`}
                        onClick={() =>
                          handleUpdateQty(item.productId, item.variantId, 0)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gift Note & Pricing Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="curated-box-gift-note"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Gift Note (Optional)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {giftNote.length}/300
                </span>
              </div>
              <textarea
                id="curated-box-gift-note"
                rows={4}
                maxLength={300}
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="Write a warm message for your recipient's card..."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="space-y-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Box Summary
                </p>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Packaging ({selectedBox.name})</span>
                  <Money amountKobo={pricing.boxPriceKobo} />
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Gift Items ({pricing.totalItemCount})</span>
                  <Money amountKobo={pricing.itemsSubtotalKobo} />
                </div>
                {pricing.discountKobo > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>
                      {pricing.discountLabel ??
                        `Bundle Discount (${pricing.discountPercent}%)`}
                    </span>
                    <span>
                      -<Money amountKobo={pricing.discountKobo} />
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base font-bold text-foreground">
                  <span>Curated Box Total</span>
                  <Money amountKobo={pricing.totalKobo} />
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={!canProceedToReview}
                onClick={handleAddCuratedBoxToBag}
                className="w-full rounded-full"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add Curated Box to Shopping Bag
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
