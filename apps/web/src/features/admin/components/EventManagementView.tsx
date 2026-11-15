"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Ban,
  Calendar,
  ExternalLink,
  Eye,
  Gift,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { StatusBadge, type StatusKind } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { AdminEventListItem } from "../api";
import {
  useAdminEventDetail,
  useAdminEvents,
  useDeleteAdminEvent,
  useUpdateAdminEventStatus,
} from "../hooks/useAdmin";

const STATUS_FILTERS = ["ALL", "PUBLISHED", "DRAFT", "CLOSED", "ARCHIVED"] as const;
const PAGE_SIZE = 8;

type PendingModerationAction =
  | {
      kind: "STATUS";
      event: Pick<AdminEventListItem, "id" | "name">;
      nextStatus: "PUBLISHED" | "CLOSED" | "ARCHIVED";
    }
  | {
      kind: "DELETE";
      event: Pick<AdminEventListItem, "id" | "name">;
    };

export function EventManagementView() {
  const eventsQuery = useAdminEvents();
  const updateStatusMutation = useUpdateAdminEventStatus();
  const deleteMutation = useDeleteAdminEvent();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    React.useState<PendingModerationAction | null>(null);
  const [actionReason, setActionReason] = React.useState("");

  const detailQuery = useAdminEventDetail(selectedEventId);

  const events = eventsQuery.data ?? [];

  const filteredEvents = events.filter((ev) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ev.name.toLowerCase().includes(q) ||
      ev.slug.toLowerCase().includes(q) ||
      (ev.host?.name?.toLowerCase().includes(q) ?? false) ||
      (ev.host?.email?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === "ALL" || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalReceivedAllKobo = events.reduce(
    (sum, ev) => sum + (ev.totalReceivedKobo ?? 0),
    0
  );
  const publishedCount = events.filter((ev) => ev.status === "PUBLISHED").length;
  const totalRsvpsAll = events.reduce((sum, ev) => sum + (ev.rsvpYesCount ?? 0), 0);

  const handleStatusChange = async (
    ev: Pick<AdminEventListItem, "id" | "name">,
    nextStatus: "PUBLISHED" | "CLOSED" | "ARCHIVED",
    reason?: string
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: ev.id,
        status: nextStatus,
        reason,
      });
      const actionLabel =
        nextStatus === "PUBLISHED"
          ? "restored to Published"
          : nextStatus === "CLOSED"
          ? "closed (taken offline)"
          : "archived";
      toast.success(`${ev.name} ${actionLabel}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update celebration status"
      );
    }
  };

  const handleDelete = async (ev: Pick<AdminEventListItem, "id" | "name">) => {
    try {
      await deleteMutation.mutateAsync(ev.id);
      toast.success(`Deleted ${ev.name}`);
      if (selectedEventId === ev.id) {
        setSelectedEventId(null);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Cannot delete celebration with existing financial records"
      );
    }
  };

  const openStatusConfirm = (
    event: Pick<AdminEventListItem, "id" | "name">,
    nextStatus: "PUBLISHED" | "CLOSED" | "ARCHIVED"
  ) => {
    setActionReason("");
    setPendingAction({ kind: "STATUS", event, nextStatus });
  };

  const openDeleteConfirm = (event: Pick<AdminEventListItem, "id" | "name">) => {
    setActionReason("");
    setPendingAction({ kind: "DELETE", event });
  };

  const handleConfirmModeration = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "STATUS") {
      await handleStatusChange(
        pendingAction.event,
        pendingAction.nextStatus,
        actionReason.trim() || undefined
      );
    } else {
      await handleDelete(pendingAction.event);
    }
    setPendingAction(null);
    setActionReason("");
  };

  const detail = detailQuery.data;
  const canDeleteSelected =
    detail &&
    detail.stats.giftCount === 0 &&
    detail.stats.orderCount === 0 &&
    detail.stats.payoutCount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Celebrations & Event Insights
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor hosted celebrations, inspect gifts, orders, RSVPs, and moderate or take events offline.
          </p>
        </div>
        <Badge variant="outline" className="self-start text-xs font-mono sm:self-auto">
          {events.length} Total Celebrations
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Celebrations
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {events.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Live / Published
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Gifts Received
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">
              <Money amountKobo={totalReceivedAllKobo} />
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Confirmed RSVPs
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-foreground">
              {totalRsvpsAll}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by celebration name, /e/slug, or host..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <Button
              key={st}
              type="button"
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === "ALL" ? "All" : st}
            </Button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {eventsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8 text-muted-foreground" />}
          title="No celebrations match"
          description="Try adjusting your search or status filter."
        />
      ) : (
        <div className="space-y-3">
          {paginated.map((ev) => {
            const hasFinancials = (ev.giftCount ?? 0) > 0 || (ev.orderCount ?? 0) > 0;
            const isOffline = ev.status === "CLOSED" || ev.status === "ARCHIVED";

            return (
              <Card key={ev.id} className="border border-border/80 bg-card">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ev.status} />
                      <Badge variant="outline" className="text-[10px]">
                        {ev.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {ev.visibility}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        /e/{ev.slug}
                      </span>
                    </div>

                    <p className="font-heading text-base font-semibold text-foreground">
                      {ev.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {ev.host && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {ev.host.name} ({ev.host.email})
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(ev.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5" />
                        {ev.giftCount} gifts · {ev.orderCount ?? 0} orders
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {ev.rsvpYesCount} attending
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {ev.postCount ?? 0} wall posts
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Received
                      </span>
                      <p className="font-heading text-base font-bold text-primary">
                        <Money amountKobo={ev.totalReceivedKobo} />
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEventId(ev.id)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Inspect
                      </Button>

                      <Button type="button" size="icon" variant="ghost" asChild>
                        <Link
                          href={`/e/${ev.slug}`}
                          target="_blank"
                          aria-label={`Open /e/${ev.slug}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {isOffline ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => openStatusConfirm(ev, "PUBLISHED")}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => openStatusConfirm(ev, "CLOSED")}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Block / Close
                        </Button>
                      )}

                      {!hasFinancials && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${ev.name}`}
                          onClick={() => openDeleteConfirm(ev)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredEvents.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemName="celebrations"
      />

      {/* Event Detail Insights Modal */}
      <Dialog
        open={Boolean(selectedEventId)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{detail?.name ?? "Celebration Insights"}</span>
              {detail && <StatusBadge status={detail.status as StatusKind} />}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `/e/${detail.slug} · ${detail.type} · ${detail.visibility}`
                : "Loading celebration activity, transactions, and summary..."}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading || !detail ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Host & Timeline */}
              <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Host Details</p>
                  <p>{detail.host?.name ?? "Unknown host"}</p>
                  <p className="text-muted-foreground">{detail.host?.email}</p>
                  {detail.host?.phone && (
                    <p className="text-muted-foreground">{detail.host.phone}</p>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Schedule & Status</p>
                  <p>Event Date: {formatDate(detail.date)}</p>
                  <p className="text-muted-foreground">
                    Created: {formatDate(detail.createdAt, "MMM d, yyyy · h:mm a")}
                  </p>
                  {detail.closedAt && (
                    <p className="text-amber-700 dark:text-amber-400">
                      Closed: {formatDate(detail.closedAt, "MMM d, yyyy · h:mm a")}
                    </p>
                  )}
                </div>
                {detail.story && (
                  <p className="sm:col-span-2 text-xs text-muted-foreground border-t border-border/60 pt-2">
                    {detail.story}
                  </p>
                )}
              </div>

              {/* Financial & Engagement Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Money Gifts</p>
                  <p className="mt-1 font-heading text-base font-bold text-primary">
                    <Money amountKobo={detail.stats.totalReceivedKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.successfulGiftCount} paid ({detail.stats.giftCount} total)
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Gift Orders</p>
                  <p className="mt-1 font-heading text-base font-bold text-foreground">
                    <Money amountKobo={detail.stats.totalOrdersKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.paidOrderCount} paid ({detail.stats.orderCount} total)
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">Payouts</p>
                  <p className="mt-1 font-heading text-base font-bold text-foreground">
                    <Money amountKobo={detail.stats.totalPayoutsKobo} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.payoutCount} payout requests
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">RSVPs & Features</p>
                  <p className="mt-1 font-heading text-base font-bold text-foreground">
                    {detail.stats.rsvpCounts.yes} Yes / {detail.stats.rsvpCounts.maybe} Maybe
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.stats.registryCount} registry · {detail.stats.poolCount} pools ·{" "}
                    {detail.stats.postCount} posts
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent Transactions ({detail.recentTransactions.length})
                </h3>
                {detail.recentTransactions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No gifts or orders recorded for this celebration yet.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {detail.recentTransactions.map((tx) => (
                      <div
                        key={`${tx.kind}-${tx.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {tx.kind}
                            </Badge>
                            <span className="font-medium text-foreground">
                              {tx.actorName}
                            </span>
                            <StatusBadge status={tx.status as StatusKind} />
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {tx.reference} · {formatDate(tx.createdAt, "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                        <Money
                          amountKobo={tx.amountKobo}
                          className="font-semibold text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity: RSVPs & Wall Posts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent RSVPs ({detail.recentActivity.rsvps.length})
                  </h3>
                  {detail.recentActivity.rsvps.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      No RSVPs yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border">
                      {detail.recentActivity.rsvps.slice(0, 6).map((r) => (
                        <div key={r.id} className="px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{r.name}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {r.response}
                            </Badge>
                          </div>
                          {r.plusOneName && (
                            <p className="text-[11px] text-muted-foreground">
                              +1: {r.plusOneName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Wall of Love ({detail.recentActivity.posts.length})
                  </h3>
                  {detail.recentActivity.posts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      No wall posts yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border">
                      {detail.recentActivity.posts.slice(0, 6).map((p) => (
                        <div key={p.id} className="px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.authorName}</span>
                            <StatusBadge status={p.status as StatusKind} />
                          </div>
                          {p.text && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                              {p.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Moderation Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  {detail.status !== "PUBLISHED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => openStatusConfirm(detail, "PUBLISHED")}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Restore to Published
                    </Button>
                  )}
                  {detail.status !== "CLOSED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => openStatusConfirm(detail, "CLOSED")}
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" />
                      Block / Close Event
                    </Button>
                  )}
                  {detail.status !== "ARCHIVED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => openStatusConfirm(detail, "ARCHIVED")}
                    >
                      <Archive className="mr-1.5 h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>

                {canDeleteSelected ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => openDeleteConfirm(detail)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Empty Event
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Events with gifts, orders, or payouts can be blocked/archived, not deleted.
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation Warning & Confirmation Dialog */}
      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setActionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>
                {pendingAction?.kind === "DELETE"
                  ? "Permanently Delete Celebration?"
                  : pendingAction?.nextStatus === "PUBLISHED"
                  ? "Restore Celebration to Live?"
                  : pendingAction?.nextStatus === "ARCHIVED"
                  ? "Archive Celebration?"
                  : "Block / Close Celebration?"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.kind === "DELETE"
                ? `This will permanently delete "${pendingAction.event.name}" and notify the creator via email and in-app notification. This action cannot be undone.`
                : pendingAction?.nextStatus === "PUBLISHED"
                ? `This will restore "${pendingAction.event.name}" to Published status so guests can view it and send gifts again. The creator will be notified via email and in-app notification.`
                : pendingAction?.nextStatus === "ARCHIVED"
                ? `This will archive "${pendingAction.event.name}" and take it offline while preserving all financial records. The creator will be notified via email and in-app notification.`
                : pendingAction
                ? `This will close "${pendingAction.event.name}" and block new gifts, orders, and RSVPs while preserving financial records. The creator will be notified via email and in-app notification.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {pendingAction?.kind === "STATUS" && (
            <div className="space-y-1.5">
              <label
                htmlFor="event-moderation-reason"
                className="text-xs font-medium text-foreground"
              >
                Reason / Note for Creator (optional)
              </label>
              <Textarea
                id="event-moderation-reason"
                rows={3}
                placeholder="e.g. Policy review completed, suspicious activity, or host request..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingAction(null);
                setActionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                pendingAction?.kind === "DELETE" ||
                pendingAction?.nextStatus === "CLOSED"
                  ? "destructive"
                  : "default"
              }
              disabled={updateStatusMutation.isPending || deleteMutation.isPending}
              onClick={handleConfirmModeration}
            >
              {pendingAction?.kind === "DELETE"
                ? "Delete Celebration"
                : pendingAction?.nextStatus === "PUBLISHED"
                ? "Confirm Restore"
                : pendingAction?.nextStatus === "ARCHIVED"
                ? "Confirm Archive"
                : "Confirm Block / Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
