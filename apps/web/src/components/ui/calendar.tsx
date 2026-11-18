"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4 w-full",
        month_caption: "flex justify-center pt-0.5 relative items-center h-9 px-10",
        caption_label:
          "inline-flex items-center gap-1 text-sm font-medium select-none",
        dropdowns: "flex items-center justify-center gap-1.5",
        dropdown_root:
          "relative inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-primary",
        dropdown: "absolute inset-0 w-full cursor-pointer opacity-0",
        nav: "pointer-events-none absolute inset-x-0 top-0.5 z-10 flex items-center justify-between",
        button_previous:
          "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-2xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
        button_next:
          "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-2xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
        chevron: "h-4 w-4 fill-current",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "h-9 w-9 p-0 font-normal rounded-control hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground",
        selected: "bg-primary text-primary-foreground rounded-control",
        today: "bg-accent text-accent-foreground rounded-control",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
