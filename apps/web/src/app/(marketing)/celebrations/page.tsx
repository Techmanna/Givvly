import type { Metadata } from "next";
import { LiveCelebrationsDirectory } from "@/features/events";

export const metadata: Metadata = {
  title: "Live Celebrations Directory — Weddings, Birthdays & Ceremonies",
  description:
    "Explore live Nigerian celebrations on Givvly — traditional & white weddings, milestone birthdays, retirement send-forths, baby naming ceremonies, and graduations.",
  openGraph: {
    title: "Live Celebrations Directory — Givvly",
    description:
      "Explore live Nigerian celebrations on Givvly — traditional & white weddings, milestone birthdays, and celebrations. View registries and send gifts.",
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1024,
        height: 614,
        alt: "Givvly Live Celebrations Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Celebrations Directory — Givvly",
    description:
      "Explore live weddings, birthdays, and celebrations across Nigeria. View registries and send gifts on Givvly.",
    images: ["/images/og-preview.jpg"],
  },
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
