import { BrandLogo } from "@/components/shared/BrandLogo";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="font-heading text-3xl font-bold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLogo />
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

