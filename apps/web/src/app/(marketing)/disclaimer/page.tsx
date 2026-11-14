import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldAlert,
  HeartHandshake,
  UtensilsCrossed,
  Sparkles,
  Flame,
  CreditCard,
  ExternalLink,
  HelpCircle,
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
  title: "Disclaimer — Givvly Celebration Registry & Gifting",
  description:
    "Important disclaimers regarding gourmet allergens, fresh flowers, candle safety, cash fund payouts, product depictions, and platform terms on Givvly.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DisclaimerPage() {
  const lastUpdated = "11 November 2026";

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-14">
      <PageHeader
        title="Disclaimer"
        description="Important legal, health, allergen, artisanal, and operational notices governing celebration gifting, registry funds, and products on Givvly."
      />

      {/* Summary Trust Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                General Gifting & Product Disclaimer
              </p>
              <Badge variant="secondary" className="text-[10px]">
                Updated {lastUpdated}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Please review these disclaimers before ordering hampers, botanicals, or establishing cash funds.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
            <a href={SITE_CONTACT.mailto}>
              <Mail className="h-3.5 w-3.5" />
              Inquiries
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
        {/* Section 1: General Platform Notice */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Scale className="h-5 w-5 text-primary" />
              1. General Information & Non-Advisory Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              The information provided on{" "}
              <Link href="/" className="font-medium text-foreground underline hover:text-primary">
                givvly.store
              </Link>
              , in our celebration registries, and through our concierge communications is for celebration gifting, registry management, and gift shopping purposes only.
            </p>
            <p>
              Nothing on this website constitutes legal, financial, tax, or investment advice. Hosts creating cash funds (such as Honeymoon Pools or Nursery Funds) are responsible for understanding their own tax, legal, and reporting requirements under Nigerian commercial law.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Allergens, Gourmet Food & Confectionery */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
              <UtensilsCrossed className="h-5 w-5 text-amber-600" />
              2. Food, Confectionery & Allergen Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Many of our luxury gift boxes and curated celebration hampers contain gourmet food items, artisan chocolates, specialty pastries, sparkling ciders, teas, nuts, and preserves:
            </p>
            <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4 text-xs">
              <p>
                <strong className="text-foreground">Cross-Contamination & Allergens:</strong> These products may contain or have been prepared in artisan facilities handling peanuts, tree nuts, dairy, soy, gluten, eggs, sesame, or sulfites.
              </p>
              <p>
                <strong className="text-foreground">Recipient Verification:</strong> Gifters and recipients are responsible for checking the specific manufacturer ingredient list on each packaged item prior to consumption. If the recipient has severe food allergies or medical dietary restrictions, gifters should contact our concierge team before placing the order so we can recommend allergen-free alternatives.
              </p>
              <p>
                <strong className="text-foreground">Liability Limitation:</strong> Givvly disclaims liability for adverse allergic reactions or dietary sensitivities resulting from the consumption of foods supplied by verified confectionery brands.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Fresh Botanicals & Flowers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              3. Fresh Botanicals, Florals & Living Keepsakes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Fresh flower bouquets, succulent arrangements, and botanical stems are natural, living agricultural products:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-xs">
              <li>
                <strong className="text-foreground">Seasonal Variations:</strong> Due to climate, seasons, and local flower farm harvests, natural bloom sizes, petal hues, and foliage stems may differ slightly from illustrative website photography.
              </li>
              <li>
                <strong className="text-foreground">Care Upon Arrival:</strong> Fresh flowers require immediate hydration, stem trimming, and cool room temperatures upon delivery in tropical climates like Lagos. Givvly cannot be held liable for premature wilting if care instructions are not promptly observed.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 4: Scented Candles, Fragrance & Wellness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Flame className="h-5 w-5 text-primary" />
              4. Scented Candles, Room Sprays & Body Balms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <div className="space-y-2 text-xs">
              <p>
                <strong className="text-foreground">Candle Safety:</strong> Burning candles must never be left unattended, placed near flammable curtains, or burned in drafts. Always trim wicks to 5mm before lighting and keep out of reach of children and household pets.
              </p>
              <p>
                <strong className="text-foreground">Skin Patch Testing:</strong> Body lotions, bath salts, and luxury balms contain natural essential oils and fragrance botanicals. We recommend performing a small patch test on the forearm before full application, particularly for individuals with sensitive skin.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Cash Registry Funds & Payouts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              5. Cash Registry Funds & Bank Account Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Givvly provides registry technology and coordinates payment processing via licensed payment partner Paystack Payments Limited:
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs">
              <p>
                <strong className="text-foreground">Host Responsibility for Bank Details:</strong> Event hosts are solely responsible for ensuring the Nigerian bank account number and bank code provided for cash gift withdrawals are correct and registered under their name.
              </p>
              <p>
                <strong className="text-foreground">Misdirected Funds:</strong> Givvly shall not be liable for delayed, rejected, or misdirected payouts arising from incorrect account numbers entered by the host. Once funds have cleared the Nigerian Interbank Settlement System (NIBSS) to the account provided, transfers cannot be reversed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Product Photography & Artisan Packaging */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              6. Product Images, Artisanal Presentation & Screen Displays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We take great care in styling, photographing, and presenting every luxury gift hamper and celebration item:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1 text-xs">
              <li>
                <strong className="text-foreground">Color & Display Differences:</strong> Because computer monitors, mobile OLED screens, and smartphone color profiles vary, actual ribbon colors, fabric textures, or box shades may appear slightly different in person.
              </li>
              <li>
                <strong className="text-foreground">Artisan Hand-Assembly:</strong> Every Givvly gift box is packed and tied by hand in Lagos. Minor artisanal nuances in ribbon bow placement or handwritten calligraphy cards reflect authentic bespoke craftsmanship.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 7: User-Generated Content & External Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ExternalLink className="h-5 w-5 text-primary" />
              7. Wall of Love Posts & External Web Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p className="text-xs">
              Celebration messages, media uploads, and guest notes appearing on the Wall of Love are created by third-party celebration guests and do not represent the opinions or endorsements of Givvly.
            </p>
            <p className="text-xs">
              Our bespoke wish builder may allow users to share external product links from third-party retailers for concierge quotation. Givvly has no ownership or control over external third-party websites or their content.
            </p>
          </CardContent>
        </Card>

        {/* Section 8: Statutory Consumer Rights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldAlert className="h-5 w-5 text-primary" />
              8. Statutory Consumer Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p className="text-xs">
              Nothing in this Disclaimer excludes, limits, or modifies any statutory rights or remedies granted to consumers under the Federal Competition and Consumer Protection Act (FCCPA) 2018 or other applicable Nigerian consumer laws that cannot lawfully be disclaimed.
            </p>
          </CardContent>
        </Card>

        {/* Section 9: Concierge Contact */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              9. Questions & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              If you have any questions or require custom assistance with an order, please contact our concierge team:
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4 text-xs space-y-1.5">
              <p>
                <strong className="text-foreground">Givvly Nigeria — Customer Concierge</strong>
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
              <p>Headquarters: {SITE_CONTACT.location}</p>
              <p>Hours: {SITE_CONTACT.hours}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
