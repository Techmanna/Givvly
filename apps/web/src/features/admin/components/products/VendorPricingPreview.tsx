"use client";

import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import {
  calculateVendorSellingPrice,
  DEFAULT_GATEWAY_ID,
  estimateGatewayFeeKobo,
  GATEWAY_FEE_CONFIGS,
} from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminVendorSummary } from "../../types";

interface VendorPricingPreviewProps {
  vendor?: AdminVendorSummary | null;
  costPriceNaira: string;
  priceNaira: string;
  isOverridden: boolean;
  onReapplyRule?: () => void;
}

const GATEWAY_OPTIONS = Object.values(GATEWAY_FEE_CONFIGS);

export function VendorPricingPreview({
  vendor,
  costPriceNaira,
  priceNaira,
  isOverridden,
  onReapplyRule,
}: VendorPricingPreviewProps) {
  const [gatewayId, setGatewayId] = useState<string>(DEFAULT_GATEWAY_ID);

  const costNum = parseFloat(costPriceNaira);
  const sellNum = parseFloat(priceNaira);

  const hasValidCost = !isNaN(costNum) && costNum > 0;
  const hasValidSell = !isNaN(sellNum) && sellNum > 0;

  if (!hasValidCost && !hasValidSell) {
    return null;
  }

  const costKobo = hasValidCost ? Math.round(costNum * 100) : 0;
  const sellKobo = hasValidSell ? Math.round(sellNum * 100) : 0;

  const suggested =
    vendor && hasValidCost
      ? calculateVendorSellingPrice(
          costKobo,
          {
            pricingMode: vendor.pricingMode ?? "PUBLIC_MARKUP",
            markupBps: vendor.markupBps ?? 1500,
            discountBps: vendor.discountBps ?? 0,
            commissionBps: vendor.commissionBps ?? 0,
            roundingStepKobo: vendor.roundingStepKobo ?? 50_000,
            pricingTiers: vendor.pricingTiers ?? null,
          },
          gatewayId
        )
      : null;

  const gatewayFeeKobo = estimateGatewayFeeKobo(sellKobo, gatewayId);
  const activeGateway =
    GATEWAY_FEE_CONFIGS[gatewayId] ?? GATEWAY_FEE_CONFIGS[DEFAULT_GATEWAY_ID];
  const isCommissionMode = vendor?.pricingMode === "COMMISSION";
  const grossProfitKobo =
    isCommissionMode && hasValidSell
      ? Math.round(sellKobo * ((vendor?.commissionBps ?? 0) / 10_000))
      : hasValidCost && hasValidSell
        ? sellKobo - costKobo
        : 0;

  const grossMarginPct =
    sellKobo > 0 ? (grossProfitKobo / sellKobo) * 100 : 0;
  const netContributionKobo = grossProfitKobo - gatewayFeeKobo;
  const netMarginPct =
    sellKobo > 0 ? (netContributionKobo / sellKobo) * 100 : 0;

  const formatNaira = (kobo: number) =>
    `₦${Math.round(kobo / 100).toLocaleString()}`;

  return (
    <div className="rounded-lg border border-border/80 bg-muted/35 p-2.5 text-[11px] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          {vendor
            ? isOverridden
              ? `Manual override (${vendor.name} rule)`
              : `Auto-priced (${vendor.name} rule)`
            : "Margin & Gateway Fee Estimate"}
        </span>

        <div className="flex items-center gap-1.5">
          <Select value={gatewayId} onValueChange={setGatewayId}>
            <SelectTrigger
              aria-label="Payment gateway for fee estimate"
              className="h-6 w-auto min-w-[130px] px-2 text-[10px] bg-card"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GATEWAY_OPTIONS.map((gw) => (
                <SelectItem key={gw.id} value={gw.id} className="text-[11px]">
                  {gw.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {vendor && isOverridden && onReapplyRule && hasValidCost && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-primary"
              onClick={onReapplyRule}
            >
              <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
              Re-apply ({suggested ? formatNaira(suggested.sellingPriceKobo) : ""})
            </Button>
          )}
        </div>
      </div>

      {hasValidCost && hasValidSell ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground sm:grid-cols-4">
          <div>
            <span className="block text-[10px]">Gross Diff</span>
            <span
              className={`font-semibold ${
                grossProfitKobo >= 0 ? "text-foreground" : "text-destructive"
              }`}
            >
              {formatNaira(grossProfitKobo)} ({grossMarginPct.toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="block text-[10px]">
              Est. {(activeGateway?.label ?? "Gateway").replace(" (Default)", "")} Fee
            </span>
            <span className="font-semibold text-foreground">
              {formatNaira(gatewayFeeKobo)}
            </span>
          </div>
          <div>
            <span className="block text-[10px]">Net Before Ads</span>
            <span
              className={`font-semibold ${
                netContributionKobo >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatNaira(netContributionKobo)} ({netMarginPct.toFixed(1)}%)
            </span>
          </div>
          {suggested && (
            <div>
              <span className="block text-[10px]">Rule Markup</span>
              <span className="font-semibold text-foreground">
                {(suggested.appliedMarkupBps / 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          Enter both vendor cost and selling price to see live margin &amp; gateway fee breakdown.
        </p>
      )}
    </div>
  );
}
