import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  Server,
  UserCheck,
  FileText,
  AlertCircle,
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
  title: "Privacy Policy — Givvly Celebration Registry & Gifting",
  description:
    "How Givvly collects, protects, and handles personal data, celebration registries, cash gift payouts, and recipient delivery information under the Nigeria Data Protection Act (NDPA 2023).",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "11 November 2026";

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-14">
      <PageHeader
        title="Privacy Policy"
        description="We treat your celebration moments, registry wishes, and personal information with utmost care, confidentiality, and institutional-grade data security."
      />

      {/* Summary Trust Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Nigeria Data Protection Act (NDPA 2023) Compliant
              </p>
              <Badge variant="secondary" className="text-[10px]">
                Updated {lastUpdated}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We never store full debit card credentials or share your guests&apos; details with advertisers.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
            <a href={SITE_CONTACT.mailto}>
              <Mail className="h-3.5 w-3.5" />
              Privacy Officer
            </a>
          </Button>
          <Button asChild size="sm" className="text-xs gap-1.5">
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
        {/* Section 1: Who We Are & Scope */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              1. Who We Are & Scope of This Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Givvly Nigeria (&ldquo;Givvly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the celebration registry and luxury gifting platform available at{" "}
              <Link href="/" className="font-medium text-foreground underline hover:text-primary">
                givvly.store
              </Link>
              . We serve hosts, celebrants, couples, wedding guests, corporate clients, and gifters across Lagos, throughout Nigeria, and worldwide across the diaspora.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, process, and protect your personal information when you create an event registry, send celebration gifts, contribute to cash pools, place an order for physical keepsakes, or interact with our concierge team.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Information We Collect */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <FileText className="h-5 w-5 text-primary" />
              2. Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              We collect only the information necessary to provide seamless celebration registries, process secure Naira transactions, and deliver gifts to recipients safely.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <span className="font-semibold text-foreground">A. Event Hosts & Celebrants</span>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  <li>Full name, email address, and telephone number</li>
                  <li>Account password (secured via Argon2id cryptographic hashing)</li>
                  <li>Celebration details: event title, date, venue, story, and cover media</li>
                  <li>Verified Nigerian bank account details (account number and bank code) for cash registry payouts</li>
                </ul>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <span className="font-semibold text-foreground">B. Gift Contributors & Guests</span>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  <li>Gifter display name and email address</li>
                  <li>Celebration messages and optional media (photos/audio/video) for the Wall of Love</li>
                  <li>RSVP status, guest counts, and dietary preferences</li>
                  <li>Option to give anonymously (display name hidden from public feeds)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <span className="font-semibold text-foreground">C. Delivery & Recipient Details</span>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  <li>Recipient legal name and active Nigerian phone number</li>
                  <li>Physical delivery address: street, estate/office gate access, city, state</li>
                  <li>Handwritten card message and bespoke gift wrapping instructions</li>
                </ul>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <span className="font-semibold text-foreground">D. Technical & Session Data</span>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  <li>IP address, browser type, operating system, and language settings</li>
                  <li>Session authentication tokens (`givvly_at`, `givvly_rt`) and CSRF security tokens</li>
                  <li>Gift box and registry drafts saved locally in your browser</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: How We Use Your Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              3. Why & How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We process personal information under lawful grounds recognized by the Nigeria Data Protection Act, including contract fulfillment, legitimate business operations, legal compliance, and your explicit consent:
            </p>
            <ul className="list-inside list-disc space-y-2 pl-1">
              <li>
                <strong className="text-foreground">Hosting Celebrations & Registries:</strong> Rendering your custom wedding, birthday, or celebration landing page, registry wishlist, and interactive RSVP system.
              </li>
              <li>
                <strong className="text-foreground">Processing Payments & Payouts:</strong> Capturing celebration contributions securely in Nigerian Naira (NGN) via Paystack and settling funds directly to the host&apos;s verified bank account.
              </li>
              <li>
                <strong className="text-foreground">Handcrafting & Dispatching Gifts:</strong> Packaging curated hampers, penning personalized greeting cards, and coordinating courier logistics with Givvly Express Logistics and verified logistics partners.
              </li>
              <li>
                <strong className="text-foreground">Community & Content Moderation:</strong> Providing hosts with moderation tools to review, approve, or hide guest messages and celebration photos on the Wall of Love.
              </li>
              <li>
                <strong className="text-foreground">Fraud Detection & Account Security:</strong> Monitoring suspicious access patterns, rate-limiting malicious bots, and preventing payment fraud.
              </li>
              <li>
                <strong className="text-foreground">Concierge Customer Support:</strong> Assisting you via WhatsApp, email, or telephone with bespoke wish sourcing, quotation inquiries, and order tracking.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 4: Bank Credentials & Payment Security */}
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
              <Lock className="h-5 w-5 text-success" />
              4. Payment & Bank Information Safeguards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Givvly takes institutional precautions to protect your financial transactions:
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4 text-xs">
              <p>
                <strong className="text-foreground">No Debit/Credit Card Storage:</strong> We never capture, store, or see your complete 16-digit card number, CVV, or card PIN on our servers. Card transactions are processed directly via Paystack, a PCI-DSS Level 1 certified payment infrastructure licensed by the Central Bank of Nigeria (CBN).
              </p>
              <p>
                <strong className="text-foreground">Masked Payout Accounts:</strong> Bank account numbers submitted by hosts for cash fund withdrawals are resolved server-side through Paystack&apos;s interbank verification API and permanently masked to the last 4 digits in all client responses (e.g., <code>******3456</code>).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Information Sharing & Disclosures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Server className="h-5 w-5 text-primary" />
              5. Who Receives Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">We do not sell, rent, or trade your personal information</strong> to third parties or advertising networks. We share information only with trusted operational service providers who are contractually bound to confidentiality:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>
                <strong className="text-foreground">Payment Gateways:</strong> Paystack Payments Limited for processing debit/credit cards, bank transfers, and automated settlement payouts.
              </li>
              <li>
                <strong className="text-foreground">Logistics & Courier Partners:</strong> Recipient name, street address, and contact phone number shared strictly to complete delivery.
              </li>
              <li>
                <strong className="text-foreground">Digital Gift Providers:</strong> BillSpot / licensed VTU switches for instant digital airtime and data voucher fulfillment.
              </li>
              <li>
                <strong className="text-foreground">Celebration Hosts:</strong> Hosts receive contributor names and gift messages (unless the contributor checked &ldquo;Give Anonymously&rdquo;).
              </li>
              <li>
                <strong className="text-foreground">Legal & Regulatory Authorities:</strong> Where required by valid Nigerian law, subpoena, or to prevent financial fraud.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 6: Anonymous Gifting & Privacy Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Eye className="h-5 w-5 text-primary" />
              6. Anonymous Gifting & Wall of Love Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We respect your desire for discretion during intimate celebration moments:
            </p>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>
                <strong className="text-foreground">Anonymous Gifts:</strong> When giving towards a cash fund or physical registry item, you may tick the anonymous checkbox. Your name will be masked from the public celebration page, guest list, and celebration feeds.
              </li>
              <li>
                <strong className="text-foreground">Wall of Love Moderation:</strong> Photos, audio notes, and celebration wishes posted by guests are subject to the host&apos;s review. Hosts have the right to approve, hide, or permanently remove any post from their celebration wall.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 7: Data Retention & Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Lock className="h-5 w-5 text-primary" />
              7. Data Retention & Cryptographic Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We retain personal data for the duration of your active account and as required to fulfill legal, tax, and auditing obligations under Nigerian commercial laws.
            </p>
            <p>
              Our infrastructure employs defense-in-depth security: HTTPS/TLS 1.3 encryption in transit, isolated PostgreSQL data stores, strict database connection security, automated daily backups, and role-based access limitations for Givvly staff.
            </p>
          </CardContent>
        </Card>

        {/* Section 8: Your Rights Under the NDPA 2023 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              8. Your Data Protection Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Under the Nigeria Data Protection Act (NDPA 2023), you hold enforceable rights regarding your personal information:
            </p>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Right of Access & Rectification</span>
                <p className="mt-1 text-muted-foreground">
                  You may request a copy of the personal data we hold about you and correct any inaccurate information.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Right to Erasure (&ldquo;To Be Forgotten&rdquo;)</span>
                <p className="mt-1 text-muted-foreground">
                  You may ask us to delete your celebration registries, account, and associated media when no longer needed.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Right to Restrict or Object</span>
                <p className="mt-1 text-muted-foreground">
                  You may object to direct marketing communications or request that we pause processing your data.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Right to Lodge a Complaint</span>
                <p className="mt-1 text-muted-foreground">
                  You have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 9: Privacy Contact */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              9. Contact Our Data Protection Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              If you have any questions, requests to exercise your data rights, or feedback regarding this Privacy Policy, please contact our privacy concierge:
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4 text-xs space-y-1.5">
              <p>
                <strong className="text-foreground">Givvly Nigeria — Data Protection & Privacy Office</strong>
              </p>
              <p>
                Email:{" "}
                <a href={SITE_CONTACT.mailto} className="text-primary underline">
                  {SITE_CONTACT.email}
                </a>
              </p>
              <p>
                WhatsApp / Concierge:{" "}
                <a
                  href={SITE_CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {SITE_CONTACT.whatsappDisplay}
                </a>
              </p>
              <p>Operational Headquarters: {SITE_CONTACT.location}</p>
              <p>Hours: {SITE_CONTACT.hours}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
