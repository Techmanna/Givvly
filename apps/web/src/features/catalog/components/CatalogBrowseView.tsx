"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {  Gift } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores/cart-store";
import {
  useCatalogCollections,
  useCatalogProducts,
} from "../hooks/useCatalog";
import type { CatalogFilters } from "../types";
import { FilterBar } from "./FilterBar";
import { ProductCard } from "./ProductCard";
import { GiftBoxDrawer } from "./GiftBoxDrawer";
import { FloatingBoxButton } from "./FloatingBoxButton";

export function CatalogBrowseView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer, getBoxItemCount } = useCartStore();

  const filters: CatalogFilters = {
    mainCategory: searchParams.get("mainCategory") ?? "ALL",
    occasion: searchParams.get("occasion") ?? "ALL",
    relationship: searchParams.get("relationship") ?? "ALL",
    giftType: searchParams.get("giftType") ?? "ALL",
    gender: searchParams.get("gender") ?? "ALL",
    ageGroup: searchParams.get("ageGroup") ?? "ALL",
    isCombo: searchParams.get("isCombo") === "true" ? true : undefined,
    maxPriceKobo: searchParams.get("maxPriceKobo")
      ? Number(searchParams.get("maxPriceKobo"))
      : undefined,
    q: searchParams.get("q") ?? "",
  };

  const productsQuery = useCatalogProducts(filters);
  const collectionsQuery = useCatalogCollections();

  const updateFilters = (next: CatalogFilters) => {
    const params = new URLSearchParams();
    if (next.mainCategory && next.mainCategory !== "ALL") {
      params.set("mainCategory", next.mainCategory);
    }
    if (next.occasion && next.occasion !== "ALL") {
      params.set("occasion", next.occasion);
    }
    if (next.relationship && next.relationship !== "ALL") {
      params.set("relationship", next.relationship);
    }
    if (next.giftType && next.giftType !== "ALL") {
      params.set("giftType", next.giftType);
    }
    if (next.gender && next.gender !== "ALL") {
      params.set("gender", next.gender);
    }
    if (next.ageGroup && next.ageGroup !== "ALL") {
      params.set("ageGroup", next.ageGroup);
    }
    if (next.isCombo) {
      params.set("isCombo", "true");
    }
    if (next.maxPriceKobo && next.maxPriceKobo > 0) {
      params.set("maxPriceKobo", String(next.maxPriceKobo));
    }
    if (next.q && next.q.trim()) {
      params.set("q", next.q.trim());
    }
    const qs = params.toString();
    router.replace(qs ? `/gifts?${qs}` : "/gifts");
  };

  const collections = collectionsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const boxItemCount = getBoxItemCount();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      {/* Editorial Atelier Header */}
      <div className="paper-surface stationery-frame relative overflow-hidden rounded-[26px] border border-border p-7 sm:p-10 editorial-enter">
        <div
          aria-hidden="true"
          className="animate-pulse-halo pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <span>The Givvly Gift Atelier &amp; Box Studio</span>
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Thoughtful keepsakes &amp;{" "}
              <span className="italic font-normal text-primary">
                curated gift boxes
              </span>
              .
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Add individual keepsakes into your bespoke gift box to create a
              personalized combo, or choose a ready-to-ship predefined luxury
              hamper. Delivered with real-time tracking across Nigeria.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#D4A959]/50 bg-card px-5 py-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary hover:bg-primary-subtle/30"
            >
              <Gift className="h-4 w-4 text-primary" />
              <span>My Curated Box ({boxItemCount})</span>
            </button>
          </div>
        </div>

        {collections.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-border/70 pt-6 sm:grid-cols-2">
            {collections.map((col) => (
              <div
                key={col.id}
                className="rounded-2xl border border-accent/35 bg-accent/10 p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Featured Collection
                </p>
                <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">
                  {col.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {col.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <FilterBar filters={filters} onChange={updateFilters} />

      {productsQuery.isLoading ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          <Skeleton className="h-80 w-full rounded-[22px]" />
          <Skeleton className="h-80 w-full rounded-[22px]" />
          <Skeleton className="h-80 w-full rounded-[22px]" />
        </div>
      ) : productsQuery.isError ? (
        <ErrorState
          title="Could not load gift catalog"
          description="Check your connection and try again."
          onRetry={() => productsQuery.refetch()}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No matching gifts found"
          description="Try adjusting your occasion, recipient, or category filter to discover more curated gifts."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Floating interactive box drawer & trigger */}
      <FloatingBoxButton />
      <GiftBoxDrawer />
    </div>
  );
}
