"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useVendorOrders } from "../hooks/useVendor";
import { StatusStepper } from "./StatusStepper";

export type VendorOrdersViewProps = {
  filterOrderId?: string;
};

export function VendorOrdersView({ filterOrderId }: VendorOrdersViewProps) {
  const { data: orders = [], isLoading } = useVendorOrders();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border bg-surface-subtle"
          />
        ))}
      </div>
    );
  }

  const displayed = filterOrderId
    ? orders.filter(
        (o) => o.id === filterOrderId || o.number === filterOrderId
      )
    : orders;

  if (displayed.length === 0) {
    return (
      <EmptyState
        title="No orders to fulfill"
        description="Orders assigned to your store will appear here for packing and dispatch."
      />
    );
  }

  return (
    <div className="space-y-4">
      {displayed.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex flex-col justify-between gap-2 border-b border-border sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-ink-muted">
                  {order.number}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <CardTitle className="mt-1 font-display text-lg">
                Recipient: {order.recipientName}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Money
                amountKobo={order.totalKobo}
                className="font-display text-lg font-semibold text-ink"
              />
              {!filterOrderId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/vendor/orders/${encodeURIComponent(order.id)}`}>
                    Inspect
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="text-sm text-ink-muted">
              Items:{" "}
              <span className="font-medium text-ink">
                {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Advance Fulfillment Step
              </p>
              <StatusStepper
                orderId={order.id}
                currentStatus={order.status}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

