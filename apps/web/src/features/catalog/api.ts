import { api } from "@/lib/api-client";
import type {
  BillSpotPlansResponse,
  BillSpotProvidersResponse,
  BillSpotVtuType,
  CatalogCollection,
  CatalogFilters,
  CatalogProduct,
} from "./types";

function toCatalogQuery(filters: CatalogFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.mainCategory && filters.mainCategory !== "ALL") {
    params.set("mainCategory", filters.mainCategory);
  }
  if (filters.giftType && filters.giftType !== "ALL") {
    params.set("giftType", filters.giftType);
  }
  if (filters.gender && filters.gender !== "ALL") {
    params.set("gender", filters.gender);
  }
  if (filters.ageGroup && filters.ageGroup !== "ALL") {
    params.set("ageGroup", filters.ageGroup);
  }
  if (filters.isCombo !== undefined) {
    params.set("isCombo", String(filters.isCombo));
  }
  if (filters.occasion && filters.occasion !== "ALL") {
    params.set("occasion", filters.occasion);
  }
  if (filters.relationship && filters.relationship !== "ALL") {
    params.set("relationship", filters.relationship);
  }
  if (filters.maxPriceKobo && filters.maxPriceKobo > 0) {
    params.set("maxPriceKobo", String(filters.maxPriceKobo));
  }
  if (filters.q && filters.q.trim()) {
    params.set("q", filters.q.trim());
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function fetchCatalogProducts(
  filters: CatalogFilters = {}
): Promise<CatalogProduct[]> {
  return api<CatalogProduct[]>(
    `/catalog/products${toCatalogQuery(filters)}`
  );
}

export function fetchCatalogProductBySlug(
  slug: string
): Promise<CatalogProduct> {
  return api<CatalogProduct>(
    `/catalog/products/${encodeURIComponent(slug)}`
  );
}

export function fetchCatalogCollections(): Promise<CatalogCollection[]> {
  return api<CatalogCollection[]>("/catalog/collections");
}

export function fetchVtuProviders(
  type: BillSpotVtuType = "airtime"
): Promise<BillSpotProvidersResponse> {
  return api<BillSpotProvidersResponse>(
    `/digital-gifts/vtu/providers?type=${encodeURIComponent(type)}`
  );
}

export function fetchVtuPlans(
  provider: string
): Promise<BillSpotPlansResponse> {
  return api<BillSpotPlansResponse>(
    `/digital-gifts/vtu/plans/${encodeURIComponent(provider.toLowerCase())}`
  );
}
