import { notFound } from "next/navigation";
import { getOwnerEventOnServer } from "@/features/events/server";
import { OwnerFeed } from "@/features/gifts";

export default async function EventGiftsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <OwnerFeed eventId={event.id} />;
}

