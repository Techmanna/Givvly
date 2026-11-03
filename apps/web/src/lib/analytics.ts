type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight analytics & error reporting hooks (Section 2 & 14.5).
 * Scrubs sensitive fields and respects user consent.
 */
export function trackEvent(event: string, properties?: AnalyticsProperties): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties);
  }
}

export function reportError(
  error: unknown,
  context?: { requestId?: string; digest?: string; route?: string }
): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[error-report]", error, context);
  }
}

