"use client";

import * as React from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Money } from "@/components/shared/Money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLedgerReport } from "../hooks/useAdmin";
import {
  buildDailyVolumeSeries,
  DailyVolumeChart,
  VolumeBreakdownCard,
} from "./FinanceCharts";
import { LedgerTable } from "./LedgerTable";

const DIRECTION_FILTERS = ["ALL", "CREDIT", "DEBIT", "PAYOUT"] as const;

export function LedgerManagementView() {
  const reportQuery = useAdminLedgerReport();
  const [directionFilter, setDirectionFilter] = React.useState<string>("ALL");
  const [accountFilter, setAccountFilter] = React.useState<string>("ALL");

  const entries = reportQuery.data?.entries ?? [];
  const trialBalance = reportQuery.data?.trialBalance;

  const accountCodes = React.useMemo(() => {
    const codes = new Set<string>();
    for (const e of entries) {
      if (e.accountCode) codes.add(e.accountCode);
    }
    return ["ALL", ...Array.from(codes).sort()];
  }, [entries]);

  const filteredEntries = entries.filter((e) => {
    const matchesDir =
      directionFilter === "ALL" || e.type === directionFilter;
    const matchesAcct =
      accountFilter === "ALL" || e.accountCode === accountFilter;
    return matchesDir && matchesAcct;
  });

  const creditEntries = entries.filter((e) => e.type === "CREDIT");
  const debitEntries = entries.filter((e) => e.type === "DEBIT");
  const creditSumKobo = creditEntries.reduce((s, e) => s + e.amountKobo, 0);
  const debitSumKobo = debitEntries.reduce((s, e) => s + e.amountKobo, 0);

  const dailySeries = buildDailyVolumeSeries(
    creditEntries.map((e) => ({ createdAt: e.createdAt, amountKobo: e.amountKobo })),
    7
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Double-Entry Ledger & Trial Balance
          </h2>
          <p className="text-xs text-muted-foreground">
            Verify balanced DEBIT/CREDIT postings, filter by ledger account code, and trace transaction references.
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

      {/* Trial Balance & Ledger KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Debits (All Time)
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              <Money amountKobo={trialBalance?.totalDebit ?? debitSumKobo} />
            </p>
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
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Recent Postings
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {entries.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyVolumeChart
          title="7-Day Credit Postings"
          subtitle="Recent ledger credits"
          points={dailySeries}
        />
        <VolumeBreakdownCard
          title="Recent Postings by Direction"
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

      {/* Direction & Account Code Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Direction:
          </span>
          {DIRECTION_FILTERS.map((dir) => (
            <Button
              key={dir}
              type="button"
              size="sm"
              variant={directionFilter === dir ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setDirectionFilter(dir)}
            >
              {dir}
            </Button>
          ))}
        </div>

        {accountCodes.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Account:
            </span>
            {accountCodes.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={accountFilter === code ? "secondary" : "ghost"}
                className="h-7 font-mono text-[11px]"
                onClick={() => setAccountFilter(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        )}
      </div>

      {reportQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <LedgerTable entries={filteredEntries} />
      )}
    </div>
  );
}
