import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkDeleteAdminProducts,
  bulkUpdateAdminProductStock,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminDisputes,
  fetchAdminEvents,
  fetchAdminEventDetail,
  updateAdminEventStatus,
  deleteAdminEvent,
  fetchAdminLedger,
  fetchAdminLedgerReport,
  fetchAdminModerationQueue,
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminPayouts,
  fetchAdminProducts,
  fetchAdminUsers,
  fetchAdminUserDetail,
  suspendAdminUser,
  restoreAdminUser,
  fetchAdminVendors,
  resolveAdminDispute,
  resolveAdminModerationItem,
  retryAdminPayout,
  updateAdminOrderStatus,
  updateAdminProduct,
  fetchAdminBespokeQuotes,
  provideAdminBespokeQuote,
  fetchAdminShippingZones,
  createAdminShippingZone,
  updateAdminShippingZone,
  deleteAdminShippingZone,
  createAdminVendor,
  updateAdminVendor,
  deleteAdminVendor,
  recalculateVendorPrices,
  forwardOrderToVendor,
  issueAdminRefund,
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

export function useAdminLedgerReport() {
  return useQuery({
    queryKey: [...adminKeys.ledger(), "report"] as const,
    queryFn: () => fetchAdminLedgerReport(),
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

export function useAdminEventDetail(id: string | null) {
  return useQuery({
    queryKey: id ? adminKeys.eventDetail(id) : ["admin", "events", "none"],
    queryFn: () => fetchAdminEventDetail(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
      reason?: string;
    }) => updateAdminEventStatus(id, status, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.events() });
      queryClient.invalidateQueries({ queryKey: adminKeys.eventDetail(variables.id) });
    },
  });
}

export function useDeleteAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.events() });
    },
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

export function useAdminUserDetail(id: string | null) {
  return useQuery({
    queryKey: id ? adminKeys.userDetail(id) : ["admin", "users", "none"],
    queryFn: () => fetchAdminUserDetail(id!),
    enabled: Boolean(id),
  });
}

export function useSuspendAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendAdminUser(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(id) });
    },
  });
}

export function useRestoreAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreAdminUser(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(id) });
    },
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
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
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
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
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

export function useAdminBespokeQuotes() {
  return useQuery({
    queryKey: adminKeys.quotes(),
    queryFn: () => fetchAdminBespokeQuotes(),
  });
}

export function useProvideAdminBespokeQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: import("@givvly/contracts").ProvideBespokeQuoteInput;
    }) => provideAdminBespokeQuote(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.quotes() });
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
    },
  });
}

export function useAdminShippingZones() {
  return useQuery({
    queryKey: adminKeys.shippingZones(),
    queryFn: () => fetchAdminShippingZones(),
  });
}

export function useCreateAdminShippingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<import("@givvly/contracts").ShippingZone, "id">) =>
      createAdminShippingZone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingZones() });
      queryClient.invalidateQueries({ queryKey: ["catalog", "shipping-zones"] });
    },
  });
}

export function useUpdateAdminShippingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Omit<import("@givvly/contracts").ShippingZone, "id">>;
    }) => updateAdminShippingZone(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingZones() });
      queryClient.invalidateQueries({ queryKey: ["catalog", "shipping-zones"] });
    },
  });
}

export function useDeleteAdminShippingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminShippingZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.shippingZones() });
      queryClient.invalidateQueries({ queryKey: ["catalog", "shipping-zones"] });
    },
  });
}

export function useCreateAdminVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createAdminVendor>[0]) =>
      createAdminVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.vendors() });
    },
  });
}

export function useUpdateAdminVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vendorId,
      payload,
    }: {
      vendorId: string;
      payload: Parameters<typeof updateAdminVendor>[1];
    }) => updateAdminVendor(vendorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.vendors() });
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useDeleteAdminVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => deleteAdminVendor(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.vendors() });
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useRecalculateVendorPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => recalculateVendorPrices(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

export function useForwardOrderToVendor() {
  return useMutation({
    mutationFn: ({
      orderId,
      vendorId,
      channel,
    }: {
      orderId: string;
      vendorId?: string;
      channel: "EMAIL" | "WHATSAPP";
    }) => forwardOrderToVendor(orderId, { vendorId, channel }),
  });
}

export function useIssueAdminRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: issueAdminRefund,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.payments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.ledger() });
      if (data.orderId) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.orderDetail(data.orderId),
        });
      }
    },
  });
}

