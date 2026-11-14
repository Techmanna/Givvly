import type { Metadata } from "next";
import Link from "next/link";
import {
  Cookie,
  ShieldCheck,
  Lock,
  Settings,
  Sliders,
  ExternalLink,
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
  title: "Cookie Policy — Givvly Celebration Registry & Gifting",
  description:
    "How Givvly uses cookies, secure local storage, and tracking technologies to safeguard your login session, gift box drafts, and Paystack-secured checkout.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicyPage() {
  const lastUpdated = "11 November 2026";

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-14">
      <PageHeader
        title="Cookie Policy"
        description="Transparent information on how Givvly utilizes cookies and essential session storage to deliver a secure, personalized celebration gifting experience."
      />

      {/* Summary Trust Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Privacy-First Cookie Architecture
              </p>
              <Badge variant="secondary" className="text-[10px]">
                Updated {lastUpdated}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We never use invasive third-party advertising trackers or sell your browsing history.
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
              Concierge
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Section 1: What Are Cookies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Cookie className="h-5 w-5 text-primary" />
              1. What Are Cookies & Web Storage?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Cookies are compact text files stored on your computer, tablet, or smartphone when you visit a website. Along with browser web storage (such as <code>localStorage</code> and <code>sessionStorage</code>), they allow a web platform to recognize your device, maintain active host authentication, remember items added to your gift box, and secure financial transactions.
            </p>
            <p>
              At Givvly, we treat cookies as an engineering tool designed to make celebration planning and gift giving seamless, fast, and completely safe under the{" "}
              <Link href="/privacy" className="text-primary underline">
                Nigeria Data Protection Act (NDPA 2023)
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Categories of Cookies We Use */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sliders className="h-5 w-5 text-primary" />
              2. Categories of Cookies We Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              We organize our cookies and storage keys into distinct functional groups:
            </p>

            <div className="space-y-3">
              {/* Strictly Necessary */}
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    A. Strictly Necessary & Security Cookies
                  </span>
                  <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">
                    Always Active
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Essential for the website to function. Without these cookies, you cannot log into your host studio, manage celebration registries, or complete checkout.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                        <th className="pb-1.5 pr-4">Cookie / Key</th>
                        <th className="pb-1.5 pr-4">Purpose</th>
                        <th className="pb-1.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-muted-foreground">
                      <tr>
                        <td className="py-2 pr-4 font-mono font-medium text-foreground">givvly_at</td>
                        <td className="py-2 pr-4">Encrypted authentication access token for API requests</td>
                        <td className="py-2">Session (15 mins)</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono font-medium text-foreground">givvly_rt</td>
                        <td className="py-2 pr-4">Secure httpOnly refresh token for session continuation</td>
                        <td className="py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono font-medium text-foreground">givvly_csrf</td>
                        <td className="py-2 pr-4">Cross-Site Request Forgery security token</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono font-medium text-foreground">givvly-cart</td>
                        <td className="py-2 pr-4">Preserves your bespoke gift box items and selected options</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono font-medium text-foreground">givvly_draft</td>
                        <td className="py-2 pr-4">Saves in-progress event registry setup and gift contributions</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Functional & Preference */}
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <span className="font-semibold text-foreground">
                  B. Functional & Preference Storage
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enables the site to remember your choices (such as preferred currency, recently used delivery addresses, or whether you have dismissed notification banners) to provide an elevated experience.
                </p>
              </div>

              {/* Performance & Security Diagnostics */}
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <span className="font-semibold text-foreground">
                  C. Performance & Error Diagnostics
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Collects aggregated, non-identifying telemetry about page load speeds and API errors so our engineering team can identify and resolve bugs across different devices and internet networks in Nigeria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Third-Party Service Provider Cookies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Lock className="h-5 w-5 text-primary" />
              3. Third-Party Service Provider Cookies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              We partner with trusted financial and media providers who may set cookies when you interact with checkout or media:
            </p>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs">
              <p>
                <strong className="text-foreground">Paystack Payments Limited:</strong> When you check out or contribute to a registry fund, Paystack securely initiates 3D-Secure payment authentication, card fraud risk analysis, and bank verification. Paystack operates independently under Central Bank of Nigeria (CBN) regulations.
              </p>
              <p>
                <strong className="text-foreground">Cloudinary & Media CDN:</strong> Facilitates high-performance caching and optimized delivery of celebration photography, event banners, and Wall of Love moments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: We Do Not Sell Your Data */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              4. Our Privacy Guarantee: No Ad Trackers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              Unlike generic retail sites, <strong className="text-foreground">Givvly does not install behavioral advertising cookies, data broker pixels, or third-party tracking scripts</strong> that follow you across the internet.
            </p>
            <p className="text-xs">
              Your celebration registries, guest list interactions, and gift selections are private personal milestones, not inventory to be monetized for behavioral advertising.
            </p>
          </CardContent>
        </Card>

        {/* Section 5: Managing Your Cookies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Settings className="h-5 w-5 text-primary" />
              5. How to Control & Manage Browser Cookies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              You can adjust your cookie settings or clear saved cookies at any time through your browser settings:
            </p>
            <div className="grid gap-2.5 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Google Chrome</span>
                <p className="mt-1 text-muted-foreground">
                  Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; Clear browsing data.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Apple Safari (iOS / macOS)</span>
                <p className="mt-1 text-muted-foreground">
                  Settings &rarr; Safari &rarr; Advanced &rarr; Block All Cookies or Clear History.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Mozilla Firefox</span>
                <p className="mt-1 text-muted-foreground">
                  Options &rarr; Privacy & Security &rarr; Cookies and Site Data &rarr; Clear Data.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="font-semibold text-foreground">Microsoft Edge</span>
                <p className="mt-1 text-muted-foreground">
                  Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic pt-1">
              Note: If you disable or block strictly necessary cookies, critical parts of our platform (including maintaining your gift box items and signing in) will not function properly.
            </p>
          </CardContent>
        </Card>

        {/* Section 6: Inquiries & Contact */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              6. Cookie Questions & Assistance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              If you have any questions regarding how Givvly uses cookies and session storage:
            </p>
            <div className="rounded-xl border border-border/70 bg-card p-4 text-xs space-y-1.5">
              <p>
                <strong className="text-foreground">Givvly Nigeria — Privacy & Technology Operations</strong>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
