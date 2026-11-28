"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Filter,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import { useAdminFinancePnl } from "../hooks/useAdmin";
import { AdminDateRangePicker } from "./AdminDateRangePicker";

const WINDOW_OPTIONS: Array<{
  key: string;
  label: string;
  days?: number;
}> = [
  { key: "7D", label: "Last 7 Days", days: 7 },
  { key: "30D", label: "Last 30 Days", days: 30 },
  { key: "90D", label: "Last 90 Days", days: 90 },
  { key: "ALL", label: "All Time", days: undefined },
  { key: "CUSTOM", label: "Custom Range" },
];

export function FinancePnlView() {
  const [windowKey, setWindowKey] = useState<string>("30D");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [projectedMonthlyOrders, setProjectedMonthlyOrders] = useState("50");
  const [cacPerOrderNaira, setCacPerOrderNaira] = useState("1500");

  const activeWindow = WINDOW_OPTIONS.find((w) => w.key === windowKey);
  const pnlQuery = useAdminFinancePnl(
    windowKey === "CUSTOM"
      ? {
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }
      : { days: activeWindow?.days }
  );

  if (pnlQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (pnlQuery.isError || !pnlQuery.data) {
    return (
      <ErrorState
        title="Could not load P&L analytics"
        onRetry={() => pnlQuery.refetch()}
      />
    );
  }

  const data = pnlQuery.data;
  const s = data.summary;

  // Interactive "Project Selling More" calculations
  const targetOrders = Math.max(0, Number(projectedMonthlyOrders) || 0);
  const cacKobo = Math.max(0, Math.round((Number(cacPerOrderNaira) || 0) * 100));
  const avgOrderRev = s.avgOrderRevenueKobo;
  const avgNetBeforeAds = s.avgOrderNetProfitKobo;
  const avgCogs =
    data.recognizedOrderCount > 0
      ? Math.round(s.vendorCostKobo / data.recognizedOrderCount)
      : 0;
  const avgGatewayFee =
    data.recognizedOrderCount > 0
      ? Math.round(s.gatewayFeesKobo / data.recognizedOrderCount)
      : 0;

  const projRevenueKobo = targetOrders * avgOrderRev;
  const projCogsKobo = targetOrders * avgCogs;
  const projGatewayFeeKobo = targetOrders * avgGatewayFee;
  const projMarketingKobo = targetOrders * cacKobo;
  const projNetProfitKobo = targetOrders * (avgNetBeforeAds - cacKobo);

  return (
    <div className="space-y-6">
      {/* Window Selector + Intelligent Filter Banner */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {WINDOW_OPTIONS.map((opt) => {
              const active = windowKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setWindowKey(opt.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {data.recognizedOrderCount} successful order
              {data.recognizedOrderCount === 1 ? "" : "s"} included
            </span>
          </div>
        </div>

        {windowKey === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-card p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Select Date Range:
            </span>
            <AdminDateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              onChange={({ startDate, endDate }) => {
                setCustomStartDate(startDate);
                setCustomEndDate(endDate);
              }}
            />
          </div>
        )}
      </div>

      {/* Intelligent Exclusions Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Intelligent P&amp;L Filter:</strong>{" "}
            Only paid, non-refunded orders (<code className="font-mono">CONFIRMED / PACKED / SHIPPED / DELIVERED</code> with <code className="font-mono">SUCCESS</code> payment) are recognized.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline">
            Excluded: {data.excluded.total}
          </Badge>
          {data.excluded.refunded > 0 && (
            <Badge variant="secondary">Refunded: {data.excluded.refunded}</Badge>
          )}
          {data.excluded.cancelled > 0 && (
            <Badge variant="secondary">Cancelled: {data.excluded.cancelled}</Badge>
          )}
          {data.excluded.disputed > 0 && (
            <Badge variant="secondary">Disputed: {data.excluded.disputed}</Badge>
          )}
          {data.excluded.unpaidOrPending > 0 && (
            <Badge variant="secondary">
              Unpaid/Pending: {data.excluded.unpaidOrPending}
            </Badge>
          )}
        </div>
      </div>

      {data.missingCostItemCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 ">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {data.missingCostItemCount} order line item
            {data.missingCostItemCount === 1 ? "" : "s"} had no{" "}
            <code className="font-mono">costPriceKobo</code> set (counted as ₦0 vendor cost). Add buying prices on products for exact COGS.
          </span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Merchandise Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              <Money amountKobo={s.merchandiseRevenueKobo} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Total Collected (incl. delivery &amp; VAT):{" "}
              <strong className="text-foreground">
                <Money amountKobo={s.totalCollectedKobo} />
              </strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Vendor Cost (COGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              <Money amountKobo={s.vendorCostKobo} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Gateway Fees:{" "}
              <strong className="text-foreground">
                <Money amountKobo={s.gatewayFeesKobo} />
              </strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Gross Profit &amp; Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground flex items-center gap-1.5">
              <Money amountKobo={s.grossProfitKobo} />
              <span className="text-xs font-semibold text-primary">
                ({s.grossMarginPct.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Avg Order Value:{" "}
              <strong className="text-foreground">
                <Money amountKobo={s.avgOrderRevenueKobo} />
              </strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Net Profit (After Gateway Fees)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-heading text-2xl font-bold flex items-center gap-1.5 ${
                s.netProfitKobo >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {s.netProfitKobo >= 0 ? (
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-5 w-5" aria-hidden="true" />
              )}
              <Money amountKobo={s.netProfitKobo} />
              <span className="text-xs font-semibold">
                ({s.netMarginPct.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Avg Net / Order:{" "}
              <strong className="text-foreground">
                <Money amountKobo={s.avgOrderNetProfitKobo} />
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Flow & Growth Projection */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Financial Flow Waterfall */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Financial Flow (P&amp;L Statement)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Merchandise Revenue</span>
              <span className="font-semibold text-foreground">
                <Money amountKobo={s.merchandiseRevenueKobo} />
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">− Vendor Cost (COGS)</span>
              <span className="font-semibold text-destructive">
                −<Money amountKobo={s.vendorCostKobo} />
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="font-medium text-foreground">= Gross Profit</span>
              <span className="font-bold text-foreground">
                <Money amountKobo={s.grossProfitKobo} /> ({s.grossMarginPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">
                − Payment Gateway Fees
              </span>
              <span className="font-semibold text-destructive">
                −<Money amountKobo={s.gatewayFeesKobo} />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <span>= Net Contribution (Before Ads &amp; Ops)</span>
              <span>
                <Money amountKobo={s.netProfitKobo} /> ({s.netMarginPct.toFixed(1)}%)
              </span>
            </div>
            <div className="pt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-lg border border-border/60 p-2">
                <span className="block">Delivery Collected</span>
                <strong className="text-foreground">
                  <Money amountKobo={s.deliveryCollectedKobo} />
                </strong>
              </div>
              <div className="rounded-lg border border-border/60 p-2">
                <span className="block">Gift Wrapping</span>
                <strong className="text-foreground">
                  <Money amountKobo={s.packagingCollectedKobo} />
                </strong>
              </div>
              <div className="rounded-lg border border-border/60 p-2">
                <span className="block">VAT Collected</span>
                <strong className="text-foreground">
                  <Money amountKobo={s.vatCollectedKobo} />
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Sales & Profit Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
              Project Selling More (Monthly Simulator)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="proj-orders" className="text-xs">
                  Target Monthly Orders
                </Label>
                <Input
                  id="proj-orders"
                  type="number"
                  min="1"
                  max="100000"
                  value={projectedMonthlyOrders}
                  onChange={(e) => setProjectedMonthlyOrders(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="proj-cac" className="text-xs">
                  Est. Marketing / CAC per Order (₦)
                </Label>
                <Input
                  id="proj-cac"
                  type="number"
                  min="0"
                  value={cacPerOrderNaira}
                  onChange={(e) => setCacPerOrderNaira(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {data.recognizedOrderCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                No successful orders yet in this window to base projections on. Once orders are confirmed, projections will auto-scale from your real average order value and margin.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Projected Revenue</span>
                  <span className="font-semibold">
                    <Money amountKobo={projRevenueKobo} />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">− Projected Vendor Cost</span>
                  <span className="text-destructive">
                    −<Money amountKobo={projCogsKobo} />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">− Projected Gateway Fees</span>
                  <span className="text-destructive">
                    −<Money amountKobo={projGatewayFeeKobo} />
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">− Projected Marketing Spend</span>
                  <span className="text-destructive">
                    −<Money amountKobo={projMarketingKobo} />
                  </span>
                </div>
                <div
                  className={`flex justify-between rounded-lg px-3 py-2 font-bold ${
                    projNetProfitKobo >= 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span>Projected Monthly Net Profit</span>
                  <span>
                    <Money amountKobo={projNetProfitKobo} />
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Breakdown & Top Profitable Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Profitability by Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byVendor.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No vendor order data in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                      <th className="pb-2 font-medium">Vendor</th>
                      <th className="pb-2 font-medium text-right">Orders</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Gross Profit</th>
                      <th className="pb-2 font-medium text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.byVendor.map((v) => (
                      <tr key={v.vendorName}>
                        <td className="py-2 font-medium">{v.vendorName}</td>
                        <td className="py-2 text-right">{v.orders}</td>
                        <td className="py-2 text-right">
                          <Money amountKobo={v.revenueKobo} />
                        </td>
                        <td className="py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          <Money amountKobo={v.grossProfitKobo} />
                        </td>
                        <td className="py-2 text-right">{v.marginPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Top Profitable Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No product sales data in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-right">Units</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Gross Profit</th>
                      <th className="pb-2 font-medium text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.topProducts.map((p) => (
                      <tr key={p.productId}>
                        <td className="py-2 font-medium max-w-[180px] truncate">
                          {p.title}
                        </td>
                        <td className="py-2 text-right">{p.units}</td>
                        <td className="py-2 text-right">
                          <Money amountKobo={p.revenueKobo} />
                        </td>
                        <td className="py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          <Money amountKobo={p.grossProfitKobo} />
                        </td>
                        <td className="py-2 text-right">{p.marginPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recognized Orders P&L Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Recognized Successful Orders (P&amp;L Breakdown)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.orders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No successful orders in this period yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Vendor</th>
                    <th className="pb-2 font-medium text-right">Merchandise</th>
                    <th className="pb-2 font-medium text-right">Vendor Cost</th>
                    <th className="pb-2 font-medium text-right">Gateway Fee</th>
                    <th className="pb-2 font-medium text-right">Net Profit</th>
                    <th className="pb-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 font-mono font-semibold">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="text-primary hover:underline"
                        >
                          #{o.number}
                        </Link>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={o.status as any} />
                      </td>
                      <td className="py-2.5">{o.vendorName}</td>
                      <td className="py-2.5 text-right">
                        <Money amountKobo={o.subtotalKobo} />
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        <Money amountKobo={o.cogsKobo} />
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        <Money amountKobo={o.gatewayFeeKobo} />
                      </td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          o.netProfitKobo >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        <Money amountKobo={o.netProfitKobo} />
                      </td>
                      <td className="py-2.5 text-right">
                        {o.netMarginPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
