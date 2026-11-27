"use client";

import * as React from "react";
import { CheckCircle2, FilterX, Search, ShieldAlert } from "lucide-react";
import { Money } from "@/components/shared/Money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLedgerReport } from "../hooks/useAdmin";
import {
  buildDailyVolumeSeries,
  DailyVolumeChart,
  VolumeBreakdownCard,
} from "./FinanceCharts";
import { LedgerTable } from "./LedgerTable";

const DIRECTION_FILTERS = [
  { value: "ALL", label: "All Postings", dotClass: "bg-foreground/40" },
  { value: "CREDIT", label: "Credits", dotClass: "bg-emerald-500" },
  { value: "DEBIT", label: "Debits", dotClass: "bg-primary" },
] as const;

const DATE_FILTERS = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "7D", label: "Last 7 Days", days: 7 },
  { value: "30D", label: "Last 30 Days", days: 30 },
  { value: "90D", label: "Last 90 Days", days: 90 },
] as const;

const ACCOUNT_CATEGORIES = [
  { value: "ALL", label: "All Account Types" },
  { value: "OWNER_PAYABLE", label: "User Wallets (OWNER_PAYABLE)" },
  { value: "WALLET_RESERVE", label: "Wallet Reserves (TC/C)" },
  { value: "PLATFORM_REVENUE", label: "Platform Revenue" },
  { value: "PROVIDER_CLEARING", label: "Provider Clearing" },
  { value: "POOL_ESCROW", label: "Pool Escrow" },
  { value: "VENDOR_PAYABLE", label: "Vendor Payable" },
  { value: "OTHER", label: "Other Accounts" },
] as const;

function getAccountCategory(accountCode?: string | null): string {
  const code = accountCode ?? "";
  if (code.startsWith("OWNER_PAYABLE")) return "OWNER_PAYABLE";
  if (code.startsWith("WALLET_RESERVE")) return "WALLET_RESERVE";
  if (code.startsWith("PLATFORM_REVENUE")) return "PLATFORM_REVENUE";
  if (code.startsWith("PROVIDER_CLEARING")) return "PROVIDER_CLEARING";
  if (code.startsWith("POOL_ESCROW")) return "POOL_ESCROW";
  if (code.startsWith("VENDOR_PAYABLE")) return "VENDOR_PAYABLE";
  return "OTHER";
}

