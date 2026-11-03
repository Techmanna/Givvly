import { notFound } from "next/navigation";
import { getOwnerEventOnServer } from "@/features/events/server";
import { OwnerRegistryManager } from "@/features/registry";

export default async function EventRegistryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <OwnerRegistryManager eventId={event.id} />;
}

