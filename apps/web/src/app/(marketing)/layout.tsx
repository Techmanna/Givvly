import { AnnouncementBar } from "@/components/shared/AnnouncementBar";
import { MarketingFooter } from "@/components/shared/MarketingFooter";
import { MarketingHeader } from "@/components/shared/MarketingHeader";
import type { ReactNode } from "react";

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col selection:bg-primary/15 selection:text-primary">
      {/* Full-page gift sketch background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-center bg-repeat-y opacity-20"
        style={{
          backgroundImage:
            "url('/images/givvly-gift-sketch.png')",
          backgroundSize: "100% auto",
        }}
      />
      <AnnouncementBar />

      <MarketingHeader />

      <main className="flex-1">{children}</main>

      <MarketingFooter />
    </div>
  );
}