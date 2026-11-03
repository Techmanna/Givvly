"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookHeart,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type EventManagementNavProps = {
  eventId: string;
};

export function EventManagementNav({ eventId }: EventManagementNavProps) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;

  const items = [
    {
      href: basePath,
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `${basePath}/invite`,
      label: "Invite card",
      icon: Star,
      exact: false,
    },
    {
      href: `${basePath}/gifts`,
      label: "Gifts",
      icon: Gift,
      exact: false,
    },
    {
      href: `${basePath}/registry`,
      label: "Registry & pools",
      icon: ListChecks,
      exact: false,
    },
    {
      href: `${basePath}/guests`,
      label: "Guests (RSVP)",
      icon: Users,
      exact: false,
    },
    {
      href: `${basePath}/wall`,
      label: "Wall of love",
      icon: MessageSquare,
      exact: false,
    },
    {
      href: `${basePath}/thank-you`,
      label: "Thank-you",
      icon: HeartHandshake,
      exact: false,
    },
    {
      href: `${basePath}/summary`,
      label: "Keepsake",
      icon: BookHeart,
      exact: false,
    },
    {
      href: `${basePath}/settings`,
      label: "Settings",
      icon: Settings,
      exact: false,
    },
  ];

  return (
    <nav
      aria-label="Event management sections"
      className="flex gap-1.5 overflow-x-auto pb-2 md:w-52 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-control px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
