"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contributeToPool,
  createOwnerRegistryEntry,
  deleteOwnerRegistryEntry,
  fetchOwnerRegistry,
  purchaseRegistryItem,
  reserveRegistryItem,
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

