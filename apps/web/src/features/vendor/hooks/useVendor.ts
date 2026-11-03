import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nairaToKobo } from "@/lib/format";
import {
  createVendorProduct,
  fetchVendorOrders,
  fetchVendorProducts,
  updateVendorOrderStatus,
  updateVendorProduct,
} from "../api";
import { vendorKeys } from "../keys";
import type { OrderStatus, VendorProductInput } from "../types";

export function useVendorOrders() {
  return useQuery({
    queryKey: vendorKeys.orders(),
    queryFn: () => fetchVendorOrders(),
  });
}

export function useUpdateVendorOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateVendorOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.orders() });
    },
  });
}

export function useVendorProducts() {
  return useQuery({
    queryKey: vendorKeys.products(),
    queryFn: () => fetchVendorProducts(),
  });
}

export function useCreateVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VendorProductInput) =>
      createVendorProduct({
        name: input.name,
        description: input.description,
        priceKobo: nairaToKobo(input.priceNaira),
        category: input.category,
        inStock: input.inStock,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.products() });
    },
  });
}

export function useToggleVendorProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      inStock,
    }: {
      productId: string;
      inStock: boolean;
    }) => updateVendorProduct(productId, { inStock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.products() });
    },
  });
}
