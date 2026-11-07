"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Gift,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  useInfiniteNotifications,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../hooks/useNotifications";
import type { NotificationItem } from "../types";

export function NotificationsInbox() {
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [search, setSearch] = React.useState("");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteNotifications({
    unreadOnly: filter === "unread",
    limit: 15,
  });

  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications: NotificationItem[] = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: any) => {
      if (Array.isArray(page)) return page;
      if (Array.isArray(page?.notifications)) return page.notifications;
      return [];
    });
  }, [data]);

  const unreadCount = React.useMemo(() => {
    const firstPage = data?.pages?.[0] as any;
    if (typeof firstPage?.unreadCount === "number") {
      return firstPage.unreadCount;
    }
    return notifications.filter((n) => !n.read).length;
  }, [data, notifications]);

  const filteredNotifications = React.useMemo(() => {
    if (!search.trim()) return notifications;
    const q = search.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const getNotificationIcon = (type?: string, title?: string) => {
    const text = `${type || ""} ${title || ""}`.toLowerCase();
    if (text.includes("gift") || text.includes("contribution")) {
      return <Gift className="h-4 w-4 text-primary" />;
    }
    if (text.includes("rsvp")) {
      return <CalendarCheck className="h-4 w-4 text-secondary-foreground" />;
    }
    if (text.includes("payout") || text.includes("bank") || text.includes("wallet")) {
      return <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (text.includes("order") || text.includes("delivery")) {
      return <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, Mark All Read */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5",
                filter === "unread"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="h-9 text-xs font-medium gap-1.5 shrink-0 self-end sm:self-auto"
          >
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* List Container */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading your notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <Bell className="h-6 w-6 opacity-40" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              {search
                ? "No matching notifications"
                : filter === "unread"
                ? "All caught up!"
                : "No notifications yet"}
            </h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              {search
                ? `No alerts found matching "${search}". Try adjusting your keywords.`
                : filter === "unread"
                ? "You have marked all notifications as read."
                : "When guests send gifts, contribute to funds, or RSVP to your events, you'll see updates here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition-all duration-200",
                item.read
                  ? "bg-card/70 border-border/70 hover:border-border"
                  : "bg-primary/[0.03] border-primary/30 shadow-2xs"
              )}
            >
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      item.read
                        ? "border-border bg-muted/40"
                        : "border-primary/20 bg-primary/10"
                    )}
                  >
                    {getNotificationIcon(undefined, item.title)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          item.read ? "text-foreground/85" : "text-foreground"
                        )}
                      >
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.2 text-[10px] font-semibold text-primary">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span>{formatDate(item.createdAt, "d MMM yyyy, h:mm a")}</span>
                      {item.href && (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <span>Open details</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!item.read ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0 gap-1 hover:border-primary hover:text-primary"
                    onClick={() => markReadMutation.mutate(item.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Mark read</span>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {/* Load More / Infinite Scroll Area */}
          {hasNextPage && (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="w-full sm:w-auto text-xs font-semibold px-6 h-9"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                    <span>Loading more notifications...</span>
                  </>
                ) : (
                  <span>Load older notifications</span>
                )}
              </Button>
            </div>
          )}

          {!hasNextPage && filteredNotifications.length > 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              You&apos;ve viewed all notifications.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

