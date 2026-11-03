import { cache } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { EventDetail, PublicEvent } from "./types";

export type PublicEventFetchResult =
  | { status: "ok"; event: PublicEvent }
  | { status: "locked" }
  | { status: "not_found" };

/**
 * Fetches a public event on the server with tag-based ISR (`event:<slug>`).
 * Handles `EVENT_LOCKED` (403) and `NOT_FOUND` (404).
 */
export const getPublicEventOnServer = cache(
  async (slug: string): Promise<PublicEventFetchResult> => {
    try {
      const event = await api<PublicEvent>(
        `/public/events/${encodeURIComponent(slug)}`,
        {
          next: {
            revalidate: 300,
            tags: [`event:${slug}`],
          },
        }
      );
      return { status: "ok", event };
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === "EVENT_LOCKED" || error.status === 403) {
          return { status: "locked" };
        }
        if (error.code === "NOT_FOUND" || error.status === 404) {
          return { status: "not_found" };
        }
      }
      throw error;
    }
  }
);

/**
 * Fetches an owner's event detail on the server (`no-store`).
 * Returns `null` on 403 or 404 so the route renders `notFound()` (Section 5.4).
 */
export const getOwnerEventOnServer = cache(
  async (id: string): Promise<EventDetail | null> => {
    try {
      const event = await api<EventDetail>(
        `/events/${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      );
      return event;
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 403 || error.status === 404)
      ) {
        return null;
      }
      throw error;
    }
  }
);

