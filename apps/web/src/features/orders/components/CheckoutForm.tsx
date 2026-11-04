"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Gift,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  Users,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import {
  useCatalogProduct,
  useVtuPlans,
  useVtuProviders,
  type BillSpotVtuType,
} from "@/features/catalog";
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
const AIRTIME_PRESETS_NAIRA = [500, 1000, 2000, 5000, 10000, 20000];

export type CheckoutFormProps = {
  productSlug: string;
};

export function CheckoutForm({ productSlug }: CheckoutFormProps) {
  const router = useRouter();
  const { data: product, isLoading } = useCatalogProduct(productSlug);
  const cartStore = useCartStore();
  const { user } = useAuthStore();
  const createOrderMutation = useCreateDirectOrder();

  const isVtuProduct = Boolean(
    product?.isDigital ||
      product?.digitalKind === "AIRTIME" ||
      product?.digitalKind === "DATA" ||
      productSlug.includes("vtu") ||
      productSlug.includes("airtime") ||
      productSlug.includes("data")
  );

  const effectiveProduct = React.useMemo(() => {
    if (product) return product;
    if (isVtuProduct) {
      const isData = productSlug.includes("data");
      return {
        id: isData ? "prod_vtu_data_01" : "prod_vtu_airtime_01",
        slug: productSlug,
        name: isData
          ? "Instant Mobile Data Bundle Gift"
          : "Instant Airtime Top-Up Gift",
        description:
          "Instant VTU top-up delivered directly to Nigerian mobile numbers.",
        priceKobo: 500_000,
        category: "Airtime & Data",
        vendorName: "Instant VTU",
        inStock: true,
        rating: 5.0,
        reviewCount: 0,
        occasions: ["BIRTHDAY", "APPRECIATION"],
        relationships: ["FRIEND", "FAMILY"],
        isDigital: true,
        digitalKind: isData ? ("DATA" as const) : ("AIRTIME" as const),
      };
    }
    return null;
  }, [product, isVtuProduct, productSlug]);

  const initialVtuType: BillSpotVtuType =
    effectiveProduct?.digitalKind === "DATA" || productSlug.includes("data")
      ? "data"
      : "airtime";

  const [vtuType, setVtuType] = React.useState<BillSpotVtuType>(initialVtuType);
  const [selectedProvider, setSelectedProvider] = React.useState<string>("mtn");
  const [airtimeAmountNaira, setAirtimeAmountNaira] = React.useState<number>(5000);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");
  const [planSearch, setPlanSearch] = React.useState<string>("");
  const [multiPhoneMode, setMultiPhoneMode] = React.useState<boolean>(false);
  const [extraPhonesInput, setExtraPhonesInput] = React.useState<string>("");

  React.useEffect(() => {
    if (product?.digitalKind === "DATA" || productSlug.includes("data")) {
      setVtuType("data");
    }
  }, [product?.digitalKind, productSlug]);

  const providersQuery = useVtuProviders(vtuType);
  const plansQuery = useVtuPlans(
    selectedProvider,
    isVtuProduct && vtuType === "data"
  );

  const providers = providersQuery.data?.providers ?? [];
  const allPlans = React.useMemo(
    () => plansQuery.data?.plans ?? [],
    [plansQuery.data?.plans]
  );

  React.useEffect(() => {
    if (vtuType === "data" && allPlans.length > 0) {
      const exists = allPlans.some(
        (p) => p.bill_item_identifier === selectedPlanId
      );
      if (!exists) {
        setSelectedPlanId(allPlans[0]!.bill_item_identifier);
      }
    }
  }, [vtuType, allPlans, selectedPlanId]);

  const selectedPlan = React.useMemo(
    () => allPlans.find((p) => p.bill_item_identifier === selectedPlanId) ?? allPlans[0],
    [allPlans, selectedPlanId]
  );

  const filteredPlans = React.useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    if (!q) return allPlans;
    return allPlans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.amount).includes(q) ||
        p.bill_item_identifier.toLowerCase().includes(q)
    );
  }, [allPlans, planSearch]);

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

  // For digital VTU products, populate default address fields so schema validation succeeds seamlessly
  React.useEffect(() => {
    if (isVtuProduct) {
      if (!form.getValues("street")) {
        form.setValue("street", "Instant VTU Digital Delivery");
      }
      if (!form.getValues("area")) {
        form.setValue("area", "Mobile Network");
      }
      if (!form.getValues("city")) {
        form.setValue("city", "Lagos");
      }
      if (!form.getValues("state")) {
        form.setValue("state", "Lagos");
      }
      form.setValue("wrapping", false);
    }
  }, [isVtuProduct, form]);

  const wrapping =
    useWatch({ control: form.control, name: "wrapping" }) ?? false;
  const watchedRecipient =
    useWatch({ control: form.control, name: "recipientName" });
  const watchedPhone =
    useWatch({ control: form.control, name: "recipientPhone" });
  const watchedStreet =
    useWatch({ control: form.control, name: "street" });
  const watchedCity =
    useWatch({ control: form.control, name: "city" });
  const watchedState =
    useWatch({ control: form.control, name: "state" });

  const parsedAllPhones = React.useMemo(() => {
    const primary = (watchedPhone || "").trim();
    if (!multiPhoneMode || !extraPhonesInput.trim()) {
      return primary ? [primary] : [];
    }
    const extras = extraPhonesInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/\D/g, "").length >= 10);
    return Array.from(new Set([primary, ...extras].filter(Boolean))).slice(0, 50);
  }, [watchedPhone, multiPhoneMode, extraPhonesInput]);

  const recipientsCount = Math.max(1, parsedAllPhones.length);

  const unitPriceKobo = React.useMemo(() => {
    if (!isVtuProduct) {
      return effectiveProduct?.priceKobo ?? 0;
    }
    if (vtuType === "data") {
      return (selectedPlan?.amount ?? 1000) * 100;
    }
    return Math.max(50, airtimeAmountNaira) * 100;
  }, [isVtuProduct, effectiveProduct?.priceKobo, vtuType, selectedPlan, airtimeAmountNaira]);

  const wrappingKobo = !isVtuProduct && wrapping ? WRAPPING_FEE_KOBO : 0;
  const totalKobo = unitPriceKobo * (isVtuProduct ? recipientsCount : 1) + wrappingKobo;

  const deliveryAddress = [watchedStreet, watchedCity, watchedState]
    .filter(Boolean)
    .join(", ");

  const whatsAppLink = effectiveProduct
    ? createSingleProductWhatsAppLink({
        name: effectiveProduct.name,
        priceKobo: totalKobo,
        category: effectiveProduct.category,
        slug: effectiveProduct.slug,
        recipientName: watchedRecipient || undefined,
        deliveryAddress: isVtuProduct
          ? `Instant ${vtuType.toUpperCase()} (${selectedProvider.toUpperCase()})`
          : deliveryAddress || undefined,
      })
    : "";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const buyerEmail =
        user?.email || (values as any).buyerEmail || "guest@givvly.ng";

      if (isVtuProduct && vtuType === "data" && !selectedPlan) {
        toast.error("Please select a data bundle plan.");
        return;
      }

      const result = await createOrderMutation.mutateAsync({
        productSlug,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        ...(isVtuProduct && parsedAllPhones.length > 1
          ? { recipientPhones: parsedAllPhones }
          : {}),
        address: {
          street: values.street || "Instant VTU Digital Delivery",
          area: values.area || "Mobile Network",
          city: values.city || "Lagos",
          state: values.state || "Lagos",
        },
        giftNote: values.giftNote || undefined,
        wrapping: isVtuProduct ? false : values.wrapping,
        ...(isVtuProduct
          ? {
              vtuType,
              vtuProvider: selectedProvider,
              billItemIdentifier:
                vtuType === "data"
                  ? selectedPlan?.bill_item_identifier
                  : undefined,
              customAmountKobo: unitPriceKobo,
            }
          : {}),
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
    toast.success(
      isVtuProduct
        ? `Instant ${vtuType === "data" ? "Data Bundle" : "Airtime"} dispatched!`
        : "Order confirmed! Preparing your gift for delivery."
    );
    router.push(
      `/checkout/success?orderId=${encodeURIComponent(createdOrder?.id || "")}&ref=${encodeURIComponent(ref)}`
    );
  };

  if (isLoading && !isVtuProduct) {
    return (
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-subtle" />
    );
  }

  if (!effectiveProduct) {
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
        {isVtuProduct && (
          <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Instant VTU Fulfillment
                  </span>
                  <CardTitle className="mt-1 font-display text-xl">
                    Configure Airtime or Data Top-Up
                  </CardTitle>
                </div>

                {/* VTU Type Toggle */}
                <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-1">
                  <button
                    type="button"
                    onClick={() => setVtuType("airtime")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      vtuType === "airtime"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Airtime
                  </button>
                  <button
                    type="button"
                    onClick={() => setVtuType("data")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      vtuType === "data"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    Mobile Data
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* 1. Network Provider Selection (Cached from BillSpot /partner/vtu/providers) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    1. Select Network Provider
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {providers.map((prov) => {
                    const isSelected =
                      selectedProvider.toLowerCase() === prov.slug.toLowerCase();
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setSelectedProvider(prov.slug)}
                        className={`relative flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <img
                          src={prov.logo}
                          alt={prov.name}
                          className="h-8 w-8 shrink-0 rounded-full border border-border object-cover bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {prov.name}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                            {prov.slug}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Airtime Amount or Data Bundle Plan Selection */}
              {vtuType === "airtime" ? (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    2. Choose Airtime Top-Up Amount (NGN)
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                    {AIRTIME_PRESETS_NAIRA.map((preset) => {
                      const active = airtimeAmountNaira === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAirtimeAmountNaira(preset)}
                          className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                              : "border-border bg-card text-ink hover:border-primary/40"
                          }`}
                        >
                          ₦{preset.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-1">
                    <Label htmlFor="customAirtimeNaira" className="text-xs text-ink-muted">
                      Or enter custom amount in Naira (min ₦50)
                    </Label>
                    <Input
                      id="customAirtimeNaira"
                      type="number"
                      min={50}
                      max={500000}
                      value={airtimeAmountNaira}
                      onChange={(e) =>
                        setAirtimeAmountNaira(Math.max(50, Number(e.target.value) || 0))
                      }
                      className="mt-1 max-w-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      2. Select {selectedProvider.toUpperCase()} Data Plan (
                      {filteredPlans.length} plans available)
                    </Label>
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-ink-muted" />
                      <Input
                        value={planSearch}
                        onChange={(e) => setPlanSearch(e.target.value)}
                        placeholder="Search e.g. Monthly, 10GB, Router..."
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>

                  {plansQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="h-14 animate-pulse rounded-xl bg-surface-subtle" />
                      <div className="h-14 animate-pulse rounded-xl bg-surface-subtle" />
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {filteredPlans.map((plan) => {
                          const isSelected =
                            selectedPlan?.bill_item_identifier ===
                            plan.bill_item_identifier;
                          return (
                            <button
                              key={plan.bill_item_identifier}
                              type="button"
                              onClick={() =>
                                setSelectedPlanId(plan.bill_item_identifier)
                              }
                              className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                                  : "border-border bg-card hover:border-primary/40"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-ink">
                                  {plan.name}
                                </p>
                                <p className="text-[10px] font-mono text-ink-muted">
                                  {plan.bill_item_identifier}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-primary">
                                  ₦{plan.amount.toLocaleString()}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {isVtuProduct
                ? "Recipient Phone & Multi-Number Dispatch"
                : "Recipient & Delivery Details"}
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
                <Label htmlFor="recipientPhone">
                  {isVtuProduct
                    ? "Primary recipient phone (NG)"
                    : "Recipient phone (NG)"}
                </Label>
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

            {isVtuProduct ? (
              <div className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        Bulk Top-Up for Multiple Numbers (Up to 50 numbers)
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Send the same {vtuType} amount to several numbers at once
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    id="multiPhoneMode"
                    checked={multiPhoneMode}
                    onCheckedChange={(checked) =>
                      setMultiPhoneMode(Boolean(checked))
                    }
                  />
                </div>

                {multiPhoneMode && (
                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="extraPhones" className="text-xs">
                      Additional Nigerian phone numbers (comma or newline separated)
                    </Label>
                    <Textarea
                      id="extraPhones"
                      rows={3}
                      value={extraPhonesInput}
                      onChange={(e) => setExtraPhonesInput(e.target.value)}
                      placeholder="08166551496, 08023456789, 09051234567"
                    />
                    <p className="text-[11px] text-ink-muted">
                      Active recipients:{" "}
                      <strong className="text-ink">{recipientsCount}</strong>{" "}
                      number{recipientsCount === 1 ? "" : "s"} (max 50)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                    <Input
                      id="city"
                      placeholder="Lagos"
                      {...form.register("city")}
                    />
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
              </>
            )}
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
              <Label htmlFor="giftNote">
                {isVtuProduct
                  ? "SMS / Notification gift message (optional)"
                  : "Printed gift card note (optional)"}
              </Label>
              <Textarea
                id="giftNote"
                rows={3}
                maxLength={300}
                placeholder={
                  isVtuProduct
                    ? "Write a sweet message to accompany your airtime/data gift..."
                    : "Write a warm note to include inside the package..."
                }
                {...form.register("giftNote")}
              />
              {form.formState.errors.giftNote && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.giftNote.message}
                </p>
              )}
            </div>

            {!isVtuProduct && (
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
            )}
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
                <p className="font-medium text-ink">
                  {isVtuProduct
                    ? vtuType === "data" && selectedPlan
                      ? `${selectedProvider.toUpperCase()} — ${selectedPlan.name}`
                      : `${selectedProvider.toUpperCase()} — ₦${airtimeAmountNaira.toLocaleString()} Airtime`
                    : effectiveProduct.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {isVtuProduct
                    ? ` Instant VTU${selectedPlan && vtuType === "data" ? ` • ${selectedPlan.bill_item_identifier}` : ""}`
                    : `By ${effectiveProduct.vendorName}`}
                </p>
              </div>
              <Money
                amountKobo={unitPriceKobo}
                className="font-medium text-ink"
              />
            </div>

            <div className="space-y-2 text-sm">
              {isVtuProduct && recipientsCount > 1 && (
                <div className="flex items-center justify-between text-ink-muted">
                  <span>Recipients count</span>
                  <span className="font-medium text-ink">
                    × {recipientsCount} numbers
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-ink-muted">
                <span>Delivery</span>
                <span className="text-success">
                  {isVtuProduct ? "Instant VTU (Free)" : "Included"}
                </span>
              </div>
              {!isVtuProduct && wrapping && (
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
              {isVtuProduct ? (
                <Phone className="h-4 w-4" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {createOrderMutation.isPending
                ? "Processing payment..."
                : isVtuProduct
                  ? `Pay & Top-Up Now`
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
                Secured by Paystack
              </p>
              <p className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {isVtuProduct
                  ? "Direct top-up to MTN, Airtel, Glo & T2mobile"
                  : "Express delivery across Nigeria"}
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
