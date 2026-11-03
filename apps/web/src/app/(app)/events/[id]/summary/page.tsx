import { notFound } from "next/navigation";
import { KeepsakeSummaryView } from "@/features/events";
import { getOwnerEventOnServer } from "@/features/events/server";

export default async function EventSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <KeepsakeSummaryView eventId={event.id} />;
}

