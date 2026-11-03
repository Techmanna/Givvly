import { notFound } from "next/navigation";
import { getOwnerEventOnServer } from "@/features/events/server";
import { OwnerWallModeration } from "@/features/moderation";

export default async function EventWallModerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <OwnerWallModeration eventId={event.id} eventSlug={event.slug} />;
}

