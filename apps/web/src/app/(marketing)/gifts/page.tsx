import { Suspense } from "react";
import { CatalogBrowseView } from "@/features/catalog";

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
