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
      title: "Celebration Event",
      description: "Celebrate special moments, view wedding registries, and send gifts on Givvly.",
      robots:
        result.status === "locked" ? { index: false, follow: false } : undefined,
    };
  }

  const { event } = result;
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/e/${event.slug}`;
  const hostName = event.hostName || event.ownerFirstName;
  const description =
    event.story?.slice(0, 160) ||
    `Celebrate ${event.name} hosted by ${hostName} on Givvly. View the gift registry, contribute to cash funds, and send your congratulations.`;

  const previewImage =
    event.coverUrl || `${baseUrl}/images/og-preview.jpg`;

  return {
    title: `${event.name} — ${hostName}'s Celebration`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots:
      event.visibility === "PRIVATE"
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title: `${event.name}`,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Givvly",
      images: [
        {
          url: previewImage,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name}`,
      description,
      images: [previewImage],
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

  const event = result.event;
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/e/${event.slug}`;
  const hostName = event.hostName || event.ownerFirstName;
  const previewImage = event.coverUrl || `${baseUrl}/images/og-preview.jpg`;

  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "SocialEvent",
    name: event.name,
    description:
      event.story || `Celebrate ${event.name} hosted by ${hostName} on Givvly.`,
    startDate: event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    url: canonicalUrl,
    image: previewImage,
    organizer: {
      "@type": "Person",
      name: hostName,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: event.currency || "NGN",
      url: canonicalUrl,
      availability: "https://schema.org/InStock",
      offerCount: (event.registry?.length || 0) + (event.pools?.length || 0),
    },
  };

  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventStructuredData),
        }}
      />
      <PublicEventView event={result.event} />
    </main>
  );
}
