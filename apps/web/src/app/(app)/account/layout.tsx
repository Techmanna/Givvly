import Link from "next/link";
import type { ReactNode } from "react";

const ACCOUNT_TABS = [
  { href: "/account", label: "Profile" },
  { href: "/account/payout", label: "Bank & Payouts" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/security", label: "Security" },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <nav
        aria-label="Account navigation"
        className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {ACCOUNT_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full bg-surface-subtle px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-primary hover:text-primary-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

