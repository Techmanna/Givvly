import { api } from "@/lib/api-client";
import type { NotificationItem, NotificationPreferences } from "./types";

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await api<
    { notifications?: NotificationItem[]; unreadCount?: number } | NotificationItem[]
  >("/notifications");
  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray((res as { notifications?: NotificationItem[] }).notifications)) {
    return (res as { notifications: NotificationItem[] }).notifications;
  }
  return [];
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
    }
  );
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

