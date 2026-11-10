"use client";

import * as React from "react";
import { Package } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/cn";

export interface BoxButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function BoxButton({ className, showLabel = true }: BoxButtonProps) {
  const items = useCartStore((s) => s.items);
  const openBox = useCartStore((s) => s.openBox);

  // Avoid SSR hydration mismatch by mounting count on client
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = mounted
    ? items.reduce((acc, item) => acc + item.qty, 0)
    : 0;

  return (
    <button
      type="button"
      onClick={openBox}
      aria-label={`Open Gift Box (${totalCount} items)`}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted/80 shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Package className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-75">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </div>

      {showLabel && (
        <span className="hidden sm:inline-block">
          Box{totalCount > 0 ? ` (${totalCount})` : ""}
        </span>
      )}
    </button>
  );
}
