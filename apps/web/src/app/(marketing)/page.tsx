import Link from "next/link";
import {
  ArrowRight,
  CalendarHeart,
  Globe2,
  Heart,
  Gift,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/Money";

const CHAPTERS = [
  {
    numeral: "I",
    kicker: "The Digital Stationery",
    title: "An invitation that feels like heavy cotton paper.",
    body: "Share your love story, Aso-Ebi colour palette, venue timings, and private access code in a single link crafted for WhatsApp and iMessage.",
  },
  {
    numeral: "II",
    kicker: "Cash Blessings & Group Pools",
    title: "From Lagos transfers to London cards, settled in Naira.",
    body: "Guests contribute toward your honeymoon fund, claim registry keepsakes, or send cash blessings—settled automatically to your Nigerian bank at 07:00 WAT.",
  },
  {
    numeral: "III",
    kicker: "The Living Keepsake",
    title: "Every prayer, toast, and photograph preserved forever.",
    body: "Friends post heartfelt wishes and celebration photos onto your Wall of Love, which transforms into a permanent keepsake book after the last dance.",
  },
];

const CURATED_HIGHLIGHTS = [
  {
    slug: "lagos-champagne-celebration-hamper",
    category: "Signature Hamper",
    title: "The Eko Grand Champagne & Artisanal Truffle Trunk",
    vendor: "Lagos Luxe Hampers",
    priceKobo: 12_500_000,
    note: "Hand-wrapped in blush satin with a wax-sealed note.",
  },
  {
    slug: "smeg-retro-kettle-toaster-duo",
    category: "Home Sanctuary",
    title: "Smeg 50s Cream Kettle & Two-Slice Breakfast Set",
    vendor: "Maison Lekki",
    priceKobo: 34_000_000,
    note: "A timeless kitchen centrepiece for newlyweds.",
  },
  {
    slug: "oriire-handwoven-aso-oke-throw",
    category: "Heritage Keepsake",
    title: "Handloomed Iseyin Aso-Oke & Brass Table Runner",
    vendor: "Atélìer Oriire",
    priceKobo: 6_800_000,
    note: "Woven by master artisans in Oyo State.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="space-y-28 pb-12 pt-8 sm:pt-14">
      {/* HERO: Asymmetrical Editorial Composition */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="gap-12">
          {/* Left Narrative Column */}
          <div className="space-y-7 editorial-enter flex flex-col justify-center items-center text-center">
            <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Where every blessing &amp; <br />gift becomes part of the  <br />
              <span className="italic font-normal text-primary">
                love story.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Whether it is a traditional introduction in Enugu, a rooftop
              thirtieth in Victoria Island, or a naming ceremony shared with
              family in London—Givvly brings your invitation, cash purse, gift
              registry, and Wall of Love into one intimate home.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-sm font-semibold shadow-sm editorial-lift"
              >
                <Link href="/events/new">
                  <span>Begin Your Celebration</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-border bg-card/80 px-6 text-sm font-medium editorial-lift"
              >
                <Link href="/e/chidada-forever-2026">
                  <CalendarHeart
                    className="mr-1.5 h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>Experience #ChidAda26 Live</span>
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* CHAPTERS: Three Editorial Pillars */}
      {/* <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Designed with Emotion
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Every moment of generosity, thoughtfully choreographed.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            No awkward bank account screenshots on flyers. No spreadsheets of
            unclaimed gifts. Just a warm, dignified experience for you and your
            guests.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CHAPTERS.map((chapter) => (
            <article
              key={chapter.numeral}
              className="paper-surface scroll-reveal editorial-lift flex flex-col justify-between rounded-[22px] border border-border p-7"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-2xl italic text-accent">
                    {chapter.numeral}.
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {chapter.kicker}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold leading-snug text-foreground">
                  {chapter.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {chapter.body}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-border/60 pt-4 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Included for every Givvly host</span>
              </div>
            </article>
          ))}
        </div>
      </section> */}

      {/* CURATED GIFT ATELIER PREVIEW */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              The Gift Atelier
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Send a wrapped physical gift to any doorstep in Nigeria.
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-border bg-card px-5 editorial-lift"
          >
            <Link href="/gifts">
              <Gift className="mr-1.5 h-4 w-4 text-primary" aria-hidden="true" />
              <span>Explore All Curated Gifts</span>
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CURATED_HIGHLIGHTS.map((item) => (
            <div
              key={item.slug}
              className="paper-surface scroll-reveal editorial-lift group flex flex-col justify-between rounded-[22px] border border-border p-6"
            >
              <div className="space-y-4">
                <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                    {item.category}
                  </span>
                  <p className="mt-1 font-heading text-base font-medium italic text-foreground/90">
                    {item.vendor}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-lg font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.note}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
                <Money
                  amountKobo={item.priceKobo}
                  className="font-heading text-lg font-semibold text-foreground"
                />
                <Link
                  href="/gifts"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Send Gift</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EMOTIONAL QUOTE & CLOSING BANNER */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="paper-surface stationery-frame scroll-reveal overflow-hidden rounded-[28px] border border-border p-8 sm:p-14">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Quote
                className="h-8 w-8 text-accent"
                aria-hidden="true"
              />
              <blockquote className="font-heading text-2xl font-medium italic leading-relaxed text-foreground sm:text-3xl">
                &ldquo;Our cousins in Houston and Manchester sent their wedding
                blessings in seconds, and reading the Wall of Love the morning
                after our wedding brought us both to tears.&rdquo;
              </blockquote>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                — Adaobi &amp; Chidi Okafor • Lagos, Nigeria
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-sm font-semibold editorial-lift"
              >
                <Link href="/events/new">
                  <Heart className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  <span>Create Your Free Page</span>
                </Link>
              </Button>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Takes less than 3 minutes • No setup fees</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

