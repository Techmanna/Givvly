import type { CatalogFilters } from "@givvly/contracts";

export const catalogKeys = {
  all: ["catalog"] as const,
  products: (filters: CatalogFilters = {}) =>
    [...catalogKeys.all, "products", filters] as const,
  product: (slug: string) => [...catalogKeys.all, "product", slug] as const,
  collections: () => [...catalogKeys.all, "collections"] as const,
};

