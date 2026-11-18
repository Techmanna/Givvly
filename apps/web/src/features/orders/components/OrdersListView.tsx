"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Package,
  Phone,
  Receipt,
  Search,
  User,
} from "lucide-react";
import type { Order } from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TransactionReceiptModal } from "@/components/shared/TransactionReceiptModal";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useOrdersList } from "../hooks/useOrders";

type OrderFilter = "ALL" | "ACTIVE" | "DELIVERED" | "PENDING_PAYMENT";

const FILTER_TABS: Array<{ id: OrderFilter; label: string }> = [
  { id: "ALL", label: "All Orders" },
  { id: "ACTIVE", label: "In Progress" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "PENDING_PAYMENT", label: "Awaiting Payment" },
];

function matchesFilter(order: Order, filter: OrderFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "DELIVERED") return order.status === "DELIVERED";
  if (filter === "PENDING_PAYMENT") return order.status === "PENDING_PAYMENT";
  return (
    order.status !== "DELIVERED" &&
    order.status !== "PENDING_PAYMENT" &&
    order.status !== "CANCELLED"
  );
}

export function OrdersListView() {
  const { data: orders = [], isLoading } = useOrdersList();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState<Order | null>(null);

  const filterCounts = useMemo(() => {
    const counts: Record<OrderFilter, number> = {
      ALL: orders.length,
      ACTIVE: 0,
      DELIVERED: 0,
      PENDING_PAYMENT: 0,
    };
    for (const order of orders) {
      if (matchesFilter(order, "ACTIVE")) counts.ACTIVE += 1;
      if (matchesFilter(order, "DELIVERED")) counts.DELIVERED += 1;
      if (matchesFilter(order, "PENDING_PAYMENT")) counts.PENDING_PAYMENT += 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, activeFilter)) return false;
      if (!q) return true;
      return (
        order.number.toLowerCase().includes(q) ||
        order.recipientName.toLowerCase().includes(q) ||
        order.items.some((i) => (i.name ?? "").toLowerCase().includes(q))
      );
    });
  }, [orders, activeFilter, searchQuery]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleExpandItems = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40"
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
      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_TABS.map((tab) => {
            const count = filterCounts[tab.id];
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search order #, item, recipient..."
            aria-label="Search orders"
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No matching orders"
          description="Try clearing your search or switching order status filters."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilter("ALL");
                setSearchQuery("");
                setPage(1);
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const isExpanded = Boolean(expandedOrderIds[order.id]);
            const visibleItems = isExpanded
              ? order.items
              : order.items.slice(0, 3);
            const hiddenCount = Math.max(0, order.items.length - 3);
            const totalUnits = order.items.reduce((sum, i) => sum + i.qty, 0);

            return (
              <Card
                key={order.id}
                className="overflow-hidden border-border/80 transition-shadow hover:shadow-md"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {order.number}
                    </span>
                    <StatusBadge status={order.status} />
                    {order.createdAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {formatDate(order.createdAt, "d MMM yyyy")}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {totalUnits} {totalUnits === 1 ? "item" : "items"}
                    </span>
                    <Money
                      amountKobo={order.totalKobo}
                      className="font-heading text-lg font-bold text-foreground"
                    />
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="space-y-4 p-5">
                  {/* Structured Items List */}
                  <ul className="space-y-2">
                    {visibleItems.map((item, idx) => (
                      <li
                        key={`${order.id}_item_${idx}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 font-mono text-xs font-semibold text-primary">
                            {item.qty}×
                          </span>
                          <span className="truncate font-medium text-foreground">
                            {item.name}
                          </span>
                        </div>
                        {typeof item.unitPriceKobo === "number" &&
                        item.unitPriceKobo > 0 ? (
                          <Money
                            amountKobo={item.unitPriceKobo * item.qty}
                            className="shrink-0 text-xs text-muted-foreground"
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpandItems(order.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {isExpanded
                        ? "Show fewer items"
                        : `+ ${hiddenCount} more ${hiddenCount === 1 ? "item" : "items"}`}
                    </button>
                  ) : null}

                  {/* Recipient & Actions Row */}
                  <div className="flex flex-col gap-3 border-t border-border/60 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                        <span>
                          To{" "}
                          <strong className="font-medium text-foreground">
                            {order.recipientName}
                          </strong>
                        </span>
                      </span>
                      {order.recipientPhone ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {order.recipientPhone}
                        </span>
                      ) : null}
                      {order.address ? (
                        <span className="inline-flex max-w-xs items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{order.address}</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 gap-1.5 rounded-full px-4 text-xs"
                        onClick={() => setSelectedReceiptOrder(order)}
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Receipt &amp; Share</span>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-full px-4 text-xs"
                      >
                        <Link href={`/orders/${encodeURIComponent(order.id)}`}>
                          <Package className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Track &amp; Manage</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredOrders.length}
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
