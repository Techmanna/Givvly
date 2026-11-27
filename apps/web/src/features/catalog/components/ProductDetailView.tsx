"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  Star,
  Check,
  ShoppingBag,
  Minus,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
import { createSingleProductWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppOrderSection } from "@/components/shared/WhatsAppOrderSection";
import type { CatalogProduct, ProductVariant } from "@givvly/contracts";
import { ProductGallery } from "./ProductGallery";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { RelatedProductsSection } from "./RelatedProductsSection";

export type ProductDetailViewProps = {
  product: CatalogProduct;
};

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const [quantity, setQuantity] = React.useState(1);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const openBag = useCartStore((s) => s.openBag);

  const activeVariants: ProductVariant[] = (product.variants || []).filter(
    (v) => v.active !== false
  );
  const hasVariants = activeVariants.length > 0;

  const minVariantPrice = hasVariants
    ? Math.min(...activeVariants.map((v) => v.priceKobo))
    : product.priceKobo;
  const maxVariantPrice = hasVariants
    ? Math.max(...activeVariants.map((v) => v.priceKobo))
    : product.priceKobo;
  const hasPriceRange = hasVariants && minVariantPrice !== maxVariantPrice;

  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(
    hasVariants && activeVariants.length > 0 ? activeVariants[0] ?? null : null
  );

  const effectivePriceKobo = selectedVariant
    ? selectedVariant.priceKobo
    : product.priceKobo;

  const inBagItem = items.find((i) => {
    if (selectedVariant) {
      return (
        i.slug === product.slug &&
        (i.variantId === selectedVariant.id ||
          i.id === `${product.id}__${selectedVariant.id}`)
      );
    }
    return i.slug === product.slug;
  });

  const handleAddToBag = () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Please select an option first");
      return;
    }

    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        priceKobo: effectivePriceKobo,
        imageUrl: product.imageUrl,
        vendorName: product.vendorName,
        inStock: selectedVariant
          ? selectedVariant.stock === null ||
            selectedVariant.stock === undefined ||
            selectedVariant.stock > 0
          : product.inStock,
        isDigital: product.isDigital,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name,
      },
      quantity
    );

    const displayName = selectedVariant
      ? `${product.name} (${selectedVariant.name})`
      : product.name;

    toast.success(`Added ${quantity} × ${displayName} to your Shopping Bag!`, {
      action: {
        label: "View Bag",
        onClick: () => openBag(),
      },
    });
  };

  const whatsAppLink = createSingleProductWhatsAppLink({
    name: selectedVariant
      ? `${product.name} (${selectedVariant.name})`
      : product.name,
    priceKobo: effectivePriceKobo,
    category: product.category,
    slug: product.slug,
    isCombo: product.isCombo,
    comboItems: product.comboItems,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      <Link
        href="/gifts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back to gift catalog</span>
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-6">
          <ProductGallery product={product} />
        </div>

        <div className="space-y-6 md:col-span-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={product.isCombo ? "default" : "outline"}
                className={product.isCombo ? "bg-primary text-white" : ""}
              >
                {product.isCombo ? "Luxury Gift Hamper" : product.category}
              </Badge>
              {product.reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  <Star
                    className="h-3.5 w-3.5 fill-accent text-accent"
                    aria-hidden="true"
                  />
                  {product.rating.toFixed(1)} ({product.reviewCount}{" "}
                  {product.reviewCount === 1 ? "review" : "reviews"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star
                    className="h-3.5 w-3.5 text-muted-foreground/40"
                    aria-hidden="true"
                  />
                  No reviews yet
                </span>
              )}
            </div>

            <h1 className="font-heading text-3xl font-bold text-foreground">
              {product.name}
            </h1>

            <div className="font-heading text-2xl font-bold text-primary">
              {hasPriceRange && !selectedVariant ? (
                <div className="flex items-center gap-1.5">
                  <Money amountKobo={minVariantPrice} />
                  <span className="text-muted-foreground text-lg font-normal">–</span>
                  <Money amountKobo={maxVariantPrice} />
                </div>
              ) : (
                <Money amountKobo={effectivePriceKobo} />
              )}
            </div>
          </div>

          <div className="space-y-2.5 text-sm leading-relaxed text-foreground">
            {(() => {
              const lines = (product.description || "")
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);
              const blocks: Array<
                | { type: "p"; text: string }
                | { type: "ul"; items: string[] }
              > = [];
              for (const line of lines) {
                if (line.startsWith("•") || line.startsWith("- ")) {
                  const text = line.replace(/^[•\-]\s*/, "").trim();
                  const last = blocks[blocks.length - 1];
                  if (last && last.type === "ul") {
                    last.items.push(text);
                  } else {
                    blocks.push({ type: "ul", items: [text] });
                  }
                } else {
                  blocks.push({ type: "p", text: line });
                }
              }
              return blocks.map((block, idx) =>
                block.type === "ul" ? (
                  <ul
                    key={idx}
                    className="list-disc space-y-1 pl-5 text-muted-foreground"
                  >
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={idx}>{block.text}</p>
                )
              );
            })()}
          </div>

          {/* Variant Selection Chips */}
          {hasVariants && (
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Choose Option:
                </span>
                {selectedVariant && (
                  <span className="text-muted-foreground">
                    Selected: <strong className="text-foreground">{selectedVariant.name}</strong> •{" "}
                    <Money amountKobo={selectedVariant.priceKobo} className="text-primary font-semibold" />
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {activeVariants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isOutOfStock = variant.stock === 0;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariant(variant)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border/80 bg-background text-foreground hover:border-primary/50"
                      } ${isOutOfStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span>{variant.name}</span>
                      <span
                        className={`text-[11px] ${
                          isSelected
                            ? "text-primary-foreground/90 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        • <Money amountKobo={variant.priceKobo} />
                      </span>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.isCombo && product.comboItems && (
            <div className="rounded-2xl border border-[#D4A959]/50 bg-[#FAF3EF] p-4 text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-wider text-[11px]">
                <span>Hamper Inclusions</span>
              </div>
              <ul className="divide-y divide-border/60">
                {product.comboItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between py-2 text-foreground font-medium"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {item.name}
                    </span>
                    {item.tag && (
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {item.tag}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {product.packagingIncluded && (
                <div className="border-t border-border/80 pt-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Packaging:{" "}
                  </span>
                  {product.packagingIncluded}
                </div>
              )}
            </div>
          )}

          {/* Quantity and Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center justify-between border border-border/80 rounded-full px-3 py-1.5 bg-background sm:w-32 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1 || !product.inStock}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold px-2">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  disabled={!product.inStock}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Bag Button */}
              <Button
                type="button"
                size="lg"
                onClick={handleAddToBag}
                className="flex-1 rounded-full gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                disabled={!product.inStock}
              >
                {inBagItem ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>In Bag ({inBagItem.qty}) • Add {quantity} More</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Bag</span>
                  </>
                )}
              </Button>
            </div>

            {/* Direct Checkout Link */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-full gap-2 text-xs text-muted-foreground hover:text-foreground border-border/80"
              disabled={!product.inStock}
            >
              <Link href={`/checkout/${product.slug}`}>
                <Gift className="h-3.5 w-3.5" />
                <span>Or send this single gift directly</span>
              </Link>
            </Button>
          </div>

          {/* WhatsApp Order & Trust Guarantee Section */}
          <WhatsAppOrderSection
            href={whatsAppLink}
            buttonLabel="Chat on WhatsApp to order"
            showTrustBadges={true}
          />
        </div>
      </div>

      <RelatedProductsSection currentProduct={product} />
      <ProductReviewsSection product={product} />
    </div>
  );
}
