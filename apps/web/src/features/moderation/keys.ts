export const moderationKeys = {
  all: ["wall"] as const,
  publicWall: (slug: string) => [...moderationKeys.all, "public", slug] as const,
  ownerWall: (eventId: string) =>
    [...moderationKeys.all, "owner", eventId] as const,
};

