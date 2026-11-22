"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contributeToPool,
  createOwnerRegistryEntry,
  deleteOwnerRegistryEntry,
  fetchOwnerRegistry,
  purchaseRegistryItem,
  purchaseRegistryItemsBatch,
  redeemRegistryItems,
  reserveRegistryItem,
  reserveRegistryItemsBatch,
  updateOwnerRegistryEntry,
} from "../api";
import { registryKeys } from "../keys";

export function useOwnerRegistry(eventId: string) {
  return useQuery({
    queryKey: registryKeys.byEvent(eventId),
    queryFn: () => fetchOwnerRegistry(eventId),
  });
}

export function useCreateRegistryEntryMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      title: string;
      priceKobo: number;
      productId?: string;
      isPool?: boolean;
      poolMode?: "PRODUCT" | "CASH";
      deadline?: string;
    }) => createOwnerRegistryEntry(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: registryKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteRegistryEntryMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteOwnerRegistryEntry(eventId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: registryKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateRegistryEntryMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      mode,
      status,
    }: {
      itemId: string;
      mode?: "PRODUCT" | "CASH";
      status?: "AVAILABLE" | "RESERVED" | "CLAIMED";
    }) => updateOwnerRegistryEntry(eventId, itemId, { mode, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: registryKeys.byEvent(eventId),
      });
    },
  });
}

export function useReserveRegistryItemMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => reserveRegistryItem(slug, itemId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", "public", slug] });
    },
  });
}

export function usePurchaseRegistryItemMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: {
        itemId: string;
        name?: string;
        email: string;
        message?: string;
        anonymous: boolean;
      };
      idempotencyKey: string;
    }) => purchaseRegistryItem(slug, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", "public", slug] });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
  });
}

export function useContributeToPoolMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: {
        poolId: string;
        amountKobo: number;
        name?: string;
        email: string;
        message?: string;
        anonymous: boolean;
      };
      idempotencyKey: string;
    }) => contributeToPool(slug, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", "public", slug] });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
  });
}

export function useReserveRegistryItemsBatchMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemIds: string[]) => reserveRegistryItemsBatch(slug, itemIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", "public", slug] });
    },
  });
}

export function usePurchaseRegistryItemsBatchMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: {
        itemIds: string[];
        reservationToken: string;
        name?: string;
        email: string;
        message?: string;
        anonymous: boolean;
        showOnWall?: boolean;
      };
      idempotencyKey: string;
    }) => purchaseRegistryItemsBatch(slug, payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", "public", slug] });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
  });
}

export function useRedeemRegistryItemsMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof redeemRegistryItems>[1]) =>
      redeemRegistryItems(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: registryKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

