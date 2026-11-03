import { Skeleton } from "@/components/ui/skeleton";

export default function PublicGiveSuccessLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12" aria-busy="true">
      <Skeleton className="h-72 w-full" />
    </main>
  );
}

