import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  Package,
  AlertTriangle,
  Building2,
  Globe2,
  MessageCircle,
  Mail,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy — Givvly Gifting & Registry",
  description:
    "Information on same-day delivery in Lagos, nationwide shipping across Nigeria, estate access guidelines, bulky packages, and international celebration deliveries on Givvly.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ShippingAndDeliveryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <PageHeader
        title="Shipping & Delivery"
        description="Every celebration gift is hand-wrapped in signature Givvly presentation and dispatched with trusted courier partners across Nigeria and beyond."
      />

      {/* Quick delivery notice banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Questions about an active gift shipment?
            </p>
            <p className="text-xs text-muted-foreground">
              Track your parcel anytime or chat directly with our Lagos concierge team.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <Link href="/orders">
              <Package className="h-3.5 w-3.5" />
              Track an Order
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5 text-xs">
            <a
              href={SITE_CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-white" />
              WhatsApp Us
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Where We Deliver */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              1. Where We Deliver & Service Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Givvly delivers celebration keepsakes, luxury gift hampers, registry items, and bespoke wish packages
              across Lagos, nationwide across Nigeria, and to selected international destinations for our diaspora community.
            </p>
            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Lagos State</span>
                  <Badge variant="secondary" className="text-[10px]">Same-Day & Next-Day</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Island (Ikoyi, Victoria Island, Lekki, Ajah) and Mainland (Ikeja, Surulere, Yaba, Maryland, Magodo).
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Nationwide Nigeria</span>
                  <Badge variant="outline" className="text-[10px]">2 – 5 Days</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Abuja (FCT), Port Harcourt, Ibadan, Enugu, Asaba, Benin City, Kano, and all 36 states via insured couriers.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">International</span>
                  <Badge variant="outline" className="text-[10px]">5 – 10 Days</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Selected overseas destinations via premium international freight partners with door-to-door tracking.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Available shipping methods, estimated arrival windows, and delivery fees are calculated transparently at checkout
              once you input the recipient's delivery address.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Same-day delivery in Lagos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              2. Same-Day Delivery in Lagos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Need a gift delivered today for an impromptu celebration? Same-day dispatch across Lagos is available for
              ready-to-ship catalog items ordered before our daily cut-off time (1:00 PM WAT).
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Artisan Preparation Lead Time:</strong> Personalized, engraved, custom-printed,
                bulky hampers, fresh floral bouquets, and freshly baked celebration cakes require artisan preparation and cannot
                always be fulfilled on a same-day basis.
              </li>
              <li>
                <strong className="text-foreground">Confirmation:</strong> A requested delivery date or express delivery request
                is confirmed once payment is captured and our concierge confirms production capacity.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3: Receiving your gift & estate guidelines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              3. Receiving Your Gift & Gated Estate Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              To ensure every surprise gift reaches the celebrant smoothly, please ensure your order includes:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>A complete, detailed street address including house or flat number, landmark, and state.</li>
              <li>An active, reachable Nigerian telephone number for the recipient (or an alternate contact).</li>
              <li>Any specific estate gate, security code, or office reception entry instructions.</li>
            </ul>
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  <strong>Estate Gate Delivery:</strong> Where private estates, gated residential streets, or corporate towers
                  restrict external delivery riders from entering, the recipient may be kindly requested to meet the courier at the
                  estate security gate. If nobody is available to receive the parcel or if an incomplete address prevents handover,
                  re-delivery may attract an additional logistics fee.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Nationwide & International Shipping Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Globe2 className="h-5 w-5 text-emerald-600" />
              4. Nationwide & International Delivery Timelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Delivery timeframes begin <strong className="text-foreground">after payment confirmation and artisan gift preparation</strong>,
              rather than the moment an order is initially created.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Tracking Updates:</strong> Once your gift parcel is dispatched, you will receive an
                automated notification with your tracking number and delivery partner details.
              </li>
              <li>
                <strong className="text-foreground">International Customs & Tariffs:</strong> International recipients are responsible
                for any local import duties, customs tariffs, or clearance taxes assessed by destination customs authorities unless
                expressly stated otherwise at checkout.
              </li>
              <li>
                <strong className="text-foreground">Carrier & Customs Inspections:</strong> While we partner with top-tier courier
                networks to ensure timely transit, unexpected airline schedule adjustments and customs clearance delays are outside
                our direct control.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5: Bulky Packages & Delivery Charges Note */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Scale className="h-5 w-5 text-primary" />
              5. Delivery Charges & Multi-Box / Bulky Packages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Standard delivery fees displayed at checkout are computed based on destination distance and a standard single-box luxury parcel.
            </p>
            <p>
              Exceptionally bulky, heavy, oversized, or multi-box orders (such as large nursery cribs, multi-tier hampers, full cookware sets,
              or grouped celebration registries) may attract an additional volumetric or weight logistics surcharge.
            </p>
            <div className="rounded-xl border border-border/80 bg-background/80 p-4">
              <p className="text-xs font-semibold text-foreground">Our Fair-Pricing Guarantee:</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                If your packaged order requires additional courier fees due to weight or volume, Givvly will always contact you directly
                with the revised quote and obtain your explicit approval before dispatch. <strong>No additional payment is ever taken
                automatically</strong>. This surcharge applies strictly to carrier freight costs, never to the price of your selected gifts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Damage, Delay or Non-Delivery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              6. Damage, Delay, or Non-Delivery Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              If a shipment is delayed, fails to arrive, or reaches the recipient damaged, please reach out to our Concierge desk immediately
              with your order reference number and clear photographs where relevant.
            </p>
            <p>
              We will open an expedited investigation with the courier partner and provide an appropriate resolution—including free
              replacement dispatch, order rescheduling, or refund as provided under our{" "}
              <Link href="/returns" className="font-medium text-primary hover:underline">
                Returns & Refunds Policy
              </Link>.
            </p>
          </CardContent>
        </Card>

        {/* Contact info box */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Givvly Delivery & Concierge Desk
                </h3>
                <p className="text-xs text-muted-foreground">
                  Available {SITE_CONTACT.hours} for dispatch inquiries and custom delivery coordination.
                </p>
                <div className="pt-2 text-xs text-foreground space-y-1">
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    <a
                      href={SITE_CONTACT.mailto}
                      className="font-medium text-primary hover:underline"
                    >
                      {SITE_CONTACT.email}
                    </a>
                  </p>
                  <p>
                    <span className="text-muted-foreground">WhatsApp: </span>
                    <a
                      href={SITE_CONTACT.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {SITE_CONTACT.whatsappDisplay}
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" size="sm">
                  <Link href="/returns">Returns Policy</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/orders">Track an Order</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
