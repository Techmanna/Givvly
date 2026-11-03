import { api } from "@/lib/api-client";
import type { RsvpRecord, SubmitRsvpRequest } from "./types";

export function submitPublicRsvp(
  slug: string,
  payload: SubmitRsvpRequest
): Promise<RsvpRecord> {
  return api<RsvpRecord>(`/public/events/${encodeURIComponent(slug)}/rsvps`, {
    method: "POST",
    body: payload,
  });
}

export function fetchEventRsvps(eventId: string): Promise<RsvpRecord[]> {
  return api<RsvpRecord[]>(`/events/${encodeURIComponent(eventId)}/rsvps`);
}

export function exportEventRsvpsCsv(
  eventId: string
): Promise<{ csv: string; filename: string }> {
  return api<{ csv: string; filename: string }>(
    `/events/${encodeURIComponent(eventId)}/rsvps/export`
  );
}

