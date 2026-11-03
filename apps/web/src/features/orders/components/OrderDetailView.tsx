"use client";

import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { useOrderDetail, useOrderTracking } from "../hooks/useOrders";
import { OrderTimeline } from "./OrderTimeline";
import { RatingStars } from "./RatingStars";
import { DisputeForm } from "./DisputeForm";

export type OrderDetailViewProps = {
  orderId?: string;
  trackingToken?: string;
  publicView?: boolean;
};

export function OrderDetailView({
  orderId = "",
  trackingToken = "",
  publicView = false,
}: OrderDetailViewProps) {
  const detailQuery = useOrderDetail(publicView ? "" : orderId);
  const trackingQuery = useOrderTracking(publicView ? trackingToken : "");

  const order = publicView ? trackingQuery.data : detailQuery.data;
  const isLoading = publicView
    ? trackingQuery.isLoading
    : detailQuery.isLoading;

  if (isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-subtle" />
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="font-display text-lg font-medium text-ink">
            Order not found
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Check the order number or tracking link and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${order.number}`
      : `/track/${order.number}`;

  return (
    <div className="space-y-6">
      {!publicView && (
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 border-b border-border sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-ink-muted">
                {order.number}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <CardTitle className="mt-1 font-display text-2xl">
              Gift for {order.recipientName}
            </CardTitle>
          </div>

          <CopyButton
            value={trackingUrl}
            label="Copy tracking link"
          />
        </CardHeader>

        <CardContent className="grid gap-8 p-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
                <Truck className="h-4 w-4 text-primary" />
                Delivery Progress
              </h3>
              <OrderTimeline
                currentStatus={order.status}
                timeline={order.timeline}
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="mb-2 font-display text-base font-semibold text-ink">
                Items in Order
              </h3>
              <ul className="space-y-2 text-sm">
                {order.items.map((item, idx) => (
                  <li
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between text-ink"
                  >
                    <span>
                      {item.qty}× {item.name}
                    </span>
                    <Money
                      amountKobo={item.unitPriceKobo * item.qty}
                      className="font-medium"
                    />
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-border pt-2 font-semibold text-ink">
                  <span>Total paid</span>
                  <Money amountKobo={order.totalKobo} />
                </li>
              </ul>
            </div>
          </div>

          {!publicView && (
            <div className="space-y-6 rounded-2xl border border-border bg-surface-subtle p-4">
              {order.status === "DELIVERED" && (
                <div>
                  <h4 className="mb-2 font-display text-sm font-semibold text-ink">
                    Leave a Review
                  </h4>
                  <RatingStars orderId={order.id} />
                </div>
              )}

              <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                <h4 className="mb-2 font-display text-sm font-semibold text-ink">
                  Need Help with This Delivery?
                </h4>
                <DisputeForm orderId={order.id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

