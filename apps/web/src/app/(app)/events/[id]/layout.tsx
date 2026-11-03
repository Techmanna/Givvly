import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EventManagementNav } from "@/features/events";
import { getOwnerEventOnServer } from "@/features/events/server";

export default async function EventManagementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOwnerEventOnServer(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 md:flex-row">
      <EventManagementNav eventId={id} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

