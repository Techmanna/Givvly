import { notFound } from "next/navigation";
import { EventOverview } from "@/features/events";
import { getOwnerEventOnServer } from "@/features/events/server";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <EventOverview initialEvent={event} />;
}
