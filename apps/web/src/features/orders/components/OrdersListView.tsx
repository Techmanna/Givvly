"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { useOrdersList } from "../hooks/useOrders";

export function OrdersListView() {
  const { data: orders = [], isLoading } = useOrdersList();
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border bg-surface-subtle"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No gift orders yet"
        description="Browse curated gifts and send something thoughtful directly to someone's doorstep."
        action={
          <Button asChild>
            <Link href="/gifts">Browse gift catalog</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {paginatedOrders.map((order) => (
          <Card key={order.id} className="transition hover:shadow-card">
            <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-medium text-ink-muted">
                    {order.number}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="font-display text-lg font-semibold text-ink">
                  {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </p>
                <p className="text-xs text-ink-muted">
                  Recipient: <span className="font-medium text-ink">{order.recipientName}</span>
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <Money
                  amountKobo={order.totalKobo}
                  className="font-display text-lg font-semibold text-ink"
                />
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={`/orders/${encodeURIComponent(order.id)}`}>
                    <Package className="h-3.5 w-3.5" />
                    Track & Manage
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={orders.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemName="orders"
      />
    </div>
  );
}

