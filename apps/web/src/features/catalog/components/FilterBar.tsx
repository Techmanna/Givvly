"use client";

import * as React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogFilters } from "../types";
import { MAIN_COLLECTIONS } from "../categories";

export type FilterBarProps = {
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
};

const MAIN_CATEGORIES = MAIN_COLLECTIONS.map((c) => ({
  value: c.value,
  label: c.label,
}));

const PERSONAL_OCCASIONS = [
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "WEDDING", label: "Wedding" },
  { value: "BRIDAL_SHOWER", label: "Bridal Shower" },
  { value: "BABY_SHOWER", label: "Baby Shower" },
  { value: "NAMING_CEREMONY", label: "Naming Ceremony" },
  { value: "CHILD_DEDICATION", label: "Child Dedication" },
  { value: "BAPTISM", label: "Baptism" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "HOUSEWARMING", label: "Housewarming" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "NEW_JOB", label: "New Job" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "THANKSGIVING", label: "Thanksgiving" },
  { value: "FUNERAL_CONDOLENCE", label: "Funeral / Condolence" },
  { value: "GET_WELL_SOON", label: "Get Well Soon" },
  { value: "CONGRATULATIONS", label: "Congratulations" },
  { value: "APPRECIATION", label: "Appreciation" },
  { value: "APOLOGY", label: "Apology" },
  { value: "JUST_BECAUSE", label: "Just Because" },
  { value: "WELCOME_HOME", label: "Welcome Home" },
  { value: "FAREWELL", label: "Farewell" },
];

const SEASONAL_OCCASIONS = [
  { value: "VALENTINES_DAY", label: "Valentine's Day" },
  { value: "CHRISTMAS", label: "Christmas" },
  { value: "BOXING_DAY", label: "Boxing Day" },
  { value: "NEW_YEAR", label: "New Year" },
  { value: "EASTER", label: "Easter" },
  { value: "RAMADAN", label: "Ramadan" },
  { value: "EID_AL_FITR", label: "Eid al-Fitr" },
  { value: "EID_AL_ADHA", label: "Eid al-Adha" },
  { value: "MOTHERS_DAY", label: "Mother's Day" },
  { value: "FATHERS_DAY", label: "Father's Day" },
  { value: "CHILDRENS_DAY", label: "Children's Day" },
  { value: "INDEPENDENCE_DAY", label: "Independence Day" },
  { value: "END_OF_YEAR", label: "End-of-Year Appreciation" },
  { value: "BACK_TO_SCHOOL", label: "Back-to-School" },
  { value: "INTL_WOMENS_DAY", label: "International Women's Day" },
  { value: "INTL_MENS_DAY", label: "International Men's Day" },
  { value: "BLACK_FRIDAY", label: "Black Friday Promotions" },
];

const GIFT_TYPES = [
  { value: "ALL", label: "All Gift Types" },
  { value: "FOOD", label: "Food & Gourmet" },
  { value: "DRINKS", label: "Drinks & Fine Wine" },
  { value: "FLOWERS", label: "Flowers & Bouquets" },
  { value: "CHOCOLATES", label: "Chocolates & Confectionery" },
  { value: "FASHION", label: "Fashion & Accessories" },
  { value: "BEAUTY", label: "Beauty & Perfumery" },
  { value: "JEWELRY", label: "Jewelry & Timepieces" },
  { value: "TECH", label: "Tech & Smart Living" },
  { value: "BOOKS", label: "Books & Stationery" },
  { value: "HOME_KITCHEN", label: "Home & Kitchen" },
  { value: "LUXURY", label: "Luxury Keepsakes" },
  { value: "WELLNESS", label: "Spa & Wellness" },
  { value: "BABY_ITEMS", label: "Baby Items & Nursery" },
  { value: "CUSTOMIZED", label: "Customized & Engraved Gifts" },
  { value: "GIFT_CARDS", label: "Gift Cards & Vouchers" },
  { value: "EXPERIENCES", label: "Experiences & Dining" },
];

