"use client";

import { useState } from "react";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/format";
import type { OrderStatus } from "@givvly/contracts";
import {
  useAdminOrders,
  useUpdateAdminOrderStatus,
} from "../hooks/useAdmin";

const STATUS_FILTERS: Array<OrderStatus | "ALL"> = [
  "ALL",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export function OrderManagementView() {
  const ordersQuery = useAdminOrders();
  const updateStatusMutation = useUpdateAdminOrderStatus();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const orders = ordersQuery.data ?? [];

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.number.toLowerCase().includes(search.toLowerCase()) ||
      ord.recipientName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      selectedStatus === "ALL" || ord.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: newStatus,
      });
      toast.success(`Order updated to ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update order status"
      );
    }
  };

  const handleCopyOrderNumber = (num: string, id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(num);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Order number copied to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Order Fulfillment & Logistics Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Oversee physical gift hampers, box combos, and delivery dispatches across Nigeria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {orders.length} Total Orders
          </Badge>
          <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
            {orders.filter((o) => o.status === "CONFIRMED" || o.status === "PACKED").length} Ready for Fulfillment
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order # or recipient name..."
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedStatus === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Order List */}
      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : ordersQuery.isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load orders. Please refresh.
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No orders match your search or status filter."
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((ord) => {
            const isCopied = copiedId === ord.id;
            const canPack = ord.status === "CONFIRMED";
            const canShip = ord.status === "PACKED";
            const canDeliver = ord.status === "SHIPPED";
            const lastUpdated = ord.timeline?.[ord.timeline.length - 1]?.at;

            return (
              <Card
                key={ord.id}
                className="overflow-hidden border border-border/80 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-soft"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    {/* Left: Info */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {ord.number}
                        </span>
                        <StatusBadge status={ord.status} />
                        {lastUpdated && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(lastUpdated)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          Recipient: {ord.recipientName}
                        </p>
                      </div>

                      {ord.items && ord.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ord.items.map((it, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[11px] font-normal"
                            >
                              {it.qty}x {it.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex flex-col items-start gap-3 border-t border-border/40 pt-3 md:items-end md:border-t-0 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Total Value
                        </span>
                        <p className="font-heading text-lg font-bold text-primary">
                          <Money amountKobo={ord.totalKobo} />
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canPack && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(ord.id, "PACKED")
                            }
                            disabled={updateStatusMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                          >
                            <Box className="mr-1.5 h-3.5 w-3.5" />
                            <span>Mark Packed</span>
                          </Button>
                        )}

                        {canShip && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(ord.id, "SHIPPED")
                            }
                            disabled={updateStatusMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                          >
                            <Truck className="mr-1.5 h-3.5 w-3.5" />
                            <span>Dispatch / Ship</span>
                          </Button>
                        )}

                        {canDeliver && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(ord.id, "DELIVERED")
                            }
                            disabled={updateStatusMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            <span>Confirm Delivery</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCopyOrderNumber(ord.number, ord.id)
                          }
                          className="text-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              <span>Copy #</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
