"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Gift, PackageCheck, PackagePlus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
import type { CatalogProduct } from "../types";

export type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const openBox = useCartStore((s) => s.openBox);

  const inBoxItem = items.find((i) => i.slug === product.slug);
  const hasImage = Boolean(product.imageUrl && !imageError);

  const handleAddToBox = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast.success(`Added ${product.name} to your Gift Box!`, {
      action: {
        label: "View Box",
        onClick: () => openBox(),
      },
    });
  };
  return (
    <article className="paper-surface scroll-reveal editorial-lift group flex flex-col justify-between overflow-hidden rounded-[22px] border border-border p-5">
      <div>
        {/* Editorial Botanical / Monogram / Image Stage */}
        <Link
          href={`/gifts/${product.slug}`}
          className={`relative flex h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border text-center transition-all duration-300 group/stage ${
            product.isCombo
              ? "border-[#D4A959]/50 bg-gradient-to-br from-[#332022]/90 via-[#6E2E3C] to-[#8F3545] text-white"
              : "border-accent/30 bg-gradient-to-br from-primary/12 via-background to-accent/20"
          }`}
        >
          {hasImage ? (
            <>
              {/* Product Photo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={() => setImageError(true)}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Ambient luxury gradient overlay for legibility */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30 transition-opacity duration-300 group-hover:from-black/90"
              />

              {/* Top Category Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md shadow-xs ${
                    product.isCombo
                      ? "border border-[#D4A959]/70 bg-black/60 text-[#D4A959]"
                      : "border border-white/25 bg-black/55 text-white"
                  }`}
                >
                  {product.isCombo ? "Luxury Hamper" : product.category}
                </span>
              </div>

              {/* Bottom Title & Vendor */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-left">
                <p className="font-heading text-base font-semibold leading-snug text-white line-clamp-2 drop-shadow-sm">
                  {product.name}
                </p>
                <span className="mt-1 block text-[11px] italic text-[#FAF3EF]/85">
                  by {product.vendorName}
                </span>
              </div>
            </>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    product.isCombo
                      ? "border border-[#D4A959]/60 bg-[#D4A959]/20 text-[#D4A959]"
                      : "border border-accent/40 bg-card/85 text-primary"
                  }`}
                >
                  {product.isCombo ? "Luxury Hamper" : product.category}
                </span>
              </div>

              <p
                className={`mt-3 font-heading text-lg font-semibold leading-snug line-clamp-2 ${
                  product.isCombo ? "text-white" : "text-foreground"
                }`}
              >
                {product.name}
              </p>

              <span
                className={`mt-2 text-[11px] italic ${
                  product.isCombo ? "text-[#FAF3EF]/75" : "text-muted-foreground"
                }`}
              >
                by {product.vendorName}
              </span>
            </div>
          )}
        </Link>

        {/* Combo breakdown preview or product description */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wider text-[10px] font-medium">
              {product.isCombo ? "Curated Hamper" : "Verified Artisan"}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star
                className="h-3.5 w-3.5 fill-accent text-accent"
                aria-hidden="true"
              />
              {product.rating.toFixed(1)}{" "}
              <span className="text-muted-foreground">
                ({product.reviewCount})
              </span>
            </span>
          </div>

          {product.isCombo && product.comboItems ? (
            <div className="rounded-xl border border-[#D4A959]/30 bg-[#FAF3EF]/60 p-2.5 text-xs">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                Includes {product.comboItems.length} curated items:
              </span>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {product.comboItems.map((c) => c.name).join(" • ")}
              </p>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
        <div className="flex items-center justify-between">
          <Money
            amountKobo={product.priceKobo}
            className="font-heading text-xl font-semibold text-foreground"
          />
          {!product.inStock ? (
            <Badge variant="secondary">Out of stock</Badge>
          ) : (
            <span className="text-[11px] font-medium text-success">
              Ready to dispatch
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAddToBox}
            className={`flex-1 rounded-full text-xs font-semibold gap-1.5 transition-all ${
              inBoxItem
                ? "bg-primary/90 text-primary-foreground hover:bg-primary"
                : ""
            }`}
            disabled={!product.inStock}
          >
            {inBoxItem ? (
              <>
                <PackageCheck className="h-3.5 w-3.5" />
                <span>In Box ({inBoxItem.qty}) • Add</span>
              </>
            ) : (
              <>
                <PackagePlus className="h-3.5 w-3.5" />
                <span>Add to Box</span>
              </>
            )}
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full px-3 text-xs"
          >
            <Link href={`/gifts/${product.slug}`} aria-label={`View ${product.name}`}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