const RELATIONSHIPS = [
  { value: "ALL", label: "All Relationships" },
  { value: "HUSBAND", label: "Husband" },
  { value: "WIFE", label: "Wife" },
  { value: "BOYFRIEND", label: "Boyfriend" },
  { value: "GIRLFRIEND", label: "Girlfriend" },
  { value: "FIANCE", label: "Fiancé / Fiancée" },
  { value: "PARENT", label: "Parent / In-Laws" },
  { value: "GRANDPARENT", label: "Grandparent" },
  { value: "CHILD", label: "Child" },
  { value: "FRIEND", label: "Friend" },
  { value: "COLLEAGUE", label: "Colleague" },
  { value: "BOSS", label: "Boss / Executive" },
  { value: "EMPLOYEE", label: "Employee / Team" },
  { value: "CLIENT", label: "Client / Partner" },
  { value: "PASTOR", label: "Pastor / Mentor" },
  { value: "TEACHER", label: "Teacher" },
  { value: "COUPLE", label: "Couple / Newlyweds" },
];

const BUDGET_OPTIONS = [
  { value: "0", label: "Any budget" },
  { value: "5000000", label: "Under ₦50,000" },
  { value: "15000000", label: "Under ₦150,000" },
  { value: "30000000", label: "Under ₦300,000" },
  { value: "50000000", label: "Under ₦500,000" },
];

const GENDERS = [
  { value: "ALL", label: "All Genders" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "UNISEX", label: "Unisex" },
];

