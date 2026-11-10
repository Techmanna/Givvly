import { BrandLogo } from "@/components/shared/BrandLogo";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 text-center">
        <BrandLogo
          href="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
        />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

