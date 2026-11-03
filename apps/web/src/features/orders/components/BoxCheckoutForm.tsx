"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, ShieldCheck, Truck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { directCheckoutSchema } from "../schemas";
import { useCreateDirectOrder } from "../hooks/useOrders";
import { createBoxWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppOrderSection } from "@/components/shared/WhatsAppOrderSection";
import { useAuthStore } from "@/stores/auth-store";
import { PaymentGatewayModal } from "./PaymentGatewayModal";
import type { DirectCheckoutInput, Order } from "../types";

type DirectCheckoutFormValues = Omit<DirectCheckoutInput, "wrapping"> & {
  wrapping?: boolean;
  buyerEmail?: string;
};

export function BoxCheckoutForm() {
  const router = useRouter();
  const cartStore = useCartStore();
  const { user } = useAuthStore();
  const createOrderMutation = useCreateDirectOrder();

  const [createdOrder, setCreatedOrder] = React.useState<Order | null>(null);
  const [paymentDetails, setPaymentDetails] = React.useState<{
    reference: string;
    accessCode: string;
    authorizationUrl: string;
    amountKobo: number;
    email: string;
  } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  const box = cartStore.box;
  const itemCount = cartStore.getBoxItemCount();
  const subtotalKobo = cartStore.getItemsSubtotalKobo();
  const packaging = cartStore.getPackagingOption();
  const totalKobo = cartStore.getTotalKobo();

  const form = useForm<DirectCheckoutFormValues, unknown, DirectCheckoutInput>({
    resolver: zodResolver(directCheckoutSchema),
    defaultValues: {
      recipientName: box.giftCardRecipient || "",
      recipientPhone: "",
      street: "",
      area: "",
      city: "Lagos",
      state: "Lagos",
      giftNote: box.giftCardMessage || "",
      wrapping: packaging.extraKobo > 0,
      buyerEmail: user?.email || "",
    },
  });

  const watchedRecipient =
    useWatch({ control: form.control, name: "recipientName" });
  const watchedStreet =
    useWatch({ control: form.control, name: "street" });
  const watchedCity =
    useWatch({ control: form.control, name: "city" });
  const watchedState =
    useWatch({ control: form.control, name: "state" });
  const watchedGiftNote =
    useWatch({ control: form.control, name: "giftNote" });

  const deliveryAddress = [watchedStreet, watchedCity, watchedState]
    .filter(Boolean)
    .join(", ");

  const boxWhatsAppUrl = createBoxWhatsAppLink({
    items: box.items,
    totalKobo,
    packagingName: packaging.name,
    recipientName: watchedRecipient || box.giftCardRecipient || undefined,
    deliveryAddress: deliveryAddress || undefined,
    giftNote: watchedGiftNote || box.giftCardMessage || undefined,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (box.items.length === 0) {
      toast.error("Your gift box is empty.");
      return;
    }

    try {
      const firstSlug = box.items[0]?.product.slug || "custom-gift-box";
      const itemsList = box.items.map((item) => ({
        name: item.product.name,
        qty: item.quantity,
        unitPriceKobo: item.product.priceKobo,
      }));

      // If packaging has extra fee, append packaging as an item
      if (packaging.extraKobo > 0) {
        itemsList.push({
          name: `Packaging: ${packaging.name}`,
          qty: 1,
          unitPriceKobo: packaging.extraKobo,
        });
      }

      const buyerEmail =
        user?.email || (values as any).buyerEmail || "guest@givvly.ng";

      const result = await createOrderMutation.mutateAsync({
        productSlug: firstSlug,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        address: {
          street: values.street,
          area: values.area,
          city: values.city,
          state: values.state,
        },
        giftNote: values.giftNote || undefined,
        wrapping: packaging.extraKobo > 0,
      });

      setCreatedOrder(result.order);
      setPaymentDetails({
        reference: result.reference,
        accessCode: result.accessCode,
        authorizationUrl: result.authorizationUrl,
        amountKobo: result.order.totalKobo,
        email: buyerEmail,
      });
      setIsPaymentModalOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not complete box checkout."
      );
    }
  });

  const handlePaymentSuccess = (ref: string) => {
    cartStore.clearBox();
    setIsPaymentModalOpen(false);
    toast.success("Gift box order confirmed! Preparing your delivery.");
    router.push(
      `/checkout/success?orderId=${encodeURIComponent(createdOrder?.id || "")}&ref=${encodeURIComponent(ref)}`
    );
  };

  if (itemCount === 0) {
    return (
      <Card className="p-10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-primary">
          <Gift className="h-7 w-7" />
        </div>
        <CardTitle className="font-heading text-2xl font-bold">
          Your Gift Box is Empty
        </CardTitle>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Add single items or select a predefined luxury combo from our atelier
          before checking out.
        </p>
        <Button asChild className="rounded-full px-6">
          <Link href="/gifts">Browse Gift Atelier</Link>
        </Button>
      </Card>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
      noValidate
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">
              Recipient &amp; Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">Recipient full name</Label>
                <Input
                  id="recipientName"
                  placeholder="e.g. Chief & Lolo Okafor"
                  {...form.register("recipientName")}
                />
                {form.formState.errors.recipientName && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.recipientName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recipientPhone">Recipient phone (NG)</Label>
                <Input
                  id="recipientPhone"
                  placeholder="08031234567"
                  {...form.register("recipientPhone")}
                />
                {form.formState.errors.recipientPhone && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.recipientPhone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="street">Street address</Label>
              <Input
                id="street"
                placeholder="14 Admiralty Way"
                {...form.register("street")}
              />
              {form.formState.errors.street && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.street.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="area">Area / Neighbourhood</Label>
                <Input
                  id="area"
                  placeholder="Lekki Phase 1"
                  {...form.register("area")}
                />
                {form.formState.errors.area && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.area.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Lagos" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="Lagos"
                  {...form.register("state")}
                />
                {form.formState.errors.state && (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold">
              Gift Box Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="giftNote">
                Handwritten gift card message (included)
              </Label>
              <Textarea
                id="giftNote"
                rows={3}
                maxLength={300}
                placeholder="Write a heartfelt message to tuck inside your box..."
                {...form.register("giftNote")}
              />
              {form.formState.errors.giftNote && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.giftNote.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Gift Box Summary */}
      <div className="space-y-4">
        <Card className="sticky top-24">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-xl font-bold">
                Box Summary
              </CardTitle>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                {box.comboTitle || "Curated Box"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="divide-y divide-border/60 max-h-60 overflow-y-auto pr-1 text-xs space-y-2">
              {box.items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-start justify-between gap-2 pt-2 first:pt-0"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Qty: {quantity} · by {product.vendorName}
                    </p>
                  </div>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNaira(product.priceKobo * quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatNaira(subtotalKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Packaging ({packaging.name})</span>
                <span className="font-medium text-foreground">
                  {packaging.extraKobo === 0
                    ? "Included"
                    : formatNaira(packaging.extraKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery across Nigeria</span>
                <span className="font-medium text-success">Included</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                <span>Total</span>
                <span className="font-heading text-xl text-primary tabular-nums">
                  {formatNaira(totalKobo)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-full font-semibold"
              size="lg"
              disabled={createOrderMutation.isPending}
            >
              <Gift className="h-4 w-4" />
              {createOrderMutation.isPending
                ? "Securing Box Order..."
                : `Pay & Send Gift Box (${formatNaira(totalKobo)})`}
            </Button>

            <WhatsAppOrderSection
              href={boxWhatsAppUrl}
              buttonLabel="Order via WhatsApp"
              showTrustBadges={true}
            />

            <div className="space-y-1.5 pt-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Secured by Paystack • Instant SMS tracking link
              </p>
              <p className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                Doorstep tracked delivery across Nigeria
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={createdOrder}
        paymentDetails={paymentDetails}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </form>
  );
}
