import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  RotateCcw,
  AlertCircle,
  CreditCard,
  XCircle,
  MessageCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SITE_CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy — Givvly Gifting & Registry",
  description:
    "Our clear and caring returns, replacements, cancellations, and refund policies for Givvly celebration registries, curated hampers, and bespoke gift orders.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ReturnsAndRefundsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <PageHeader
        title="Returns & Refunds"
        description="Careful, transparent policies designed for celebration registries, curated gift boxes, and bespoke keepsakes."
      />

      {/* Quick notice banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Need immediate assistance with an order?
            </p>
            <p className="text-xs text-muted-foreground">
              Report damaged or incorrect deliveries within 48 hours for expedited resolution.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <a
              href={SITE_CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-success" />
              WhatsApp Us
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 text-xs">
            <a href={SITE_CONTACT.mailto}>
              <Mail className="h-3.5 w-3.5" />
              Email Concierge
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Section 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              1. Tell Us Promptly (Within 48 Hours)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every Givvly gift is thoughtfully prepared, inspected, and packaged in our signature
              presentation style. If an item arrives damaged, defective, materially different from what
              you ordered, or incomplete, please notify our Concierge team within{" "}
              <strong className="text-foreground">48 hours of delivery</strong>.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Share your order reference (e.g.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground font-mono">
                  GV-2026-XXXXXX
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground font-mono">
                  GV-WISH-XXXXXX
                </code>
                ) and high-resolution photographs or video showing the affected item and outer parcel.
              </li>
              <li>
                Please do not dispose of the item, tags, or protective packaging before our concierge has
                reviewed your request and provided return instructions.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <RotateCcw className="h-5 w-5 text-primary" />
              2. Change-of-Mind Returns (5-Day Window)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We want every celebration gift to bring joy. Eligible unused, non-personalized, and non-perishable
              products purchased directly from the Givvly Gift Atelier may be requested for return within{" "}
              <strong className="text-foreground">5 calendar days of delivery</strong>.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Items must be completely unused, in their pristine original condition and packaging, and accompanied
                by your proof of purchase.
              </li>
              <li>
                Always contact our Concierge before returning any parcel so we can confirm return eligibility and
                provide the designated receiving address.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <XCircle className="h-5 w-5 text-destructive" />
              3. Items That Normally Cannot Be Returned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Given the celebration-focused and custom nature of our gifts, the following categories are strictly
              non-returnable and non-exchangeable for change of mind:
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <p className="font-medium text-foreground">Personalised & Made-to-Order</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Custom-engraved keepsakes, monogrammed items, bespoke wish packages, and tailored hamper builds once
                  artisan production has commenced.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <p className="font-medium text-foreground">Fresh & Perishable Goods</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fresh floral arrangements, celebratory cakes, artisan treats, gourmet pastries, and perishable food
                  items.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <p className="font-medium text-foreground">Opened Personal Care & Hygiene</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opened fragrances, cosmetics, skincare, luxury soaps, and personal wellness items.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <p className="font-medium text-foreground">Digital Gifts & Cash Funds</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Direct cash contributions to event hosts, VTU mobile airtime & data top-ups, and digital gift cards.
                </p>
              </div>
            </div>
            <p className="pt-1 text-xs text-muted-foreground italic">
              Items damaged after delivery through misuse, improper opening, or poor storage cannot be accepted. These
              exclusions do not limit your statutory legal rights regarding remedies for genuinely faulty or misdescribed
              goods.
            </p>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              4. Refunds, Replacements & Courier Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Once a returned item is received, inspected, and approved by our fulfillment team, your refund will be
              processed back to your original payment method (Paystack card reversal or verified Nigerian bank account).
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Processing Times:</strong> Bank and card provider processing times
                typically vary between 3 to 7 business days depending on your bank.
              </li>
              <li>
                <strong className="text-foreground">Delivery Fees:</strong> Original logistics fees and return courier
                charges are non-refundable for change-of-mind requests.
              </li>
              <li>
                <strong className="text-foreground">Damaged or Incorrect Items:</strong> If we supplied an incorrect,
                damaged, or defective item, Givvly will cover all reasonable courier and replacement delivery costs.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Clock className="h-5 w-5 text-primary" />
              5. Order Cancellations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Need to cancel or amend an order? Please reach out to our Concierge team immediately. We can cancel
              standard catalog orders for a full refund at any time before packaging or dispatch has started.
            </p>
            <p>
              Once bespoke production, fresh-flower sourcing, bakery preparation, or customized packaging has commenced,
              cancellation may no longer be possible.
            </p>
          </CardContent>
        </Card>

        {/* Contact info box */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Givvly Concierge Desk
                </h3>
                <p className="text-xs text-muted-foreground">
                  Our celebration and customer care team is available {SITE_CONTACT.hours}.
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
                  <Link href="/help">Help Center & FAQ</Link>
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
