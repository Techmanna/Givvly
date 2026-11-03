import { notFound } from "next/navigation";
import { EventSettingsForm } from "@/features/events";
import { getOwnerEventOnServer } from "@/features/events/server";

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <EventSettingsForm initialEvent={event} />;
}

