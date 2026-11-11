"use client";

import * as React from "react";
import {
  MapPin,
  Check,
  Plus,
  Trash2,
  Star,
  Building2,
  Home,
  User,
  History,
  BookmarkCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSavedAddressStore } from "@/stores/saved-address-store";
import type { SavedAddress } from "@givvly/contracts";

export type SavedAddressSelectorProps = {
  selectedAddressId?: string | null;
  onSelectAddress: (address: SavedAddress) => void;
  onClearSelection?: () => void;
  pastOrders?: Array<{
    recipientName?: string;
    recipientPhone?: string;
    buyerEmail?: string;
    address?: any;
  }>;
};

export function SavedAddressSelector({
  selectedAddressId,
  onSelectAddress,
  onClearSelection,
  pastOrders = [],
}: SavedAddressSelectorProps) {
  const {
    addresses,
    deleteAddress,
    setDefaultAddress,
    importFromPastOrders,
  } = useSavedAddressStore();

  const [isImporting, setIsImporting] = React.useState(false);

  // Auto-import past orders on first load if store is completely empty
  React.useEffect(() => {
    if (addresses.length === 0 && pastOrders.length > 0 && !isImporting) {
      setIsImporting(true);
      importFromPastOrders(pastOrders);
    }
  }, [addresses.length, pastOrders, importFromPastOrders, isImporting]);

  if (addresses.length === 0 && pastOrders.length === 0) {
    return null;
  }

  const getLabelIcon = (label?: string) => {
    const l = (label || "").toLowerCase();
    if (l.includes("home") || l.includes("house") || l.includes("residence")) {
      return <Home className="h-3.5 w-3.5 text-primary" />;
    }
    if (l.includes("work") || l.includes("office") || l.includes("biz")) {
      return <Building2 className="h-3.5 w-3.5 text-primary" />;
    }
    return <MapPin className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <h3 className="text-xs sm:text-sm font-bold text-foreground">
            Presaved Delivery Addresses
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
            {addresses.length} saved
          </Badge>
        </div>
        {selectedAddressId && onClearSelection && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Enter different address
          </Button>
        )}
      </div>

      <p className="text-[11px] sm:text-xs text-muted-foreground">
        Pick any presaved destination below to 1-tap auto-fill your delivery details.
      </p>

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {addresses.map((item) => {
          const isSelected = selectedAddressId === item.id;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectAddress(item);
                toast.success(`Applied address: ${item.label || item.recipientName}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectAddress(item);
                  toast.success(`Applied address: ${item.label || item.recipientName}`);
                }
              }}
              className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-background shadow-xs ring-2 ring-primary/40"
                  : "border-border/80 bg-background/80 hover:border-primary/50 hover:bg-background"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getLabelIcon(item.label)}
                    <span className="font-heading font-semibold text-xs text-foreground truncate">
                      {item.label || item.recipientName || "Delivery Address"}
                    </span>
                    {item.isDefault && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={item.isDefault ? "Default address" : "Set as default address"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultAddress(item.id);
                        toast.success(`Set "${item.label || item.recipientName}" as default address`);
                      }}
                      className={`p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors ${
                        item.isDefault ? "text-amber-500" : "hover:text-amber-500"
                      }`}
                    >
                      <Star className={`h-3 w-3 ${item.isDefault ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete this saved address"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAddress(item.id);
                        toast.info("Address removed from saved list");
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5 text-xs">
                  <p className="font-medium text-foreground truncate">
                    {item.recipientName}{" "}
                    <span className="font-mono text-muted-foreground font-normal">
                      • {item.recipientPhone}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {item.street}, {item.area}, {item.city}, {item.state}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {isSelected ? "Selected destination" : "Click to use this"}
                </span>
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "border border-muted-foreground/30 group-hover:border-primary"
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type SaveAddressToggleProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label: string;
  onLabelChange: (label: string) => void;
  onSaveNow?: () => void;
  canSaveNow?: boolean;
};

export function SaveAddressToggle({
  enabled,
  onToggle,
  label,
  onLabelChange,
  onSaveNow,
  canSaveNow = false,
}: SaveAddressToggleProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="h-4 w-4 text-primary shrink-0" />
          <div>
            <Label
              htmlFor="saveAddressSwitch"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Save this delivery address &amp; contact for next time
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Reuse in 1-tap across future gifts and celebration checkouts
            </p>
          </div>
        </div>
        <Switch
          id="saveAddressSwitch"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {enabled && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Input
              id="addressLabelInput"
              placeholder="Give this address a label (e.g. Home, Office, Mom's House)"
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>
          {onSaveNow && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canSaveNow}
              onClick={onSaveNow}
              className="h-9 shrink-0 text-xs font-medium"
            >
              Save to Address Book
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
