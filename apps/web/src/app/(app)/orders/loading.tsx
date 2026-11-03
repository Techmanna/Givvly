export default function OrdersListLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-border bg-surface-subtle"
        />
      ))}
    </div>
  );
}

