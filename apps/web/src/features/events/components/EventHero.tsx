import { Calendar } from "lucide-react";
import { Countdown } from "@/components/shared/Countdown";
import { EventCover } from "@/components/shared/EventCover";
import { formatDate } from "@/lib/format";
import type { PublicEvent } from "../types";

export type EventHeroProps = {
  event: PublicEvent;
};

export function EventHero({ event }: EventHeroProps) {
  return (
    <section className="space-y-6 editorial-enter">
      <EventCover
        name={event.name}
        type={event.type}
        coverUrl={event.coverUrl}
      />

      <div className="paper-surface stationery-frame rounded-[26px] border border-border p-6 sm:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/12 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span>Hosted by {event.ownerFirstName}</span>
            </div>

            <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {event.name}
            </h1>

            <div className="inline-flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{formatDate(event.date, "EEEE, d MMMM yyyy")}</span>
            </div>
          </div>

          <Countdown targetDate={event.date} />
        </div>
      </div>
    </section>
  );
}
