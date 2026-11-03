import { api } from "@/lib/api-client";
import type { CatalogProduct, Order, OrderStatus } from "./types";

export function fetchVendorOrders() {
  return api<Order[]>("/vendor/orders");
}

export function updateVendorOrderStatus(orderId: string, status: OrderStatus) {
  return api<Order>(`/vendor/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function fetchVendorProducts() {
  return api<CatalogProduct[]>("/vendor/products");
}

export function createVendorProduct(payload: {
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  inStock: boolean;
}) {
  return api<CatalogProduct>("/vendor/products", {
    method: "POST",
    body: payload,
  });
}

export function updateVendorProduct(
  productId: string,
  patch: Partial<CatalogProduct>
) {
  return api<CatalogProduct>(
    `/vendor/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: patch,
    }
  );
}

