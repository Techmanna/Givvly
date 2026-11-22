"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShippingZones } from "@/features/catalog";
import { PaymentGatewayModal } from "@/features/orders/components/PaymentGatewayModal";
import { SavedAddressSelector } from "@/features/orders/components/SavedAddressSelector";
import { useAuthStore } from "@/stores/auth-store";
import type { SavedAddress } from "@givvly/contracts";
import { Button } from "@/components/ui/button";
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
import { Money } from "@/components/shared/Money";
import { useRedeemRegistryItemsMutation } from "../hooks/useRegistry";

export type RedeemRegistryDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemIds: string[];
  onRedeemed: () => void;
};

export function RedeemRegistryDialog({
  eventId,
  open,
  onOpenChange,
  selectedItemIds,
  onRedeemed,
}: RedeemRegistryDialogProps) {
  const currentUser = useAuthStore((s) => s.user);
  const shippingZonesQuery = useShippingZones();
  const redeemMutation = useRedeemRegistryItemsMutation(eventId);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingZoneId, setShippingZoneId] = useState<string>("");
  const [recipientName, setRecipientName] = useState(
    () => currentUser?.name ?? ""
  );
  const [recipientPhone, setRecipientPhone] = useState(
    () => currentUser?.phone ?? ""
  );
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientArea, setRecipientArea] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientState, setRecipientState] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setRecipientName(addr.recipientName);
    setRecipientPhone(addr.recipientPhone);
    setRecipientAddress(addr.street);
    setRecipientArea(addr.area ?? "");
    setRecipientCity(addr.city);
    setRecipientState(addr.state);
  };

  const handleClearSavedAddress = () => {
    setSelectedAddressId(null);
    setRecipientName(currentUser?.name ?? "");
    setRecipientPhone(currentUser?.phone ?? "");
    setRecipientAddress("");
    setRecipientArea("");
    setRecipientCity("");
    setRecipientState("");
  };

  const [redeemOrder, setRedeemOrder] = useState<any>(null);
  const [redeemPaymentDetails, setRedeemPaymentDetails] = useState<{
    reference: string;
    accessCode: string;
    authorizationUrl: string;
    amountKobo: number;
    email: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const shippingZones = (shippingZonesQuery.data ?? []).filter((z) => z.enabled);
  const selectedZone = shippingZones.find((z) => z.id === shippingZoneId);
  const estimatedDeliveryFeeKobo = selectedZone ? selectedZone.priceKobo : 250000;

  useEffect(() => {
    if (!shippingZoneId && shippingZones[0]) {
      setShippingZoneId(shippingZones[0].id);
    }
  }, [shippingZoneId, shippingZones]);

  useEffect(() => {
    if (currentUser?.name) {
      setRecipientName((prev) => prev || currentUser.name);
    }
    if (currentUser?.phone) {
      setRecipientPhone((prev) => prev || currentUser.phone || "");
    }
  }, [currentUser?.name, currentUser?.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) return;

    try {
      const res = await redeemMutation.mutateAsync({
        itemIds: selectedItemIds,
        shippingZoneId: shippingZoneId || undefined,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        recipientArea: recipientArea.trim() || undefined,
        recipientCity: recipientCity.trim(),
        recipientState: recipientState.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
      });

      onOpenChange(false);

      if (!res.requiresPayment || !res.paymentDetails) {
        toast.success(`Order ${res.order.number} confirmed for delivery!`);
        onRedeemed();
        return;
      }

      setRedeemOrder(res.order);
      setRedeemPaymentDetails({
        reference: res.paymentDetails.reference,
        accessCode: res.paymentDetails.accessCode ?? "",
        authorizationUrl: res.paymentDetails.authorizationUrl ?? "",
        amountKobo: res.order.deliveryFeeKobo,
        email: currentUser?.email ?? "",
      });
      setIsPaymentModalOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not initiate delivery checkout."
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Checkout &amp; Ship Claimed Gifts</DialogTitle>
            <DialogDescription>
              Enter your delivery address and select a shipping zone. You only
              pay the delivery fee for {selectedItemIds.length} claimed{" "}
              {selectedItemIds.length === 1 ? "item" : "items"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <SavedAddressSelector
              selectedAddressId={selectedAddressId}
              onSelectAddress={handleSelectSavedAddress}
              onClearSelection={handleClearSavedAddress}
            />

            {shippingZones.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="redeem-zone">Delivery zone</Label>
                <Select value={shippingZoneId} onValueChange={setShippingZoneId}>
                  <SelectTrigger id="redeem-zone">
                    <SelectValue placeholder="Select delivery zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name} —{" "}
                        {zone.priceKobo === 0
                          ? "Free"
                          : `₦${(zone.priceKobo / 100).toLocaleString()}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="redeem-name">Recipient name</Label>
                <Input
                  id="redeem-name"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="redeem-phone">Phone number</Label>
                <Input
                  id="redeem-phone"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redeem-address">Street address</Label>
              <Input
                id="redeem-address"
                required
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redeem-area">Area / Landmark (optional)</Label>
              <Input
                id="redeem-area"
                placeholder="e.g. Near Spar / Lekki Phase 1 Gate"
                value={recipientArea}
                onChange={(e) => setRecipientArea(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="redeem-city">City</Label>
                <Input
                  id="redeem-city"
                  required
                  value={recipientCity}
                  onChange={(e) => setRecipientCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="redeem-state">State</Label>
                <Input
                  id="redeem-state"
                  required
                  value={recipientState}
                  onChange={(e) => setRecipientState(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redeem-notes">Delivery notes (optional)</Label>
              <Input
                id="redeem-notes"
                placeholder="Gate code, landmark, or preferred drop-off time"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Delivery fee</span>
              <Money
                amountKobo={estimatedDeliveryFeeKobo}
                className="font-semibold text-primary"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={redeemMutation.isPending}>
                {redeemMutation.isPending
                  ? "Creating order..."
                  : estimatedDeliveryFeeKobo === 0
                    ? "Confirm & Ship"
                    : "Proceed to Pay Delivery Fee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={redeemOrder}
        paymentDetails={redeemPaymentDetails}
        onPaymentSuccess={() => {
          setIsPaymentModalOpen(false);
          toast.success(
            `Delivery fee paid! Order ${redeemOrder?.number ?? ""} is confirmed for shipping.`
          );
          onRedeemed();
        }}
      />
    </>
  );
}
