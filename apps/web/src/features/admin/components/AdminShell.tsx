"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  CreditCard,
  Building2,
  BookOpen,
  Shield,
  AlertCircle,
  Users,
  Store,
  ArrowUpRight,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sliders,
  Share,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type NavGroup = {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/admin", label: "Executive Overview", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders & Shipping", icon: ShoppingBag, badge: "Live" },
      { href: "/admin/products", label: "Gifts & Combos", icon: Package },
      { href: "/admin/events", label: "Celebrations", icon: Share },
    ],
  },
  {
    title: "FINANCIAL LEDGER",
    items: [
      { href: "/admin/payments", label: "Payment Inflow", icon: CreditCard },
      { href: "/admin/payouts", label: "Bank Payouts", icon: Building2 },
      { href: "/admin/ledger", label: "Dual-Entry Ledger", icon: BookOpen },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [
      { href: "/admin/users", label: "User Accounts", icon: Users },
      { href: "/admin/moderation", label: "Moderation Queue", icon: Shield },
      { href: "/admin/disputes", label: "Disputes & Claims", icon: AlertCircle },
      { href: "/admin/vendors", label: "Legacy Vendors", icon: Store },
    ],
  },
];

export function AdminShell({
  children,
  userName = "Administrator",
  userEmail = "admin@givvly.com",
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-card/60 backdrop-blur-md lg:flex">
        <div className="flex flex-col">
          {/* Logo & Brand Header */}
          <div className="flex h-16 items-center justify-between border-b border-border/80 px-6">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="font-heading text-xl font-bold tracking-tight text-primary">
                Givvly
              </span>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary uppercase"
              >
                Admin
              </Badge>
            </Link>
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 space-y-6 px-4 py-6 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span>{item.label}</span>
                        </span>

                        {item.badge && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: User & Quick Switch */}
        <div className="border-t border-border/80 p-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {userName}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase">
              Staff
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs"
            >
              <Link href="/dashboard">
                <span>Host Dashboard</span>
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative flex w-full max-w-xs flex-1 flex-col justify-between border-r border-border bg-card p-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <span className="font-heading text-lg font-bold text-primary">
                  Givvly Admin
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="mt-4 space-y-6 overflow-y-auto">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium",
                              isActive
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="border-t border-border pt-3">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard">
                  <span>Exit to Host Portal</span>
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>Operations Hub</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground capitalize">
                {pathname.replace("/admin", "").replace("/", "") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-600 font-medium"
            >
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </Badge>

            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/dashboard">
                <span>Host View</span>
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 px-4 py-8 sm:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

