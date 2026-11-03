import { Skeleton } from "@/components/ui/skeleton";

export default function PublicGiveLoading() {
  return (
    <main
      className="mx-auto w-full max-w-lg space-y-4 px-4 py-8"
      aria-busy="true"
    >
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}

