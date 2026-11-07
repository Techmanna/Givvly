import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublicEventOnServer } from "@/features/events/server";
import { GiveMoneyForm } from "@/features/gifts";

export default async function PublicGivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicEventOnServer(slug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "locked") {
    redirect(`/e/${encodeURIComponent(slug)}/unlock`);
  }

  const { event } = result;

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-10 sm:px-6 editorial-enter">
      <Link
        href={`/e/${event.slug}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Return to {event.name}</span>
      </Link>

      <div className="paper-surface stationery-frame rounded-[26px] border border-border p-6 sm:p-9">
        <div className="mb-6 space-y-2 border-b border-border/70 pb-5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span>Blessing Purse • Settled in Naira</span>
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            Send a gift to {event.ownerFirstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Celebrate {event.name} with a cash blessing and a personal note for
            their Wall of Love.
          </p>
        </div>

        <GiveMoneyForm
          slug={event.slug}
          eventName={event.name}
          ownerFirstName={event.ownerFirstName}
          moneyGiftsEnabled={event.moneyGiftsEnabled}
          eventType={event.type}
          eventDate={event.date}
          eventStory={event.story}
        />
      </div>
    </main>
  );
}