export function LedgerManagementView() {
  const reportQuery = useAdminLedgerReport();
  const [search, setSearch] = React.useState("");
  const [directionFilter, setDirectionFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [accountFilter, setAccountFilter] = React.useState<string>("ALL");
  const [dateFilter, setDateFilter] = React.useState<string>("ALL");

  const entries = reportQuery.data?.entries ?? [];
  const trialBalance = reportQuery.data?.trialBalance;

  const accountCodes = React.useMemo(() => {
    const codes = new Set<string>();
    for (const e of entries) {
      if (!e.accountCode) continue;
      if (categoryFilter === "ALL" || getAccountCategory(e.accountCode) === categoryFilter) {
        codes.add(e.accountCode);
      }
    }
    return ["ALL", ...Array.from(codes).sort()];
  }, [entries, categoryFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    directionFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    accountFilter !== "ALL" ||
    dateFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setDirectionFilter("ALL");
    setCategoryFilter("ALL");
    setAccountFilter("ALL");
    setDateFilter("ALL");
  };

  const filteredWithoutDirection = React.useMemo(() => {
    const now = Date.now();
    const selectedDateOption = DATE_FILTERS.find((d) => d.value === dateFilter);
    const cutoffMs =
      selectedDateOption?.days != null
        ? selectedDateOption.value === "TODAY"
          ? new Date().setHours(0, 0, 0, 0)
          : now - selectedDateOption.days * 24 * 60 * 60 * 1000
        : null;
    const q = search.trim().toLowerCase();

    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        (e.reference?.toLowerCase().includes(q) ?? false) ||
        (e.description?.toLowerCase().includes(q) ?? false) ||
        (e.accountCode?.toLowerCase().includes(q) ?? false);
      const matchesCategory =
        categoryFilter === "ALL" ||
        getAccountCategory(e.accountCode) === categoryFilter;
      const matchesAcct =
        accountFilter === "ALL" || e.accountCode === accountFilter;
      const matchesDate =
        cutoffMs == null || new Date(e.createdAt).getTime() >= cutoffMs;

      return matchesSearch && matchesCategory && matchesAcct && matchesDate;
    });
  }, [entries, search, categoryFilter, accountFilter, dateFilter]);

  const directionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      ALL: filteredWithoutDirection.length,
    };
    for (const e of filteredWithoutDirection) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, [filteredWithoutDirection]);

  const filteredEntries = React.useMemo(
    () =>
      directionFilter === "ALL"
        ? filteredWithoutDirection
        : filteredWithoutDirection.filter((e) => e.type === directionFilter),
    [filteredWithoutDirection, directionFilter]
  );

  const creditEntries = filteredEntries.filter((e) => e.type === "CREDIT");
  const debitEntries = filteredEntries.filter((e) => e.type === "DEBIT");
  const creditSumKobo = creditEntries.reduce((s, e) => s + e.amountKobo, 0);
  const debitSumKobo = debitEntries.reduce((s, e) => s + e.amountKobo, 0);

  const chartDays = dateFilter === "30D" || dateFilter === "90D" ? 30 : 7;
  const chartSource =
    directionFilter === "DEBIT" ? debitEntries : creditEntries;
  const dailySeries = buildDailyVolumeSeries(
    chartSource.map((e) => ({ createdAt: e.createdAt, amountKobo: e.amountKobo })),
    chartDays
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Double-Entry Ledger & Trial Balance
          </h2>
          <p className="text-xs text-muted-foreground">
            Verify balanced DEBIT/CREDIT postings, filter by account type or code, and trace transaction references.
          </p>
        </div>
        {trialBalance && (
          <Badge
            variant={trialBalance.isBalanced ? "success" : "destructive"}
            className="gap-1.5 self-start text-xs sm:self-auto"
          >
            {trialBalance.isBalanced ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            {trialBalance.isBalanced ? "Trial Balance: Balanced" : "Imbalance Detected"}
          </Badge>
        )}
      </div>

      {/* Trial Balance & Filtered Ledger KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Debits (All Time)
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              <Money amountKobo={trialBalance?.totalDebit ?? debitSumKobo} />
            </p>
            {hasActiveFilters && (
              <p className="text-[11px] text-muted-foreground">
                Filtered: <Money amountKobo={debitSumKobo} /> ({debitEntries.length})
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Credits (All Time)
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              <Money amountKobo={trialBalance?.totalCredit ?? creditSumKobo} />
            </p>
            {hasActiveFilters && (
              <p className="text-[11px] text-muted-foreground">
                Filtered: <Money amountKobo={creditSumKobo} /> ({creditEntries.length})
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Ledger Drift
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money
                amountKobo={Math.abs(
                  (trialBalance?.totalCredit ?? creditSumKobo) -
                    (trialBalance?.totalDebit ?? debitSumKobo)
                )}
              />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {trialBalance?.isBalanced ? "Zero discrepancy" : "Check unbalanced tx"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {hasActiveFilters ? "Filtered Postings" : "Recent Postings"}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {filteredEntries.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {hasActiveFilters ? `of ${entries.length} loaded` : "Latest ledger entries"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts — driven by active filters */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyVolumeChart
          title={
            directionFilter === "DEBIT"
              ? `Debit Postings (Last ${chartDays} Days)`
              : `Credit Postings (Last ${chartDays} Days)`
          }
          subtitle={
            hasActiveFilters ? "Filtered ledger slice" : "Recent ledger credits"
          }
          barColorClass={
            directionFilter === "DEBIT" ? "bg-primary" : "bg-emerald-600"
          }
          points={dailySeries}
        />
        <VolumeBreakdownCard
          title="Postings by Direction"
          segments={[
            {
              label: "CREDIT",
              count: creditEntries.length,
              amountKobo: creditSumKobo,
              colorClass: "bg-emerald-600",
            },
            {
              label: "DEBIT",
              count: debitEntries.length,
              amountKobo: debitSumKobo,
              colorClass: "bg-primary",
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
              placeholder="Search reference, description, or account code..."
              className="h-9 pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setAccountFilter("ALL");
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 font-mono text-xs">
                <SelectValue placeholder="Specific Account" />
              </SelectTrigger>
              <SelectContent>
                {accountCodes.map((code) => (
                  <SelectItem key={code} value={code} className="font-mono text-xs">
                    {code === "ALL" ? "All Account Codes" : code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 lg:col-span-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 flex-1 text-xs">
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
          {DIRECTION_FILTERS.map((dir) => {
            const count = directionCounts[dir.value] ?? 0;
            const active = directionFilter === dir.value;
            return (
              <button
                key={dir.value}
                type="button"
                onClick={() => setDirectionFilter(dir.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dir.dotClass}`} />
                <span>{dir.label}</span>
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

      {reportQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <LedgerTable entries={filteredEntries} />
      )}
    </div>
  );
}
