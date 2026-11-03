import { cache } from "react";
import { api } from "@/lib/api-client";
import type { User } from "./types";

/**
 * Server-side session check (`GET /auth/me`) used by protected layouts
 * (`(app)/layout.tsx`, `vendor/layout.tsx`, `admin/layout.tsx`) and `(auth)/layout.tsx`.
 * Wrapped in React `cache()` so multiple calls in one request deduplicate.
 */
export const getSession = cache(async (): Promise<User | null> => {
  try {
    const res = await api<{ user?: User } | User>("/auth/me", { cache: "no-store" });
    const user = (res as { user?: User })?.user || (res as User);
    if (!user || !user.id) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
});

