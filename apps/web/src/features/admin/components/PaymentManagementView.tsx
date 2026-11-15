"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  ExternalLink,
  Eye,
  Gift,
  Package,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge, type StatusKind } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAdminPayments } from "../hooks/useAdmin";
import type { AdminPaymentRecord } from "../types";
import {
  buildDailyVolumeSeries,
  DailyVolumeChart,
  VolumeBreakdownCard,
} from "./FinanceCharts";

const STATUS_FILTERS = ["ALL", "SUCCESS", "INITIATED", "FAILED", "ABANDONED"] as const;
const SOURCE_FILTERS = ["ALL", "GIFT", "ORDER"] as const;
const PAGE_SIZE = 10;

export function PaymentManagementView() {
  const paymentsQuery = useAdminPayments();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [selectedPayment, setSelectedPayment] =
    React.useState<AdminPaymentRecord | null>(null);

  const payments = paymentsQuery.data ?? [];

  const filtered = payments.filter((pay) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      pay.reference.toLowerCase().includes(q) ||
      (pay.payerEmail?.toLowerCase().includes(q) ?? false) ||
      (pay.order?.number?.toLowerCase().includes(q) ?? false) ||
      (pay.order?.recipientName?.toLowerCase().includes(q) ?? false) ||
      (pay.gift?.event?.name?.toLowerCase().includes(q) ?? false) ||
      (pay.gift?.event?.slug?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === "ALL" || pay.status === statusFilter;
    const matchesSource =
      sourceFilter === "ALL" ||
      (sourceFilter === "GIFT" && Boolean(pay.gift)) ||
      (sourceFilter === "ORDER" && Boolean(pay.order));
    return matchesSearch && matchesStatus && matchesSource;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const successful = payments.filter((p) => p.status === "SUCCESS");
  const failedOrPending = payments.filter((p) => p.status !== "SUCCESS");
  const grossSettledKobo = successful.reduce((s, p) => s + p.totalKobo, 0);
  const totalServiceFeesKobo = successful.reduce(
    (s, p) => s + p.serviceFeeKobo,
    0
  );
  const successRate =
    payments.length > 0
      ? Math.round((successful.length / payments.length) * 100)
      : 0;

  const dailySeries = buildDailyVolumeSeries(
    successful.map((p) => ({ createdAt: p.createdAt, amountKobo: p.totalKobo })),
    7
  );

  const giftTotalKobo = successful
    .filter((p) => Boolean(p.gift))
    .reduce((s, p) => s + p.totalKobo, 0);
  const orderTotalKobo = successful
    .filter((p) => Boolean(p.order))
    .reduce((s, p) => s + p.totalKobo, 0);
  const otherTotalKobo = Math.max(
    0,
    grossSettledKobo - giftTotalKobo - orderTotalKobo
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Payments & Inflow Traceability
          </h2>
          <p className="text-xs text-muted-foreground">
            Audit Paystack settlements, platform service fees, failure reasons, and trace each reference to its gift or order.
          </p>
        </div>
        <Badge variant="outline" className="self-start font-mono text-xs sm:self-auto">
          {payments.length} Payment Records
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Gross Settled
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money amountKobo={grossSettledKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {successful.length} successful transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Service Fees Collected
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              <Money amountKobo={totalServiceFeesKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              Net principal:{" "}
              <Money amountKobo={grossSettledKobo - totalServiceFeesKobo} />
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Settlement Rate
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {successRate}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {successful.length} of {payments.length} attempts
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Pending / Failed
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-700 dark:text-amber-400">
              {failedOrPending.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Requires review if stuck
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyVolumeChart
          title="7-Day Settled Inflow"
          subtitle="Successful payments"
          points={dailySeries}
        />
        <VolumeBreakdownCard
          title="Settled Volume by Source"
          segments={[
            {
              label: "Celebration Gifts",
              count: successful.filter((p) => Boolean(p.gift)).length,
              amountKobo: giftTotalKobo,
              colorClass: "bg-primary",
            },
            {
              label: "Gift Box & Store Orders",
              count: successful.filter((p) => Boolean(p.order)).length,
              amountKobo: orderTotalKobo,
              colorClass: "bg-emerald-600",
            },
            {
              label: "Other / Direct",
              count: successful.filter((p) => !p.gift && !p.order).length,
              amountKobo: otherTotalKobo,
              colorClass: "bg-amber-500",
            },
          ]}
        />
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Trace by reference, payer email, order #, or celebration..."
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_FILTERS.map((src) => (
              <Button
                key={src}
                type="button"
                size="sm"
                variant={sourceFilter === src ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setSourceFilter(src);
                  setPage(1);
                }}
              >
                {src === "ALL" ? "All Sources" : src === "GIFT" ? "Gifts" : "Orders"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <Button
              key={st}
              type="button"
              size="sm"
              variant={statusFilter === st ? "secondary" : "ghost"}
              className="h-7 text-[11px]"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === "ALL" ? "All Statuses" : st}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {paymentsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
          title="No matching payments"
          description="Try clearing your search or status filter."
        />
      ) : (
        <div className="space-y-3">
          {paginated.map((pay) => (
            <Card key={pay.reference} className="border border-border/80 bg-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {pay.reference}
                    </span>
                    <StatusBadge status={pay.status as StatusKind} />
                    {pay.gift && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Gift className="h-3 w-3" />
                        {pay.gift.type}
                      </Badge>
                    )}
                    {pay.order && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Package className="h-3 w-3" />
                        {pay.order.number}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pay.payerEmail ? `${pay.payerEmail} · ` : ""}
                    Channel: {pay.channel || "Card/Transfer"} ({pay.provider || "PAYSTACK"})
                    {" · "}
                    {formatDate(pay.createdAt, "d MMM yyyy, h:mm a")}
                  </p>
                  {pay.gift?.event && (
                    <p className="text-[11px] text-muted-foreground">
                      Celebration: {pay.gift.event.name} (/e/{pay.gift.event.slug})
                    </p>
                  )}
                  {pay.order && (
                    <p className="text-[11px] text-muted-foreground">
                      Order for {pay.order.recipientName}
                      {pay.order.shippingZoneName
                        ? ` · ${pay.order.shippingZoneName}`
                        : ""}
                    </p>
                  )}
                  {pay.failureReason && (
                    <p className="text-[11px] font-medium text-destructive">
                      Failure: {pay.failureReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total Settled
                    </span>
                    <p className="font-heading text-base font-bold text-primary">
                      <Money amountKobo={pay.totalKobo} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Fee: <Money amountKobo={pay.serviceFeeKobo} />
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPayment(pay)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Trace
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemName="transactions"
      />

      {/* Payment Trace Modal */}
      <Dialog
        open={Boolean(selectedPayment)}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-base">
              <span>{selectedPayment?.reference}</span>
              {selectedPayment && (
                <StatusBadge status={selectedPayment.status as StatusKind} />
              )}
            </DialogTitle>
            <DialogDescription>
              Full payment settlement breakdown and linked resource trace.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-muted-foreground">Principal Amount</p>
                  <p className="font-semibold text-foreground">
                    <Money amountKobo={selectedPayment.amountKobo} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform Fee</p>
                  <p className="font-semibold text-foreground">
                    <Money amountKobo={selectedPayment.serviceFeeKobo} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Paid</p>
                  <p className="font-bold text-primary">
                    <Money amountKobo={selectedPayment.totalKobo} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Provider Fee</p>
                  <p className="font-semibold text-foreground">
                    {selectedPayment.providerFeeKobo != null ? (
                      <Money amountKobo={selectedPayment.providerFeeKobo} />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-xl border border-border p-3">
                <p>
                  <span className="text-muted-foreground">Payer Email:</span>{" "}
                  {selectedPayment.payerEmail || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Provider / Channel:</span>{" "}
                  {selectedPayment.provider || "PAYSTACK"} ·{" "}
                  {selectedPayment.channel || "Unspecified"}
                </p>
                <p>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {formatDate(selectedPayment.createdAt, "d MMM yyyy, h:mm a")}
                </p>
                {selectedPayment.paidAt && (
                  <p>
                    <span className="text-muted-foreground">Paid At:</span>{" "}
                    {formatDate(selectedPayment.paidAt, "d MMM yyyy, h:mm a")}
                  </p>
                )}
                {selectedPayment.failureReason && (
                  <p className="font-medium text-destructive">
                    Failure Reason: {selectedPayment.failureReason}
                  </p>
                )}
              </div>

              {selectedPayment.gift && (
                <div className="space-y-1 rounded-xl border border-border p-3">
                  <p className="font-semibold text-foreground">Linked Gift</p>
                  <p>
                    Type: {selectedPayment.gift.type} · Giver:{" "}
                    {selectedPayment.gift.giverName || "Anonymous"}
                  </p>
                  {selectedPayment.gift.event && (
                    <div className="flex items-center justify-between pt-1">
                      <span>{selectedPayment.gift.event.name}</span>
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/e/${selectedPayment.gift.event.slug}`}
                          target="_blank"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Open Event
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedPayment.order && (
                <div className="space-y-1 rounded-xl border border-border p-3">
                  <p className="font-semibold text-foreground">
                    Linked Order ({selectedPayment.order.number})
                  </p>
                  <p>
                    Recipient: {selectedPayment.order.recipientName} · Status:{" "}
                    {selectedPayment.order.status}
                  </p>
                  <p className="text-muted-foreground">
                    Delivery:{" "}
                    <Money amountKobo={selectedPayment.order.deliveryFeeKobo} /> ·
                    VAT: <Money amountKobo={selectedPayment.order.vatKobo} />
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
