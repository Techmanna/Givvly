"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  ExternalLink,
  Eye,
  FilterX,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAdminPayments } from "../hooks/useAdmin";
import type { AdminPaymentRecord } from "../types";
import {
  buildDailyVolumeSeries,
  DailyVolumeChart,
  VolumeBreakdownCard,
} from "./FinanceCharts";

const STATUS_FILTERS = [
  { value: "ALL", label: "All", dotClass: "bg-foreground/40" },
  { value: "SUCCESS", label: "Settled", dotClass: "bg-emerald-500" },
  { value: "REFUNDED", label: "Refunded", dotClass: "bg-amber-500" },
  { value: "INITIATED", label: "Initiated", dotClass: "bg-slate-400" },
  { value: "FAILED", label: "Failed", dotClass: "bg-destructive" },
  { value: "ABANDONED", label: "Abandoned", dotClass: "bg-muted-foreground/60" },
] as const;
const DATE_FILTERS = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "7D", label: "Last 7 Days", days: 7 },
  { value: "30D", label: "Last 30 Days", days: 30 },
  { value: "90D", label: "Last 90 Days", days: 90 },
] as const;
const PAGE_SIZE = 10;

function normalizeChannel(channel?: string | null): string {
  const trimmed = channel?.trim();
  return trimmed ? trimmed.toLowerCase() : "unspecified";
}

