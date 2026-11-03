"use client";

import * as React from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/format";

interface CeremonyPreview {
  id: string;
  categoryLabel: string;
  badgeTag: string;
  monogram: string;
  title: string;
  subtitle: string;
  venue: string;
  slug: string;
  coverGradient: string;
  poolTitle: string;
  poolCurrentKobo: number;
  poolTargetKobo: number;
  poolPercent: number;
  totalRaisedKobo: number;
  giftCount: number;
  blessingSender: string;
  blessingAmountKobo: number;
  blessingNote: string;
}

const CEREMONY_SHOWCASES: CeremonyPreview[] = [
  {
    id: "wedding",
    categoryLabel: "Wedding",
    badgeTag: "#ChidAda26 · Lagos",
    monogram: "A & C",
    title: "Adaobi & Chidi",
    subtitle: "Traditional Igba Nkwu & White Wedding",
    venue: "Landmark Event Centre, Victoria Island",
    slug: "adaobi-and-chidi-2026",
    coverGradient: "from-[#332022] via-[#8F3545] to-[#D4A959]",
    poolTitle: "Zanzibar & Amalfi Honeymoon Fund",
    poolCurrentKobo: 185_000_000,
    poolTargetKobo: 250_000_000,
    poolPercent: 74,
    totalRaisedKobo: 342_500_000,
    giftCount: 47,
    blessingSender: "Chief & Lolo Okafor",
    blessingAmountKobo: 25_000_000,
    blessingNote: "“May your home overflow with laughter, peace, and abundance!”",
  },
  {
    id: "birthday",
    categoryLabel: "40th Birthday",
    badgeTag: "#TundeAt40 · Ikoyi",
    monogram: "T · 40",
    title: "Tunde's 40th Jubilee",
    subtitle: "Black-Tie & Gold Agbada Rooftop Soirée",
    venue: "The Wheatbaker Rooftop Terrace, Ikoyi",
    slug: "tunde-golden-40th-lagos",
    coverGradient: "from-[#2A1B1E] via-[#6E3B26] to-[#D4A959]",
    poolTitle: "40th Milestone Tokyo & Kyoto Trip",
    poolCurrentKobo: 215_000_000,
    poolTargetKobo: 300_000_000,
    poolPercent: 72,
    totalRaisedKobo: 285_000_000,
    giftCount: 38,
    blessingSender: "Kemi & Dapo",
    blessingAmountKobo: 20_000_000,
    blessingNote: "“Life truly begins at 40, brother! Enjoy Tokyo to the fullest.”",
  },
  {
    id: "sendforth",
    categoryLabel: "Send-Forth",
    badgeTag: "35 Years · UNILAG",
    monogram: "Prof. N",
    title: "Prof. Ngozi Nwosu",
    subtitle: "Distinguished Send-Forth & Retirement Honour",
    venue: "Civic Centre Grand Banquet Hall, Lagos",
    slug: "prof-nwosu-send-forth",
    coverGradient: "from-[#1E242B] via-[#5C2D38] to-[#C69749]",
    poolTitle: " Enugu Garden Library & Solar Studio",
    poolCurrentKobo: 340_000_000,
    poolTargetKobo: 450_000_000,
    poolPercent: 76,
    totalRaisedKobo: 412_000_000,
    giftCount: 64,
    blessingSender: "Class of 2014 Alumni",
    blessingAmountKobo: 50_000_000,
    blessingNote: "“Thank you for mentoring generations of scholars with grace.”",
  },
  {
    id: "naming",
    categoryLabel: "Naming Ceremony",
    badgeTag: "Baby Zainab · Abuja",
    monogram: "B · Z",
    title: "Welcome Baby Zainab",
    subtitle: "Naming Ceremony & Afternoon Garden Blessing",
    venue: "Maitama Rose Conservatory, Abuja",
    slug: "welcome-baby-zainab-2026",
    coverGradient: "from-[#332022] via-[#A3485A] to-[#E2B86B]",
    poolTitle: "Baby Zainab Education & Nursery Trust",
    poolCurrentKobo: 125_000_000,
    poolTargetKobo: 150_000_000,
    poolPercent: 83,
    totalRaisedKobo: 168_500_000,
    giftCount: 31,
    blessingSender: "Hajia Amina Bello",
    blessingAmountKobo: 10_000_000,
    blessingNote: "“May Zainab grow in wisdom, health, and endless joy!”",
  },
  {
    id: "graduation",
    categoryLabel: "Graduation",
    badgeTag: "MBBS · Call to Medicine",
    monogram: "Dr. C",
    title: "Dr. Chisom Eze, MBBS",
    subtitle: "Medical Induction & Thanksgiving Reception",
    venue: "Radisson Blu Anchorage, Victoria Island",
    slug: "dr-chisom-mbbs-induction",
    coverGradient: "from-[#231F20] via-[#7A2E3D] to-[#D4A959]",
    poolTitle: "Residency Laptop & Medical Equipment Fund",
    poolCurrentKobo: 92_000_000,
    poolTargetKobo: 120_000_000,
    poolPercent: 77,
    totalRaisedKobo: 118_000_000,
    giftCount: 26,
    blessingSender: "Uncle Emeka (Houston)",
    blessingAmountKobo: 15_000_000,
    blessingNote: "“So proud of our newest doctor in the family! Shine bright.”",
  },
];

