"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarPlus,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldAlert,
  User as UserIcon,
  X,
} from "lucide-react";
import type { User } from "@givvly/contracts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/features/notifications";
import { logoutUser } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";

export type UserAppHeaderProps = {
  user: User;
};

export function UserAppHeader({ user }: UserAppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    } finally {
      clearAuth();
      router.push("/login");
      router.refresh();
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events/new", label: "Create Event", icon: CalendarPlus },
    { href: "/gifts", label: "Gift Catalog", icon: Gift },
    { href: "/orders", label: "My Orders", icon: Package },
    { href: "/account/payout", label: "Bank & Payouts", icon: CreditCard },
  ];

  const displayName =
    (user?.name || "").trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";
  const firstName = displayName.split(" ")[0];

  const getInitials = (name?: string) => {
    const clean =
      (name || "").trim() ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "U";
    return (
      clean
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group transition-transform active:scale-95"
          >
            <span className="font-heading text-2xl font-bold tracking-tight text-primary transition-colors group-hover:text-primary/90">
              Givvly
            </span>
            <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground hidden sm:inline-block">
              Celebrations
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-1 text-sm font-medium"
          >
            {navLinks.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Admin Console Pill, Notifications, User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Admin shortcut button if user is ADMIN */}
          {user?.role === "ADMIN" ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-secondary/40 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 hover:border-secondary text-xs font-semibold px-2.5 shadow-xs"
            >
              <Link href="/admin">
                <ShieldAlert className="h-3.5 w-3.5 text-secondary" />
                <span className="hidden sm:inline">Admin Console</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            </Button>
          ) : null}

          {/* Notification bell */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 px-2 hover:bg-muted/70 rounded-full border border-border/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {getInitials(user?.name)}
                </div>
                <span className="hidden lg:inline-block max-w-[120px] truncate text-xs font-medium text-foreground">
                  {firstName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    {user?.name || displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                  {user?.role ? (
                    <span className="inline-block mt-1 w-fit rounded-full bg-secondary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {user.role}
                    </span>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                <Link href="/account">
                  <UserIcon className="mr-2 h-3.5 w-3.5" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                <Link href="/account/payout">
                  <CreditCard className="mr-2 h-3.5 w-3.5" />
                  <span>Bank & Payouts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                <Link href="/account/security">
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  <span>Security & Password</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen ? (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2">
          {navLinks.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-secondary/15 text-secondary-foreground border border-secondary/30 mt-2"
            >
              <ShieldAlert className="h-4 w-4 text-secondary" />
              <span>Enter Admin Console</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

