import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDirectOrder,
  createBespokeWishPackage,
  fetchBespokeWishDetail,
  payBespokeWishQuote,
  fetchOrderDetail,
  fetchOrders,
  fetchOrderTracking,
  payOrder,
  submitOrderDispute,
  submitOrderReview,
} from "../api";
import { orderKeys } from "../keys";
import type {
  CreateDirectOrderRequest,
  DisputeFormInput,
  ReviewFormInput,
} from "../types";

function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem_ord_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useOrdersList() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: () => fetchOrders(),
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrderDetail(id),
    enabled: Boolean(id),
  });
}

export function useOrderTracking(token: string) {
  return useQuery({
    queryKey: orderKeys.tracking(token),
    queryFn: () => fetchOrderTracking(token),
    enabled: Boolean(token),
  });
}

export function useCreateDirectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDirectOrderRequest) => {
      const key = generateIdempotencyKey();
      return createDirectOrder(payload, key);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.setQueryData(orderKeys.detail(result.order.id), result.order);
    },
  });
}

export function useSubmitOrderReview(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewFormInput) =>
      submitOrderReview(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

export function useSubmitOrderDispute(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DisputeFormInput) =>
      submitOrderDispute(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
  });
}

export function useBespokeWishDetail(token: string) {
  return useQuery({
    queryKey: orderKeys.quoteDetail(token),
    queryFn: () => fetchBespokeWishDetail(token),
    enabled: Boolean(token),
  });
}

export function useCreateBespokeWishPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: import("../types").CreateBespokeWishPackageInput) =>
      createBespokeWishPackage(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({
        queryKey: orderKeys.quoteDetail(result.trackingToken),
      });
    },
  });
}

export function usePayBespokeWishQuote(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => payBespokeWishQuote(token),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderKeys.quoteDetail(token),
      });
    },
  });
}