export function HeroCeremonyShowcase() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CEREMONY_SHOWCASES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const active = CEREMONY_SHOWCASES[activeIndex] ?? CEREMONY_SHOWCASES[0]!;

  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ceremony Switcher Pills */}
      <div
        role="tablist"
        aria-label="Live ceremony showcase categories"
        className="mb-3.5 flex flex-wrap items-center gap-1.5"
      >
        {CEREMONY_SHOWCASES.map((item, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                isSelected
                  ? "bg-primary text-white shadow-sm scale-[1.03]"
                  : "border border-border/80 bg-surface-elevated/80 text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {item.categoryLabel}
            </button>
          );
        })}
      </div>

      {/* Main Editorial Framed Keepsake Card */}
      <div
        key={active.id}
        className="animate-card-swap relative overflow-hidden rounded-[2rem] border border-border/90 bg-surface-elevated p-3.5 shadow-modal sm:p-5"
      >
        {/* Ceremony Cover Header */}
        <div
          className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${active.coverGradient} px-6 pt-8 pb-7 text-white`}
        >
          <div
            aria-hidden="true"
            className="animate-pulse-halo pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/15 blur-2xl"
          />

          <div className="relative flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] text-[#FAF3EF]/85 uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-ping" />
              Live {active.categoryLabel}
            </span>
            <span>{active.badgeTag}</span>
          </div>

          <div className="relative mt-6 text-center">
            <div className="animate-float-slow mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#D4A959]/60 bg-white/10 font-serif text-lg font-semibold text-[#FAF3EF] backdrop-blur-sm">
              {active.monogram}
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {active.title}
            </h2>
            <p className="mt-1.5 text-xs font-medium text-[#FAF3EF]/85 sm:text-sm">
              {active.subtitle}
            </p>
            <p className="mt-1 text-[11px] text-[#FAF3EF]/70">{active.venue}</p>
          </div>

          {/* Active Group Pool Progress */}
          <div className="relative mt-6 rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#FAF3EF]/90">{active.poolTitle}</span>
              <span className="font-semibold text-[#D4A959]">{active.poolPercent}% Funded</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="animate-progress-fill h-full rounded-full bg-gradient-to-r from-[#D4A959] to-[#F3D28A]"
                style={{ width: `${active.poolPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#FAF3EF]/75">
              <span className="tabular-nums">
                {formatNaira(active.poolCurrentKobo)} raised
              </span>
              <span className="tabular-nums">
                Goal: {formatNaira(active.poolTargetKobo)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Stats & Direct Action */}
        <div className="mt-4 space-y-3 px-1">
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3.5 py-2.5">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Total Blessings Received
              </p>
              <p className="font-serif text-lg font-bold text-foreground tabular-nums">
                {formatNaira(active.totalRaisedKobo)}{" "}
                <span className="font-sans text-xs font-normal text-muted">
                  from {active.giftCount} guests
                </span>
              </p>
            </div>
            <Link
              href={`/e/${active.slug}`}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-primary-hover"
            >
              Open Event →
            </Link>
          </div>

          {/* Animated Floating Blessing Toast */}
          <div className="animate-float-delayed rounded-xl border border-[#D4A959]/35 bg-[#FAF3EF] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {active.blessingSender}{" "}
                <span className="font-normal text-muted">sent a blessing</span>
              </p>
              <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
                {formatNaira(active.blessingAmountKobo)}
              </span>
            </div>
            <p className="mt-1 font-serif text-xs italic text-muted">
              {active.blessingNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
