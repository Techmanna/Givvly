"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchEventGifts,
  fetchPaymentStatus,
  fetchThankYouList,
  initiateMoneyGift,
  sendBulkThankYou,
  toggleGiftThanked,
} from "../api";
import { giftKeys } from "../keys";
import type {
  BulkThankYouInput,
  Gift,
  GiftFilters,
  GiveMoneyRequest,
} from "../types";

export function useEventGifts(id: string, filters: GiftFilters = {}) {
  return useQuery({
    queryKey: giftKeys.byEvent(id, filters),
    queryFn: () => fetchEventGifts(id, filters),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useThankYouList(eventId: string) {
  return useQuery({
    queryKey: giftKeys.thankYou(eventId),
    queryFn: () => fetchThankYouList(eventId),
  });
}

export function useToggleGiftThankedMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      giftId,
      thanked,
    }: {
      giftId: string;
      thanked: boolean;
    }) => toggleGiftThanked(giftId, thanked),
    onMutate: async ({ giftId, thanked }) => {
      await queryClient.cancelQueries({
        queryKey: giftKeys.all,
      });

      const previousThankYou = queryClient.getQueryData<Gift[]>(
        giftKeys.thankYou(eventId)
      );
      const previousDefaultFeed = queryClient.getQueryData<Gift[]>(
        giftKeys.byEvent(eventId, {})
      );

      const updateList = (old: Gift[] | undefined) =>
        old
          ? old.map((g) => (g.id === giftId ? { ...g, thanked } : g))
          : undefined;

      if (previousThankYou) {
        queryClient.setQueryData<Gift[]>(
          giftKeys.thankYou(eventId),
          updateList(previousThankYou)
        );
      }
      if (previousDefaultFeed) {
        queryClient.setQueryData<Gift[]>(
          giftKeys.byEvent(eventId, {}),
          updateList(previousDefaultFeed)
        );
      }

      return { previousThankYou, previousDefaultFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousThankYou) {
        queryClient.setQueryData(
          giftKeys.thankYou(eventId),
          context.previousThankYou
        );
      }
      if (context?.previousDefaultFeed) {
        queryClient.setQueryData(
          giftKeys.byEvent(eventId, {}),
          context.previousDefaultFeed
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: giftKeys.all });
    },
  });
}

export function useBulkThankYouMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkThankYouInput) =>
      sendBulkThankYou(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftKeys.all });
    },
  });
}

export function useInitiateMoneyGiftMutation(slug: string) {
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: GiveMoneyRequest;
      idempotencyKey: string;
    }) => initiateMoneyGift(slug, payload, idempotencyKey),
  });
}

export function usePaymentStatusQuery(
  reference: string | null,
  pollingAllowed: boolean
) {
  return useQuery({
    queryKey: giftKeys.payment(reference ?? "none"),
    queryFn: () => fetchPaymentStatus(reference!),
    enabled: Boolean(reference),
    refetchInterval: (query) => {
      if (!pollingAllowed) return false;
      const status = query.state.data?.status;
      if (status === "SUCCESS" || status === "FAILED") {
        return false;
      }
      return 2_000;
    },
  });
}

