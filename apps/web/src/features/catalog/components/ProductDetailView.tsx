"use client";

import Link from "next/link";
import { ArrowLeft, Gift, Star, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { createSingleProductWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppOrderSection } from "@/components/shared/WhatsAppOrderSection";
import type { CatalogProduct } from "../types";
import { ProductGallery } from "./ProductGallery";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { RelatedProductsSection } from "./RelatedProductsSection";

export type ProductDetailViewProps = {
  product: CatalogProduct;
};

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const whatsAppLink = createSingleProductWhatsAppLink({
    name: product.name,
    priceKobo: product.priceKobo,
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
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <Star
                  className="h-3.5 w-3.5 fill-accent text-accent"
                  aria-hidden="true"
                />
                {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>

            <h1 className="font-heading text-3xl font-bold text-foreground">
              {product.name}
            </h1>

            <p className="font-heading text-2xl font-bold text-primary">
              <Money amountKobo={product.priceKobo} />
            </p>
          </div>

          <p className="text-sm leading-relaxed text-foreground">
            {product.description}
          </p>

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full rounded-full gap-2 font-semibold"
              disabled={!product.inStock}
            >
              <Link href={`/checkout/${product.slug}`}>
                <Gift className="h-4 w-4" aria-hidden="true" />
                <span>Send This Gift Now</span>
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
