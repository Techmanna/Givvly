export const registryKeys = {
  all: ["registry"] as const,
  byEvent: (eventId: string) => [...registryKeys.all, "event", eventId] as const,
};

