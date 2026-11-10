"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  Star,
  Check,
  PackagePlus,
  PackageCheck,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
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
  const [quantity, setQuantity] = React.useState(1);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const openBox = useCartStore((s) => s.openBox);

  const inBoxItem = items.find((i) => i.slug === product.slug);

  const handleAddToBox = () => {
    addItem(product, quantity);
    toast.success(`Added ${quantity} × ${product.name} to your Gift Box!`, {
      action: {
        label: "View Box",
        onClick: () => openBox(),
      },
    });
  };

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

              {/* Add to Box Button */}
              <Button
                type="button"
                size="lg"
                onClick={handleAddToBox}
                className="flex-1 rounded-full gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                disabled={!product.inStock}
              >
                {inBoxItem ? (
                  <>
                    <PackageCheck className="h-4 w-4" />
                    <span>In Box ({inBoxItem.qty}) • Add {quantity} More</span>
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-4 w-4" />
                    <span>Add to Box</span>
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
