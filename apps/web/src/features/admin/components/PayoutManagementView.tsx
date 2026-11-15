"use client";

import * as React from "react";
import { Banknote, Eye, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
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
import { useAdminPayouts, useRetryAdminPayout } from "../hooks/useAdmin";
import type { AdminPayoutDetail } from "../types";
import {
  buildDailyVolumeSeries,
  DailyVolumeChart,
  VolumeBreakdownCard,
} from "./FinanceCharts";

const STATUS_FILTERS = ["ALL", "SENT", "PENDING", "FAILED"] as const;
const PAGE_SIZE = 10;

export function PayoutManagementView() {
  const payoutsQuery = useAdminPayouts();
  const retryPayoutMutation = useRetryAdminPayout();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [selectedPayout, setSelectedPayout] =
    React.useState<AdminPayoutDetail | null>(null);

  const payouts = payoutsQuery.data ?? [];

  const filtered = payouts.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.eventName.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      (p.ownerEmail?.toLowerCase().includes(q) ?? false) ||
      p.bankName.toLowerCase().includes(q) ||
      p.accountNumberLast4.toLowerCase().includes(q) ||
      (p.reference?.toLowerCase().includes(q) ?? false) ||
      p.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const sentPayouts = payouts.filter((p) => p.status === "SENT");
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const failedPayouts = payouts.filter((p) => p.status === "FAILED");

  const sentTotalKobo = sentPayouts.reduce((s, p) => s + p.amountKobo, 0);
  const pendingTotalKobo = pendingPayouts.reduce((s, p) => s + p.amountKobo, 0);
  const failedTotalKobo = failedPayouts.reduce((s, p) => s + p.amountKobo, 0);

  const dailySeries = buildDailyVolumeSeries(
    sentPayouts.map((p) => ({ createdAt: p.createdAt, amountKobo: p.amountKobo })),
    7
  );

  const handleRetryPayout = async (payoutId: string) => {
    try {
      await retryPayoutMutation.mutateAsync(payoutId);
      toast.success("Payout retry initiated.");
      if (selectedPayout?.id === payoutId) {
        setSelectedPayout(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to retry payout"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Payouts & Beneficiary Disbursements
          </h2>
          <p className="text-xs text-muted-foreground">
            Track host bank withdrawals, inspect transfer references and failure reasons, and retry failed disbursements.
          </p>
        </div>
        <Badge variant="outline" className="self-start font-mono text-xs sm:self-auto">
          {payouts.length} Payouts
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Disbursed
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              <Money amountKobo={sentTotalKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {sentPayouts.length} completed transfers
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Pending Queue
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-700 dark:text-amber-400">
              <Money amountKobo={pendingTotalKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pendingPayouts.length} awaiting settlement
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Failed Disbursements
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-destructive">
              <Money amountKobo={failedTotalKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {failedPayouts.length} needing retry
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Payout Volume
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money amountKobo={sentTotalKobo + pendingTotalKobo + failedTotalKobo} />
            </p>
            <p className="text-[11px] text-muted-foreground">
              Across {payouts.length} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyVolumeChart
          title="7-Day Disbursed Payouts"
          subtitle="Sent transfers"
          points={dailySeries}
          barColorClass="bg-emerald-600"
        />
        <VolumeBreakdownCard
          title="Payout Volume by Status"
          segments={[
            {
              label: "Sent",
              count: sentPayouts.length,
              amountKobo: sentTotalKobo,
              colorClass: "bg-emerald-600",
            },
            {
              label: "Pending",
              count: pendingPayouts.length,
              amountKobo: pendingTotalKobo,
              colorClass: "bg-amber-500",
            },
            {
              label: "Failed",
              count: failedPayouts.length,
              amountKobo: failedTotalKobo,
              colorClass: "bg-destructive",
            },
          ]}
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by beneficiary, bank, event, or reference..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <Button
              key={st}
              type="button"
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === "ALL" ? "All" : st}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {payoutsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-8 w-8 text-muted-foreground" />}
          title="No matching payouts"
          description="Try adjusting your search or status filter."
        />
      ) : (
        <div className="space-y-3">
          {paginated.map((payout) => (
            <Card key={payout.id} className="border border-border/80 bg-card">
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={payout.status as StatusKind} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(payout.createdAt, "d MMM yyyy, h:mm a")}
                    </span>
                    {payout.reference && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Ref: {payout.reference}
                      </span>
                    )}
                  </div>
                  <p className="font-heading text-base font-semibold text-foreground">
                    {payout.eventName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Beneficiary: {payout.ownerName}
                    {payout.ownerEmail ? ` (${payout.ownerEmail})` : ""} •{" "}
                    {payout.bankName} (•••• {payout.accountNumberLast4})
                  </p>
                  {payout.failureReason && (
                    <p className="text-[11px] font-medium text-destructive">
                      Failure: {payout.failureReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Money
                    amountKobo={payout.amountKobo}
                    className="mr-2 font-heading text-lg font-bold text-primary"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPayout(payout)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Details
                  </Button>
                  {payout.status === "FAILED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRetryPayout(payout.id)}
                      disabled={retryPayoutMutation.isPending}
                      className="gap-1.5"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Retry Payout
                    </Button>
                  )}
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
        itemName="payouts"
      />

      {/* Payout Trace Modal */}
      <Dialog
        open={Boolean(selectedPayout)}
        onOpenChange={(open) => {
          if (!open) setSelectedPayout(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Payout Details</span>
              {selectedPayout && (
                <StatusBadge status={selectedPayout.status as StatusKind} />
              )}
            </DialogTitle>
            <DialogDescription>
              Disbursement audit trail for {selectedPayout?.eventName}.
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-heading text-lg font-bold text-primary">
                    <Money amountKobo={selectedPayout.amountKobo} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attempts</p>
                  <p className="font-semibold text-foreground">
                    {selectedPayout.attempts ?? 1}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-xl border border-border p-3">
                <p>
                  <span className="text-muted-foreground">Payout ID:</span>{" "}
                  <span className="font-mono">{selectedPayout.id}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Provider Ref:</span>{" "}
                  <span className="font-mono">{selectedPayout.reference || "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Beneficiary:</span>{" "}
                  {selectedPayout.ownerName}
                  {selectedPayout.ownerEmail ? ` (${selectedPayout.ownerEmail})` : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Bank Account:</span>{" "}
                  {selectedPayout.bankName} ·{" "}
                  {selectedPayout.accountName
                    ? `${selectedPayout.accountName} · `
                    : ""}
                  •••• {selectedPayout.accountNumberLast4}
                </p>
                <p>
                  <span className="text-muted-foreground">Queued:</span>{" "}
                  {formatDate(selectedPayout.createdAt, "d MMM yyyy, h:mm a")}
                </p>
                {selectedPayout.completedAt && (
                  <p>
                    <span className="text-muted-foreground">Completed:</span>{" "}
                    {formatDate(selectedPayout.completedAt, "d MMM yyyy, h:mm a")}
                  </p>
                )}
                {selectedPayout.failureReason && (
                  <p className="font-medium text-destructive">
                    Failure Reason: {selectedPayout.failureReason}
                  </p>
                )}
              </div>

              {selectedPayout.status === "FAILED" && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRetryPayout(selectedPayout.id)}
                    disabled={retryPayoutMutation.isPending}
                    className="gap-1.5"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Retry Payout Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
