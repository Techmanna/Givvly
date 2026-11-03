"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchCatalogCollections,
  fetchCatalogProductBySlug,
  fetchCatalogProducts,
} from "../api";
import { catalogKeys } from "../keys";
import type { CatalogFilters, CatalogProduct } from "../types";

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

export function useCatalogCollections() {
  return useQuery({
    queryKey: catalogKeys.collections(),
    queryFn: fetchCatalogCollections,
  });
}

