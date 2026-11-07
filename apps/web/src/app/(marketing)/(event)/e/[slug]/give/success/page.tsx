import { notFound, redirect } from "next/navigation";
import { getPublicEventOnServer } from "@/features/events/server";
import { GiveReceiptView } from "@/features/gifts";

export default async function PublicGiveSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const result = await getPublicEventOnServer(slug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "locked") {
    redirect(`/e/${encodeURIComponent(slug)}/unlock`);
  }

  const { event } = result;
  const normalizedRef =
    typeof ref === "string" && ref.trim().length > 0 ? ref.trim() : null;

  return (
    <main className="flex-1 bg-background">
      <GiveReceiptView
        slug={event.slug}
        eventName={event.name}
        ownerFirstName={event.hostName || event.ownerFirstName}
        reference={normalizedRef}
      />
    </main>
  );
}

