"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, Gift, PackagePlus } from "lucide-react";
import { toast } from "sonner";
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
  const addItem = useCartStore((s) => s.addItem);
  const openBox = useCartStore((s) => s.openBox);

  const handleAddToBox = (product: CatalogProduct) => {
    addItem(product, 1);
    toast.success(`Added ${product.name} to your Gift Box!`, {
      action: {
        label: "View Box",
        onClick: () => openBox(),
      },
    });
  };

  const allProducts = productsQuery.data ?? [];

  // Filter out current product and VTU items, prioritize same category
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.id !== currentProduct.id &&
        p.slug !== currentProduct.slug &&
        p.slug !== "airtime" &&
        p.slug !== "data" &&
        !p.slug.startsWith("billspot-vtu-") &&
        p.digitalKind !== "AIRTIME" &&
        p.digitalKind !== "DATA"
    )
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
          {relatedProducts.map((item) => (
            <article
              key={item.id}
              className="group/card flex-none w-[270px] sm:w-[290px] snap-start flex flex-col justify-between overflow-hidden rounded-[22px] border border-border/80 bg-card p-4 shadow-soft transition-all duration-300 hover:border-primary/40 hover:shadow-card hover:-translate-y-1"
            >
              <div>
                {/* Stage Card */}
                <Link
                  href={`/gifts/${item.slug}`}
                  className={`relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-xl border text-center transition-all duration-300 group/stage ${
                    item.isCombo
                      ? "border-[#D4A959]/50 bg-gradient-to-br from-[#332022]/90 via-[#6E2E3C] to-[#8F3545] text-white"
                      : "border-accent/30 bg-gradient-to-br from-primary/10 via-[#FAF3EF] to-accent/15 text-foreground"
                  }`}
                >
                  {item.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30"
                      />
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                            item.isCombo
                              ? "border border-[#D4A959]/70 bg-black/60 text-[#D4A959]"
                              : "border border-white/20 bg-black/55 text-white"
                          }`}
                        >
                          {item.isCombo ? "Luxury Hamper" : item.category}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3 text-left">
                        <p className="font-heading text-xs font-semibold leading-snug text-white line-clamp-1 drop-shadow-sm">
                          {item.name}
                        </p>
                        <span className="text-[10px] italic text-[#FAF3EF]/85">
                          by {item.vendorName}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          item.isCombo
                            ? "border border-[#D4A959]/60 bg-[#D4A959]/20 text-[#D4A959]"
                            : "border border-accent/40 bg-card/90 text-primary"
                        }`}
                      >
                        {item.isCombo ? "Luxury Hamper" : item.category}
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
                    </div>
                  )}
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

              {/* Price and Send button */}
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
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToBox(item)}
                  className="rounded-full text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  <span>Add to Box</span>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
