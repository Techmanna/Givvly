"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RotateCw,
  CheckCircle,
  XCircle,
  Shield,
  Layers,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PaginationBar } from "@/components/shared/PaginationBar";
import {
  useAdminDisputes,
  useAdminEvents,
  useAdminLedger,
  useAdminModerationQueue,
  useAdminOrders,
  useAdminPayments,
  useAdminPayouts,
  useAdminUsers,
  useAdminVendors,
  useResolveAdminDispute,
  useRetryAdminPayout,
} from "../hooks/useAdmin";
import { ModerationCard } from "./ModerationCard";
import { LedgerTable } from "./LedgerTable";
import { ProductManagementView } from "./ProductManagementView";
import { OrderManagementView } from "./OrderManagementView";
import { UserManagementView } from "./UserManagementView";

export type AdminSection =
  | "overview"
  | "products"
  | "orders"
  | "events"
  | "payments"
  | "payouts"
  | "ledger"
  | "moderation"
  | "disputes"
  | "users"
  | "vendors";

export type AdminConsoleViewProps = {
  section?: AdminSection;
};

const NAV_ITEMS: Array<{ key: AdminSection; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "orders", label: "Orders & Shipping", href: "/admin/orders" },
  { key: "products", label: "Gifts & Combos", href: "/admin/products" },
  { key: "events", label: "Celebrations", href: "/admin/events" },
  { key: "payments", label: "Payment Inflow", href: "/admin/payments" },
  { key: "payouts", label: "Bank Payouts", href: "/admin/payouts" },
  { key: "ledger", label: "Dual Ledger", href: "/admin/ledger" },
  { key: "moderation", label: "Moderation", href: "/admin/moderation" },
  { key: "disputes", label: "Disputes", href: "/admin/disputes" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "vendors", label: "Vendors (Legacy)", href: "/admin/vendors" },
];

