"use client";

import * as React from "react";
import { useState } from "react";
import {
  Mail,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PUBLIC_MARKUP_TIERS,
  type VendorPricingMode,
  type VendorPricingTier,
} from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useAdminVendors,
  useCreateAdminVendor,
  useDeleteAdminVendor,
  useRecalculateVendorPrices,
  useUpdateAdminVendor,
} from "../hooks/useAdmin";
import type { AdminVendorSummary } from "../types";

const PRICING_MODE_LABELS: Record<VendorPricingMode, string> = {
  PUBLIC_MARKUP: "Public Price + Tiered Markup",
  FIXED_MARKUP: "Fixed Flat Markup %",
  RESELLER_DISCOUNT: "Reseller Discount Off Public",
  COMMISSION: "Commission From Vendor",
};

function formatVendorRuleBadge(vendor: AdminVendorSummary): string {
  const mode = vendor.pricingMode ?? "PUBLIC_MARKUP";
  if (mode === "PUBLIC_MARKUP") {
    return "Tiered Markup (18% / 15% / 12%)";
  }
  if (mode === "FIXED_MARKUP") {
    return `+${((vendor.markupBps ?? 1500) / 100).toFixed(1)}% Markup`;
  }
  if (mode === "RESELLER_DISCOUNT") {
    return `${((vendor.discountBps ?? 0) / 100).toFixed(1)}% Reseller Discount`;
  }
  return `${((vendor.commissionBps ?? 0) / 100).toFixed(1)}% Commission`;
}

