"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type CountdownProps = {
  targetDate: string;
  className?: string;
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
};

function computeRemaining(targetIso: string, nowMs: number): TimeRemaining {
  const targetMs = new Date(`${targetIso.slice(0, 10)}T00:00:00+01:00`).getTime();
  const diff = targetMs - nowMs;

  if (Number.isNaN(targetMs) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes, isPast: false };
}

export function Countdown({ targetDate, className }: CountdownProps) {
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = React.useMemo(
    () => computeRemaining(targetDate, nowMs),
    [targetDate, nowMs]
  );

  if (remaining.isPast) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-accent/50 bg-accent/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground",
          className
        )}
      >
        Happening today
      </div>
    );
  }

  return (
    <div
      aria-label={`${remaining.days} days, ${remaining.hours} hours remaining`}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-2xl border border-accent/40 bg-card/90 px-4 py-2.5 shadow-2xs",
        className
      )}
    >
      <div className="flex flex-col items-center px-2">
        <span className="font-heading text-xl font-semibold tabular-nums text-primary">
          {remaining.days}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Days
        </span>
      </div>
      <span className="font-heading text-lg text-accent/70">:</span>
      <div className="flex flex-col items-center px-2">
        <span className="font-heading text-xl font-semibold tabular-nums text-primary">
          {remaining.hours}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Hours
        </span>
      </div>
      <span className="font-heading text-lg text-accent/70">:</span>
      <div className="flex flex-col items-center px-2">
        <span className="font-heading text-xl font-semibold tabular-nums text-primary">
          {remaining.minutes}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Mins
        </span>
      </div>
    </div>
  );
}
