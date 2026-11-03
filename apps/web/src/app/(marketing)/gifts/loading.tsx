export default function GiftsCatalogLoading() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-72 animate-pulse rounded-xl bg-surface-subtle" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-2xl border border-border bg-surface-subtle"
          />
        ))}
      </div>
    </div>
  );
}

