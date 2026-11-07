import type { Metadata } from "next";
import Link from "next/link";
import {
  Smartphone,
  Wifi,
  ArrowRight,
  ArrowLeft,
  Zap,
  Users,
  CheckCircle2,
  Gift,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Digital Gifts — Instant Airtime & Mobile Data Bundles | Givvly",
  description:
    "Gift instant airtime top-ups or high-speed data bundles across Nigeria (MTN, Airtel, Glo, T2mobile) for weddings, birthdays, and celebrations.",
  openGraph: {
    title: "Instant Digital Gifts & VTU — Givvly",
    description:
      "Send airtime or data bundles instantly to one or up to 50 phone numbers across Nigeria.",
    images: [{ url: "/images/og-preview.jpg", width: 1024, height: 614, alt: "Givvly Digital Gifts" }],
  },
};

interface DigitalGiftsPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function DigitalGiftsPage({ searchParams }: DigitalGiftsPageProps) {
  const { event } = await searchParams;
  const eventParam = event ? `?event=${encodeURIComponent(event)}` : "";

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      {/* Event Context Breadcrumb / Back Link */}
      {event ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <Gift className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Gifting for event:</span>
            <span className="font-semibold text-foreground">{event}</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-primary hover:text-primary">
            <Link href={`/e/${encodeURIComponent(event)}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to celebration</span>
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Header */}
      <div className="space-y-3 text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
          Instant Digital Gifts
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Send airtime &amp;{" "}
          <span className="italic font-normal text-primary">mobile data</span>.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Surprise the host, bridal party, or celebration guests with instant top-ups across Nigeria.
          Dispatched in seconds with automated VTU fulfillment.
        </p>
      </div>

      {/* Action Cards: Airtime vs Data */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Airtime Card */}
        <Card className="group relative flex flex-col justify-between overflow-hidden border border-border/80 transition-all duration-300 hover:border-primary/50 hover:shadow-md">
          <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-2xl font-semibold">
                  Instant Airtime
                </CardTitle>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Fastest
                </span>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                Gift custom airtime top-ups from ₦50 to ₦100,000. Send to one recipient or distribute to up to 50 phone numbers at once.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>MTN, Airtel, Glo &amp; T2mobile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Custom recharge amount or quick presets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Instant delivery via SMS &amp; network top-up</span>
              </div>
            </div>

            <Button asChild size="lg" className="w-full rounded-full shadow-xs gap-2">
              <Link href={`/checkout/airtime${eventParam}`}>
                <span>Send Airtime Gift</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Data Bundle Card */}
        <Card className="group relative flex flex-col justify-between overflow-hidden border border-border/80 transition-all duration-300 hover:border-primary/50 hover:shadow-md">
          <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Wifi className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-2xl font-semibold">
                  Mobile Data Bundles
                </CardTitle>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  110MB - 1.5TB
                </span>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                Choose official SME and direct data plans across Nigerian networks. Daily, weekly, monthly, and mega bundle gifts.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Over 100+ verified provider plans</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Bulk gifting up to 50 numbers supported</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Direct network allocation with receipt</span>
              </div>
            </div>

            <Button asChild size="lg" className="w-full rounded-full shadow-xs gap-2">
              <Link href={`/checkout/data${eventParam}`}>
                <span>Gift Data Bundle</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Network Logos & Feature Banner */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/80 bg-muted/20 p-6 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Instant Automated VTU</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Powered by BillSpot enterprise APIs. Real-time fulfillment 24 hours a day, 7 days a week.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Single or Bulk Numbers</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reward an individual or top-up up to 50 phone numbers in one swift, secure transaction.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border shrink-0">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Want Physical Gifts?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Explore luxury hampers, home appliances, and keepsakes in the{" "}
              <Link
                href={`/gifts${eventParam}`}
                className="font-medium text-primary hover:underline"
              >
                Givvly Catalog →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

