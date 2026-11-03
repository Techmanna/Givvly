export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  googleUrl: (next?: string) => [...authKeys.all, "googleUrl", next ?? ""] as const,
};

