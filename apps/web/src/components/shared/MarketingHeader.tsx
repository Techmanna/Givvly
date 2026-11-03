import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./BrandLogo";

const navigationLinks = [
    { label: "Gift Atelier", href: "/gifts" },
    { label: "Live Celebrations", href: "/celebrations" },
    { label: "Concierge & FAQ", href: "/help" },
];

export function MarketingHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md transition-colors">
            <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
                <BrandLogo />

                <nav
                    aria-label="Marketing navigation"
                    className="hidden items-center gap-8 text-sm font-medium md:flex"
                >
                    {navigationLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-foreground/85 transition-colors hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                {/* if the user is auth, id this and show their profile to route to the respected role dashboard */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="px-3 py-2 text-sm font-medium text-foreground/85 transition-colors hover:text-primary"
                    >
                        Sign in
                    </Link>

                    <Button
                        asChild
                        size="sm"
                        className="rounded-full px-5 shadow-xs editorial-lift"
                    >
                        <Link href="/events/new">Create Your Event</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}