import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowseView } from "@/features/catalog";

export const metadata: Metadata = {
  title: "Curated Gift Catalog — Luxury Hampers, Home & Keepsakes",
  description:
    "Explore curated gifts, luxury celebration hampers, bespoke home appliances, and heritage keepsakes for weddings, birthdays, and anniversaries across Nigeria.",
  openGraph: {
    title: "Curated Gift Catalog — Givvly",
    description:
      "Explore curated gifts, luxury celebration hampers, bespoke home appliances, and heritage keepsakes for weddings and celebrations across Nigeria.",
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1024,
        height: 614,
        alt: "Givvly Curated Gift Catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Curated Gift Catalog — Givvly",
    description:
      "Curated celebration hampers, luxury gifts, and heritage keepsakes delivered across Nigeria.",
    images: ["/images/og-preview.jpg"],
  },
};

export default function GiftsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="h-96 animate-pulse rounded-[24px] border border-border bg-muted/50" />
        </div>
      }
    >
      <CatalogBrowseView />
    </Suspense>
  );
}
