export const ADMIN_DATE_FILTERS = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "7D", label: "Last 7 Days", days: 7 },
  { value: "30D", label: "Last 30 Days", days: 30 },
  { value: "90D", label: "Last 90 Days", days: 90 },
  { value: "CUSTOM", label: "Custom Range", days: null },
] as const;

export function matchesAdminDateFilter(
  isoDate: string,
  dateFilter: string,
  customStartDate?: string,
  customEndDate?: string,
  nowMs = Date.now()
): boolean {
  if (dateFilter === "ALL") return true;

  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;

  if (dateFilter === "CUSTOM") {
    if (customStartDate) {
      const startMs = new Date(`${customStartDate}T00:00:00.000`).getTime();
      if (!Number.isNaN(startMs) && ts < startMs) return false;
    }
    if (customEndDate) {
      const endMs = new Date(`${customEndDate}T23:59:59.999`).getTime();
      if (!Number.isNaN(endMs) && ts > endMs) return false;
    }
    return true;
  }

  const selected = ADMIN_DATE_FILTERS.find((d) => d.value === dateFilter);
  if (!selected || selected.days == null) return true;

  const cutoffMs =
    selected.value === "TODAY"
      ? new Date().setHours(0, 0, 0, 0)
      : nowMs - selected.days * 24 * 60 * 60 * 1000;

  return ts >= cutoffMs;
}
