"use client";

import Link from "next/link";
import { Gift, Star, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import type { CatalogProduct } from "../types";

export type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="paper-surface scroll-reveal editorial-lift group flex flex-col justify-between overflow-hidden rounded-[22px] border border-border p-5">
      <div>
        {/* Editorial Botanical / Monogram Stage */}
        <Link
          href={`/gifts/${product.slug}`}
          className={`relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 text-center transition-all duration-300 ${
            product.isCombo
              ? "border-[#D4A959]/50 bg-gradient-to-br from-[#332022]/90 via-[#6E2E3C] to-[#8F3545] text-white"
              : "border-accent/30 bg-gradient-to-br from-primary/12 via-background to-accent/20"
          }`}
        >
          <div className="flex items-center gap-2">
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
            asChild
            size="sm"
            className="flex-1 rounded-full text-xs font-semibold"
            disabled={!product.inStock}
          >
            <Link href={`/checkout/${product.slug}`}>
              <Gift className="mr-1.5 h-3.5 w-3.5" />
              <span>Send Gift</span>
            </Link>
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
