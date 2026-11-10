"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ShoppingCart,
  Star,
  Pencil,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Money } from "@/components/shared/Money";
import { ProductOverviewTab } from "./ProductOverviewTab";
import { ProductActivityTab } from "./ProductActivityTab";
import { ProductEditForm } from "./ProductEditForm";
import type { AdminProduct } from "../../types";

interface ProductDetailModalProps {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "overview" | "activity" | "edit";
  onTabChange: (tab: "overview" | "activity" | "edit") => void;
  onProductUpdated: (updated: AdminProduct) => void;
  onProductDeleted?: () => void;
  orders: any[];
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  onProductUpdated,
  onProductDeleted,
  orders,
}: ProductDetailModalProps) {
  // Filter orders matching this product
  const productOrders = useMemo(() => {
    if (!product) return [];
    const pName = product.name.toLowerCase().trim();
    const pSlug = product.slug.toLowerCase().trim();
    const pId = product.id;

    return orders.filter((ord) =>
      (ord.items || []).some((it: any) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = it.productId;
        return (
          itPid === pId ||
          itName === pName ||
          (itName && pName.includes(itName)) ||
          (pSlug && itName.replace(/[^a-z0-9]+/g, "-") === pSlug)
        );
      })
    );
  }, [product, orders]);

  const unitsSold = useMemo(() => {
    if (!product) return 0;
    const pName = product.name.toLowerCase().trim();
    const pId = product.id;
    return productOrders.reduce((sum, ord) => {
      const matching = (ord.items || []).filter((it: any) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = it.productId;
        return itPid === pId || itName === pName || (itName && pName.includes(itName));
      });
      return sum + matching.reduce((s: number, it: any) => s + (it.qty || 1), 0);
    }, 0);
  }, [product, productOrders]);

  const revenueKobo = useMemo(() => {
    if (!product) return 0;
    const pName = product.name.toLowerCase().trim();
    const pId = product.id;
    return productOrders.reduce((sum, ord) => {
      const matching = (ord.items || []).filter((it: any) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = it.productId;
        return itPid === pId || itName === pName || (itName && pName.includes(itName));
      });
      return (
        sum +
        matching.reduce(
          (s: number, it: any) =>
            s + (it.unitPriceKobo || product.priceKobo) * (it.qty || 1),
          0
        )
      );
    }, 0);
  }, [product, productOrders]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-4xl p-0 gap-0">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* <Badge variant="outline" className="text-xs font-mono">
                  ID: {product.id}
                </Badge> */}
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
                {product.isCombo && (
                  <Badge className="bg-accent/20 text-accent-foreground text-xs font-semibold gap-1">
                    <Layers className="h-3 w-3" />
                    Curated Combo
                  </Badge>
                )}
                <Badge
                  className={
                    product.inStock
                      ? "bg-emerald-600 text-white text-xs"
                      : "bg-zinc-500 text-white text-xs"
                  }
                >
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              <DialogTitle className="font-heading text-xl font-bold text-foreground">
                {product.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                Slug: {product.slug}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
              >
                <Link
                  href={`/gifts/${product.slug}`}
                  target="_blank"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Live Catalog Page</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
              >
                <Link
                  href={`/checkout/${product.slug}`}
                  target="_blank"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Direct Checkout</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* 4 Stat / KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 ">
            <Card className="border-border/80 bg-muted/20 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Unit Price
              </span>
              <p className="mt-1 font-heading text-lg font-bold text-primary">
                <Money amountKobo={product.priceKobo} />
              </p>
            </Card>

            <Card className="border-border/80 bg-muted/20 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Units Sold
              </span>
              <p className="mt-1 font-heading text-lg font-bold text-foreground">
                {unitsSold} units
              </p>
              <p className="text-[10px] text-muted-foreground">
                across {productOrders.length} orders
              </p>
            </Card>

            <Card className="border-border/80 bg-muted/20 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Product Revenue
              </span>
              <p className="mt-1 font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                <Money amountKobo={revenueKobo} />
              </p>
              <p className="text-[10px] text-muted-foreground">
                delivered & confirmed
              </p>
            </Card>

            <Card className="border-border/80 bg-muted/20 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rating & Reviews
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-heading text-lg font-bold text-foreground">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({product.reviewCount})
                </span>
              </div>
            </Card>
          </div>

          {/* Tabs: Specifications, Orders/Activity, Full Edit */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => onTabChange(val as "overview" | "activity" | "edit")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="text-xs">
                Specifications & Curation
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                Orders & Activities ({productOrders.length})
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs gap-1.5 font-semibold">
                <Pencil className="h-3.5 w-3.5" />
                <span>Quick Edit & Full Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview">
              <ProductOverviewTab product={product} />
            </TabsContent>

            {/* Tab 2: Orders & Activity */}
            <TabsContent value="activity">
              <ProductActivityTab orders={productOrders} />
            </TabsContent>

            {/* Tab 3: Full Edit Product */}
            <TabsContent value="edit" className="pt-3">
              <ProductEditForm
                product={product}
                onSuccess={(updated) => {
                  onProductUpdated(updated);
                  onTabChange("overview");
                }}
                onCancel={() => onTabChange("overview")}
                onDeleted={() => {
                  onProductDeleted?.();
                  onOpenChange(false);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