export function VendorManagementView() {
  const vendorsQuery = useAdminVendors();
  const createMutation = useCreateAdminVendor();
  const updateMutation = useUpdateAdminVendor();
  const deleteMutation = useDeleteAdminVendor();
  const recalcMutation = useRecalculateVendorPrices();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<AdminVendorSummary | null>(
    null
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pricingMode, setPricingMode] =
    useState<VendorPricingMode>("PUBLIC_MARKUP");
  const [markupPct, setMarkupPct] = useState("15");
  const [discountPct, setDiscountPct] = useState("10");
  const [commissionPct, setCommissionPct] = useState("15");
  const [roundingStepNaira, setRoundingStepNaira] = useState("500");
  const [pricingTiers, setPricingTiers] = useState<VendorPricingTier[]>(
    DEFAULT_PUBLIC_MARKUP_TIERS
  );

  const openCreateDialog = () => {
    setEditingVendor(null);
    setName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setLogoUrl("");
    setPricingMode("PUBLIC_MARKUP");
    setMarkupPct("15");
    setDiscountPct("10");
    setCommissionPct("15");
    setRoundingStepNaira("500");
    setPricingTiers(DEFAULT_PUBLIC_MARKUP_TIERS);
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor: AdminVendorSummary) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setEmail(vendor.email);
    setPhone(vendor.phone ?? "");
    setLocation(vendor.location ?? "");
    setLogoUrl(vendor.logoUrl ?? "");
    setPricingMode(vendor.pricingMode ?? "PUBLIC_MARKUP");
    setMarkupPct(String(((vendor.markupBps ?? 1500) / 100).toFixed(1).replace(/\.0$/, "")));
    setDiscountPct(String(((vendor.discountBps ?? 0) / 100).toFixed(1).replace(/\.0$/, "")));
    setCommissionPct(String(((vendor.commissionBps ?? 0) / 100).toFixed(1).replace(/\.0$/, "")));
    setRoundingStepNaira(String(Math.round((vendor.roundingStepKobo ?? 50_000) / 100)));
    setPricingTiers(
      vendor.pricingTiers && vendor.pricingTiers.length > 0
        ? vendor.pricingTiers
        : DEFAULT_PUBLIC_MARKUP_TIERS
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toBps = (val: string, fallback = 0) => {
      const n = parseFloat(val);
      return isNaN(n) || n < 0 ? fallback : Math.round(n * 100);
    };
    const roundingNairaNum = parseInt(roundingStepNaira, 10);
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      pricingMode,
      markupBps: toBps(markupPct, 1500),
      discountBps: toBps(discountPct, 0),
      commissionBps: toBps(commissionPct, 0),
      roundingStepKobo:
        !isNaN(roundingNairaNum) && roundingNairaNum >= 0
          ? roundingNairaNum * 100
          : 50_000,
      pricingTiers:
        pricingMode === "PUBLIC_MARKUP" ? pricingTiers : null,
    };

    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({
          vendorId: editingVendor.id,
          payload,
        });
        toast.success(`Updated vendor "${payload.name}".`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Added vendor "${payload.name}".`);
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save vendor."
      );
    }
  };

  const handleDelete = async (vendor: AdminVendorSummary) => {
    try {
      await deleteMutation.mutateAsync(vendor.id);
      toast.success(`Removed vendor "${vendor.name}".`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete vendor."
      );
    }
  };

  if (vendorsQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (vendorsQuery.isError) {
    return (
      <ErrorState
        title="Could not load vendors"
        onRetry={() => vendorsQuery.refetch()}
      />
    );
  }

  const vendors = vendorsQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = vendors.filter(
    (v) =>
      !term ||
      v.name.toLowerCase().includes(term) ||
      v.email.toLowerCase().includes(term) ||
      (v.phone ?? "").toLowerCase().includes(term) ||
      (v.location ?? "").toLowerCase().includes(term)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name, email, phone, location..."
            className="pl-9"
          />
        </div>

        <Button type="button" onClick={openCreateDialog}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          <span>Add Vendor</span>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No vendors found"
          description="Add a vendor source with their email and WhatsApp/phone so you can assign products and forward order details."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((vendor) => (
            <Card key={vendor.id} className="border border-border/80 bg-card">
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  {vendor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.name}
                      className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Store className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-heading text-base font-semibold text-foreground">
                        {vendor.name}
                      </p>
                      <StatusBadge status={vendor.status} />
                    </div>

                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{vendor.email}</span>
                      </p>
                      {vendor.phone ? (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{vendor.phone}</span>
                        </p>
                      ) : null}
                      {vendor.location ? (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{vendor.location}</span>
                        </p>
                      ) : null}
                      <p className="pt-0.5 text-[11px] font-medium text-foreground/80">
                        {vendor.productCount}{" "}
                        {vendor.productCount === 1 ? "product" : "products"}
                      </p>
                      <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Percent className="h-3 w-3" aria-hidden="true" />
                        {formatVendorRuleBadge(vendor)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {vendor.productCount > 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Recalculate product selling prices from this vendor's rule"
                      aria-label={`Recalculate prices for ${vendor.name}`}
                      disabled={recalcMutation.isPending}
                      onClick={async () => {
                        try {
                          const res = await recalcMutation.mutateAsync(vendor.id);
                          toast.success(
                            `Recalculated ${res.updatedCount} product${res.updatedCount === 1 ? "" : "s"} (${res.skippedOverridden} overridden, ${res.skippedNoCost} missing cost).`
                          );
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Could not recalculate prices."
                          );
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${vendor.name}`}
                    onClick={() => openEditDialog(vendor)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${vendor.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => void handleDelete(vendor)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </DialogTitle>
            <DialogDescription>
              Vendors can be assigned as product sources and receive order
              dispatch details via WhatsApp or email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Vendor Name *</Label>
              <Input
                id="vendor-name"
                required
                placeholder="e.g. Lagos Luxury Hampers"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-email">Email *</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  required
                  placeholder="orders@vendor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendor-phone">Phone / WhatsApp *</Label>
                <Input
                  id="vendor-phone"
                  required
                  placeholder="e.g. 08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-location">Location (optional)</Label>
              <Input
                id="vendor-location"
                placeholder="e.g. Lekki Phase 1, Lagos"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-logo">Logo URL (optional)</Label>
              <Input
                id="vendor-logo"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold">
                  Dynamic Pricing Rule
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Auto-prices products when this vendor is selected
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="vendor-pricing-mode" className="text-xs">
                    Pricing Mode
                  </Label>
                  <Select
                    value={pricingMode}
                    onValueChange={(val) =>
                      setPricingMode(val as VendorPricingMode)
                    }
                  >
                    <SelectTrigger id="vendor-pricing-mode" className="h-9 text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRICING_MODE_LABELS) as VendorPricingMode[]).map(
                        (mode) => (
                          <SelectItem key={mode} value={mode} className="text-xs">
                            {PRICING_MODE_LABELS[mode]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="vendor-rounding" className="text-xs">
                    Price Rounding
                  </Label>
                  <Select
                    value={roundingStepNaira}
                    onValueChange={setRoundingStepNaira}
                    disabled={pricingMode === "COMMISSION"}
                  >
                    <SelectTrigger id="vendor-rounding" className="h-9 text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs">
                        Exact (No rounding)
                      </SelectItem>
                      <SelectItem value="100" className="text-xs">
                        Round up to ₦100
                      </SelectItem>
                      <SelectItem value="500" className="text-xs">
                        Round up to ₦500 (Recommended)
                      </SelectItem>
                      <SelectItem value="1000" className="text-xs">
                        Round up to ₦1,000
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pricingMode === "PUBLIC_MARKUP" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Tiered markup applied on top of the vendor&apos;s public website price:
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {pricingTiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border/70 bg-card p-2 space-y-1"
                      >
                        <span className="block text-[10px] font-medium text-muted-foreground">
                          {tier.maxCostKobo === null
                            ? "₦50,000+"
                            : idx === 0
                              ? "Up to ₦19,999"
                              : `Up to ₦${Math.round(tier.maxCostKobo / 100).toLocaleString()}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="200"
                            step="0.5"
                            className="h-7 text-xs"
                            value={String(tier.markupBps / 100)}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value);
                              const bps = isNaN(pct) || pct < 0 ? 0 : Math.round(pct * 100);
                              setPricingTiers((prev) =>
                                prev.map((t, i) =>
                                  i === idx ? { ...t, markupBps: bps } : t
                                )
                              );
                            }}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pricingMode === "FIXED_MARKUP" && (
                <div className="space-y-1">
                  <Label htmlFor="vendor-markup-pct" className="text-xs">
                    Flat Markup (%)
                  </Label>
                  <Input
                    id="vendor-markup-pct"
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    className="h-9 text-xs bg-card"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(e.target.value)}
                  />
                </div>
              )}

              {pricingMode === "RESELLER_DISCOUNT" && (
                <div className="space-y-1">
                  <Label htmlFor="vendor-discount-pct" className="text-xs">
                    Reseller Discount Off Public Price (%)
                  </Label>
                  <Input
                    id="vendor-discount-pct"
                    type="number"
                    min="0"
                    max="95"
                    step="0.5"
                    className="h-9 text-xs bg-card"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Selling price is computed as Cost / (1 − Discount) so Givvly matches their public price.
                  </p>
                </div>
              )}

              {pricingMode === "COMMISSION" && (
                <div className="space-y-1">
                  <Label htmlFor="vendor-commission-pct" className="text-xs">
                    Vendor Commission Paid to Givvly (%)
                  </Label>
                  <Input
                    id="vendor-commission-pct"
                    type="number"
                    min="0"
                    max="95"
                    step="0.5"
                    className="h-9 text-xs bg-card"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Givvly sells at the vendor&apos;s listed price (0% markup) and earns this commission.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingVendor
                    ? "Save Changes"
                    : "Add Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
