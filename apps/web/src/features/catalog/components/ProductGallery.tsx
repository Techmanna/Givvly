"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "../types";

export type ProductGalleryProps = {
  product: CatalogProduct;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const [imageError, setImageError] = React.useState(false);
  const hasImage = Boolean(product.imageUrl && !imageError);

  if (hasImage) {
    return (
      <div className="group relative min-h-80 sm:min-h-96 w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
        />
        <div className="absolute top-4 left-4 z-10">
          <Badge
            variant={product.isCombo ? "default" : "outline"}
            className={
              product.isCombo
                ? "bg-[#D4A959] text-white border-none shadow-sm"
                : "bg-background/90 backdrop-blur-md"
            }
          >
            {product.isCombo ? "Curated Hamper" : product.category}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-72 sm:min-h-80 flex-col items-center justify-center rounded-2xl border border-border bg-accent/10 p-8 text-center">
      <Badge variant="outline" className="mb-3">
        {product.category}
      </Badge>
      <h2 className="font-heading text-2xl font-bold text-foreground">
        {product.name}
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Curated and fulfilled by {product.vendorName}
      </p>
    </div>
  );
}

