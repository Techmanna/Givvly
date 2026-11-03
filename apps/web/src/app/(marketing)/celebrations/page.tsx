import type { Metadata } from "next";
import { LiveCelebrationsDirectory } from "@/features/events";

export const metadata: Metadata = {
  title: "Live Celebrations Directory — Weddings, Birthdays, Send-Forths & More",
  description:
    "Explore live Nigerian celebrations on Givvly — traditional & white weddings, milestone birthdays, retirement send-forths, baby naming ceremonies, and graduations.",
};

interface CelebrationsPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function CelebrationsPage({
  searchParams,
}: CelebrationsPageProps) {
  const resolved = await searchParams;
  const initialType = resolved.type?.toUpperCase() || "ALL";

  return <LiveCelebrationsDirectory initialType={initialType} />;
}

