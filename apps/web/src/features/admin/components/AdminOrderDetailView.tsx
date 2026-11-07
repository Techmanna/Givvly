"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";
import type { OrderStatus } from "@givvly/contracts";
import {
  useAdminOrderDetail,
  useUpdateAdminOrderStatus,
} from "../hooks/useAdmin";
import type { AdminAddressPayload } from "../types";

export type AdminOrderDetailViewProps = {
  orderId: string;
};

export function AdminOrderDetailView({ orderId }: AdminOrderDetailViewProps) {
  const { data: order, isLoading, isError, error, refetch, isRefetching } =
    useAdminOrderDetail(orderId);
  const updateStatusMutation = useUpdateAdminOrderStatus();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, label: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        status: newStatus,
      });
      toast.success(`Order #${order.number} transitioned to ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to advance order status"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-6 w-36 rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Order Not Found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : `We could not locate an order matching identifier "${orderId}".`}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/orders">View All Orders</Link>
              </Button>
              <Button size="sm" onClick={() => refetch()} variant="default">
                Retry Query
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Address parsing
  const rawAddress = order.address;
  let parsedAddress: AdminAddressPayload | null = null;
  if (typeof rawAddress === "string") {
    try {
      parsedAddress = JSON.parse(rawAddress);
    } catch {
      parsedAddress = { street: rawAddress };
    }
  } else if (rawAddress && typeof rawAddress === "object") {
    parsedAddress = rawAddress as AdminAddressPayload;
  }

  const isVtu =
    Boolean(parsedAddress?.vtuType) ||
    order.items.some((it) => it.vtuMetadata !== null && it.vtuMetadata !== undefined);

  const canPack = order.status === "CONFIRMED";
  const canShip = order.status === "PACKED";
  const canDeliver = order.status === "SHIPPED";

  const trackingToken = order.trackingToken || order.number;
  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${trackingToken}`
      : `/track/${trackingToken}`;

  // WhatsApp quick messaging helper
  const cleanPhone = (order.recipientPhone || "").replace(/[^0-9]/g, "");
  const waRecipientPhone = cleanPhone.startsWith("0")
    ? `234${cleanPhone.slice(1)}`
    : cleanPhone.startsWith("234")
    ? cleanPhone
    : `234${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${waRecipientPhone}?text=${encodeURIComponent(
    `Hello ${order.recipientName}, your Givvly gift order (#${order.number}) is currently ${order.status.replace(
      "_",
      " "
    )}. You can track its live delivery status here: ${trackingUrl}`
  )}`;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Orders</span>
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-sm font-bold text-foreground">
            {order.number}
          </span>
          <StatusBadge status={order.status} />
          {isVtu && (
            <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 text-[11px] font-semibold dark:bg-purple-950/40 dark:text-purple-300">
              VTU Digital Gift
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${
                isRefetching ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(order.number, "orderNumber", "Order number")}
            className="text-xs"
          >
            {copiedKey === "orderNumber" ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                <span>Copy #</span>
              </>
            )}
          </Button>

          {/* Quick Lifecycle Action Buttons */}
          {canPack && (
            <Button
              size="sm"
              onClick={() => handleUpdateStatus("PACKED")}
              disabled={updateStatusMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs"
            >
              <Box className="mr-1.5 h-3.5 w-3.5" />
              <span>Mark Packed</span>
            </Button>
          )}

          {canShip && (
            <Button
              size="sm"
              onClick={() => handleUpdateStatus("SHIPPED")}
              disabled={updateStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs"
            >
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              <span>Dispatch / Ship</span>
            </Button>
          )}

          {canDeliver && (
            <Button
              size="sm"
              onClick={() => handleUpdateStatus("DELIVERED")}
              disabled={updateStatusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              <span>Confirm Delivery</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4 KPI / Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Value */}
        <Card className="border-border/80 bg-card">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Order Value
            </span>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money amountKobo={order.totalKobo} />
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Subtotal: <Money amountKobo={order.subtotalKobo} />
              {order.deliveryFeeKobo > 0 && (
                <> + Delivery: <Money amountKobo={order.deliveryFeeKobo} /></>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Fulfillment Type & Quantity */}
        <Card className="border-border/80 bg-card">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Order Type & Items
            </span>
            <p className="mt-1 font-heading text-lg font-bold text-foreground">
              {isVtu ? "Digital Airtime / Data" : "Physical Gift Hamper"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order.items.reduce((acc, it) => acc + it.qty, 0)} total item units
            </p>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="border-border/80 bg-card">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Payment Gateway
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-heading text-lg font-bold uppercase text-emerald-600 dark:text-emerald-400">
                {order.payment?.status ?? "CONFIRMED"}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {order.payment?.provider ?? "PAYSTACK"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate font-mono">
              Ref: {order.payment?.reference ?? "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Recipient */}
        <Card className="border-border/80 bg-card">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recipient
            </span>
            <p className="mt-1 font-heading text-lg font-bold text-foreground truncate">
              {order.recipientName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {order.recipientPhone || order.recipientEmail || "No contact specified"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Items, Lifecycle History, Gift Personalization */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items Card */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Items in This Order
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {order.items.length} {order.items.length === 1 ? "Product" : "Products"}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {order.items.map((item, idx) => (
                  <div key={item.id ?? idx} className="p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.name}
                          </span>
                          <Badge variant="outline" className="text-[11px] font-mono">
                            Qty: {item.qty}
                          </Badge>
                        </div>
                        {item.productId && (
                          <p className="font-mono text-[11px] text-muted-foreground">
                            Product ID: {item.productId}
                          </p>
                        )}

                        {/* VTU details if any */}
                        {item.vtuMetadata && (
                          <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50/60 p-2.5 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-200">
                            <p className="font-semibold">
                              VTU Dispatch: {item.vtuMetadata.network || item.vtuMetadata.provider} (
                              {item.vtuMetadata.type || "airtime"})
                            </p>
                            {item.vtuMetadata.planName && (
                              <p className="text-[11px] text-muted-foreground">
                                Plan: {item.vtuMetadata.planName}
                              </p>
                            )}
                            {Array.isArray(item.vtuMetadata.recipients) && (
                              <p className="text-[11px]">
                                Recipients: {item.vtuMetadata.recipients.join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-muted-foreground block">
                          Unit: <Money amountKobo={item.unitPriceKobo} />
                        </span>
                        <span className="font-heading text-sm font-bold text-foreground">
                          Total: <Money amountKobo={item.totalPriceKobo || item.unitPriceKobo * item.qty} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown Footer */}
              <div className="border-t border-border/80 bg-muted/20 p-4 sm:p-5 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <Money amountKobo={order.subtotalKobo} />
                </div>
                {order.deliveryFeeKobo > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery & Logistics Fee</span>
                    <Money amountKobo={order.deliveryFeeKobo} />
                  </div>
                )}
                {order.feeKobo !== undefined && order.feeKobo > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Service Fee</span>
                    <Money amountKobo={order.feeKobo} />
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-heading text-sm font-bold text-foreground">
                  <span>Grand Total</span>
                  <span className="text-primary">
                    <Money amountKobo={order.totalKobo} />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gift Personalization & Note */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Gift Personalization & Packaging
                </CardTitle>
              </div>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium dark:bg-amber-950/40 dark:text-amber-300">
                <Sparkles className="mr-1 h-3 w-3" />
                {order.wrapStyle || "Luxury Gift Box & Ribbon"}
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Personal Handwritten Note
                </span>
                <div className="mt-1.5 rounded-xl border border-border/60 bg-muted/30 p-4 italic text-foreground text-sm leading-relaxed">
                  {order.giftNote ? (
                    `"${order.giftNote}"`
                  ) : (
                    <span className="text-muted-foreground font-normal not-italic">
                      No personalized note was provided for this order.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Packaging Style
                </span>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {order.wrapStyle || "Standard Premium Givvly Packaging"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Lifecycle History / Audit Trail */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Order Status Audit Trail
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {order.history && order.history.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {order.history.map((h, idx) => (
                    <div key={h.id ?? idx} className="relative">
                      <div className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary shadow-xs" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(h.createdAt)}
                        </span>
                        {h.actorId && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Actor: {h.actorId}
                          </Badge>
                        )}
                      </div>
                      {h.note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {h.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No status transition history recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Recipient, Buyer, Payment, Tracking Links */}
        <div className="space-y-6">
          {/* Recipient & Destination Details */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Recipient & Delivery Info
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Full Name</span>
                <p className="text-sm font-bold text-foreground">
                  {order.recipientName}
                </p>
              </div>

              {order.recipientPhone && (
                <div>
                  <span className="font-semibold text-muted-foreground">Phone Number</span>
                  <div className="mt-0.5 flex items-center justify-between">
                    <a
                      href={`tel:${order.recipientPhone}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {order.recipientPhone}
                    </a>
                    {cleanPhone && (
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-emerald-600">
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                          <Send className="mr-1 h-3 w-3" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {order.recipientEmail && (
                <div>
                  <span className="font-semibold text-muted-foreground">Email Address</span>
                  <p className="mt-0.5">
                    <a
                      href={`mailto:${order.recipientEmail}`}
                      className="text-primary hover:underline truncate block"
                    >
                      {order.recipientEmail}
                    </a>
                  </p>
                </div>
              )}

              <div className="border-t border-border/50 pt-3">
                <span className="font-semibold text-muted-foreground">
                  {isVtu ? "VTU Target Details" : "Physical Shipping Address"}
                </span>
                {isVtu ? (
                  <div className="mt-1 space-y-1 text-foreground">
                    <p>
                      <strong>Network Provider:</strong>{" "}
                      {parsedAddress?.vtuProvider || "Mobile Network"}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {parsedAddress?.vtuType?.toUpperCase() || "AIRTIME / DATA"}
                    </p>
                    {Array.isArray(parsedAddress?.recipientPhones) && (
                      <p>
                        <strong>Phone Numbers:</strong>{" "}
                        {parsedAddress.recipientPhones.join(", ")}
                      </p>
                    )}
                  </div>
                ) : parsedAddress?.street ? (
                  <p className="mt-1 text-foreground leading-relaxed">
                    {parsedAddress.street}
                    {parsedAddress.area ? `, ${parsedAddress.area}` : ""}
                    {parsedAddress.city ? `, ${parsedAddress.city}` : ""}
                    {parsedAddress.state ? `, ${parsedAddress.state}` : ""}
                    <br />
                    <span className="text-muted-foreground">Nigeria</span>
                  </p>
                ) : (
                  <p className="mt-1 text-muted-foreground italic">
                    No physical address registered (pickup or digital order).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logistics & Tracking Card */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Tracking & Dispatch
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Tracking Token</span>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="font-mono font-medium text-foreground">
                    {trackingToken}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleCopy(trackingToken, "trackingToken", "Tracking token")}
                  >
                    {copiedKey === "trackingToken" ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs"
                >
                  <Link href={`/track/${trackingToken}`} target="_blank">
                    <span className="flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Public Tracking Page
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Live
                    </Badge>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(trackingUrl, "trackingUrl", "Public tracking URL")}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  <span>Copy Public Tracking Link</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Details */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Buyer Profile
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Email</span>
                <p className="mt-0.5 font-medium text-foreground">
                  {order.buyerEmail || "Anonymous Buyer"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground">Account Status</span>
                <div className="mt-1">
                  {order.buyerUserId ? (
                    <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Registered Member ({order.buyerUserId.slice(0, 10)}...)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Guest Checkout
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground">Ordered On</span>
                <p className="mt-0.5 text-foreground">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Audit Details */}
          <Card className="border-border/80 bg-card shadow-soft">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="font-heading text-base font-bold">
                  Payment Transaction
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Reference</span>
                <p className="mt-0.5 font-mono text-[11px] text-foreground break-all">
                  {order.payment?.reference || "N/A"}
                </p>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="font-semibold text-muted-foreground">Gateway</span>
                  <p className="mt-0.5 uppercase font-medium text-foreground">
                    {order.payment?.provider || "Paystack"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Currency</span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {order.payment?.currency || "NGN"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Settlement</span>
                  <p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    {order.payment?.status || "PAID"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review or Disputes if any */}
          {order.review && (
            <Card className="border-border/80 bg-card shadow-soft">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="font-heading text-base font-bold">
                  Customer Review
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2 text-xs">
                <p className="font-semibold text-foreground">
                  Rating: {order.review.rating || 5} / 5 Stars
                </p>
                {order.review.comment && (
                  <p className="italic text-muted-foreground">
                    "{order.review.comment}"
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

