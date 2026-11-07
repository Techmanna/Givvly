import { api } from "@/lib/api-client";
import type { NotificationItem, NotificationPreferences } from "./types";

export type NotificationQueryParams = {
  unread?: boolean;
  limit?: number;
  page?: number;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
};

export async function fetchNotifications(
  params?: NotificationQueryParams
): Promise<NotificationListResponse> {
  const query = new URLSearchParams();
  if (params?.unread !== undefined) query.set("unread", String(params.unread));
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.page !== undefined) query.set("page", String(params.page));

  const qs = query.toString();
  const endpoint = qs ? `/notifications?${qs}` : "/notifications";

  const res = await api<
    | NotificationListResponse
    | { notifications?: NotificationItem[]; unreadCount?: number }
    | NotificationItem[]
  >(endpoint);

  if (Array.isArray(res)) {
    const unreadCount = res.filter((n) => !n.read).length;
    return {
      notifications: res,
      unreadCount,
      total: res.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? res.length,
      totalPages: 1,
      hasMore: false,
    };
  }

  const items = Array.isArray((res as any)?.notifications)
    ? (res as any).notifications
    : [];
  const unreadCount =
    typeof (res as any)?.unreadCount === "number"
      ? (res as any).unreadCount
      : items.filter((n: any) => !n.read).length;

  return {
    notifications: items,
    unreadCount,
    total: (res as any)?.total ?? items.length,
    page: (res as any)?.page ?? params?.page ?? 1,
    limit: (res as any)?.limit ?? params?.limit ?? items.length,
    totalPages: (res as any)?.totalPages ?? 1,
    hasMore: (res as any)?.hasMore ?? false,
  };
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
    }
  );
}

export function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return api<{ success: boolean }>("/notifications/read-all", {
    method: "POST",
  });
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api<any>("/me/notification-preferences");
  if (Array.isArray(res)) {
    const emailPref = res.find((p: any) => p.channel === "EMAIL");
    const whatsappPref = res.find(
      (p: any) => p.channel === "WHATSAPP" || p.channel === "SMS"
    );
    const inAppPref = res.find((p: any) => p.channel === "IN_APP");
    return {
      email: emailPref ? emailPref.enabled : true,
      whatsappOrSms: whatsappPref ? whatsappPref.enabled : true,
      inApp: inAppPref ? inAppPref.enabled : true,
    };
  }
  return {
    email: res?.email ?? true,
    whatsappOrSms: res?.whatsappOrSms ?? true,
    inApp: res?.inApp ?? true,
  };
}

export function updateNotificationPreferences(
  payload: NotificationPreferences
): Promise<NotificationPreferences> {
  return api<NotificationPreferences>("/me/notification-preferences", {
    method: "PUT",
    body: payload,
  });
}

