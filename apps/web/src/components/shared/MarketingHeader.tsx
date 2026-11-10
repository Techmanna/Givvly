"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarPlus,
  CreditCard,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  ChevronDown,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationBell } from "@/features/notifications";
import { logoutUser } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";
import { BrandLogo } from "./BrandLogo";
import { BoxButton } from "./BoxButton";

const navigationLinks = [
  { label: "Gift Atelier", href: "/gifts", icon: Gift },
  { label: "Live Celebrations", href: "/celebrations", icon: Sparkles },
  { label: "Concierge & FAQ", href: "/help", icon: HelpCircle },
];

export type MarketingHeaderProps = {
  initialUser?: User | null;
};

export function MarketingHeader({ initialUser }: MarketingHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const storeUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const user = storeUser || initialUser;
  const isAuthed = Boolean(user && user.id);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    } finally {
      clearAuth();
      if (typeof window !== "undefined") {
        try {
          window.location.href = "/login";
        } catch {
          router.push("/login");
          router.refresh();
        }
      } else {
        router.push("/login");
        router.refresh();
      }
    }
  };

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-4 sm:px-6 gap-3">
        {/* Brand Logo */}
        <BrandLogo href={isAuthed ? "/dashboard" : "/"} />

        {/* Desktop Navigation */}
        <nav
          aria-label="Marketing navigation"
          className="hidden items-center gap-6 lg:gap-8 text-sm font-medium md:flex"
        >
          {navigationLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-1 text-sm font-medium transition-colors hover:text-primary",
                  isActive
                    ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                    : "text-foreground/85"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <BoxButton />
          {isAuthed ? (
            <>
              {/* Dashboard Shortcut */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold hover:bg-muted"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                  <span>Dashboard</span>
                </Link>
              </Button>

              {/* Admin Shortcut */}
              {user?.role === "ADMIN" ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-secondary/40 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 text-xs font-semibold px-2 sm:px-2.5 shadow-2xs"
                >
                  <Link href="/admin">
                    <ShieldAlert className="h-3.5 w-3.5 text-secondary" />
                    <span className="hidden md:inline">Admin</span>
                  </Link>
                </Button>
              ) : null}

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 sm:gap-2 px-1.5 sm:px-2 hover:bg-muted/70 rounded-full border border-border/60"
                    aria-label="User menu"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {getInitials(user?.name)}
                    </div>
                    <span className="hidden lg:inline-block max-w-[100px] truncate text-xs font-medium text-foreground">
                      {firstName}
                    </span>
                    <ChevronDown className="hidden sm:inline-block h-3 w-3 text-muted-foreground opacity-60" />
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
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs cursor-pointer">
                    <Link href="/events/new">
                      <CalendarPlus className="mr-2 h-3.5 w-3.5" />
                      <span>Create Event</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs cursor-pointer">
                    <Link href="/orders">
                      <Package className="mr-2 h-3.5 w-3.5" />
                      <span>My Orders</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs cursor-pointer">
                    <Link href="/account/payout">
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      <span>Bank & Payouts</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs cursor-pointer">
                    <Link href="/account">
                      <UserIcon className="mr-2 h-3.5 w-3.5" />
                      <span>My Profile</span>
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
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-foreground/85 transition-colors hover:text-primary whitespace-nowrap"
              >
                Sign in
              </Link>

              <Button
                asChild
                size="sm"
                className="rounded-full px-3.5 sm:px-5 h-8 sm:h-9 text-xs sm:text-sm font-semibold shadow-2xs editorial-lift whitespace-nowrap"
              >
                <Link href="/events/new">
                  <CalendarPlus className="h-3.5 w-3.5 sm:hidden mr-1" />
                  <span className="hidden sm:inline">Create Your Event</span>
                  <span className="sm:hidden">Create</span>
                </Link>
              </Button>
            </>
          )}

          {/* Mobile Navigation Sheet Trigger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground hover:text-foreground"
                aria-label="Open mobile navigation"
              >
                <Menu className="h-9 w-9" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-xs p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <SheetHeader className="text-left space-y-1">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <BrandLogo href={isAuthed ? "/dashboard" : "/"} />
                </SheetHeader>

                {/* User card if authed */}
                {isAuthed && (
                  <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {getInitials(user?.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {user?.name || displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        asChild
                        size="sm"
                        className="w-full text-xs font-semibold"
                        onClick={() => setSheetOpen(false)}
                      >
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full text-xs font-medium"
                        onClick={() => setSheetOpen(false)}
                      >
                        <Link href="/events/new">New Event</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Navigation links */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                    Explore
                  </p>
                  {navigationLinks.map((link) => {
                    const isActive =
                      pathname === link.href || pathname.startsWith(`${link.href}/`);
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Additional user links if authed */}
                {isAuthed && (
                  <div className="space-y-1 pt-2 border-t border-border/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                      Account
                    </p>
                    <Link
                      href="/orders"
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Package className="h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                    <Link
                      href="/account/payout"
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Bank & Payouts</span>
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                    {user?.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary/10 hover:bg-secondary/20"
                      >
                        <ShieldAlert className="h-4 w-4 text-secondary" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-6 border-t border-border/60 space-y-2">
                {isAuthed ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSheetOpen(false);
                      handleLogout();
                    }}
                    className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      className="w-full rounded-full font-semibold"
                      onClick={() => setSheetOpen(false)}
                    >
                      <Link href="/events/new">Create Your Event</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => setSheetOpen(false)}
                    >
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
