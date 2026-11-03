import { notFound } from "next/navigation";
import { InviteEditor } from "@/features/events";
import { getOwnerEventOnServer } from "@/features/events/server";

export default async function EventInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <InviteEditor initialEvent={event} />;
}

