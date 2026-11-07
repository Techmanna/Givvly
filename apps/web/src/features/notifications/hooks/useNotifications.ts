"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  type NotificationQueryParams,
  type NotificationListResponse,
} from "../api";
import { notificationKeys } from "../keys";
import type { NotificationItem, NotificationPreferences } from "../types";

export function useNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: [...notificationKeys.list(), params],
    queryFn: () => fetchNotifications(params),
    refetchInterval: 30_000,
  });
}

export function useInfiniteNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}) {
  const limit = options?.limit ?? 10;
  const unreadOnly = options?.unreadOnly;

  return useInfiniteQuery({
    queryKey: [...notificationKeys.list(), "infinite", { unreadOnly, limit }],
    queryFn: ({ pageParam = 1 }) =>
      fetchNotifications({
        page: pageParam,
        limit,
        unread: unreadOnly,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: NotificationListResponse) => {
      if (lastPage.hasMore) {
        return (lastPage.page ?? 1) + 1;
      }
      return undefined;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      // Optimistically update all notification queries in cache
      queryClient.setQueriesData({ queryKey: notificationKeys.list() }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((item) =>
            item.id === id ? { ...item, read: true } : item
          );
        }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              unreadCount: Math.max(0, (p.unreadCount ?? 1) - 1),
              notifications: (p.notifications ?? []).map((item: any) =>
                item.id === id ? { ...item, read: true } : item
              ),
            })),
          };
        }
        if (old.notifications) {
          return {
            ...old,
            unreadCount: Math.max(0, (old.unreadCount ?? 1) - 1),
            notifications: old.notifications.map((item: any) =>
              item.id === id ? { ...item, read: true } : item
            ),
          };
        }
        return old;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      queryClient.setQueriesData({ queryKey: notificationKeys.list() }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((item) => ({ ...item, read: true }));
        }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              unreadCount: 0,
              notifications: (p.notifications ?? []).map((item: any) => ({
                ...item,
                read: true,
              })),
            })),
          };
        }
        if (old.notifications) {
          return {
            ...old,
            unreadCount: 0,
            notifications: old.notifications.map((item: any) => ({
              ...item,
              read: true,
            })),
          };
        }
        return old;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: fetchNotificationPreferences,
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NotificationPreferences) =>
      updateNotificationPreferences(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationKeys.preferences(), updated);
    },
  });
}

