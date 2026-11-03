"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Gift,
  ArrowRight,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { BOX_PACKAGING_OPTIONS } from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { createBoxWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppOrderSection } from "@/components/shared/WhatsAppOrderSection";

export function GiftBoxDrawer() {
  const router = useRouter();
  const {
    box,
    isDrawerOpen,
    closeDrawer,
    removeFromBox,
    updateBoxItemQty,
    setBoxPackaging,
    setGiftCard,
    setComboTitle,
    clearBox,
    getBoxItemCount,
    getItemsSubtotalKobo,
    getPackagingOption,
    getTotalKobo,
  } = useCartStore();

  const [customComboName, setCustomComboName] = React.useState(
    box.comboTitle || ""
  );
  const [isEditingComboName, setIsEditingComboName] = React.useState(false);

  const itemCount = getBoxItemCount();
  const subtotalKobo = getItemsSubtotalKobo();
  const packaging = getPackagingOption();
  const totalKobo = getTotalKobo();

  const boxWhatsAppUrl = createBoxWhatsAppLink({
    items: box.items,
    totalKobo,
    packagingName: packaging.name,
    recipientName: box.giftCardRecipient,
    giftNote: box.giftCardMessage,
  });

  if (!isDrawerOpen) return null;

  const handleSaveAsCombo = () => {
    const title = customComboName.trim() || "My Bespoke Gift Combo";
    setComboTitle(title);
    setIsEditingComboName(false);
    toast.success(`Saved "${title}"! Ready to gift.`);
  };

  const handleProceedToCheckout = () => {
    closeDrawer();
    router.push("/checkout/box");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your Curated Gift Box"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-300"
    >
      <div
        className="fixed inset-0"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:max-w-md md:max-w-lg">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4A959]/50 bg-primary/10 text-primary">
              <Gift className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Your Curated Gift Box
              </h2>
              <p className="text-xs text-muted-foreground">
                {itemCount === 0
                  ? "Empty box"
                  : `${itemCount} item${itemCount === 1 ? "" : "s"} assembled`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close box drawer"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted/60 text-muted-foreground">
                <Gift className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                Your gift box is empty
              </h3>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Add single keepsakes from our catalog or pick a ready-to-ship
                predefined combo to start building your gift.
              </p>
              <Button
                size="sm"
                className="mt-6 rounded-full px-5"
                onClick={closeDrawer}
              >
                Browse Gift Atelier
              </Button>
            </div>
          ) : (
            <>
              {/* Combo Title Bar / Customization Tag */}
              <div className="rounded-xl border border-[#D4A959]/40 bg-gradient-to-r from-[#FAF3EF] to-card p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary uppercase tracking-wider text-[11px]">
                    {box.comboTitle ? "Custom Combo" : "Curated Gift Box"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingComboName(!isEditingComboName)}
                    className="text-xs text-muted-foreground underline hover:text-primary"
                  >
                    {isEditingComboName ? "Done" : "Name this combo"}
                  </button>
                </div>

                {isEditingComboName ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={customComboName}
                      onChange={(e) => setCustomComboName(e.target.value)}
                      placeholder="e.g. Chief Okafor's Golden Birthday Box"
                      className="h-8 flex-1 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveAsCombo}
                      className="h-8 px-3 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 font-heading text-sm font-bold text-foreground">
                    {box.comboTitle || "Bespoke Gift Box Bundle"}
                  </p>
                )}
              </div>

              {/* Box Items List */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Box Items ({itemCount})
                </p>

                <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
                  {box.items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex items-start justify-between gap-3 p-3.5"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="font-heading text-sm font-semibold text-foreground leading-tight">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {product.vendorName}
                        </p>
                        <p className="text-xs font-medium text-primary">
                          <Money amountKobo={product.priceKobo * quantity} />
                          {quantity > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">
                              ({formatNaira(product.priceKobo)} each)
                            </span>
                          )}
                        </p>

                        {/* If this is a predefined combo, show its contents */}
                        {product.isCombo && product.comboItems && (
                          <div className="mt-2 space-y-0.5 rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground text-[10px] uppercase tracking-wide">
                              Included in this combo:
                            </span>
                            <ul className="list-disc pl-4 space-y-0.5 mt-1">
                              {product.comboItems.map((c, i) => (
                                <li key={i}>{c.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => removeFromBox(product.id)}
                          aria-label={`Remove ${product.name}`}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background p-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateBoxItemQty(product.id, quantity - 1)
                            }
                            aria-label="Decrease quantity"
                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-semibold tabular-nums text-foreground">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateBoxItemQty(product.id, quantity + 1)
                            }
                            aria-label="Increase quantity"
                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Packaging Selection */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Box Presentation & Packaging
                </p>

                <div className="space-y-2">
                  {BOX_PACKAGING_OPTIONS.map((pkg) => {
                    const isSelected = box.packagingId === pkg.id;
                    return (
                      <label
                        key={pkg.id}
                        className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 transition-colors ${isSelected
                            ? "border-primary bg-primary/5 shadow-2xs"
                            : "border-border bg-card hover:border-primary/40"
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="packaging"
                            checked={isSelected}
                            onChange={() => setBoxPackaging(pkg.id)}
                            className="mt-1 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {pkg.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {pkg.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary shrink-0 ml-2">
                          {pkg.extraKobo === 0 ? "Included" : `+${formatNaira(pkg.extraKobo)}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Handwritten Note Card */}
              <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                  <span>Complimentary Gift Card Message</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={box.giftCardMessage}
                  onChange={(e) => setGiftCard(e.target.value)}
                  placeholder="Write a warm note to be handwritten inside your gift box..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer & Checkout Action */}
        {itemCount > 0 && (
          <div className="border-t border-border bg-card p-5 space-y-3.5">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatNaira(subtotalKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Packaging ({packaging.name})</span>
                <span className="font-semibold text-foreground">
                  {packaging.extraKobo === 0 ? "Included" : formatNaira(packaging.extraKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery across Nigeria</span>
                <span className="font-semibold text-success">Doorstep Tracked</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                <span>Total</span>
                <span className="font-heading text-lg text-primary tabular-nums">
                  {formatNaira(totalKobo)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearBox}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Clear Box
              </Button>
              <Button
                size="lg"
                onClick={handleProceedToCheckout}
                className="flex-1 rounded-full text-sm font-semibold shadow-xs"
              >
                <span>Checkout Gift Box</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            <WhatsAppOrderSection
              href={boxWhatsAppUrl}
              buttonLabel="Chat on WhatsApp to order box"
              showTrustBadges={false}
              className="pt-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}

