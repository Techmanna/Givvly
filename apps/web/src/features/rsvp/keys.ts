export const rsvpKeys = {
  all: ["rsvps"] as const,
  byEvent: (eventId: string) => [...rsvpKeys.all, "event", eventId] as const,
};

