import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkDeleteAdminProducts,
  bulkUpdateAdminProductStock,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminDisputes,
  fetchAdminEvents,
  fetchAdminLedger,
  fetchAdminModerationQueue,
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminPayouts,
  fetchAdminProducts,
  fetchAdminUsers,
  fetchAdminVendors,
  resolveAdminDispute,
  resolveAdminModerationItem,
  retryAdminPayout,
  updateAdminOrderStatus,
  updateAdminProduct,
} from "../api";
import { adminKeys } from "../keys";

export function useAdminModerationQueue() {
  return useQuery({
    queryKey: adminKeys.moderation(),
    queryFn: () => fetchAdminModerationQueue(),
  });
}

export function useResolveModerationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: "APPROVED" | "REMOVED";
    }) => resolveAdminModerationItem(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moderation() });
    },
  });
}

export function useAdminPayouts() {
  return useQuery({
    queryKey: adminKeys.payouts(),
    queryFn: () => fetchAdminPayouts(),
  });
}

export function useRetryAdminPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payoutId: string) => retryAdminPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.payouts() });
    },
  });
}

export function useAdminLedger() {
  return useQuery({
    queryKey: adminKeys.ledger(),
    queryFn: () => fetchAdminLedger(),
  });
}

export function useAdminDisputes() {
  return useQuery({
    queryKey: adminKeys.disputes(),
    queryFn: () => fetchAdminDisputes(),
  });
}

export function useResolveAdminDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      status,
    }: {
      disputeId: string;
      status: "RESOLVED" | "REJECTED";
    }) => resolveAdminDispute(disputeId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.disputes() });
    },
  });
}

export function useAdminEvents() {
  return useQuery({
    queryKey: adminKeys.events(),
    queryFn: () => fetchAdminEvents(),
  });
}

export function useAdminPayments() {
  return useQuery({
    queryKey: adminKeys.payments(),
    queryFn: () => fetchAdminPayments(),
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: adminKeys.orders(),
    queryFn: () => fetchAdminOrders(),
  });
}

export function useAdminOrderDetail(orderId: string) {
  return useQuery({
    queryKey: adminKeys.orderDetail(orderId),
    queryFn: () => fetchAdminOrderDetail(orderId),
    enabled: Boolean(orderId),
  });
}

export function useAdminVendors() {
  return useQuery({
    queryKey: adminKeys.vendors(),
    queryFn: () => fetchAdminVendors(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => fetchAdminUsers(),
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: () => fetchAdminProducts(),
  });
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      patch,
    }: {
      productId: string;
      patch: Parameters<typeof updateAdminProduct>[1];
    }) => updateAdminProduct(productId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteAdminProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useBulkDeleteAdminProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, permanent }: { ids: string[]; permanent?: boolean }) =>
      bulkDeleteAdminProducts(ids, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useBulkUpdateAdminProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, inStock }: { ids: string[]; inStock: boolean }) =>
      bulkUpdateAdminProductStock(ids, inStock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: Parameters<typeof updateAdminOrderStatus>[1];
    }) => updateAdminOrderStatus(orderId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      if (variables?.orderId) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.orderDetail(variables.orderId),
        });
      }
    },
  });
}
