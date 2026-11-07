"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchCatalogCollections,
  fetchCatalogProductBySlug,
  fetchCatalogProducts,
  fetchProductReviews,
  fetchVtuPlans,
  fetchVtuProviders,
  submitProductReview,
} from "../api";
import { catalogKeys } from "../keys";
import type {
  BillSpotVtuType,
  CatalogFilters,
  CatalogProduct,
  CreateProductReviewInput,
  ProductReview,
} from "../types";

export function useCatalogProducts(filters: CatalogFilters = {}) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: () => fetchCatalogProducts(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCatalogProduct(
  slug: string,
  initialData?: CatalogProduct
) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => fetchCatalogProductBySlug(slug),
    initialData,
  });
}

export function useProductReviews(
  slug: string,
  initialData?: ProductReview[]
) {
  return useQuery({
    queryKey: catalogKeys.reviews(slug),
    queryFn: () => fetchProductReviews(slug),
    initialData,
  });
}

export function useSubmitProductReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductReviewInput) =>
      submitProductReview(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.reviews(slug) });
      queryClient.invalidateQueries({ queryKey: catalogKeys.product(slug) });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}

export function useCatalogCollections() {
  return useQuery({
    queryKey: catalogKeys.collections(),
    queryFn: fetchCatalogCollections,
  });
}

/**
 * Cached hook for BillSpot VTU providers (MTN, Airtel, Glo, T2mobile).
 * Cached client-side for 24 hours (matching backend Redis TTL).
 */
export function useVtuProviders(type: BillSpotVtuType = "airtime") {
  return useQuery({
    queryKey: catalogKeys.vtuProviders(type),
    queryFn: () => fetchVtuProviders(type),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * Cached hook for BillSpot Data plans per provider.
 * Cached client-side for 24 hours (matching backend Redis TTL).
 */
export function useVtuPlans(provider: string, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.vtuPlans(provider),
    queryFn: () => fetchVtuPlans(provider),
    enabled: Boolean(provider) && enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });
}
