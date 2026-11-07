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

export type UserAppHeaderProps = {
  user?: User | null;
};

export function UserAppHeader({ user: initialUser }: UserAppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const storeUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const user = storeUser || initialUser;

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
    { href: "/gifts", label: "Gift Atelier", icon: Gift },
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 gap-3">
        {/* Brand Logo & Celebrations Tag */}
        <div className="flex items-center gap-2.5 sm:gap-6">
          <div className="flex items-center gap-2">
            <BrandLogo href="/dashboard" showTagline={false} />
          </div>

          {/* Desktop Navigation (lg+ to avoid tablet cramping) */}
          <nav
            aria-label="Main application navigation"
            className="hidden lg:flex items-center gap-1 text-sm font-medium"
          >
            {navLinks.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-2xs"
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

        {/* Right Section: Admin, Notifications, User Profile, Mobile Trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Admin shortcut button if user is ADMIN */}
          {user?.role === "ADMIN" ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-secondary/40 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 hover:border-secondary text-xs font-semibold px-2 sm:px-2.5 shadow-2xs"
            >
              <Link href="/admin">
                <ShieldAlert className="h-3.5 w-3.5 text-secondary" />
                <span className="hidden sm:inline">Admin Console</span>
                <span className="sm:hidden sr-only">Admin</span>
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
                className="h-9 gap-1.5 sm:gap-2 px-1.5 sm:px-2 hover:bg-muted/70 rounded-full border border-border/60"
                aria-label="User account menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {getInitials(user?.name)}
                </div>
                <span className="hidden xl:inline-block max-w-[100px] truncate text-xs font-medium text-foreground">
                  {firstName}
                </span>
                <ChevronDown className="hidden sm:inline-block h-3 w-3 text-muted-foreground opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold text-foreground truncate">
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

          {/* Mobile & Tablet Drawer Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Open mobile navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-xs p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <SheetHeader className="text-left space-y-1">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <BrandLogo href="/dashboard" showTagline={false} />
                </SheetHeader>

                {/* User Info Card */}
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
                  <Button
                    asChild
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/events/new">
                      <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                      <span>Create New Event</span>
                    </Link>
                  </Button>
                </div>

                {/* Core Navigation */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                    Navigation
                  </p>
                  {navLinks.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
                  <Link
                    href="/celebrations"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Live Celebrations</span>
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Concierge & FAQ</span>
                  </Link>
                </div>

                {/* Account Links */}
                <div className="space-y-1 pt-2 border-t border-border/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                    Account
                  </p>
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/account/security"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Security & Password</span>
                  </Link>
                  {user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
                    >
                      <ShieldAlert className="h-4 w-4 text-secondary" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Drawer Footer Sign Out */}
              <div className="pt-6 border-t border-border/60">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
