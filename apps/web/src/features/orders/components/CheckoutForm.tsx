"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { useCatalogProduct } from "@/features/catalog";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { PaymentGatewayModal } from "./PaymentGatewayModal";
import { directCheckoutSchema } from "../schemas";
import { useCreateDirectOrder } from "../hooks/useOrders";
import { createSingleProductWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppOrderSection } from "@/components/shared/WhatsAppOrderSection";
import type { DirectCheckoutInput, Order } from "../types";

type DirectCheckoutFormValues = Omit<DirectCheckoutInput, "wrapping"> & {
  wrapping?: boolean;
  buyerEmail?: string;
};

const WRAPPING_FEE_KOBO = 250_000; // ₦2,500

export type CheckoutFormProps = {
  productSlug: string;
};

export function CheckoutForm({ productSlug }: CheckoutFormProps) {
  const router = useRouter();
  const { data: product, isLoading } = useCatalogProduct(productSlug);
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

  const form = useForm<DirectCheckoutFormValues, unknown, DirectCheckoutInput>({
    resolver: zodResolver(directCheckoutSchema),
    defaultValues: {
      recipientName: cartStore.draft.recipientName || "",
      recipientPhone: cartStore.draft.recipientPhone || "",
      street: cartStore.draft.street || "",
      area: cartStore.draft.area || "",
      city: cartStore.draft.city || "Lagos",
      state: cartStore.draft.state || "Lagos",
      giftNote: cartStore.draft.giftNote || "",
      wrapping: cartStore.draft.wrapping ?? false,
      buyerEmail: user?.email || "",
    },
  });

  const wrapping =
    useWatch({ control: form.control, name: "wrapping" }) ?? false;
  const watchedRecipient =
    useWatch({ control: form.control, name: "recipientName" });
  const watchedStreet =
    useWatch({ control: form.control, name: "street" });
  const watchedCity =
    useWatch({ control: form.control, name: "city" });
  const watchedState =
    useWatch({ control: form.control, name: "state" });

  const unitPriceKobo = product?.priceKobo ?? 0;
  const wrappingKobo = wrapping ? WRAPPING_FEE_KOBO : 0;
  const totalKobo = unitPriceKobo + wrappingKobo;

  const deliveryAddress = [watchedStreet, watchedCity, watchedState]
    .filter(Boolean)
    .join(", ");

  const whatsAppLink = product
    ? createSingleProductWhatsAppLink({
        name: product.name,
        priceKobo: totalKobo,
        category: product.category,
        slug: product.slug,
        recipientName: watchedRecipient || undefined,
        deliveryAddress: deliveryAddress || undefined,
      })
    : "";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const buyerEmail =
        user?.email || (values as any).buyerEmail || "guest@givvly.ng";

      const result = await createOrderMutation.mutateAsync({
        productSlug,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        address: {
          street: values.street,
          area: values.area,
          city: values.city,
          state: values.state,
        },
        giftNote: values.giftNote || undefined,
        wrapping: values.wrapping,
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
        err instanceof Error ? err.message : "Could not complete checkout."
      );
    }
  });

  const handlePaymentSuccess = (ref: string) => {
    cartStore.clearCart();
    setIsPaymentModalOpen(false);
    toast.success("Order confirmed! Preparing your gift for delivery.");
    router.push(
      `/checkout/success?orderId=${encodeURIComponent(createdOrder?.id || "")}&ref=${encodeURIComponent(ref)}`
    );
  };

  if (isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-subtle" />
    );
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-ink-muted">
          Product not found for checkout.
        </CardContent>
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
            <CardTitle className="font-display text-xl">
              Recipient & Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">Recipient full name</Label>
                <Input
                  id="recipientName"
                  placeholder="e.g. Chidinma Eze"
                  {...form.register("recipientName")}
                />
                {form.formState.errors.recipientName && (
                  <p role="alert" className="text-xs text-danger">
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
                  <p role="alert" className="text-xs text-danger">
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
                <p role="alert" className="text-xs text-danger">
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
                  <p role="alert" className="text-xs text-danger">
                    {form.formState.errors.area.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Lagos" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p role="alert" className="text-xs text-danger">
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
                  <p role="alert" className="text-xs text-danger">
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Personal Touch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="giftNote">Printed gift card note (optional)</Label>
              <Textarea
                id="giftNote"
                rows={3}
                maxLength={300}
                placeholder="Write a warm note to include inside the package..."
                {...form.register("giftNote")}
              />
              {form.formState.errors.giftNote && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.giftNote.message}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-subtle p-3.5">
              <Checkbox
                id="wrapping"
                checked={wrapping}
                onCheckedChange={(checked) =>
                  form.setValue("wrapping", Boolean(checked))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="wrapping" className="cursor-pointer font-medium">
                  Add Blush & Gold luxury gift wrapping (+
                  <Money amountKobo={WRAPPING_FEE_KOBO} />)
                </Label>
                <p className="text-xs text-ink-muted">
                  Includes satin ribbon, wax seal, and keepsake card.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="font-display text-xl">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="font-medium text-ink">{product.name}</p>
                <p className="text-xs text-ink-muted">By {product.vendorName}</p>
              </div>
              <Money
                amountKobo={product.priceKobo}
                className="font-medium text-ink"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Delivery</span>
                <span className="text-success">Included</span>
              </div>
              {wrapping && (
                <div className="flex items-center justify-between text-ink-muted">
                  <span>Luxury gift wrapping</span>
                  <Money amountKobo={WRAPPING_FEE_KOBO} />
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-ink">
                <span>Total</span>
                <Money amountKobo={totalKobo} />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-xl"
              size="lg"
              disabled={createOrderMutation.isPending}
            >
              <Gift className="h-4 w-4" />
              {createOrderMutation.isPending
                ? "Processing payment..."
                : "Pay & Send Gift"}
            </Button>

            {whatsAppLink && (
              <WhatsAppOrderSection
                href={whatsAppLink}
                buttonLabel="Chat on WhatsApp to order"
                showTrustBadges={true}
              />
            )}

            <div className="space-y-1.5 pt-2 text-xs text-ink-muted">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Secured by Paystack • Instant SMS tracking link
              </p>
              <p className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                Express delivery across Nigeria
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
