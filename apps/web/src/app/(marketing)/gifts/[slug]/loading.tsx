export default function GiftProductDetailLoading() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-[4/3] animate-pulse rounded-2xl border border-border bg-surface-subtle" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 animate-pulse rounded-xl bg-surface-subtle" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-subtle" />
      </div>
    </div>
  );
}

