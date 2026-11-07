import { ImageResponse } from "next/og";
import { getPublicEventOnServer } from "@/features/events/server";
import { formatDate } from "@/lib/format";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function EventOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicEventOnServer(slug);

  const title =
    result.status === "ok" ? result.event.name : "Celebrate on Givvly";
  const subtitle =
    result.status === "ok"
      ? `Hosted by ${result.event.ownerFirstName} • ${formatDate(result.event.date)}`
      : "RSVP and send thoughtful gifts";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAF3EF",
          color: "#332022",
          padding: "72px",
          border: "16px solid #ECDCD6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 32,
            fontWeight: 700,
            color: "#B5495B",
          }}
        >
          Givvly
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.15,
              color: "#332022",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#7A6468",
            }}
          >
            {subtitle}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #ECDCD6",
            paddingTop: "24px",
            fontSize: 22,
            color: "#B5495B",
          }}
        >
          <span>givvly.vercel.app</span>
          <span style={{ color: "#D4A959", fontWeight: 600 }}>
            Send a gift or RSVP
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