function formatChannelLabel(channel?: string | null): string {
  const normalized = normalizeChannel(channel);
  if (normalized === "unspecified") return "Unspecified (Uncompleted)";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PaymentManagementView() {
  const paymentsQuery = useAdminPayments();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = React.useState<string>("ALL");
  const [providerFilter, setProviderFilter] = React.useState<string>("ALL");
  const [channelFilter, setChannelFilter] = React.useState<string>("ALL");
  const [dateFilter, setDateFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [selectedPayment, setSelectedPayment] =
    React.useState<AdminPaymentRecord | null>(null);

  const payments = paymentsQuery.data ?? [];

  const providerOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) {
      if (p.provider) set.add(p.provider.toUpperCase());
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [payments]);

  const channelOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) {
      set.add(normalizeChannel(p.channel));
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [payments]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    sourceFilter !== "ALL" ||
    providerFilter !== "ALL" ||
    channelFilter !== "ALL" ||
    dateFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setProviderFilter("ALL");
    setChannelFilter("ALL");
    setDateFilter("ALL");
    setPage(1);
  };

  const filteredWithoutStatus = React.useMemo(() => {
    const now = Date.now();
    const selectedDateOption = DATE_FILTERS.find((d) => d.value === dateFilter);
    const cutoffMs =
      selectedDateOption?.days != null
        ? selectedDateOption.value === "TODAY"
          ? new Date().setHours(0, 0, 0, 0)
          : now - selectedDateOption.days * 24 * 60 * 60 * 1000
        : null;

    const q = search.trim().toLowerCase();

    return payments.filter((pay) => {
      const matchesSearch =
        !q ||
        pay.reference.toLowerCase().includes(q) ||
        (pay.payerEmail?.toLowerCase().includes(q) ?? false) ||
        (pay.provider?.toLowerCase().includes(q) ?? false) ||
        (pay.channel?.toLowerCase().includes(q) ?? false) ||
        (pay.order?.number?.toLowerCase().includes(q) ?? false) ||
        (pay.order?.recipientName?.toLowerCase().includes(q) ?? false) ||
        (pay.gift?.event?.name?.toLowerCase().includes(q) ?? false) ||
        (pay.gift?.event?.slug?.toLowerCase().includes(q) ?? false);
      const matchesSource =
        sourceFilter === "ALL" ||
        (sourceFilter === "GIFT" && Boolean(pay.gift)) ||
        (sourceFilter === "ORDER" && Boolean(pay.order)) ||
        (sourceFilter === "DIRECT" && !pay.gift && !pay.order);
      const matchesProvider =
        providerFilter === "ALL" ||
        (pay.provider?.toUpperCase() ?? "") === providerFilter;
      const matchesChannel =
        channelFilter === "ALL" || normalizeChannel(pay.channel) === channelFilter;
      const matchesDate =
        cutoffMs == null || new Date(pay.createdAt).getTime() >= cutoffMs;

      return (
        matchesSearch &&
        matchesSource &&
        matchesProvider &&
        matchesChannel &&
        matchesDate
      );
    });
  }, [
    payments,
    search,
    sourceFilter,
    providerFilter,
    channelFilter,
    dateFilter,
  ]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: filteredWithoutStatus.length };
    for (const p of filteredWithoutStatus) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [filteredWithoutStatus]);

  const filtered = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? filteredWithoutStatus
        : filteredWithoutStatus.filter((pay) => pay.status === statusFilter),
    [filteredWithoutStatus, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Truth-first financial metrics computed strictly from the filtered slice:
  // Initiated, Failed, and Abandoned attempts NEVER count as settled inflow.
  const settled = filtered.filter((p) => p.status === "SUCCESS");
  const refunded = filtered.filter((p) => p.status === "REFUNDED");
  const unsettled = filtered.filter(
    (p) => p.status !== "SUCCESS" && p.status !== "REFUNDED"
  );

  const grossSettledKobo = settled.reduce((s, p) => s + p.totalKobo, 0);
  const totalServiceFeesKobo = settled.reduce(
    (s, p) => s + p.serviceFeeKobo,
    0
  );
  const totalProviderFeesKobo = settled.reduce(
    (s, p) => s + (p.providerFeeKobo ?? 0),
    0
  );
  const refundedKobo = refunded.reduce((s, p) => s + p.totalKobo, 0);
  const unsettledAttemptedKobo = unsettled.reduce((s, p) => s + p.totalKobo, 0);
  const successRate =
    filtered.length > 0
      ? Math.round((settled.length / filtered.length) * 100)
      : 0;

  const isViewingNonSettledStatus =
    statusFilter === "INITIATED" ||
    statusFilter === "FAILED" ||
    statusFilter === "ABANDONED" ||
    statusFilter === "REFUNDED";

  const chartSourceRecords = isViewingNonSettledStatus ? filtered : settled;
  const chartDays = dateFilter === "30D" ? 30 : dateFilter === "90D" ? 30 : 7;

  const dailySeries = buildDailyVolumeSeries(
    chartSourceRecords.map((p) => ({
      createdAt: p.createdAt,
      amountKobo: p.totalKobo,
    })),
    chartDays
  );

  const chartTotalKobo = chartSourceRecords.reduce((s, p) => s + p.totalKobo, 0);
  const giftTotalKobo = chartSourceRecords
    .filter((p) => Boolean(p.gift))
    .reduce((s, p) => s + p.totalKobo, 0);
  const orderTotalKobo = chartSourceRecords
    .filter((p) => Boolean(p.order))
    .reduce((s, p) => s + p.totalKobo, 0);
  const otherTotalKobo = Math.max(
    0,
    chartTotalKobo - giftTotalKobo - orderTotalKobo
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Payments & Inflow Traceability
          </h2>
          <p className="text-xs text-muted-foreground">
            Only verified <span className="font-medium text-foreground">SUCCESS</span> settlements count toward inflow &amp; fee totals. Uncompleted, failed, and refunded attempts are isolated and never inflated into revenue.
          </p>
        </div>
        <Badge variant="outline" className="self-start font-mono text-xs sm:self-auto">
          {hasActiveFilters
            ? `${filtered.length} of ${payments.length} Records`
            : `${payments.length} Payment Records`}
        </Badge>
      </div>

      {/* KPIs — driven by active filters, truth-only for settled money */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              True Settled Inflow
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money amountKobo={grossSettledKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {settled.length} settled{refunded.length > 0 ? ` · ${refunded.length} refunded (` : ""}
              {refunded.length > 0 ? <Money amountKobo={refundedKobo} /> : null}
              {refunded.length > 0 ? ")" : ""}
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
              {totalProviderFeesKobo > 0 ? (
                <>
                  {" · Provider fees: "}
                  <Money amountKobo={totalProviderFeesKobo} />
                </>
              ) : null}
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
              {settled.length} of {filtered.length} filtered attempts
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Unsettled / Failed
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-700 dark:text-amber-400">
              {unsettled.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <Money amountKobo={unsettledAttemptedKobo} /> never received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts — driven by active filters */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyVolumeChart
          title={
            isViewingNonSettledStatus
              ? `${
                  STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ??
                  statusFilter
                } Attempts (${chartDays}D)`
              : `Settled Inflow (Last ${chartDays} Days)`
          }
          subtitle={
            isViewingNonSettledStatus
              ? statusFilter === "REFUNDED"
                ? "Refunded payments only"
                : "Not settled — attempted volume"
              : "Verified settlements only"
          }
          barColorClass={
            statusFilter === "FAILED" || statusFilter === "ABANDONED"
              ? "bg-destructive/80"
              : isViewingNonSettledStatus
                ? "bg-amber-500"
                : "bg-primary"
          }
          points={dailySeries}
        />
        <VolumeBreakdownCard
          title={
            isViewingNonSettledStatus
              ? `${
                  STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ??
                  statusFilter
                } Volume by Source`
              : "Settled Volume by Source"
          }
          segments={[
            {
              label: "Celebration Gifts",
              count: chartSourceRecords.filter((p) => Boolean(p.gift)).length,
              amountKobo: giftTotalKobo,
              colorClass: "bg-primary",
            },
            {
              label: "Gift Box & Store Orders",
              count: chartSourceRecords.filter((p) => Boolean(p.order)).length,
              amountKobo: orderTotalKobo,
              colorClass: "bg-emerald-600",
            },
            {
              label: "Wallet / Direct",
              count: chartSourceRecords.filter((p) => !p.gift && !p.order).length,
              amountKobo: otherTotalKobo,
              colorClass: "bg-amber-500",
            },
          ]}
        />
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference, email, order #, event..."
              className="h-9 pl-9 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              value={sourceFilter}
              onValueChange={(val) => {
                setSourceFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="GIFT">Celebration Gifts</SelectItem>
                <SelectItem value="ORDER">Store &amp; Gift Orders</SelectItem>
                <SelectItem value="DIRECT">Wallet / Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={dateFilter}
              onValueChange={(val) => {
                setDateFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={providerFilter}
              onValueChange={(val) => {
                setProviderFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov === "ALL" ? "All Providers" : prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 lg:col-span-2">
            <Select
              value={channelFilter}
              onValueChange={(val) => {
                setChannelFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((ch) => (
                  <SelectItem key={ch} value={ch}>
                    {ch === "ALL" ? "All Channels" : formatChannelLabel(ch)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                title="Reset all filters"
                onClick={resetFilters}
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
          {STATUS_FILTERS.map((st) => {
            const count = statusCounts[st.value] ?? 0;
            const active = statusFilter === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => {
                  setStatusFilter(st.value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${st.dotClass}`} />
                <span>{st.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
                    Channel: {formatChannelLabel(pay.channel)} ({pay.provider || "PAYSTACK"})
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
                      {pay.status === "SUCCESS"
                        ? "Settled"
                        : pay.status === "REFUNDED"
                          ? "Refunded"
                          : pay.status === "INITIATED"
                            ? "Initiated (Unpaid)"
                            : "Attempted (Unpaid)"}
                    </span>
                    <p
                      className={`font-heading text-base font-bold ${
                        pay.status === "SUCCESS"
                          ? "text-primary"
                          : pay.status === "REFUNDED"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    >
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
