"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Check,
  Minus,
  Plus,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import type { CatalogProduct, ProductVariant } from "@givvly/contracts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "@/components/ui/sonner";

export type ChooseOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: CatalogProduct;
};

export function ChooseOptionsDialog({
  open,
  onOpenChange,
  product,
}: ChooseOptionsDialogProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openBag = useCartStore((s) => s.openBag);

  const activeVariants: ProductVariant[] = (product.variants || []).filter(
    (v) => v.active !== false
  );

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    activeVariants[0] || null
  );
  const [quantity, setQuantity] = useState(1);

  // Sync initial selection whenever dialog opens or product changes
  useEffect(() => {
    if (open && activeVariants.length > 0) {
      setSelectedVariant((prev) => {
        if (prev && activeVariants.some((v) => v.id === prev.id)) {
          return prev;
        }
        return activeVariants[0] ?? null;
      });
      setQuantity(1);
    }
  }, [open, product]);

  const handleSelect = (variant: ProductVariant) => {
    if (variant.stock === 0) return;
    setSelectedVariant(variant);
  };

  const handleAddToBag = () => {
    if (!selectedVariant) {
      toast.error("Please select an option to continue");
      return;
    }

    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        priceKobo: selectedVariant.priceKobo,
        imageUrl: product.imageUrl,
        vendorName: product.vendorName,
        inStock:
          selectedVariant.stock === null ||
          selectedVariant.stock === undefined ||
          selectedVariant.stock > 0,
        isDigital: product.isDigital,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
      },
      quantity
    );

    toast.success(`Added ${product.name} (${selectedVariant.name}) to your Shopping Bag!`, {
      description: `${quantity}x ${selectedVariant.name}`,
    });

    onOpenChange(false);
    openBag();
  };

  const currentPriceKobo = selectedVariant
    ? selectedVariant.priceKobo
    : product.priceKobo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 sm:rounded-3xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {product.category || "Gift Atelier"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              By {product.vendorName}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl font-bold text-foreground">
            {product.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </DialogDescription>
        </DialogHeader>

        {/* Product Snapshot & Price */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-muted/30 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Selected Option Price
            </p>
            <p className="font-heading text-2xl font-bold text-primary">
              <Money amountKobo={currentPriceKobo * quantity} />
            </p>
            {quantity > 1 && (
              <p className="text-[11px] text-muted-foreground">
                (<Money amountKobo={currentPriceKobo} /> each)
              </p>
            )}
          </div>
        </div>

        {/* Variant options list */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Choose Option
            </span>
            {selectedVariant && (
              <span className="text-muted-foreground text-[11px]">
                Selected: <strong className="text-foreground">{selectedVariant.name}</strong>
              </span>
            )}
          </div>

          <div className="grid gap-2 max-h-56 overflow-y-auto pr-1 p-1">
            {activeVariants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock === 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleSelect(variant)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-border/80 bg-card hover:border-primary/50"
                  } ${isOutOfStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{variant.name}</p>
                      {variant.sku && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {variant.sku}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <Money
                      amountKobo={variant.priceKobo}
                      className="font-semibold text-foreground"
                    />
                    {isOutOfStock ? (
                      <p className="text-[10px] font-medium text-destructive">
                        Out of stock
                      </p>
                    ) : variant.stock !== null && variant.stock !== undefined && variant.stock <= 5 ? (
                      <p className="text-[10px] text-amber-600 font-medium">
                        Only {variant.stock} left
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity selector & Add button */}
        <div className="space-y-3 pt-2 border-t border-border/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Quantity</span>
            <div className="flex items-center border border-border/80 rounded-full px-2.5 py-1 bg-background">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-semibold px-3 min-w-[20px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full rounded-full gap-2 font-semibold shadow-md"
            onClick={handleAddToBag}
            disabled={!selectedVariant || selectedVariant.stock === 0}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>
              Add to Bag • <Money amountKobo={currentPriceKobo * quantity} />
            </span>
          </Button>

          <div className="text-center">
            <Link
              href={`/gifts/${product.slug}`}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span>View full product details</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
