"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  GiftIcon,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { useCartStore, type BagItem } from "@/stores/cart-store";

function BagDrawerItemRow({
  item,
  updateItemQty,
  removeItem,
}: {
  item: BagItem;
  updateItemQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
}) {
  const [imgError, setImgError] = React.useState(false);
  const itemKey = item.variantId
    ? `${item.slug}__${item.variantId}`
    : item.id || item.slug;

  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted/40">
        {item.imageUrl && !imgError ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <h4 className="font-medium text-sm text-foreground line-clamp-1">
          {item.name}
        </h4>
        <div className="flex items-center gap-2">
          {item.curatedBox && (
            <span className="inline-flex items-center rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              Curated Box
            </span>
          )}
          {item.variantName && (
            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {item.variantName}
            </span>
          )}
          {item.vendorName && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {item.curatedBox ? item.vendorName : `By ${item.vendorName}`}
            </p>
          )}
        </div>
        {item.curatedBox && item.curatedBox.items.length > 0 && (
          <ul className="mt-1 space-y-0.5 border-l-2 border-primary/20 pl-2 text-[11px] text-muted-foreground">
            {item.curatedBox.items.slice(0, 4).map((inner, idx) => (
              <li key={`${inner.productId}-${inner.variantId || idx}`} className="line-clamp-1">
                {inner.qty}x {inner.name}
                {inner.variantName ? ` (${inner.variantName})` : ""}
              </li>
            ))}
            {item.curatedBox.items.length > 4 && (
              <li className="text-[10px] text-primary font-medium">
                +{item.curatedBox.items.length - 4} more item(s)
              </li>
            )}
          </ul>
        )}
        <div className="mt-1 flex items-center justify-between">
          <Money
            amountKobo={item.priceKobo}
            className="text-sm font-semibold text-primary"
          />

          <div className="flex items-center gap-2 border border-border/80 rounded-full px-2 py-0.5 bg-background">
            <button
              type="button"
              onClick={() => updateItemQty(itemKey, item.qty - 1)}
              aria-label={`Decrease quantity of ${item.name}`}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-xs font-semibold px-1 min-w-[16px] text-center">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => updateItemQty(itemKey, item.qty + 1)}
              aria-label={`Increase quantity of ${item.name}`}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeItem(itemKey)}
        aria-label={`Remove ${item.name} from bag`}
        className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BagDrawer() {
  const { items, isOpen, closeBag, removeItem, updateItemQty, clearBag } =
    useCartStore();

  const totalCount = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotalKobo = items.reduce(
    (acc, item) => acc + item.priceKobo * item.qty,
    0
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeBag()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md bg-card border-l border-border"
      >
        <SheetHeader className="border-b border-border/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="font-heading text-lg font-bold text-foreground">
                  Your Shopping Bag
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {totalCount === 0
                    ? "Your shopping bag is empty"
                    : `${totalCount} celebration ${
                        totalCount === 1 ? "gift" : "gifts"
                      } in bag`}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={clearBag}
                className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors mr-6"
              >
                Clear all
              </button>
            )}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
            </div>
            <h3 className="mt-5 font-heading text-xl font-bold text-foreground">
              Your Shopping Bag is Empty
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Curate unforgettable celebrations with artisanal keepsakes, luxury
              fragrances, and sweet treats from our Gift Atelier.
            </p>
            <Button
              asChild
              className="mt-6 rounded-full px-6 text-sm font-semibold gap-2"
              onClick={closeBag}
            >
              <Link href="/gifts">
                <GiftIcon className="h-4 w-4" />
                <span>Explore Gift Atelier</span>
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-border/60">
              {items.map((item) => {
                const itemKey = item.variantId
                  ? `${item.slug}__${item.variantId}`
                  : item.id || item.slug;
                return (
                  <BagDrawerItemRow
                    key={itemKey}
                    item={item}
                    updateItemQty={updateItemQty}
                    removeItem={removeItem}
                  />
                );
              })}
            </div>

            <div className="border-t border-border/80 bg-muted/20 p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gifts Subtotal</span>
                  <Money
                    amountKobo={subtotalKobo}
                    className="font-semibold text-foreground text-base"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Standard Dispatch</span>
                  <span className="text-success font-medium">Lagos Wide</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-2.5 text-[11px] text-muted-foreground border border-primary/10">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  All gifts packaged together in luxury Givvly keepsake boxes
                  with handwritten notes.
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full font-semibold gap-2 shadow-md hover:shadow-lg transition-all"
                  onClick={closeBag}
                >
                  <Link href="/checkout/bag">
                    <span>Proceed to Bag Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={closeBag}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
