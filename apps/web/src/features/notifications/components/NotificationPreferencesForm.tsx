"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/format";
import {
  useMarkNotificationReadMutation,
  useNotificationPreferences,
  useNotifications,
  useUpdateNotificationPreferencesMutation,
} from "../hooks/useNotifications";
import { notificationPreferencesSchema } from "../schemas";
import type { NotificationItem, NotificationPreferences } from "../types";

export function NotificationPreferencesForm() {
  const prefsQuery = useNotificationPreferences();
  const notificationsQuery = useNotifications();
  const updatePrefsMutation = useUpdateNotificationPreferencesMutation();
  const markReadMutation = useMarkNotificationReadMutation();

  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    values: prefsQuery.data ?? {
      email: true,
      whatsappOrSms: true,
      inApp: true,
    },
  });

  const emailEnabled = useWatch({ control: form.control, name: "email" });
  const whatsappEnabled = useWatch({
    control: form.control,
    name: "whatsappOrSms",
  });
  const inAppEnabled = useWatch({ control: form.control, name: "inApp" });

  if (prefsQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (prefsQuery.isError) {
    return (
      <ErrorState
        title="Could not load notification settings"
        description="Check your connection and try again."
        onRetry={() => prefsQuery.refetch()}
      />
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updatePrefsMutation.mutateAsync(values);
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Could not save notification preferences. Please try again.");
    }
  });

  const rawData = notificationsQuery.data as unknown;
  const items: NotificationItem[] = Array.isArray(rawData)
    ? (rawData as NotificationItem[])
    : Array.isArray(
        (rawData as { notifications?: NotificationItem[] } | null | undefined)
          ?.notifications
      )
    ? (rawData as { notifications: NotificationItem[] }).notifications
    : [];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Notification channels</CardTitle>
          <CardDescription>
            Choose how Givvly notifies you about new gifts, RSVPs, payouts, and
            order deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-email" className="text-sm font-medium">
                    Email notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gift receipts, payout alerts, and weekly event summaries.
                  </p>
                </div>
                <Switch
                  id="pref-email"
                  checked={Boolean(emailEnabled)}
                  onCheckedChange={(checked) =>
                    form.setValue("email", Boolean(checked), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pref-whatsapp"
                    className="text-sm font-medium"
                  >
                    WhatsApp or SMS alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Instant alerts when a guest sends a cash gift or when a
                    package is out for delivery.
                  </p>
                </div>
                <Switch
                  id="pref-whatsapp"
                  checked={Boolean(whatsappEnabled)}
                  onCheckedChange={(checked) =>
                    form.setValue("whatsappOrSms", Boolean(checked), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-inapp" className="text-sm font-medium">
                    In-app notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show activity updates inside your Givvly dashboard bell.
                  </p>
                </div>
                <Switch
                  id="pref-inapp"
                  checked={Boolean(inAppEnabled)}
                  onCheckedChange={(checked) =>
                    form.setValue("inApp", Boolean(checked), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={updatePrefsMutation.isPending}>
              {updatePrefsMutation.isPending
                ? "Saving..."
                : "Save preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Recent activity
        </h2>

        {items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="When guests send gifts or RSVP to your events, updates will appear here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(item.createdAt, "d MMM yyyy, h:mm a")}
                    </p>
                  </div>

                  {!item.read ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => markReadMutation.mutate(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Mark read</span>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

