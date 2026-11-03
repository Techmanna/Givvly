"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  fetchBanks,
  fetchEventDetail,
  fetchEventStats,
  fetchEventSummary,
  fetchMyEvents,
  fetchPayoutAccount,
  fetchPublicEvent,
  fetchPublicEventsList,
  publishEvent,
  requestUploadPresign,
  resolveBankAccount,
  savePayoutAccount,
  unlockPrivateEvent,
  updateEventInvite,
  updateEventSettings,
  updateEventSummary,
} from "../api";
import { eventKeys } from "../keys";
import type {
  CreateEventRequest,
  InviteTemplateData,
  PresignUploadRequest,
  UpdateEventRequest,
} from "../types";

export function useMyEvents() {
  return useQuery({
    queryKey: eventKeys.mine(),
    queryFn: fetchMyEvents,
  });
}

export function useEventDetail(id: string, initialData?: Awaited<ReturnType<typeof fetchEventDetail>>) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEventDetail(id),
    initialData,
  });
}

export function useEventStats(id: string) {
  return useQuery({
    queryKey: eventKeys.stats(id),
    queryFn: () => fetchEventStats(id),
  });
}

export function usePublicEvent(slug: string, initialData?: Awaited<ReturnType<typeof fetchPublicEvent>>) {
  return useQuery({
    queryKey: eventKeys.public(slug),
    queryFn: () => fetchPublicEvent(slug),
    initialData,
  });
}

export function usePublicEventsList(
  filters?: { type?: string; q?: string },
  initialData?: Awaited<ReturnType<typeof fetchPublicEventsList>>
) {
  return useQuery({
    queryKey: eventKeys.publicList(filters),
    queryFn: () => fetchPublicEventsList(filters),
    initialData,
  });
}

export function useCreateAndPublishEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEventRequest) => {
      const created = await createEvent(payload);
      const published = await publishEvent(created.id);
      return published;
    },
    onSuccess: (published) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.mine() });
      queryClient.setQueryData(eventKeys.detail(published.id), published);
    },
  });
}

export function usePresignUploadMutation() {
  return useMutation({
    mutationFn: (payload: PresignUploadRequest) =>
      requestUploadPresign(payload),
  });
}

export function useUnlockEventMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accessCode: string) => unlockPrivateEvent(slug, accessCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.public(slug) });
    },
  });
}

export function useBanksQuery() {
  return useQuery({
    queryKey: eventKeys.banks(),
    queryFn: fetchBanks,
    staleTime: 10 * 60_000,
  });
}

export function usePayoutAccountQuery() {
  return useQuery({
    queryKey: eventKeys.payoutAccount(),
    queryFn: fetchPayoutAccount,
  });
}

export function useResolveBankAccountMutation() {
  return useMutation({
    mutationFn: (payload: { bankCode: string; accountNumber: string }) =>
      resolveBankAccount(payload),
  });
}

export function useSavePayoutAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      bankCode: string;
      accountNumber: string;
      accountName: string;
      confirmedOwnership: boolean;
    }) => savePayoutAccount(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(eventKeys.payoutAccount(), saved);
      queryClient.invalidateQueries({ queryKey: eventKeys.mine() });
    },
  });
}

export function useUpdateEventInviteMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: InviteTemplateData) =>
      updateEventInvite(eventId, template),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: eventKeys.public(updated.slug) });
    },
  });
}

export function useEventSummaryQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.summary(eventId),
    queryFn: () => fetchEventSummary(eventId),
  });
}

export function useToggleKeepsakeMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keepsakePublished: boolean) =>
      updateEventSummary(eventId, keepsakePublished),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.summary(eventId), updated);
      queryClient.setQueryData(eventKeys.detail(eventId), updated.event);
    },
  });
}

export function useUpdateEventSettingsMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateEventRequest) =>
      updateEventSettings(eventId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: eventKeys.mine() });
      queryClient.invalidateQueries({ queryKey: eventKeys.public(updated.slug) });
    },
  });
}


