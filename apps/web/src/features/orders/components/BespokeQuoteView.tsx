"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Gift,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  ExternalLink,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusKind } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { useBespokeWishDetail, usePayBespokeWishQuote } from "../hooks/useOrders";
import { formatDate } from "@/lib/format";

export type BespokeQuoteViewProps = {
  token: string;
};

export function BespokeQuoteView({ token }: BespokeQuoteViewProps) {
  const detailQuery = useBespokeWishDetail(token);
  const payMutation = usePayBespokeWishQuote(token);

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-12 px-4">
        <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Wish Package Not Found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find a custom wish package matching this tracking token. Please check your link or contact concierge support.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/custom-gift">Create a New Wish Package</Link>
          </Button>
        </div>
      </div>
    );
  }

  const quote = detailQuery.data;
  const isAwaitingQuote = quote.status === "AWAITING_QUOTE";
  const isQuoted = quote.status === "QUOTED";
  const isPaidOrBeyond =
    quote.status !== "AWAITING_QUOTE" &&
    quote.status !== "QUOTED" &&
    quote.status !== "CANCELLED";

  const handlePay = async () => {
    try {
      const res = await payMutation.mutateAsync();
      if (res.authorizationUrl) {
        toast.info("Redirecting to Paystack secure checkout...");
        window.location.href = res.authorizationUrl;
      } else {
        toast.error("Could not obtain payment link. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initialization failed";
      toast.error(msg);
    }
  };

  const wrapStyleName =
    quote.wrapStyle === "SIGNATURE_VELVET_BOX"
      ? "Signature Velvet Keepsake Box"
      : quote.wrapStyle === "WOODEN_CELEBRATION_CRATE"
      ? "Artisanal Celebration Wooden Chest"
      : quote.wrapStyle === "MINIMALIST_LUXE_WRAP"
      ? "Eco-Luxe Japanese Wrap"
      : "Standard Givvly Presentation Box";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-20">
      {/* Status Progress Header */}
      <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Bespoke Wish #{quote.orderNumber}
          </div>
          <StatusBadge status={quote.status as StatusKind} />
        </div>

        <div className="mt-4 space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAwaitingQuote && "Our Concierge is Sourcing Your Package"}
            {isQuoted && "Your Itemized Quote is Ready!"}
            {isPaidOrBeyond && "Package Confirmed & Being Prepared"}
            {quote.status === "CANCELLED" && "Wish Package Cancelled"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isAwaitingQuote &&
              "We have received your wish list and our luxury sourcing team is validating official merchant pricing, warranties, and delivery logistics."}
            {isQuoted &&
              "Our concierge has verified availability and prepared your customized quote below. Review the itemized pricing and complete payment to confirm your order."}
            {isPaidOrBeyond &&
              "Your payment has been successfully recorded. Our fulfillment team is packaging your gifts in signature Givvly presentation for delivery."}
          </p>
        </div>

        {/* Milestone Steps */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-foreground">1. Wish Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            {isAwaitingQuote ? (
              <Clock className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span
              className={`text-xs font-medium ${
                isAwaitingQuote ? "text-amber-500 font-semibold" : "text-foreground"
              }`}
            >
              2. Sourcing Quote
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isQuoted ? (
              <Sparkles className="h-4 w-4 text-primary animate-bounce shrink-0" />
            ) : isPaidOrBeyond ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 ml-1 mr-1" />
            )}
            <span
              className={`text-xs font-medium ${
                isQuoted ? "text-primary font-bold" : isPaidOrBeyond ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              3. Payment Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPaidOrBeyond ? (
              <Truck className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 ml-1 mr-1" />
            )}
            <span
              className={`text-xs font-medium ${
                isPaidOrBeyond ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              4. Hand Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Quoted Pricing & Pay Callout (If QUOTED) */}
      {isQuoted && (
        <Card className="rounded-3xl border-2 border-primary/40 bg-card shadow-lg ring-4 ring-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <CreditCard className="h-5 w-5" />
                <CardTitle className="text-xl">Approved Quotation Breakdown</CardTitle>
              </div>
              <Badge variant="default" className="text-xs">
                Ready to Pay
              </Badge>
            </div>
            {quote.customWishData?.adminNote && (
              <div className="mt-2 rounded-xl bg-primary/10 p-4 text-xs sm:text-sm text-foreground">
                <p className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <MessageSquare className="h-4 w-4" /> Concierge Note:
                </p>
                <p className="leading-relaxed">{quote.customWishData.adminNote}</p>
                {quote.customWishData.estimatedDeliveryDays && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-primary" /> Estimated delivery:{" "}
                    <span className="text-foreground font-semibold">
                      {quote.customWishData.estimatedDeliveryDays} business days
                    </span>{" "}
                    after payment
                  </p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 border-y border-border/80 py-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Gift Items Sourcing Subtotal</span>
                <span className="font-medium text-foreground">
                  <Money amountKobo={quote.subtotalKobo} />
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{wrapStyleName}</span>
                <span className="font-medium text-foreground">
                  {quote.packagingFeeKobo > 0 ? (
                    <Money amountKobo={quote.packagingFeeKobo} />
                  ) : (
                    "Included Free"
                  )}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Doorstep Insured Delivery</span>
                <span className="font-medium text-foreground">
                  {quote.deliveryFeeKobo > 0 ? (
                    <Money amountKobo={quote.deliveryFeeKobo} />
                  ) : (
                    "Free Delivery"
                  )}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-heading text-lg font-bold text-foreground">
                <span>Total Amount to Pay</span>
                <span className="text-primary text-xl">
                  <Money amountKobo={quote.totalKobo} />
                </span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handlePay}
              disabled={payMutation.isPending}
              className="w-full text-base font-bold shadow-md h-12"
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting to Paystack...
                </>
              ) : (
                <>
                  Accept Quote & Pay <Money amountKobo={quote.totalKobo} />
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Secured via Paystack • Instant confirmation • Bank transfer & Cards accepted
            </p>
          </CardContent>
        </Card>
      )}

      {/* Package Items List */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5" />
              <CardTitle className="text-lg">Requested Items</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {quote.customWishData?.items?.length ?? 0} item(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(quote.customWishData?.items || []).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border/70 bg-muted/20 p-4"
            >
              {item.imageUrl ? (
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Gift className="h-8 w-8" />
                </div>
              )}

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-heading text-base font-bold text-foreground">
                    {item.title}
                  </h4>
                  <Badge variant="secondary" className="text-[11px]">
                    Qty: {item.qty}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                    {item.category}
                  </span>
                  {item.targetBudgetHint && (
                    <span className="text-muted-foreground">
                      Target: {item.targetBudgetHint}
                    </span>
                  )}
                  {item.inspirationUrl && (
                    <a
                      href={item.inspirationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Store Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {item.specs && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    <span className="font-medium text-foreground">Specifications: </span>
                    {item.specs}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Keepsake Packaging & Card Message */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg">Presentation & Calligraphy Card</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selected Packaging Style
              </span>
              {quote.packagingFeeKobo > 0 ? (
                <span className="text-xs font-bold text-primary">
                  <Money amountKobo={quote.packagingFeeKobo} />
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-600">Included Free</span>
              )}
            </div>
            <p className="mt-1 font-heading text-base font-bold text-foreground">
              {wrapStyleName}
            </p>
          </div>

          {quote.giftNote && (
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Handwritten Card Message
              </span>
              <p className="font-serif italic text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                &ldquo;{quote.giftNote}&rdquo;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery & Recipient Information */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <CardTitle className="text-lg">Delivery Destination</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Recipient
            </span>
            <p className="mt-1 font-bold text-foreground text-base">
              {quote.recipientName}
            </p>
            {quote.recipientPhone && (
              <p className="text-muted-foreground">{quote.recipientPhone}</p>
            )}
            {quote.customWishData?.occasion && (
              <p className="mt-1 text-primary font-medium text-xs">
                Occasion: {quote.customWishData.occasion}
              </p>
            )}
          </div>

          <div>
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Address
            </span>
            <p className="mt-1 font-medium text-foreground">
              {quote.deliveryAddress.street}
              {quote.deliveryAddress.area ? `, ${quote.deliveryAddress.area}` : ""}
            </p>
            <p className="text-muted-foreground">
              {quote.deliveryAddress.city}, {quote.deliveryAddress.state}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
