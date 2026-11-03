"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api";
import { notificationKeys } from "../keys";
import type { NotificationItem, NotificationPreferences } from "../types";

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = queryClient.getQueryData<NotificationItem[]>(
        notificationKeys.list()
      );
      queryClient.setQueryData<NotificationItem[]>(
        notificationKeys.list(),
        (old) => {
          const list = Array.isArray(old) ? old : [];
          return list.map((item) =>
            item.id === id ? { ...item, read: true } : item
          );
        }
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
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

