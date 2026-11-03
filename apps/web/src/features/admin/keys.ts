export const adminKeys = {
  all: ["admin"] as const,
  moderation: () => ["admin", "moderation"] as const,
  payouts: () => ["admin", "payouts"] as const,
  ledger: () => ["admin", "ledger"] as const,
  disputes: () => ["admin", "disputes"] as const,
  events: () => ["admin", "events"] as const,
  payments: () => ["admin", "payments"] as const,
  orders: () => ["admin", "orders"] as const,
  products: () => ["admin", "products"] as const,
  vendors: () => ["admin", "vendors"] as const,
  users: () => ["admin", "users"] as const,
};
