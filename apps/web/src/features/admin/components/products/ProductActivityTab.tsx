"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";

interface ProductActivityTabProps {
  orders: any[];
}

export function ProductActivityTab({ orders }: ProductActivityTabProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/20 p-8 text-center text-xs text-muted-foreground space-y-2 mt-3">
        <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="font-semibold text-foreground text-sm">
          No Orders Placed Yet
        </p>
        <p>
          This product has not been purchased in any orders yet. It is published and ready in the live store.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="flex flex-col justify-between gap-2 rounded-xl border border-border/80 bg-card p-3 sm:flex-row sm:items-center text-xs transition-colors hover:border-primary/40"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/orders/${ord.id}`}
                  className="font-mono font-bold text-foreground hover:text-primary hover:underline"
                >
                  {ord.number}
                </Link>
                <StatusBadge status={ord.status} />
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(ord.createdAt || ord.timeline?.[0]?.at || new Date().toISOString())}
                </span>
              </div>
              <p className="text-muted-foreground">
                Recipient: <strong className="text-foreground">{ord.recipientName}</strong>
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase text-muted-foreground block">
                  Total Value
                </span>
                <span className="font-bold text-primary">
                  <Money amountKobo={ord.totalKobo} />
                </span>
              </div>
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Link href={`/admin/orders/${ord.id}`}>
                  View Order
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