export function AdminConsoleView({
  section = "overview",
}: AdminConsoleViewProps) {
  const moderationQuery = useAdminModerationQueue();
  const eventsQuery = useAdminEvents();
  const paymentsQuery = useAdminPayments();
  const payoutsQuery = useAdminPayouts();
  const ledgerQuery = useAdminLedger();
  const ordersQuery = useAdminOrders();
  const vendorsQuery = useAdminVendors();
  const disputesQuery = useAdminDisputes();
  const usersQuery = useAdminUsers();
  const retryPayoutMutation = useRetryAdminPayout();
  const resolveDisputeMutation = useResolveAdminDispute();

  const [eventsPage, setEventsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [disputesPage, setDisputesPage] = useState(1);
  const [moderationPage, setModerationPage] = useState(1);

  const PAGE_SIZE = 8;

  const handleRetryPayout = async (payoutId: string) => {
    try {
      await retryPayoutMutation.mutateAsync(payoutId);
      toast.success("Payout retry initiated via Paystack Transfers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payout retry failed");
    }
  };

  const handleResolveDispute = async (
    disputeId: string,
    status: "RESOLVED" | "REJECTED"
  ) => {
    try {
      await resolveDisputeMutation.mutateAsync({ disputeId, status });
      toast.success(`Dispute marked as ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update dispute"
      );
    }
  };

  const totalPaymentsKobo = (paymentsQuery.data ?? []).reduce(
    (acc, p) => acc + p.totalKobo,
    0
  );
  const pendingOrders = (ordersQuery.data ?? []).filter(
    (o) => o.status === "CONFIRMED"
  ).length;
  const openDisputes = (disputesQuery.data ?? []).filter(
    (d) => d.status === "OPEN"
  ).length;
  const moderationCount = (moderationQuery.data ?? []).length;

  return (
    <div className="space-y-6">
      {/* Horizontal Nav Bar */}
      <nav
        aria-label="Admin console navigation"
        className="flex flex-wrap gap-2 border-b border-border/80 pb-3"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
              section === item.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Overview Dashboard */}
      {section === "overview" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Inflow
                  </span>
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                  <Money amountKobo={totalPaymentsKobo} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across weddings, birthdays & gifts
                </p>
              </CardContent>
            </Card>

            <Card className="border border-amber-500/20 bg-card/80 backdrop-blur-sm shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ready to Dispatch
                  </span>
                  <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                  {pendingOrders}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gift packages waiting for delivery
                </p>
              </CardContent>
            </Card>

            <Card className="border border-rose-500/20 bg-card/80 backdrop-blur-sm shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Content Moderation
                  </span>
                  <span className="rounded-xl bg-rose-500/10 p-2 text-rose-600">
                    <Shield className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                  {moderationCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Flagged Wall of Love wishes
                </p>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/20 bg-card/80 backdrop-blur-sm shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Celebrations
                  </span>
                  <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  </span>
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                  {(eventsQuery.data ?? []).length}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Live Nigerian events on platform
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Operations Matrix */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Orders Card */}
            <Card className="border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-heading text-base font-bold">
                  Recent Gift Orders
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link href="/admin/orders">
                    <span>View All</span>
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ordersQuery.data ?? []).slice(0, 4).map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">
                          {ord.number}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        To: {ord.recipientName}
                      </p>
                    </div>
                    <Money
                      amountKobo={ord.totalKobo}
                      className="font-semibold text-primary"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Moderation Queue Preview */}
            <Card className="border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-heading text-base font-bold">
                  Flagged Posts Queue ({moderationCount})
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link href="/admin/moderation">
                    <span>Moderate</span>
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {moderationCount === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No posts currently flagged for review.
                  </div>
                ) : (
                  (moderationQuery.data ?? []).slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {item.authorName}
                        </span>
                        <Badge variant="destructive" className="text-[10px]">
                          Flagged
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &quot;{item.text || item.reason || "Flagged post"}&quot;
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Section: Products */}
      {section === "products" && <ProductManagementView />}

      {/* Section: Orders */}
      {section === "orders" && <OrderManagementView />}

      {/* Section: Users */}
      {section === "users" && <UserManagementView />}

      {/* Section: Moderation */}
      {section === "moderation" && (() => {
        const items = moderationQuery.data ?? [];
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        const curPage = Math.min(moderationPage, totalPages);
        const paginated = items.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

        return (
          <div className="space-y-4">
            {paginated.map((item) => (
              <ModerationCard key={item.id} item={item} />
            ))}
            {items.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                All Wall of Love posts are approved.
              </div>
            )}
            <PaginationBar
              currentPage={curPage}
              totalPages={totalPages}
              totalItems={items.length}
              pageSize={PAGE_SIZE}
              onPageChange={setModerationPage}
              itemName="flagged posts"
            />
          </div>
        );
      })()}

      {/* Section: Events */}
      {section === "events" && (() => {
        const events = eventsQuery.data ?? [];
        const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
        const curPage = Math.min(eventsPage, totalPages);
        const paginated = events.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {paginated.map((ev) => (
                <Card key={ev.id} className="border border-border/80 bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ev.status} />
                        <span className="font-mono text-xs text-muted-foreground">
                          /e/{ev.slug}
                        </span>
                      </div>
                      <p className="mt-1 font-heading text-base font-semibold text-foreground">
                        {ev.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.date)} • {ev.giftCount} gifts •{" "}
                        {ev.rsvpYesCount} attending
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Received
                      </span>
                      <p className="font-heading text-base font-bold text-primary">
                        <Money amountKobo={ev.totalReceivedKobo} />
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PaginationBar
              currentPage={curPage}
              totalPages={totalPages}
              totalItems={events.length}
              pageSize={PAGE_SIZE}
              onPageChange={setEventsPage}
              itemName="celebrations"
            />
          </div>
        );
      })()}

      {/* Section: Payments */}
      {section === "payments" && (() => {
        const payments = paymentsQuery.data ?? [];
        const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
        const curPage = Math.min(paymentsPage, totalPages);
        const paginated = payments.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {paginated.map((pay) => (
                <Card key={pay.reference} className="border border-border/80 bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {pay.reference}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Service Fee: <Money amountKobo={pay.serviceFeeKobo} /> • Channel: Card/NUBAN
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Total Settled
                      </span>
                      <p className="font-heading text-base font-bold text-primary">
                        <Money amountKobo={pay.totalKobo} />
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PaginationBar
              currentPage={curPage}
              totalPages={totalPages}
              totalItems={payments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPaymentsPage}
              itemName="transactions"
            />
          </div>
        );
      })()}

      {/* Section: Payouts */}
      {section === "payouts" && (() => {
        const payouts = payoutsQuery.data ?? [];
        const totalPages = Math.max(1, Math.ceil(payouts.length / PAGE_SIZE));
        const curPage = Math.min(payoutsPage, totalPages);
        const paginated = payouts.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {paginated.map((payout) => (
                <Card key={payout.id} className="border border-border/80 bg-card">
                  <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={payout.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(payout.createdAt, "d MMM yyyy, h:mm a")}
                        </span>
                      </div>
                      <p className="font-heading text-base font-semibold text-foreground">
                        {payout.eventName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Beneficiary: {payout.ownerName} • {payout.bankName} (••••{" "}
                        {payout.accountNumberLast4})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Money
                        amountKobo={payout.amountKobo}
                        className="font-heading text-lg font-bold text-primary"
                      />
                      {payout.status === "FAILED" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRetryPayout(payout.id)}
                          disabled={retryPayoutMutation.isPending}
                          className="gap-1.5"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          Retry Payout
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PaginationBar
              currentPage={curPage}
              totalPages={totalPages}
              totalItems={payouts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPayoutsPage}
              itemName="payouts"
            />
          </div>
        );
      })()}

      {/* Section: Ledger */}
      {section === "ledger" && (
        <LedgerTable entries={ledgerQuery.data ?? []} />
      )}

      {/* Section: Vendors (Unified notice + Legacy Audit) */}
      {section === "vendors" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground space-y-1">
            <p className="font-semibold text-primary">
              Unified Admin Operations Notice
            </p>
            <p className="text-muted-foreground">
              External vendor portals have been consolidated directly into the Givvly Operations Console. All product catalogs, combo curation, and fulfillment logistics are now operated directly by Givvly Administrators. Legacy vendor partners are retained below for historical audit trails.
            </p>
          </div>

          <div className="space-y-3">
            {(vendorsQuery.data ?? []).map((v) => (
              <Card key={v.id} className="border border-border/80 bg-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-heading text-base font-semibold text-foreground">
                      {v.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.email} • {v.productCount} catalog products
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Section: Disputes */}
      {section === "disputes" && (() => {
        const disputes = disputesQuery.data ?? [];
        const totalPages = Math.max(1, Math.ceil(disputes.length / PAGE_SIZE));
        const curPage = Math.min(disputesPage, totalPages);
        const paginated = disputes.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {paginated.map((disp) => (
                <Card key={disp.id} className="border border-border/80 bg-card">
                  <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={disp.status} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {disp.orderNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {disp.type}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{disp.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disp.status !== "OPEN"}
                        onClick={() => handleResolveDispute(disp.id, "RESOLVED")}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Resolve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disp.status !== "OPEN"}
                        onClick={() => handleResolveDispute(disp.id, "REJECTED")}
                        className="gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {disputes.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No active customer disputes found.
                </div>
              )}
            </div>
            <PaginationBar
              currentPage={curPage}
              totalPages={totalPages}
              totalItems={disputes.length}
              pageSize={PAGE_SIZE}
              onPageChange={setDisputesPage}
              itemName="disputes"
            />
          </div>
        );
      })()}
    </div>
  );
}
