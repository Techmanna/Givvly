export const eventKeys = {
  all: ["events"] as const,
  mine: () => [...eventKeys.all, "mine"] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
  stats: (id: string) => [...eventKeys.detail(id), "stats"] as const,
  summary: (id: string) => [...eventKeys.detail(id), "summary"] as const,
  public: (slug: string) => [...eventKeys.all, "public", slug] as const,
  publicList: (filters?: { type?: string; q?: string }) =>
    [...eventKeys.all, "public-list", filters ?? {}] as const,
  banks: () => ["payout", "banks"] as const,
  payoutAccount: () => ["payout", "account"] as const,
};
