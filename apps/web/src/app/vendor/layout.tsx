import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server";
import { SessionBootstrap } from "@/features/auth";

export default async function VendorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  redirect("/admin");
}

