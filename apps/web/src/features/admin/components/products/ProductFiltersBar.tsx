"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MAIN_COLLECTIONS } from "@/features/catalog";

interface ProductFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  combosOnly: boolean;
  onCombosToggle: (value: boolean) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ProductFiltersBar({
  search,
  onSearchChange,
  combosOnly,
  onCombosToggle,
  selectedCategory,
  onCategoryChange,
}: ProductFiltersBarProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product name, items or description..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
            <Switch
              checked={combosOnly}
              onCheckedChange={onCombosToggle}
            />
            <span>Predefined Combos Only</span>
          </label>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
        {MAIN_COLLECTIONS.map((col) => (
          <button
            key={col.value}
            type="button"
            onClick={() => onCategoryChange(col.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === col.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}
