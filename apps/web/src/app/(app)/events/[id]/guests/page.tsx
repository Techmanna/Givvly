import { notFound } from "next/navigation";
import { getOwnerEventOnServer } from "@/features/events/server";
import { GuestListTable } from "@/features/rsvp";

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <GuestListTable eventId={event.id} />;
}

