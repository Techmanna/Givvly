"use client";

import * as React from "react";
import { Edit2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import type { ShippingZone } from "@givvly/contracts";
import { Money } from "@/components/shared/Money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminShippingZones,
  useCreateAdminShippingZone,
  useDeleteAdminShippingZone,
  useUpdateAdminShippingZone,
} from "../hooks/useAdmin";

type ZoneFormState = {
  code: string;
  name: string;
  areas: string;
  deliveryNote: string;
  etaLabel: string;
  priceNaira: string;
  sortOrder: string;
  enabled: boolean;
};

const EMPTY_FORM: ZoneFormState = {
  code: "",
  name: "",
  areas: "",
  deliveryNote: "",
  etaLabel: "",
  priceNaira: "",
  sortOrder: "0",
  enabled: true,
};

export function ShippingZonesView() {
  const { data: zones = [], isLoading } = useAdminShippingZones();
  const createMutation = useCreateAdminShippingZone();
  const updateMutation = useUpdateAdminShippingZone();
  const deleteMutation = useDeleteAdminShippingZone();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingZone, setEditingZone] = React.useState<ShippingZone | null>(null);
  const [form, setForm] = React.useState<ZoneFormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditingZone(null);
    setForm({
      ...EMPTY_FORM,
      sortOrder: String(zones.length + 1),
    });
    setDialogOpen(true);
  };

  const openEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setForm({
      code: zone.code,
      name: zone.name,
      areas: zone.areas,
      deliveryNote: zone.deliveryNote ?? "",
      etaLabel: zone.etaLabel ?? "",
      priceNaira: String(Math.round(zone.priceKobo / 100)),
      sortOrder: String(zone.sortOrder),
      enabled: zone.enabled,
    });
    setDialogOpen(true);
  };

  const handleToggleEnabled = async (zone: ShippingZone, nextEnabled: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: zone.id,
        payload: { enabled: nextEnabled },
      });
      toast.success(
        `${zone.name} ${nextEnabled ? "enabled" : "disabled"} for checkout`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update zone status",
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(form.priceNaira);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid shipping price in Naira.");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      areas: form.areas.trim(),
      deliveryNote: form.deliveryNote.trim() || null,
      etaLabel: form.etaLabel.trim() || null,
      priceKobo: Math.round(priceNum * 100),
      sortOrder: Math.max(0, Number(form.sortOrder) || 0),
      enabled: form.enabled,
    };

    try {
      if (editingZone) {
        await updateMutation.mutateAsync({ id: editingZone.id, payload });
        toast.success(`Updated ${payload.name}`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Created ${payload.name}`);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save shipping zone",
      );
    }
  };

  const handleDelete = async (zone: ShippingZone) => {
    try {
      await deleteMutation.mutateAsync(zone.id);
      toast.success(`Deleted ${zone.name}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete shipping zone",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Prices are VAT-inclusive (7.5% Nigerian VAT). Disabled zones are hidden
          from customer checkout.
        </div>
        <Button onClick={openCreate} size="sm" className="self-start sm:self-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Shipping Zone
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />
            <span>Configured Shipping Zones ({zones.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-20 animate-pulse rounded-xl bg-muted/50"
                />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No shipping zones configured yet.
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex flex-col gap-4 py-4 first:pt-1 last:pb-1 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {zone.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {zone.code}
                      </Badge>
                      {zone.etaLabel && (
                        <Badge variant="secondary" className="text-[10px]">
                          {zone.etaLabel}
                        </Badge>
                      )}
                      {!zone.enabled && (
                        <Badge variant="destructive" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{zone.areas}</p>
                    {zone.deliveryNote && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-600">
                        {zone.deliveryNote}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right">
                      <Money
                        amountKobo={zone.priceKobo}
                        className="text-sm font-bold text-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        incl. VAT
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={zone.enabled}
                        disabled={updateMutation.isPending}
                        aria-label={`Toggle ${zone.name}`}
                        onCheckedChange={(checked) =>
                          handleToggleEnabled(zone, checked)
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-primary"
                        aria-label={`Edit ${zone.name}`}
                        onClick={() => openEdit(zone)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${zone.name}`}
                        onClick={() => handleDelete(zone)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? `Edit ${editingZone.name}` : "Add Shipping Zone"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure covered locations, delivery notice, and VAT-inclusive price in Naira.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Zone Code *</label>
                <Input
                  required
                  placeholder="ZONE_A"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Zone Name *</label>
                <Input
                  required
                  placeholder="ZONE A"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Covered Areas *</label>
              <Textarea
                required
                rows={2}
                placeholder="Gbagada, Yaba, Iwaya, Shomolu..."
                value={form.areas}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, areas: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Delivery Notice / Requirement
              </label>
              <Input
                placeholder="YOU’D BE REQUIRED TO RECEIVE AT ESTATE GATE..."
                value={form.deliveryNote}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deliveryNote: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  Price (₦ incl. VAT) *
                </label>
                <Input
                  required
                  type="number"
                  min={0}
                  placeholder="3763"
                  value={form.priceNaira}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priceNaira: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">ETA Label</label>
                <Input
                  placeholder="Within 48hrs"
                  value={form.etaLabel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, etaLabel: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Sort Order</label>
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3">
              <span className="text-xs font-semibold">
                Enabled for Checkout?
              </span>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : "Save Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
