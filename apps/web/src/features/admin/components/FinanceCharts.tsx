"use client";

import { Money } from "@/components/shared/Money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export type DailyVolumePoint = {
  dateKey: string;
  label: string;
  amountKobo: number;
  count: number;
};

export function buildDailyVolumeSeries(
  items: Array<{ createdAt: string; amountKobo: number }>,
  days = 7
): DailyVolumePoint[] {
  const now = new Date();
  const buckets = new Map<string, DailyVolumePoint>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      dateKey: key,
      label: formatDate(d, "MMM d"),
      amountKobo: 0,
      count: 0,
    });
  }

  for (const item of items) {
    const key = item.createdAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.amountKobo += item.amountKobo;
      bucket.count += 1;
    }
  }

  return Array.from(buckets.values());
}

export function DailyVolumeChart({
  title,
  subtitle,
  points,
  barColorClass = "bg-primary",
}: {
  title: string;
  subtitle?: string;
  points: DailyVolumePoint[];
  barColorClass?: string;
}) {
  const maxAmount = Math.max(1, ...points.map((p) => p.amountKobo));

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-2 pt-4">
          {points.map((pt) => {
            const heightPct =
              pt.amountKobo > 0
                ? Math.max(10, Math.round((pt.amountKobo / maxAmount) * 100))
                : 4;
            return (
              <div
                key={pt.dateKey}
                className="group flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="relative flex h-24 w-full items-end justify-center">
                  <div
                    className={`w-full max-w-[34px] rounded-t-md transition-all ${
                      pt.amountKobo > 0 ? barColorClass : "bg-muted"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${pt.label}: ${pt.count} tx`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{pt.label}</span>
                <span className="text-[10px] font-medium text-foreground">
                  {pt.count > 0 ? <Money amountKobo={pt.amountKobo} /> : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export type BreakdownSegment = {
  label: string;
  count: number;
  amountKobo: number;
  colorClass: string;
};

export function VolumeBreakdownCard({
  title,
  segments,
}: {
  title: string;
  segments: BreakdownSegment[];
}) {
  const totalAmount = Math.max(
    1,
    segments.reduce((s, seg) => s + seg.amountKobo, 0)
  );

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((seg) => {
            const pct = (seg.amountKobo / totalAmount) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={seg.label}
                className={seg.colorClass}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${Math.round(pct)}%`}
              />
            );
          })}
        </div>

        <div className="space-y-2">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${seg.colorClass}`} />
                <span className="font-medium text-foreground">{seg.label}</span>
                <span className="text-muted-foreground">({seg.count})</span>
              </div>
              <Money
                amountKobo={seg.amountKobo}
                className="font-semibold text-foreground"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
