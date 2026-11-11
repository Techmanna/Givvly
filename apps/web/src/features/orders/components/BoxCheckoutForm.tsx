"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CreditCard,
  Gift,
  Mail,
  Minus,
  Package,
  PackageOpen,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  usePayOrderWithWalletMutation,
  useWalletSummary,
} from "@/features/wallet";
import { PaymentGatewayModal } from "./PaymentGatewayModal";
import { openPaystackCheckout } from "@/features/gifts/paystack";
import { verifyOrderPayment } from "../api";
import { useCreateDirectOrder, useOrdersList } from "../hooks/useOrders";
import {
  SavedAddressSelector,
  SaveAddressToggle,
} from "./SavedAddressSelector";
import { useSavedAddressStore } from "@/stores/saved-address-store";
import type { Order } from "../types";
import type { SavedAddress } from "@givvly/contracts";
import { NIGERIAN_PHONE_REGEX } from "@givvly/contracts";

const WRAPPING_FEE_KOBO = 250_000; // ₦2,500 flat for luxury whole-box presentation

const boxCheckoutFormSchema = z
  .object({
    recipientName: z
      .string()
      .trim()
      .min(2, "Recipient name must be at least 2 characters")
      .max(60, "Recipient name must be 60 characters or fewer"),
    recipientPhone: z
      .string()
      .trim()
      .regex(
        NIGERIAN_PHONE_REGEX,
        "Enter a valid Nigerian phone number (e.g. 08031234567 or +2348031234567)"
      ),
    street: z
      .string()
      .trim()
      .min(3, "Street address must be at least 3 characters")
      .max(100, "Street address must be 100 characters or fewer"),
    area: z
      .string()
      .trim()
      .min(2, "Area or landmark must be at least 2 characters")
      .max(50, "Area must be 50 characters or fewer"),
    city: z
      .string()
      .trim()
      .min(2, "City must be at least 2 characters")
      .max(50, "City must be 50 characters or fewer"),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters")
      .max(50, "State must be 50 characters or fewer"),
    giftNote: z
      .string()
      .trim()
      .max(300, "Gift note must be 300 characters or fewer")
      .optional()
      .or(z.literal("")),
    wrapping: z.boolean().default(false),
    buyerEmail: z
      .string()
      .trim()
      .email("Enter a valid email address for your order receipt")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (v) => `${v.street}, ${v.area}, ${v.city}, ${v.state}`.length <= 200,
    {
      path: ["street"],
      message: "Combined delivery address must be 200 characters or fewer",
    }
  );

type BoxCheckoutInput = z.infer<typeof boxCheckoutFormSchema>;
type BoxCheckoutFormValues = Omit<BoxCheckoutInput, "wrapping"> & {
  wrapping?: boolean;
};

export function BoxCheckoutForm() {
  const router = useRouter();
  const { items, updateItemQty, removeItem, clearBox, draft, updateDraft } =
    useCartStore();
  const { user } = useAuthStore();
  const createOrderMutation = useCreateDirectOrder();
  const { data: walletSummary } = useWalletSummary(1, 5, true);
  const payWithWalletMutation = usePayOrderWithWalletMutation();

  const [paymentMethod, setPaymentMethod] = React.useState<"paystack" | "wallet">(
    "paystack"
  );
  const [walletPin, setWalletPin] = React.useState("");
  const [createdOrder, setCreatedOrder] = React.useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [paymentDetails, setPaymentDetails] = React.useState<{
    reference: string;
    accessCode: string;
    authorizationUrl: string;
    amountKobo: number;
    email: string;
  } | null>(null);

  // Presaved Addresses state
  const { data: pastOrders = [] } = useOrdersList();
  const { addresses, addAddress } = useSavedAddressStore();
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);
  const [saveAddressEnabled, setSaveAddressEnabled] = React.useState(true);
  const [addressLabel, setAddressLabel] = React.useState("");

  const subtotalKobo = items.reduce(
    (acc, item) => acc + item.priceKobo * item.qty,
    0
  );
  const totalCount = items.reduce((acc, item) => acc + item.qty, 0);

  const form = useForm<BoxCheckoutFormValues, unknown, BoxCheckoutInput>({
    resolver: zodResolver(boxCheckoutFormSchema),
    defaultValues: {
      recipientName: draft.recipientName || "",
      recipientPhone: draft.recipientPhone || "",
      street: draft.street || "",
      area: draft.area || "",
      city: draft.city || "Lagos",
      state: draft.state || "Lagos",
      giftNote: draft.giftNote || "",
      wrapping: draft.wrapping ?? true, // Default to luxury box wrapping for celebration gift boxes
      buyerEmail: user?.email || draft.buyerEmail || "",
    },
  });

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    form.setValue("recipientName", addr.recipientName, { shouldValidate: true });
    form.setValue("recipientPhone", addr.recipientPhone, { shouldValidate: true });
    form.setValue("street", addr.street, { shouldValidate: true });
    form.setValue("area", addr.area, { shouldValidate: true });
    form.setValue("city", addr.city, { shouldValidate: true });
    form.setValue("state", addr.state, { shouldValidate: true });
    if (addr.buyerEmail && !form.getValues("buyerEmail")) {
      form.setValue("buyerEmail", addr.buyerEmail, { shouldValidate: true });
    }
  };

  const handleClearSelectedAddress = () => {
    setSelectedAddressId(null);
    form.setValue("recipientName", "");
    form.setValue("recipientPhone", "");
    form.setValue("street", "");
    form.setValue("area", "");
    form.setValue("city", "Lagos");
    form.setValue("state", "Lagos");
  };

  const watchedStreet = form.watch("street");
  const watchedPhone = form.watch("recipientPhone");
  const canSaveNow = Boolean(
    watchedStreet && watchedStreet.trim().length >= 3 && watchedPhone
  );

  const handleSaveCurrentAddress = () => {
    const values = form.getValues();
    if (!values.street || values.street.trim().length < 3 || !values.recipientPhone) {
      toast.error("Please enter a phone number and street address first.");
      return;
    }
    const saved = addAddress({
      label: addressLabel.trim() || undefined,
      recipientName: values.recipientName || "Recipient",
      recipientPhone: values.recipientPhone,
      buyerEmail: values.buyerEmail || undefined,
      street: values.street,
      area: values.area || "City Center",
      city: values.city || "Lagos",
      state: values.state || "Lagos",
    });
    setSelectedAddressId(saved.id);
    toast.success(`Saved "${saved.label || saved.recipientName}" to your address book!`);
  };

  const isWrappingSelected = form.watch("wrapping");
  const wrappingFeeKobo = isWrappingSelected ? WRAPPING_FEE_KOBO : 0;
  const grandTotalKobo = subtotalKobo + wrappingFeeKobo;

  // Persist form changes into cart draft
  React.useEffect(() => {
    const sub = form.watch((vals) => {
      updateDraft({
        recipientName: vals.recipientName || "",
        recipientPhone: vals.recipientPhone || "",
        street: vals.street || "",
        area: vals.area || "",
        city: vals.city || "Lagos",
        state: vals.state || "Lagos",
        giftNote: vals.giftNote || "",
        wrapping: vals.wrapping ?? false,
        buyerEmail: vals.buyerEmail || "",
      });
    });
    return () => sub.unsubscribe();
  }, [form, updateDraft]);

  const handlePaymentSuccess = (ref: string, orderId: string) => {
    clearBox();
    setIsPaymentModalOpen(false);
    toast.success("Order confirmed! Preparing your Gift Box for delivery.");
    router.push(
      `/checkout/success?orderId=${encodeURIComponent(
        orderId
      )}&ref=${encodeURIComponent(ref)}`
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (items.length === 0) {
      toast.error("Your gift box is empty. Add gifts before checking out.");
      return;
    }

    const buyerEmail =
      values.buyerEmail?.trim() || user?.email || "guest@givvly.store";

    try {
      const orderItems = items.map((i) => ({
        productId: i.id,
        productSlug: i.slug,
        name: i.name,
        qty: i.qty,
        unitPriceKobo: i.priceKobo,
      }));

      const idempotencyKey =
        draft.idempotencyKey ||
        `idem_box_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const result = await createOrderMutation.mutateAsync({
        items: orderItems,
        productSlug: items[0]?.slug,
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
        buyerEmail,
      });

      setCreatedOrder(result.order);

      // Auto-save delivery address for future checkouts if requested
      if (saveAddressEnabled && values.street && values.recipientPhone) {
        const exists = addresses.some(
          (a) =>
            a.recipientPhone === values.recipientPhone &&
            a.street.toLowerCase() === values.street.toLowerCase()
        );
        if (!exists) {
          addAddress({
            label: addressLabel.trim() || undefined,
            recipientName: values.recipientName,
            recipientPhone: values.recipientPhone,
            buyerEmail: values.buyerEmail || undefined,
            street: values.street,
            area: values.area,
            city: values.city,
            state: values.state,
          });
        }
      }

      // Wallet Payment flow
      if (paymentMethod === "wallet" && walletSummary) {
        if (!walletSummary.security.hasPin) {
          toast.error(
            "Please set your 4-digit Wallet Transaction PIN in Wallet & Payout settings first."
          );
          return;
        }
        if (!/^\d{4}$/.test(walletPin)) {
          toast.error("Please enter your 4-digit Wallet Transaction PIN.");
          return;
        }
        if (
          (walletSummary.availableBalanceKobo ?? 0) < result.order.totalKobo
        ) {
          toast.error("Insufficient Givvly Wallet balance for this order.");
          return;
        }
        const walletRes = await payWithWalletMutation.mutateAsync({
          orderId: result.order.id,
          pin: walletPin,
          transaction_id: `ord_wal_${result.order.id}`,
        });
        handlePaymentSuccess(walletRes.transaction_id, result.order.id);
        return;
      }

      setPaymentDetails({
        reference: result.reference,
        accessCode: result.accessCode,
        authorizationUrl: result.authorizationUrl,
        amountKobo: result.order.totalKobo,
        email: buyerEmail,
      });

      // Paystack Payment flow
      if (paymentMethod === "paystack") {
        const paystackRes = await openPaystackCheckout({
          email: buyerEmail,
          amountKobo: result.order.totalKobo,
          reference: result.reference,
          accessCode: result.accessCode,
          onComplete: async (ref) => {
            try {
              await verifyOrderPayment(result.order.id);
            } catch {
              // Webhook or server handles capture
            }
            handlePaymentSuccess(ref, result.order.id);
          },
          onDismiss: () => {
            setIsPaymentModalOpen(true);
            toast.info(
              "Payment window dismissed. You can complete payment whenever you're ready."
            );
          },
        });

        if (!paystackRes.opened) {
          if (result.authorizationUrl) {
            window.location.href = result.authorizationUrl;
          } else {
            setIsPaymentModalOpen(true);
          }
        }
        return;
      }

      setIsPaymentModalOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not complete checkout."
      );
    }
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <PackageOpen className="h-12 w-12 stroke-[1.5]" />
        </div>
        <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-bold text-foreground">
          Your Gift Box is Empty
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          You don&apos;t have any gifts in your Box yet. Browse our curated
          Gift Atelier to assemble a customized gift package for your loved
          ones.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="rounded-full px-8 gap-2 font-semibold">
            <Link href="/gifts">
              <Sparkles className="h-4 w-4" />
              <span>Explore Gift Atelier</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <Link
          href="/gifts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Continue browsing Gift Atelier</span>
        </Link>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
          Checkout Your Gift Box
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bundle {totalCount} {totalCount === 1 ? "gift" : "gifts"} into one
          hand-packed, luxury celebration delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Fields: Recipient, Delivery, Note */}
        <div className="lg:col-span-7 space-y-6">
          <form id="box-checkout-form" onSubmit={onSubmit} className="space-y-6">
            {/* Presaved Addresses Selector */}
            <SavedAddressSelector
              selectedAddressId={selectedAddressId}
              onSelectAddress={handleSelectSavedAddress}
              onClearSelection={handleClearSelectedAddress}
              pastOrders={pastOrders}
            />

            {/* Recipient Details Card */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Celebrant & Recipient Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label htmlFor="recipientName" className="text-xs font-semibold">
                    Recipient Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipientName"
                    placeholder="e.g. Adaobi Okonkwo"
                    className="mt-1.5 text-sm"
                    {...form.register("recipientName")}
                  />
                  {form.formState.errors.recipientName && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.recipientName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="recipientPhone" className="text-xs font-semibold">
                    Recipient Phone Number (for delivery coordination) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recipientPhone"
                      placeholder="e.g. 0803 123 4567"
                      className="pl-9 text-sm"
                      {...form.register("recipientPhone")}
                    />
                  </div>
                  {form.formState.errors.recipientPhone && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.recipientPhone.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address Card */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Delivery Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label htmlFor="street" className="text-xs font-semibold">
                    Street Address / Apartment / Estate <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="street"
                    placeholder="e.g. 14 Admiralty Way, Block B, Flat 4"
                    className="mt-1.5 text-sm"
                    {...form.register("street")}
                  />
                  {form.formState.errors.street && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.street.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="area" className="text-xs font-semibold">
                      Area / Landmark <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="area"
                      placeholder="e.g. Lekki Phase 1"
                      className="mt-1.5 text-sm"
                      {...form.register("area")}
                    />
                    {form.formState.errors.area && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.area.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city" className="text-xs font-semibold">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Lagos"
                      className="mt-1.5 text-sm"
                      {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-xs font-semibold">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="state"
                      placeholder="e.g. Lagos"
                      className="mt-1.5 text-sm"
                      {...form.register("state")}
                    />
                    {form.formState.errors.state && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Save Address for Next Time */}
                <SaveAddressToggle
                  enabled={saveAddressEnabled}
                  onToggle={setSaveAddressEnabled}
                  label={addressLabel}
                  onLabelChange={setAddressLabel}
                  onSaveNow={handleSaveCurrentAddress}
                  canSaveNow={canSaveNow}
                />
              </CardContent>
            </Card>

            {/* Handwritten Gift Note Card */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Gift className="h-4 w-4 text-primary" />
                  <span>Handwritten Celebration Card Note</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <Label htmlFor="giftNote" className="text-xs font-semibold">
                  Personal Message (inscribed by hand onto our gold-foiled stationery)
                </Label>
                <Textarea
                  id="giftNote"
                  rows={3}
                  maxLength={300}
                  placeholder="e.g. Happy 30th Birthday Adaobi! Wishing you abundant joy, good health, and greater heights ahead. Love always, Chidi & Family."
                  className="text-sm leading-relaxed resize-none"
                  {...form.register("giftNote")}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Included with your Gift Box delivery</span>
                  <span>{form.watch("giftNote")?.length || 0}/300</span>
                </div>
              </CardContent>
            </Card>

            {/* Buyer Details */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Your Details & Receipt Email</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label htmlFor="buyerEmail" className="text-xs font-semibold">
                    Email Address (for order tracking & payment receipt)
                  </Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    placeholder="you@example.com"
                    className="mt-1.5 text-sm"
                    {...form.register("buyerEmail")}
                  />
                  {form.formState.errors.buyerEmail && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.buyerEmail.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selector */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Select Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paystack")}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      paymentMethod === "paystack"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Paystack Gateway
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Debit/Credit Card, Bank Transfer, USSD, Apple Pay
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("wallet")}
                    disabled={!user}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      paymentMethod === "wallet"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 disabled:opacity-50"
                    }`}
                  >
                    <Wallet className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground">
                          Givvly Wallet
                        </p>
                        {!user && (
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            Login required
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {user && walletSummary
                          ? `Balance: ₦${Math.round(
                              (walletSummary.availableBalanceKobo || 0) / 100
                            ).toLocaleString()}`
                          : "Pay directly with your celebration earnings"}
                      </p>
                    </div>
                  </button>
                </div>

                {paymentMethod === "wallet" && user && (
                  <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2">
                    <Label htmlFor="walletPin" className="text-xs font-semibold">
                      4-Digit Wallet Transaction PIN
                    </Label>
                    <Input
                      id="walletPin"
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={walletPin}
                      onChange={(e) => setWalletPin(e.target.value)}
                      className="max-w-[140px] text-center tracking-widest text-base font-bold"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Sidebar: Items in Box & Cost Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border-border/80 shadow-xs sticky top-24">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Items in Your Box ({totalCount})</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={clearBox}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear box
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-border/60">
                {items.map((item) => (
                  <div
                    key={item.slug}
                    className="flex items-center gap-3 pt-3 first:pt-0"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <Money
                          amountKobo={item.priceKobo}
                          className="text-xs font-medium text-primary"
                        />

                        {/* Qty controls */}
                        <div className="flex items-center gap-1.5 border border-border/80 rounded-full px-1.5 py-0.5 bg-background">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQty(item.slug, item.qty - 1)
                            }
                            aria-label={`Decrease ${item.name} quantity`}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-[11px] font-bold px-1 min-w-[12px] text-center">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQty(item.slug, item.qty + 1)
                            }
                            aria-label={`Increase ${item.name} quantity`}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.slug)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted-foreground/60 hover:text-destructive p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Whole-Box Luxury Gift Wrapping Toggle */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="box-wrapping"
                    checked={isWrappingSelected}
                    onCheckedChange={(checked) =>
                      form.setValue("wrapping", Boolean(checked))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="box-wrapping"
                      className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Luxury Whole-Box Gift Presentation</span>
                      <span className="text-primary font-semibold">
                        (+₦2,500 flat)
                      </span>
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      All gifts enclosed together in our signature gold-embossed
                      celebration box with satin ribbon ties.
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-border/80 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Gifts Subtotal ({totalCount} items)</span>
                  <Money amountKobo={subtotalKobo} className="font-medium text-foreground" />
                </div>

                {isWrappingSelected && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Signature Box Presentation</span>
                    <Money amountKobo={WRAPPING_FEE_KOBO} className="font-medium text-foreground" />
                  </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Delivery Logistics</span>
                  <span className="text-success font-medium">Standard Dispatch</span>
                </div>

                <div className="border-t border-border/80 pt-2 flex items-center justify-between text-sm font-bold text-foreground">
                  <span>Total Amount</span>
                  <Money
                    amountKobo={grandTotalKobo}
                    className="text-lg font-bold text-primary"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                form="box-checkout-form"
                size="lg"
                disabled={createOrderMutation.isPending || payWithWalletMutation.isPending}
                className="w-full rounded-full font-bold shadow-md hover:shadow-lg transition-all"
              >
                {createOrderMutation.isPending || payWithWalletMutation.isPending ? (
                  <span>Processing Your Box...</span>
                ) : (
                  <span>Pay & Send Gift Box (₦{Math.round(grandTotalKobo / 100).toLocaleString()})</span>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground text-center">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Protected by Paystack 256-bit bank grade encryption</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Gateway Modal fallback */}
      {paymentDetails && (
        <PaymentGatewayModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          order={createdOrder}
          paymentDetails={paymentDetails}
          onPaymentSuccess={(ref) =>
            handlePaymentSuccess(ref, createdOrder?.id || "")
          }
        />
      )}
    </div>
  );
}
