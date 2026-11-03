import type { Metadata } from "next";
import { EventUnlockForm } from "@/features/events";

export const metadata: Metadata = {
  title: "Unlock private event | Givvly",
  robots: { index: false, follow: false },
};

export default async function EventUnlockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-lg flex-col items-center justify-center px-4 py-12 editorial-enter">
      <EventUnlockForm slug={slug} />
    </main>
  );
}
