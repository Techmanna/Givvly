import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Scale,
  Gift,
  CreditCard,
  Truck,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms and Conditions — Givvly Celebration Registry & Gifting",
  description:
    "Terms of service, celebration registry rules, cash gift payouts, bespoke wish ordering, and delivery guidelines governing the Givvly platform.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsAndConditionsPage() {
  const lastUpdated = "11 November 2026";

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-14">
      <PageHeader
        title="Terms and Conditions"
        description="The standards, rules, and mutual agreements governing celebration registries, gift orders, cash funds, and delivery on the Givvly platform."
      />

      {/* Summary Trust Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Givvly Platform Agreement & Service Standards
              </p>
              <Badge variant="secondary" className="text-[10px]">
                Effective {lastUpdated}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              By creating an event or placing an order on Givvly, you agree to these terms.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
            <a href={SITE_CONTACT.mailto}>
              <Mail className="h-3.5 w-3.5" />
              Legal Inquiries
            </a>
          </Button>
          <Button asChild size="sm" className="text-xs gap-1.5">
            <a
              href={SITE_CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-white" />
              Concierge
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Introduction & Agreement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <FileText className="h-5 w-5 text-primary" />
              1. Introduction & Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Host&rdquo;, &ldquo;Guest&rdquo;, or &ldquo;Buyer&rdquo;) and Givvly Nigeria (&ldquo;Givvly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), governing your access to and use of{" "}
              <Link href="/" className="font-medium text-foreground underline hover:text-primary">
                givvly.store
              </Link>
              , our celebration registry builder, gift ateliers, and concierge order workflows.
            </p>
            <p>
              By accessing our platform, registering an account, creating an event wishlist, contributing to a cash fund, or completing a physical gift purchase, you confirm that you have read, understood, and agreed to be bound by these Terms and our{" "}
              <Link href="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              . If you do not agree, please do not use our platform.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Eligibility & Account Responsibilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              2. Eligibility & Account Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>
                <strong className="text-foreground">Legal Age:</strong> You must be at least 18 years old or possess legal capacity under Nigerian law to register an account, publish a registry, or make financial transactions.
              </li>
              <li>
                <strong className="text-foreground">Accurate Information:</strong> You agree to provide truthful, accurate, and current information during registration, RSVP submission, and checkout.
              </li>
              <li>
                <strong className="text-foreground">Account Security:</strong> You are responsible for safeguarding your password and credentials. You must notify our team immediately of any suspected unauthorized access.
              </li>
              <li>
                <strong className="text-foreground">Legitimate Celebration Use:</strong> Givvly is an intimate celebration registry and luxury gifting house. Users may not use the service for deceptive crowdfunding, political solicitations, illegal lotteries, or fraudulent activities.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3: Celebration Registries & Cash Gifting Pools */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Gift className="h-5 w-5 text-primary" />
              3. Celebration Registries & Cash Fund Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Givvly empowers celebrants to create customized registries combining physical gift items, digital cards, and cash gifting pools (such as Honeymoon Funds, Baby Nursery Funds, or Big-Ticket Group Gifts):
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs">
              <p>
                <strong className="text-foreground">Naira Settlements & Currency:</strong> All gift contributions and transactions are denominated and processed in Nigerian Naira (NGN).
              </p>
              <p>
                <strong className="text-foreground">Host Payout Verification:</strong> Cash gift funds settle directly to the host&apos;s verified Nigerian bank account. Hosts must provide bank account details belonging to their legal name. Givvly verifies bank credentials through licensed payment partners.
              </p>
              <p>
                <strong className="text-foreground">Settlement Windows:</strong> Cash fund payouts are processed during scheduled settlement windows following bank network verification. Payout timelines may be subject to standard Nigerian interbank clearing and banking holidays.
              </p>
              <p>
                <strong className="text-foreground">Contributor Authorization:</strong> By contributing to a registry fund or claiming a gift, contributors authorize Paystack to charge their designated payment method. Contributions made to celebration registries are non-refundable once disbursed to the celebrant.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Gift Atelier, Product Options & Bespoke Wishes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              4. Gift Atelier Orders, Product Options & Bespoke Wishes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>
                <strong className="text-foreground">Product Options & Variants:</strong> Many catalog items are available with selectable options (such as size, scent, flavor, color, or bundle tiers). The applicable price corresponds to the specific option selected and added to the gift box.
              </li>
              <li>
                <strong className="text-foreground">Artisanal Craft & Natural Variations:</strong> Our luxury gift boxes, handcrafted ribbons, imported botanicals, artisanal chocolates, and personalized keepsakes are hand-assembled. Minor variations in packaging texture, botanical hue, or confectionery wrapping are natural characteristics of luxury artisanal gifting.
              </li>
              <li>
                <strong className="text-foreground">Seasonal Substitutions:</strong> If a fresh botanical or specific gourmet brand is seasonally unavailable, Givvly concierges will contact the buyer or host with a comparable or superior substitution of equal or greater value before dispatch.
              </li>
              <li>
                <strong className="text-foreground">Bespoke Wish Quotations:</strong> Users can submit custom wish requests for items outside our standard catalog. Quotations issued by our concierge team specify pricing, estimated delivery windows, and presentation styling, and become binding orders once accepted and paid.
              </li>
              <li>
                <strong className="text-foreground">Order Acceptance:</strong> An order acknowledgement email does not constitute binding acceptance. Acceptance occurs when payment is confirmed and our concierge commences fulfillment. We reserve the right to cancel orders with full refund in cases of pricing typographical errors or product stockouts.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5: Delivery & Logistics Guidelines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Truck className="h-5 w-5 text-primary" />
              5. Shipping, Access Instructions & Redelivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Physical celebration orders are handled under our signature packaging standards. Complete logistics terms are detailed in our{" "}
              <Link href="/shipping" className="text-primary underline">
                Shipping & Delivery Policy
              </Link>
              :
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3.5 text-xs">
              <p>
                <strong className="text-foreground">Delivery Estimates:</strong> Delivery windows begin once order preparation is completed. Same-day delivery in Lagos applies to eligible orders confirmed before operational cut-off times.
              </p>
              <p>
                <strong className="text-foreground">Estate & Gate Clearance:</strong> Gifters must provide complete street addresses, reachable recipient telephone numbers, and any estate or office security clearance codes. Where couriers are restricted from entering premises, the recipient may need to receive the parcel at the main gate.
              </p>
              <p>
                <strong className="text-foreground">Redelivery Surcharge:</strong> Where a delivery fails due to incorrect address information, gate refusal, or an unreachable recipient after multiple documented contact attempts, an additional redelivery charge may be assessed before rescheduling.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Returns, Refunds & Cancellations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <RotateCcw className="h-5 w-5 text-primary" />
              6. Returns, Replacements & Cancellations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Our return and refund standards are outlined in our{" "}
              <Link href="/returns" className="text-primary underline">
                Returns & Refunds Policy
              </Link>
              :
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-xs">
              <li>
                <strong className="text-foreground">Damaged or Faulty Items:</strong> Must be reported within <strong>48 hours</strong> of physical delivery with photographs of the packaging and item. We provide prompt replacement or full refund at our expense.
              </li>
              <li>
                <strong className="text-foreground">Change-of-Mind Returns:</strong> Unused, non-personalized, and non-perishable items in original packaging may be returned within <strong>5 days</strong> of delivery. Return courier fees and a standard handling fee may apply.
              </li>
              <li>
                <strong className="text-foreground">Non-Returnable Items:</strong> Custom engraved gifts, personalized stationery, fresh flowers, confectionery, intimate care items, and digital airtime/gift cards cannot be returned once production or dispatch has begun.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 7: User Content & Wall of Love Moderation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              7. Community Standards & Wall of Love Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Celebration guests are welcome to share heartfelt notes, celebration photographs, and audio/video wishes on the host&apos;s Wall of Love.
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-xs">
              <li>
                <strong className="text-foreground">Host Sovereignty:</strong> Event hosts retain full authority over their celebration walls and may approve, hide, or delete any guest post at their sole discretion.
              </li>
              <li>
                <strong className="text-foreground">Prohibited Content:</strong> Users may not post defamatory, abusive, sexually explicit, copyrighted, or unlawful material. Givvly reserves the right to remove non-compliant content and terminate repeat offending accounts.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 8: Intellectual Property */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Scale className="h-5 w-5 text-primary" />
              8. Intellectual Property Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              All branding, trade dress, logos, website software, custom graphics, packaging concepts, and editorial materials are the exclusive property of Givvly Nigeria and are protected under Nigerian copyright and trademark laws. You may not copy, reproduce, or commercially exploit our platform assets without our express prior written permission.
            </p>
          </CardContent>
        </Card>

        {/* Section 9: Limitation of Liability & Force Majeure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" />
              9. Limitation of Liability & Force Majeure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              To the maximum extent permitted under applicable Nigerian law, Givvly shall not be liable for indirect, incidental, or consequential damages resulting from platform downtime, banking switch disruptions, or courier delays caused by circumstances beyond our reasonable control (&ldquo;Force Majeure&rdquo;), including severe weather, civic road closures, fuel scarcity, customs delays, or telecommunication network failures.
            </p>
            <p className="text-xs">
              In any event, our total aggregate liability arising in connection with any gift order shall not exceed the actual amount paid by you for that order.
            </p>
          </CardContent>
        </Card>

        {/* Section 10: Governing Law & Jurisdiction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Scale className="h-5 w-5 text-primary" />
              10. Governing Law & Dispute Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. In the event of any disagreement, the parties agree to first seek amicable resolution through good-faith consultation with our Concierge Management. If unresolved within 30 days, the matter shall be submitted to the competent courts of Lagos State, Nigeria.
            </p>
          </CardContent>
        </Card>

        {/* Section 11: Contact Us */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              11. Questions & Concierge Assistance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              For inquiries regarding these Terms and Conditions or assistance with an active celebration order:
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4 text-xs space-y-1.5">
              <p>
                <strong className="text-foreground">Givvly Nigeria — Concierge & Legal Operations</strong>
              </p>
              <p>
                Email:{" "}
                <a href={SITE_CONTACT.mailto} className="text-primary underline">
                  {SITE_CONTACT.email}
                </a>
              </p>
              <p>
                WhatsApp Concierge:{" "}
                <a
                  href={SITE_CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {SITE_CONTACT.whatsappDisplay}
                </a>
              </p>
              <p>Location: {SITE_CONTACT.location}</p>
              <p>Hours: {SITE_CONTACT.hours}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
