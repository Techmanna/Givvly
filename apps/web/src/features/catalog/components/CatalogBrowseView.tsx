"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Wifi } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/shared/PaginationBar";
import {
  useCatalogCollections,
  useCatalogProducts,
  useVtuProviders,
} from "../hooks/useCatalog";
import type { CatalogFilters } from "../types";
import { FilterBar } from "./FilterBar";
import { ProductCard } from "./ProductCard";

export function CatalogBrowseView() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const vtuProvidersQuery = useVtuProviders("airtime");
  const vtuProviders = vtuProvidersQuery.data?.providers ?? [];

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
  const products = (productsQuery.data ?? []).filter(
    (p) =>
      p.slug !== "airtime" &&
      p.slug !== "data" &&
      !p.slug.startsWith("billspot-vtu-") &&
      p.digitalKind !== "AIRTIME" &&
      p.digitalKind !== "DATA"
  );

  const PAGE_SIZE = 12;
  const pageParam = Number(searchParams.get("page")) || 1;
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(pageParam, totalPages);
  const paginatedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    router.push(qs ? `/gifts?${qs}` : "/gifts", { scroll: true });
  };

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
              <span>The Givvly Gift Atelier</span>
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Thoughtful keepsakes &amp;{" "}
              <span className="italic font-normal text-primary">
                luxury hampers
              </span>
              .
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pick a curated keepsake or ready-to-ship luxury hamper and send it
              directly to your recipient&apos;s doorstep with real-time tracking
              across Nigeria.
            </p>
          </div>
        </div>

        {/* disabled for now */}
        {/* {collections.length > 0 ? (
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
        ) : null} */}
      </div>

      <div className="">
        <FilterBar filters={filters} onChange={updateFilters} />
      </div>

      {/* Instant Airtime & Data VTU Studio Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/25 bg-linear-to-r from-primary/10 via-card to-accent/15 p-5 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Instant VTU
            </span>
            {vtuProviders.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {vtuProviders.map((prov) => (
                  <img
                    key={prov.id}
                    src={prov.logo}
                    alt={prov.name}
                    title={prov.name}
                    className="h-5 w-5 rounded-full border border-background bg-white object-cover"
                  />
                ))}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              MTN • Airtel • Glo • T2mobile
            </span>
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Gift Instant Airtime or Data Bundles (Single or up to 50 Numbers)
          </h2>
          <p className="text-xs text-muted-foreground">
            Powered by BillSpot VTU — choose any data plan (110MB to 1.5TB) or custom airtime top-up with instant delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/checkout/airtime"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-opacity hover:opacity-95"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Send Airtime
          </Link>
          <Link
            href="/checkout/data"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10"
          >
            <Wifi className="h-3.5 w-3.5 text-primary" />
            Gift Data Bundle
          </Link>
        </div>
      </div>

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
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={products.length}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            itemName="curated gifts"
          />
        </div>
      )}
    </div>
  );
}
