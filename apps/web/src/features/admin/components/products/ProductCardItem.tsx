"use client";

import { Eye, Layers, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/shared/Money";
import type { AdminProduct } from "../../types";

interface ProductCardItemProps {
  product: AdminProduct;
  onSelect: (product: AdminProduct, tab?: "overview" | "activity" | "edit") => void;
  onToggleStock: (id: string, currentStock: boolean) => void;
  isStockPending?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ProductCardItem({
  product,
  onSelect,
  onToggleStock,
  isStockPending = false,
  isSelected = false,
  onToggleSelect,
}: ProductCardItemProps) {
  return (
    <Card
      key={product.id}
      className={`overflow-hidden border transition-all duration-200 hover:shadow-soft flex flex-col justify-between ${
        isSelected
          ? "ring-2 ring-primary border-primary/60 bg-primary/[0.02]"
          : product.inStock
            ? "border-border/80 bg-card hover:border-primary/40"
            : "border-border/40 bg-muted/20 opacity-80"
      }`}
    >
      <div className="flex h-full flex-col justify-between p-4">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {onToggleSelect && (
                <div
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id={`select-product-${product.id}`}
                    data-testid="product-select-checkbox"
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(product.id)}
                    aria-label={`Select ${product.name}`}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}
              {product.isCombo ? (
                <Badge
                  variant="secondary"
                  className="bg-accent/20 text-accent-foreground text-[10px] font-semibold gap-1"
                >
                  <Layers className="h-3 w-3" />
                  <span>Curated Combo</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground"
                >
                  {product.category}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {product.inStock ? "In Stock" : "Out of Stock"}
              </span>
              <Switch
                checked={product.inStock}
                onCheckedChange={() =>
                  onToggleStock(product.id, product.inStock)
                }
                disabled={isStockPending}
                aria-label={`Toggle stock for ${product.name}`}
              />
            </div>
          </div>

          {product.imageUrl && (
            <div
              onClick={() => onSelect(product, "overview")}
              className="group relative h-36 w-full cursor-pointer overflow-hidden rounded-lg border border-border/50 bg-muted/30"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          <h3
            onClick={() => onSelect(product, "overview")}
            className="font-heading text-base font-bold text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors"
          >
            {product.name}
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>

          {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
            <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground space-y-1">
              <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">
                Box Includes ({product.comboItems.length} items):
              </p>
              <p className="line-clamp-1 text-xs">
                {product.comboItems
                  .map((c) => `${c.qty}x ${c.name}`)
                  .join(" • ")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Catalog Price
            </span>
            <p className="font-heading text-base font-bold text-primary">
              <Money amountKobo={product.priceKobo} />
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onSelect(product, "overview")}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View Details</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
              onClick={() => onSelect(product, "edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
