"use client";

import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import {
  useMarkNotificationReadMutation,
  useNotifications,
} from "../hooks/useNotifications";
import type { NotificationItem } from "../types";

export function NotificationBell() {
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationReadMutation();

  const rawData = notificationsQuery.data as unknown;
  const items: NotificationItem[] = Array.isArray(rawData)
    ? (rawData as NotificationItem[])
    : Array.isArray(
        (rawData as { notifications?: NotificationItem[] } | null | undefined)
          ?.notifications
      )
    ? (rawData as { notifications: NotificationItem[] }).notifications
    : [];
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-heading text-sm font-semibold text-foreground">
            Notifications
          </span>
          <Link
            href="/account/notifications"
            className="text-xs font-medium text-primary hover:underline"
          >
            Preferences
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            You are all caught up.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-control border p-2.5 text-xs ${
                  item.read
                    ? "border-border bg-card text-muted-foreground"
                    : "border-primary/30 bg-primary/5 text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  {!item.read ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      onClick={() => markReadMutation.mutate(item.id)}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span>Read</span>
                    </button>
                  ) : null}
                </div>
                <p className="mt-1">{item.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDate(item.createdAt, "d MMM, h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

