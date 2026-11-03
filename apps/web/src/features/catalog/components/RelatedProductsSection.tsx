"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
import { useCatalogProducts } from "../hooks/useCatalog";
import type { CatalogProduct } from "../types";

export function RelatedProductsSection({
  currentProduct,
}: {
  currentProduct: CatalogProduct;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const productsQuery = useCatalogProducts();
  const { addToBox, loadPredefinedCombo, box } = useCartStore();

  const allProducts = productsQuery.data ?? [];

  // Filter out current product, prioritize same category or combo, then others
  const relatedProducts = allProducts
    .filter((p) => p.id !== currentProduct.id && p.slug !== currentProduct.slug)
    .sort((a, b) => {
      const aSameCategory = a.category === currentProduct.category ? -1 : 1;
      const bSameCategory = b.category === currentProduct.category ? -1 : 1;
      return aSameCategory - bSameCategory;
    })
    .slice(0, 8);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  const handleQuickAdd = (product: CatalogProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.isCombo) {
      loadPredefinedCombo(product);
      toast.success(`Loaded "${product.name}" into your gift box!`);
    } else {
      addToBox(product, 1);
      toast.success(`Added "${product.name}" to your gift box!`);
    }
  };

  if (relatedProducts.length === 0) return null;

  return (
    <section className="mt-16 space-y-8 border-t border-border/80 pt-12">
      {/* Editorial Givvly Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-[#FAF3EF] px-3 py-1 text-xs font-semibold text-primary shadow-xs">
          <span>Curated Recommendations</span>
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          More Options to Consider
        </h2>
        <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
          Complementary luxury keepsakes, gourmet boxes, and curated combos to enhance your gift.
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Previous gifts"
          className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card/95 p-2.5 text-primary shadow-soft backdrop-blur-xs transition-all duration-200 hover:bg-primary hover:text-white hover:scale-105 active:scale-95 sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Next gifts"
          className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card/95 p-2.5 text-primary shadow-soft backdrop-blur-xs transition-all duration-200 hover:bg-primary hover:text-white hover:scale-105 active:scale-95 sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scrollable Row */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {relatedProducts.map((item) => {
            const isAlreadyInBox = box.items.some(
              (bi) => bi.product.id === item.id
            );

            return (
              <article
                key={item.id}
                className="group/card flex-none w-[270px] sm:w-[290px] snap-start flex flex-col justify-between overflow-hidden rounded-[22px] border border-border/80 bg-card p-4 shadow-soft transition-all duration-300 hover:border-primary/40 hover:shadow-card hover:-translate-y-1"
              >
                <div>
                  {/* Stage Card */}
                  <Link
                    href={`/gifts/${item.slug}`}
                    className={`relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-xl border p-4 text-center transition-all duration-300 ${
                      item.isCombo
                        ? "border-[#D4A959]/50 bg-gradient-to-br from-[#332022]/90 via-[#6E2E3C] to-[#8F3545] text-white"
                        : "border-accent/30 bg-gradient-to-br from-primary/10 via-[#FAF3EF] to-accent/15 text-foreground"
                    }`}
                  >
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        item.isCombo
                          ? "border border-[#D4A959]/60 bg-[#D4A959]/20 text-[#D4A959]"
                          : "border border-accent/40 bg-card/90 text-primary"
                      }`}
                    >
                      {item.isCombo ? "Curated Combo" : item.category}
                    </span>

                    <p
                      className={`mt-2 font-heading text-sm font-semibold leading-snug line-clamp-2 ${
                        item.isCombo ? "text-white" : "text-foreground"
                      }`}
                    >
                      {item.name}
                    </p>

                    <span
                      className={`mt-1 text-[11px] italic ${
                        item.isCombo ? "text-[#FAF3EF]/75" : "text-muted-foreground"
                      }`}
                    >
                      by {item.vendorName}
                    </span>
                  </Link>

                  {/* Rating & Description */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        {item.rating.toFixed(1)}{" "}
                        <span className="text-muted-foreground">
                          ({item.reviewCount})
                        </span>
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-primary">
                        {item.inStock ? "In Stock" : "Pre-order"}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Price and Add button */}
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Price
                    </span>
                    <p className="font-heading text-base font-bold text-primary">
                      <Money amountKobo={item.priceKobo} />
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={isAlreadyInBox ? "secondary" : "outline"}
                    className="rounded-full text-xs font-semibold gap-1"
                    onClick={(e) => handleQuickAdd(item, e)}
                  >
                    {isAlreadyInBox ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>In Box</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
