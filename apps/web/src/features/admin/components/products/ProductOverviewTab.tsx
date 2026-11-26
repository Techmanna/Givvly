"use client";

import { Layers, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/Money";
import { isVideoMediaUrl } from "@/features/events/api";
import type { AdminProduct } from "../../types";

interface ProductOverviewTabProps {
  product: AdminProduct;
}

export function ProductOverviewTab({ product }: ProductOverviewTabProps) {
  return (
    <div className="space-y-4 pt-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Media Preview */}
        <div className="sm:col-span-1">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            {isVideoMediaUrl(product.imageUrl || "") ? (
              <video
                src={product.imageUrl}
                controls
                className="aspect-square w-full object-cover"
              />
            ) : (
              <img
                src={product.imageUrl || "/images/gifts/box-luxury.jpg"}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 sm:col-span-2 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              Full Product Description
            </span>
            <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2.5">
            <div>
              <span className="text-muted-foreground">Sourcing Vendor</span>
              <p className="font-semibold text-foreground text-sm">
                {product.vendorName}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Packaging Included</span>
              <p className="font-semibold text-foreground text-sm">
                {product.packagingIncluded || "Luxury Gift Box & Ribbon"}
              </p>
            </div>
            {product.costPriceKobo !== null && product.costPriceKobo !== undefined && (
              <div>
                <span className="text-muted-foreground">
                  Vendor / Buying Price (Admin Only)
                </span>
                <p className="font-semibold text-foreground text-sm">
                  ₦{Math.round(product.costPriceKobo / 100).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Occasions & Relationships */}
          <div className="space-y-2 border-t border-border/50 pt-2.5">
            {product.occasions && product.occasions.length > 0 && (
              <div>
                <span className="text-muted-foreground text-[11px] block mb-1">
                  Target Occasions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {product.occasions.map((occ) => (
                    <Badge key={occ} variant="outline" className="text-[10px]">
                      {occ}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.relationships && product.relationships.length > 0 && (
              <div>
                <span className="text-muted-foreground text-[11px] block mb-1">
                  Relationships:
                </span>
                <div className="flex flex-wrap gap-1">
                  {product.relationships.map((rel) => (
                    <Badge key={rel} variant="secondary" className="text-[10px]">
                      {rel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Variants Breakdown */}
          {product.variants && product.variants.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Product Variants ({product.variants.length})
                </span>
                {product.variants.length > 1 && (
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    <Money amountKobo={product.minPriceKobo ?? product.priceKobo} /> –{" "}
                    <Money amountKobo={product.maxPriceKobo ?? product.priceKobo} />
                  </span>
                )}
              </div>
              <div className="grid gap-1.5">
                {product.variants.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground">{v.name}</span>
                      {v.sku && (
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                          {v.sku}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Money
                        amountKobo={v.priceKobo}
                        className="font-semibold text-primary"
                      />
                      {v.stock !== null && v.stock !== undefined && (
                        <Badge variant="outline" className="text-[10px]">
                          Stock: {v.stock}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combo Breakdown */}
          {product.isCombo && product.comboItems && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
              <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Combo Box Contents ({product.comboItems.length} items)
              </span>
              <ul className="space-y-1 text-xs text-muted-foreground pl-1">
                {product.comboItems.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>• {item.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Qty: {item.qty}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
