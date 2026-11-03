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
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
    });
  }, [clear, router]);

  return null;
}

