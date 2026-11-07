"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  useInfiniteNotifications,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../hooks/useNotifications";
import type { NotificationItem } from "../types";

export function NotificationBell() {
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [open, setOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteNotifications({
    unreadOnly: filter === "unread",
    limit: 8,
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

  // Infinite scroll trigger on container scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (isFetchingNextPage || !hasNextPage) return;
    const threshold = 60;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
      fetchNextPage();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 rounded-full"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-2xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-96 max-w-sm p-0 shadow-lg border-border/80 overflow-hidden"
      >
        {/* Header with Title and Filter Tabs */}
        <div className="border-b border-border bg-card p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-foreground">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} new
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary hover:text-primary font-medium gap-1"
                  disabled={markAllReadMutation.isPending}
                  onClick={() => markAllReadMutation.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </Button>
              ) : null}

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Preferences"
              >
                <Link
                  href="/account/notifications"
                  onClick={() => setOpen(false)}
                  aria-label="Notification Preferences"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                filter === "unread"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-tight",
                    filter === "unread"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/20 text-primary"
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Notification List with Infinite Scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[340px] sm:max-h-[380px] overflow-y-auto p-3 space-y-2.5 divide-y divide-border/40"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-xs font-medium text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                You are all caught up.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "pt-2.5 first:pt-0 rounded-lg p-2.5 text-xs transition-colors group relative",
                  item.read
                    ? "bg-card text-muted-foreground hover:bg-muted/30"
                    : "bg-primary/5 border border-primary/20 text-foreground"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {!item.read && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs truncate",
                          item.read
                            ? "font-medium text-foreground/90"
                            : "font-semibold text-foreground"
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground break-words line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  {!item.read ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-primary hover:text-primary hover:bg-primary/10 shrink-0 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(item.id);
                      }}
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 mr-0.5" />
                      <span>Read</span>
                    </Button>
                  ) : null}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/80 pl-4">
                  <span>{formatDate(item.createdAt, "d MMM, h:mm a")}</span>
                  {item.href && (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                    >
                      <span>View</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Infinite Scroll Fetcher / End Indicator */}
          {hasNextPage && (
            <div className="py-2 text-center">
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Load older alerts
                </Button>
              )}
            </div>
          )}

          {!hasNextPage && notifications.length > 0 && (
            <p className="py-2 text-center text-[11px] text-muted-foreground/70">
              You&apos;ve reached the end
            </p>
          )}
        </div>

        {/* Dedicated Page Navigation Footer */}
        <div className="border-t border-border bg-card/90 p-2.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold h-8 rounded-lg shadow-2xs hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Link href="/account/notifications">
              <span>View all notifications</span>
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
