"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerUnauthenticatedHandler } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionQuery } from "../hooks/useAuth";

export function SessionBootstrap() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  useSessionQuery(true);

  useEffect(() => {
    registerUnauthenticatedHandler((nextPath) => {
      clear();
      if (typeof document !== "undefined") {
        document.cookie =
          "givvly_at=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        document.cookie =
          "givvly_rt=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      }
      const target = `/login?next=${encodeURIComponent(nextPath)}&error=unauthenticated`;
      if (typeof window !== "undefined") {
        window.location.href = target;
      } else {
        router.push(target);
      }
    });
  }, [clear, router]);

  return null;
}

