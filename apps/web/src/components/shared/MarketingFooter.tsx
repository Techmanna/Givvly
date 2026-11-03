import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const footerSections = [
    {
        title: "Celebrations",
        links: [
            { label: "Create an Event", href: "/events/new" },
            { label: "Explore Live Celebrations", href: "/celebrations" },
            { label: "Gift Atelier", href: "/gifts" },
        ],
    },
    {
        title: "Hosts & Guests",
        links: [
            { label: "Host Studio", href: "/dashboard" },
            { label: "Track a Gift Order", href: "/orders" },
            { label: "Concierge Help", href: "/help" },
        ],
    },
    {
        title: "Trust & Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
        ],
    },
];

export function FooterLinks() {
    return (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            {footerSections.map((section) => (
                <div key={section.title} className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                        {section.title}
                    </p>

                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {section.links.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="transition-colors hover:text-foreground"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}


export function MarketingFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-20 border-t border-border bg-card/70">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="grid gap-10 md:grid-cols-12">
                    {/* Brand and trust information */}
                    <div className="space-y-4 md:col-span-5">
                        <BrandLogo variant="footer" />

                        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                            An intimate celebration registry and gifting house built for
                            weddings, milestone birthdays, naming ceremonies, and the loved
                            ones who gather around them.
                        </p>

                        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck
                                className="h-4 w-4 text-success"
                                aria-hidden="true"
                            />

                            <span>
                                Secured by Paystack • NDPA Compliant
                            </span>
                        </p>
                    </div>

                    {/* Footer navigation */}
                    <FooterLinks />
                </div>

                {/* Copyright and attribution */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
                    <p>
                        © {currentYear} Givvly Nigeria. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}