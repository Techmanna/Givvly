"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ArrowRight, Receipt, Phone } from "lucide-react";
import type { Order } from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { TransactionReceiptModal } from "@/components/shared/TransactionReceiptModal";
import { useOrdersList } from "../hooks/useOrders";

export function OrdersListView() {
  const { data: orders = [], isLoading } = useOrdersList();
  const [page, setPage] = useState(1);
  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState<Order | null>(null);

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
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span>
                    Recipient:{" "}
                    <span className="font-medium text-ink">
                      {order.recipientName}
                    </span>
                  </span>
                  {order.recipientPhone ? (
                    <span className="inline-flex items-center gap-1 font-mono text-ink-muted">
                      <Phone className="h-3 w-3" />
                      {order.recipientPhone}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
                <Money
                  amountKobo={order.totalKobo}
                  className="font-display text-lg font-semibold text-ink"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSelectedReceiptOrder(order)}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Receipt & Share
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href={`/orders/${encodeURIComponent(order.id)}`}>
                      <Package className="h-3.5 w-3.5" />
                      Track & Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
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

      {selectedReceiptOrder ? (
        <TransactionReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      ) : null}
    </div>
  );
}

