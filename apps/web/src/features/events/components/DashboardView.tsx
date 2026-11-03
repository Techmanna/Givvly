"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Gift,
  Package,
  ArrowRight,
  Clock,
  MapPin,
  Share2,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { useMyEvents, usePayoutAccountQuery } from "../hooks/useEvents";
import { useOrdersList } from "@/features/orders/hooks/useOrders";
import { StatsCards } from "./StatsCards";

type DashboardTab = "events" | "orders" | "payout";

function getCountdownBadge(dateStr: string) {
  try {
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return null;
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: "Past celebration", className: "bg-muted text-muted-foreground" };
    }
    if (diffDays === 0) {
      return { text: "Today! 🎉", className: "bg-primary text-primary-foreground font-semibold animate-pulse" };
    }
    if (diffDays === 1) {
      return { text: "Tomorrow 🌟", className: "bg-accent/20 text-accent-foreground font-semibold" };
    }
    return { text: `In ${diffDays} days`, className: "bg-primary/10 text-primary font-medium" };
  } catch {
    return null;
  }
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const eventsQuery = useMyEvents();
  const payoutQuery = usePayoutAccountQuery();
  const ordersQuery = useOrdersList();

  const [activeTab, setActiveTab] = useState<DashboardTab>("events");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const events = eventsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const totals = events.reduce(
    (acc, ev) => {
      acc.received += ev.totalReceivedKobo ?? 0;
      acc.gifts += ev.giftCount ?? 0;
      acc.rsvps += ev.rsvpYesCount ?? 0;
      return acc;
    },
    { received: 0, gifts: 0, rsvps: 0 }
  );

  const payoutVerified = payoutQuery.data?.status === "VERIFIED";

  const handleCopyLink = (slug: string, id: string) => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      navigator.clipboard.writeText(`${origin}/e/${slug}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2400);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blush/20 bg-gradient-to-br from-card via-background to-blush/10 p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span>Host & Celebration Portal</span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {user?.name ? `Welcome back, ${user.name.split(" ")[0]}! 🌸` : "Celebration Dashboard"}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Monitor your weddings, birthdays, baby dedications, and milestone ceremonies. Track cash gifts, curated hampers, and guest RSVPs seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="default" className="shadow-sm">
              <Link href="/events/new">
                <CalendarPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Create Event</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/live-events">
                <span>Live Directory</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Payout / Bank Alert Banner */}
      {!payoutQuery.isLoading && !payoutVerified && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Nigerian Bank Account verification required for cash gifts
              </p>
              <p className="text-xs text-muted-foreground">
                Connect your verified NUBAN account so guests can send you monetary blessings directly to your bank account via Paystack/Monnify.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="default" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
            <Link href="/account/payout">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              <span>Verify Bank Details</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards
        totalReceivedKobo={totals.received}
        giftCount={totals.gifts}
        rsvpYesCount={totals.rsvps}
        activeEventsCount={events.length}
      />

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`relative pb-3 text-sm font-semibold transition-colors duration-200 ${
            activeTab === "events"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          } mr-6 inline-flex items-center gap-2`}
        >
          <CalendarPlus className="h-4 w-4" />
          <span>My Celebrations</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
            {events.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`relative pb-3 text-sm font-semibold transition-colors duration-200 ${
            activeTab === "orders"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          } mr-6 inline-flex items-center gap-2`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>My Gift Orders & Boxes</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground font-bold">
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payout")}
          className={`relative pb-3 text-sm font-semibold transition-colors duration-200 ${
            activeTab === "payout"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          } inline-flex items-center gap-2`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Payout Settings</span>
          {payoutVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" />
            </span>
          )}
        </button>
      </div>

      {/* Tab: Events */}
      {activeTab === "events" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Hosted Celebrations ({events.length})
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/events/new">
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                <span>New Event</span>
              </Link>
            </Button>
          </div>

          {eventsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Skeleton className="h-52 w-full rounded-2xl" />
              <Skeleton className="h-52 w-full rounded-2xl" />
            </div>
          ) : eventsQuery.isError ? (
            <ErrorState
              description="Could not load your events. Please refresh."
              onRetry={() => void eventsQuery.refetch()}
            />
          ) : events.length === 0 ? (
            <EmptyState
              title="No celebrations registered yet"
              description="Create your first Nigerian wedding, birthday, bridal shower, or housewarming to start receiving love, money blessings, and combo boxes."
              action={
                <Button asChild size="default">
                  <Link href="/events/new">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    <span>Create My First Event</span>
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {events.map((event) => {
                const countdown = getCountdownBadge(event.date);
                const isCopied = copiedId === event.id;

                return (
                  <Card
                    key={event.id}
                    className="group relative flex flex-col justify-between overflow-hidden border border-border/80 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-card"
                  >
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/40" />
                    
                    <CardHeader className="space-y-2 pb-3 pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="font-heading text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                            <Link href={`/events/${event.id}`}>
                              {event.name}
                            </Link>
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(event.date)}
                            </span>
                            <span className="capitalize text-muted-foreground/80">
                              • {event.type.toLowerCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={event.status} />
                          {countdown && (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${countdown.className}`}>
                              {countdown.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-1">
                      {/* Metric Pill Grid */}
                      <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Cash Received
                          </p>
                          <p className="font-heading text-base font-bold text-primary">
                            <Money amountKobo={event.totalReceivedKobo} />
                          </p>
                        </div>
                        <div className="border-l border-border/60 pl-3">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Gift Items & RSVPs
                          </p>
                          <p className="text-xs font-semibold text-foreground">
                            {event.giftCount} gifts • {event.rsvpYesCount} attending
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" variant="default">
                            <Link href={`/events/${event.id}`}>
                              <span>Manage</span>
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/e/${event.slug}`} target="_blank">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              <span>Public Page</span>
                            </Link>
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyLink(event.slug, event.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isCopied ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              <span>Copy Invite Link</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                My Gift Orders & Combos
              </h2>
              <p className="text-xs text-muted-foreground">
                Track direct gifts and curated combo boxes you ordered for celebrations.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/gifts">
                <Gift className="mr-1.5 h-3.5 w-3.5" />
                <span>Explore Gift Catalog</span>
              </Link>
            </Button>
          </div>

          {ordersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : ordersQuery.isError ? (
            <ErrorState
              description="Could not load your orders."
              onRetry={() => void ordersQuery.refetch()}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No gift orders yet"
              description="When you order a gift hamper, combo box, or curated single item, you can track fulfillment and dispatch status here."
              action={
                <Button asChild size="default">
                  <Link href="/gifts">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span>Browse Gift Catalog</span>
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-soft sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {order.number || `Order #${order.id.slice(-6).toUpperCase()}`}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recipient: <span className="font-medium text-foreground">{order.recipientName}</span>
                      {order.timeline?.[0]?.at && (
                        <span> • Placed {formatDate(order.timeline[0].at)}</span>
                      )}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Items: {order.items.map((it) => `${it.qty}x ${it.name}`).join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-heading text-base font-bold text-primary">
                        <Money amountKobo={order.totalKobo} />
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline">
                      <Link href={`/orders/${order.id}`}>
                        <span>View Details</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab: Payout Settings */}
      {activeTab === "payout" && (
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Payout & Bank Account Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Direct settlement for monetary wedding sprays and birthday cash gifts into your verified Nigerian bank account.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {payoutVerified ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      Bank Account Connected & Verified
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Settlements are wired automatically to {payoutQuery.data?.bankName} (••••••{payoutQuery.data?.accountNumberLast4}) in {payoutQuery.data?.accountName}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      No Verified Bank Account Linked
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You need to connect an account to receive cash gift payouts from your guests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button asChild variant="default">
                <Link href="/account/payout">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>{payoutVerified ? "Update Bank Account" : "Connect Bank Account"}</span>
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/account">
                  <span>Profile Settings</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
