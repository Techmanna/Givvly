"use client";

import * as React from "react";
import { Gift } from "lucide-react";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";

export function FloatingBoxButton() {
  const { box, openDrawer, getBoxItemCount, getTotalKobo } = useCartStore();
  const itemCount = getBoxItemCount();
  const totalKobo = getTotalKobo();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-bounce-short">
      <button
        type="button"
        onClick={openDrawer}
        aria-label={`Open gift box with ${itemCount} items`}
        className="flex items-center gap-3 rounded-full border border-[#D4A959]/60 bg-gradient-to-r from-primary via-[#9C3B4B] to-primary px-5 py-3 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <Gift className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4A959] text-[10px] font-bold text-[#332022]">
            {itemCount}
          </span>
        </span>

        <div className="text-left text-xs">
          <p className="font-semibold leading-tight">
            {box.comboTitle || "My Curated Box"}
          </p>
          <p className="text-[11px] text-[#FAF3EF]/85 tabular-nums">
            {formatNaira(totalKobo)} · View Box →
          </p>
        </div>
      </button>
    </div>
  );
}

