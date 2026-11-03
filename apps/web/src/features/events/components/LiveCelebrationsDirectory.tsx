"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Heart, MapPin, Search, Users } from "lucide-react";
import { EventCover } from "@/components/shared/EventCover";
import { Money } from "@/components/shared/Money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNaira } from "@/lib/format";
import { usePublicEventsList } from "../hooks/useEvents";
import type { EventType, PublicEvent } from "../types";

const CEREMONY_FILTERS: Array<{ value: "ALL" | EventType; label: string }> = [
  { value: "ALL", label: "All Ceremonies" },
  { value: "WEDDING", label: "Weddings" },
  { value: "BIRTHDAY", label: "Milestone Birthdays" },
  { value: "OTHER", label: "Send-Forths & Honours" },
  { value: "BABY_SHOWER", label: "Naming & Baby Showers" },
  { value: "GRADUATION", label: "Graduations & Inductions" },
];

const EVENT_TYPE_BADGES: Record<string, string> = {
  WEDDING: "Wedding Celebration",
  BIRTHDAY: "Milestone Birthday",
  OTHER: "Send-Forth & Honour",
  BABY_SHOWER: "Naming & Baby Welcome",
  GRADUATION: "Graduation & Induction",
  ANNIVERSARY: "Anniversary",
  HOUSEWARMING: "Housewarming",
};

export interface LiveCelebrationsDirectoryProps {
  initialType?: string;
}

export function LiveCelebrationsDirectory({
  initialType = "ALL",
}: LiveCelebrationsDirectoryProps) {
  const [selectedType, setSelectedType] = React.useState<string>(initialType);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: events, isLoading } = usePublicEventsList({
    type: selectedType === "ALL" ? undefined : selectedType,
    q: searchQuery.trim() || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Editorial Hero Header */}
      <div className="editorial-enter relative overflow-hidden rounded-4xl border border-border/80 bg-linear-gradient-to-br from-[#FAF3EF] via-card to-[#F5E4DC]/65 px-6 py-10 sm:px-12 sm:py-14">
        <div
          aria-hidden="true"
          className="animate-pulse-halo pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Every life milestone deserves to be celebrated with warmth.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Explore live weddings, milestone birthdays, retirement
            send-forths, baby naming ceremonies, and medical inductions. Step
            inside any celebration to RSVP, contribute to a group pool, or leave
            a heartfelt blessing on the wall.
          </p>
        </div>

        {/* Search & Ceremony Category Filter Bar */}
        <div className="relative mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Filter celebrations by ceremony type"
            className="flex flex-wrap gap-2"
          >
            {CEREMONY_FILTERS.map((filter) => {
              const active = selectedType === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedType(filter.value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border/80 bg-card/90 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              aria-label="Search live celebrations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search host, city, or ceremony..."
              className="h-10 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-[430px] rounded-[1.75rem]" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <div className="mt-10 rounded-[1.75rem] border border-border/80 bg-card p-12 text-center shadow-sm">
          <p className="font-heading text-2xl font-semibold text-foreground">
            No live celebrations match that filter yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try clearing your search or switching back to All Ceremonies.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedType("ALL");
              setSearchQuery("");
            }}
            className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Show All Ceremonies
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {events.map((evt, index) => (
            <CelebrationDirectoryCard key={evt.id} event={evt} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function CelebrationDirectoryCard({
  event,
  index,
}: {
  event: PublicEvent;
  index: number;
}) {
  const topPool = event.pools[0];
  const poolPct =
    topPool && topPool.targetKobo > 0
      ? Math.min(
          100,
          Math.round((topPool.raisedKobo / topPool.targetKobo) * 100)
        )
      : 0;
  const staggerClass =
    index % 3 === 0 ? "stagger-1" : index % 3 === 1 ? "stagger-2" : "stagger-3";
  const venue = event.template?.fields?.venue;

  return (
    <article
      className={`editorial-enter ${staggerClass} editorial-lift group flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card`}
    >
      <div className="relative">
        <EventCover
          name={event.name}
          type={event.type}
          coverUrl={event.coverUrl}
          className="rounded-none border-0"
        />
        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[#332022]/80 px-3 py-1 text-[11px] font-semibold text-[#FAF3EF] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            {EVENT_TYPE_BADGES[event.type] ?? event.type}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            Hosted by {event.ownerFirstName}
          </p>
          <h2 className="mt-1.5 font-heading text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
            <Link href={`/e/${event.slug}`}>{event.name}</Link>
          </h2>
          {event.story && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {event.story}
            </p>
          )}

          <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{formatDate(event.date, "EEEE, d MMM yyyy")}</span>
            </div>
            {venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{venue}</span>
              </div>
            )}
          </div>

          {topPool && (
            <div className="mt-4 rounded-xl border border-border/70 bg-[#FAF3EF]/75 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-semibold text-foreground">
                  {topPool.title}
                </span>
                <span className="ml-2 shrink-0 font-bold text-primary">
                  {poolPct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="animate-progress-fill h-full rounded-full bg-gradient-to-r from-primary to-[#D4A959]"
                  style={{ width: `${poolPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                {formatNaira(topPool.raisedKobo)} of{" "}
                {formatNaira(topPool.targetKobo)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border/70 pt-4">
          <div className="mb-3.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Heart className="h-3.5 w-3.5 text-primary" />
              <Money amountKobo={event.totalReceivedKobo} /> raised
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#D4A959]" />
              {event.giftCount} blessings · {event.rsvpYesCount} RSVPs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`/e/${event.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              View Story
            </Link>
            <Link
              href={`/e/${event.slug}/give`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90"
            >
              Send Blessing
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
