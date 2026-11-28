"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

interface AdminDateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  className?: string;
}

function parseIsoDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIsoDate(date?: Date): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

export function AdminDateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: AdminDateRangePickerProps) {
  const from = parseIsoDate(startDate);
  const to = parseIsoDate(endDate);
  const selected: DateRange | undefined =
    from || to ? { from, to } : undefined;

  const label =
    from && to
      ? `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`
      : from
        ? `${format(from, "MMM d, yyyy")} – ...`
        : "Pick a date range";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left text-xs font-normal bg-card",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
            <span>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selected}
            numberOfMonths={2}
            onSelect={(range) =>
              onChange({
                startDate: toIsoDate(range?.from),
                endDate: toIsoDate(range?.to),
              })
            }
          />
        </PopoverContent>
      </Popover>

      {(startDate || endDate) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Clear custom date range"
          onClick={() => onChange({ startDate: "", endDate: "" })}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
