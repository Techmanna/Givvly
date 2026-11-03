import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function VendorLayout({ children }: { children: ReactNode }) {
  redirect("/admin");
  return <>{children}</>;
}
