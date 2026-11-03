import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Africa/Lagos";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats integer kobo (1 naira = 100 kobo) into NGN display string.
 * Throws if kobo is not a safe integer.
 */
export function formatNaira(kobo: number): string {
  if (!Number.isSafeInteger(kobo)) {
    throw new Error("Money in kobo must be a safe integer");
  }
  const naira = kobo / 100;
  return nairaFormatter.format(naira);
}

/**
 * Converts integer Naira input to kobo (1 naira = 100 kobo).
 */
export function nairaToKobo(naira: number): number {
  if (!Number.isSafeInteger(naira)) {
    throw new Error("Naira amount must be a safe integer");
  }
  return naira * 100;
}

/**
 * Formats an ISO 8601 UTC date string in Africa/Lagos timezone by default.
 */
export function formatDate(
  isoDate: string | Date,
  pattern = "d MMM yyyy",
  timeZone = DEFAULT_TIMEZONE
): string {
  return formatInTimeZone(isoDate, timeZone, pattern);
}

/**
 * Validates that a `next` redirect parameter is a safe same-origin relative path.
 * Must start with `/` and NOT start with `//` or `/\`.
 */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") {
    return fallback;
  }
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  return trimmed;
}

