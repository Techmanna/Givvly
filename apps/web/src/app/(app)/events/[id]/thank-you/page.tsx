import { notFound } from "next/navigation";
import { getOwnerEventOnServer } from "@/features/events/server";
import { ThankYouList } from "@/features/gifts";

export default async function EventThankYouPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return <ThankYouList eventId={event.id} />;
}

