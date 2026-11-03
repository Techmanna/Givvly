import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server";
import { isMockApiEnabled } from "@/lib/env";
import { AdminShell } from "@/features/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isMockApiEnabled() && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminShell
      userName={user.name ?? "Administrator"}
      userEmail={user.email ?? "admin@givvly.com"}
    >
      {children}
    </AdminShell>
  );
}
