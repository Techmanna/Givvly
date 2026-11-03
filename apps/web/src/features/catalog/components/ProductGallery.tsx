import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "../types";

export type ProductGalleryProps = {
  product: CatalogProduct;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-card border border-border bg-accent/10 p-8 text-center">
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

