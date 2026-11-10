import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server";
import { AdminShell } from "@/features/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login?next=/admin&error=session_expired");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
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