const AGE_GROUPS = [
  { value: "ALL", label: "All Ages" },
  { value: "BABY", label: "Baby" },
  { value: "TODDLER", label: "Toddler" },
  { value: "CHILD", label: "Child" },
  { value: "TEENAGER", label: "Teenager" },
  { value: "YOUNG_ADULT", label: "Young Adult" },
  { value: "ADULT", label: "Adult" },
  { value: "SENIOR", label: "Senior Citizen" },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const activeMainCategory = filters.mainCategory || "ALL";

  const hasActiveFilters = Boolean(
    (filters.mainCategory && filters.mainCategory !== "ALL") ||
      (filters.occasion && filters.occasion !== "ALL") ||
      (filters.relationship && filters.relationship !== "ALL") ||
      (filters.giftType && filters.giftType !== "ALL") ||
      (filters.gender && filters.gender !== "ALL") ||
      (filters.ageGroup && filters.ageGroup !== "ALL") ||
      (filters.maxPriceKobo && filters.maxPriceKobo > 0) ||
      filters.isCombo ||
      (filters.q && filters.q.trim())
  );

  const clearAllFilters = () => {
    onChange({
      mainCategory: "ALL",
      occasion: "ALL",
      relationship: "ALL",
      giftType: "ALL",
      gender: "ALL",
      ageGroup: "ALL",
      maxPriceKobo: undefined,
      isCombo: undefined,
      q: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Category Navigation Pills */}
      <div
        role="tablist"
        aria-label="Main gift categories"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {MAIN_CATEGORIES.map((cat) => {
          const isSelected = activeMainCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                onChange({
                  ...filters,
                  mainCategory: cat.value,
                  isCombo: cat.value === "COMBOS" ? true : undefined,
                });
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 sm:text-sm ${
                isSelected
                  ? "bg-primary text-white shadow-xs scale-[1.02]"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {/* {cat.value === "COMBOS" && (
                <Sparkles className="mr-1.5 inline-block h-3.5 w-3.5 text-[#D4A959]" />
              )} */}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 2. Primary Filter Bar using Shadcn Components (Search Input + Shadcn Selects) */}
      <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
        {/* Search Input */}
        <div className="relative lg:col-span-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search gifts"
            placeholder="Search gifts, perfumes, hampers..."
            value={filters.q ?? ""}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            className="h-10 pl-9 pr-3 text-xs sm:text-sm"
          />
        </div>

        {/* Occasion Shadcn Select (Grouped Personal & Seasonal) */}
        <div className="lg:col-span-3">
          <Select
            value={filters.occasion ?? "ALL"}
            onValueChange={(val) => onChange({ ...filters, occasion: val })}
          >
            <SelectTrigger
              aria-label="Filter by occasion"
              className="h-10 text-xs sm:text-sm"
            >
              <SelectValue placeholder="All Occasions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Occasions</SelectItem>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Personal Celebrations
                </SelectLabel>
                {PERSONAL_OCCASIONS.map((occ) => (
                  <SelectItem key={occ.value} value={occ.value}>
                    {occ.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Seasonal &amp; Holidays
                </SelectLabel>
                {SEASONAL_OCCASIONS.map((occ) => (
                  <SelectItem key={occ.value} value={occ.value}>
                    {occ.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Gift Type Shadcn Select */}
        <div className="lg:col-span-2">
          <Select
            value={filters.giftType ?? "ALL"}
            onValueChange={(val) => onChange({ ...filters, giftType: val })}
          >
            <SelectTrigger
              aria-label="Filter by gift type"
              className="h-10 text-xs sm:text-sm"
            >
              <SelectValue placeholder="All Gift Types" />
            </SelectTrigger>
            <SelectContent>
              {GIFT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recipient / Relationship Shadcn Select */}
        <div className="lg:col-span-2">
          <Select
            value={filters.relationship ?? "ALL"}
            onValueChange={(val) =>
              onChange({ ...filters, relationship: val })
            }
          >
            <SelectTrigger
              aria-label="Filter by recipient"
              className="h-10 text-xs sm:text-sm"
            >
              <SelectValue placeholder="All Relationships" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel.value} value={rel.value}>
                  {rel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* More Filters Toggle Button */}
        <div className="flex items-center gap-1.5 lg:col-span-1">
          <Button
            type="button"
            variant={showAdvanced ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-label="Toggle advanced filters"
            className="h-10 w-full rounded-control p-0"
            title="More filter options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3. Advanced Filters Sub-Bar using Shadcn Select, Checkbox & Label */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/80 bg-muted/40 p-4 sm:grid-cols-4 animate-in fade-in-50 duration-200">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Budget (NGN)
            </Label>
            <Select
              value={String(filters.maxPriceKobo ?? 0)}
              onValueChange={(val) =>
                onChange({
                  ...filters,
                  maxPriceKobo:
                    Number(val) > 0 ? Number(val) : undefined,
                })
              }
            >
              <SelectTrigger
                aria-label="Filter by budget"
                className="h-9 text-xs"
              >
                <SelectValue placeholder="Any budget" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By Gender
            </Label>
            <Select
              value={filters.gender ?? "ALL"}
              onValueChange={(val) => onChange({ ...filters, gender: val })}
            >
              <SelectTrigger
                aria-label="Filter by gender"
                className="h-9 text-xs"
              >
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By Age Group
            </Label>
            <Select
              value={filters.ageGroup ?? "ALL"}
              onValueChange={(val) =>
                onChange({ ...filters, ageGroup: val })
              }
            >
              <SelectTrigger
                aria-label="Filter by age group"
                className="h-9 text-xs"
              >
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2.5 pt-5">
            <Checkbox
              id="combos-only"
              checked={Boolean(filters.isCombo)}
              onCheckedChange={(checked) =>
                onChange({
                  ...filters,
                  isCombo: Boolean(checked) ? true : undefined,
                })
              }
            />
            <Label
              htmlFor="combos-only"
              className="cursor-pointer text-xs font-medium text-foreground leading-none"
            >
              Predefined Combos Only
            </Label>
          </div>
        </div>
      )}

      {/* 4. Active Filters Strip using Shadcn Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {filters.mainCategory && filters.mainCategory !== "ALL" && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              {MAIN_CATEGORIES.find((c) => c.value === filters.mainCategory)?.label}
              <button
                type="button"
                onClick={() => onChange({ ...filters, mainCategory: "ALL" })}
                className="hover:opacity-75"
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.occasion && filters.occasion !== "ALL" && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              Occasion: {filters.occasion.replace(/_/g, " ")}
              <button
                type="button"
                onClick={() => onChange({ ...filters, occasion: "ALL" })}
                className="hover:opacity-75"
                aria-label="Remove occasion filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.giftType && filters.giftType !== "ALL" && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              Type: {GIFT_TYPES.find((t) => t.value === filters.giftType)?.label}
              <button
                type="button"
                onClick={() => onChange({ ...filters, giftType: "ALL" })}
                className="hover:opacity-75"
                aria-label="Remove gift type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.relationship && filters.relationship !== "ALL" && (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              For: {RELATIONSHIPS.find((r) => r.value === filters.relationship)?.label}
              <button
                type="button"
                onClick={() => onChange({ ...filters, relationship: "ALL" })}
                className="hover:opacity-75"
                aria-label="Remove relationship filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.isCombo && (
            <Badge
              variant="outline"
              className="gap-1 rounded-full border-[#D4A959]/60 bg-[#D4A959]/15 px-2.5 py-0.5 text-xs font-semibold text-[#8C6321]"
            >
              Predefined Combos
              <button
                type="button"
                onClick={() => onChange({ ...filters, isCombo: undefined })}
                className="hover:opacity-75"
                aria-label="Remove combo filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-medium text-muted-foreground underline hover:text-foreground ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
