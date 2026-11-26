"use client";

import * as React from "react";
import { useState } from "react";
import {
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useAdminVendors,
  useCreateAdminVendor,
  useDeleteAdminVendor,
  useUpdateAdminVendor,
} from "../hooks/useAdmin";
import type { AdminVendorSummary } from "../types";

export function VendorManagementView() {
  const vendorsQuery = useAdminVendors();
  const createMutation = useCreateAdminVendor();
  const updateMutation = useUpdateAdminVendor();
  const deleteMutation = useDeleteAdminVendor();

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

  const openCreateDialog = () => {
    setEditingVendor(null);
    setName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setLogoUrl("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor: AdminVendorSummary) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setEmail(vendor.email);
    setPhone(vendor.phone ?? "");
    setLocation(vendor.location ?? "");
    setLogoUrl(vendor.logoUrl ?? "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
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
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
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
