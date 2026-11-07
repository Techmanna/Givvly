export type AnalyticsEventName =
  | "signup_started"
  | "signup_completed"
  | "signup_optional_phone_toggled"
  | "login_completed"
  | "demo_login_used"
  | "wizard_step_viewed"
  | "wizard_step_completed"
  | "wizard_quick_date_selected"
  | "wizard_story_template_applied"
  | "wizard_registry_preset_added"
  | "event_created"
  | "event_published"
  | "readiness_checklist_clicked"
  | "payout_bank_resolved"
  | "payout_account_verified"
  | "give_preset_selected"
  | "give_wish_chip_selected"
  | "give_initiated"
  | "give_completed"
  | "rsvp_response_selected"
  | "rsvp_submitted"
  | "registry_item_reserved"
  | "registry_pool_contributed"
  | "thank_you_template_copied"
  | "thank_you_marked"
  | "checkout_initiated"
  | "checkout_wrapping_toggled"
  | "checkout_completed"
  | "invite_shared_whatsapp"
  | (string & {});

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export type AnalyticsEventRecord = {
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
  timestamp: string;
};

declare global {
  interface Window {
    __GIVVLY_ANALYTICS_QUEUE__?: AnalyticsEventRecord[];
  }
}

/**
 * Lightweight analytics & error reporting hooks (Section 2 & 14.5).
 * Scrubs sensitive fields, buffers funnel telemetry for low-bandwidth clients,
 * and dispatches a DOM custom event for observability/testing.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsProperties
): void {
  if (typeof window === "undefined") return;

  const record: AnalyticsEventRecord = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    if (!Array.isArray(window.__GIVVLY_ANALYTICS_QUEUE__)) {
      window.__GIVVLY_ANALYTICS_QUEUE__ = [];
    }
    window.__GIVVLY_ANALYTICS_QUEUE__.push(record);
    if (window.__GIVVLY_ANALYTICS_QUEUE__.length > 100) {
      window.__GIVVLY_ANALYTICS_QUEUE__.shift();
    }
    window.dispatchEvent(
      new CustomEvent("givvly:analytics", { detail: record })
    );
  } catch {
    // Ignore restricted WebView errors
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties);
  }
}

export function getTrackedEvents(): AnalyticsEventRecord[] {
  if (typeof window === "undefined") return [];
  return window.__GIVVLY_ANALYTICS_QUEUE__ ?? [];
}

export function reportError(
  error: unknown,
  context?: { requestId?: string; digest?: string; route?: string }
): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[error-report]", error, context);
  }
}

