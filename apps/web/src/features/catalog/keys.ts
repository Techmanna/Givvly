import type { BillSpotVtuType, CatalogFilters } from "@givvly/contracts";

export const catalogKeys = {
  all: ["catalog"] as const,
  products: (filters: CatalogFilters = {}) =>
    [...catalogKeys.all, "products", filters] as const,
  product: (slug: string) => [...catalogKeys.all, "product", slug] as const,
  collections: () => [...catalogKeys.all, "collections"] as const,
  vtuProviders: (type: BillSpotVtuType = "airtime") =>
    [...catalogKeys.all, "vtu-providers", type] as const,
  vtuPlans: (provider: string) =>
    [...catalogKeys.all, "vtu-plans", provider.toLowerCase()] as const,
};
