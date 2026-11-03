import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicEventView } from "@/features/events";
import { getPublicEventOnServer } from "@/features/events/server";
import { env } from "@/lib/env";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicEventOnServer(slug);

  if (result.status !== "ok") {
    return {
      title: "Event on Givvly",
      description: "Celebrate special moments and send gifts on Givvly.",
      robots:
        result.status === "locked" ? { index: false, follow: false } : undefined,
    };
  }

  const { event } = result;
  const canonicalUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/e/${event.slug}`;
  const description =
    event.story?.slice(0, 160) ||
    `Celebrate ${event.name} with ${event.ownerFirstName} on Givvly.`;

  return {
    title: `${event.name} | Givvly`,
    description,
    robots:
      event.visibility === "PRIVATE"
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title: event.name,
      description,
      url: canonicalUrl,
      type: "website",
      images: event.coverUrl
        ? [{ url: event.coverUrl, width: 1200, height: 630, alt: event.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description,
      images: event.coverUrl ? [event.coverUrl] : undefined,
    },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicEventOnServer(slug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "locked") {
    redirect(`/e/${encodeURIComponent(slug)}/unlock`);
  }

  return (
    <main className="flex-1">
      <PublicEventView event={result.event} />
    </main>
  );
}

