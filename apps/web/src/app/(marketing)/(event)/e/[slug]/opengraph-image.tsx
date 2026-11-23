import { ImageResponse } from "next/og";
import { getPublicEventOnServer } from "@/features/events/server";
import { formatDate } from "@/lib/format";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type OgTheme = {
  bg: string;
  panel: string;
  frame: string;
  accent: string;
  ink: string;
  muted: string;
  spot: string;
};

const OG_THEMES: Record<string, OgTheme> = {
  "blush-minimal": {
    bg: "#FDF8F6",
    panel: "#FFFFFF",
    frame: "#E6C2B5",
    accent: "#B4654A",
    ink: "#2A1C18",
    muted: "#6E5852",
    spot: "#B5495B",
  },
  "royal-gold": {
    bg: "#191510",
    panel: "#221C13",
    frame: "#D4AF37",
    accent: "#E5C158",
    ink: "#FAF5EA",
    muted: "#C8BCA4",
    spot: "#E5C158",
  },
  "lagos-botanical": {
    bg: "#F3F8F4",
    panel: "#FFFFFF",
    frame: "#89AE8E",
    accent: "#2D5A37",
    ink: "#18281C",
    muted: "#4F6B55",
    spot: "#2D5A37",
  },
  "modern-editorial": {
    bg: "#FAFAFA",
    panel: "#FFFFFF",
    frame: "#18181B",
    accent: "#18181B",
    ink: "#18181B",
    muted: "#52525B",
    spot: "#B5495B",
  },
};

export default async function EventOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicEventOnServer(slug);

  const event = result.status === "ok" ? result.event : null;
  const templateId = event?.template?.templateId ?? "blush-minimal";
  const theme = OG_THEMES[templateId] ?? OG_THEMES["blush-minimal"]!;

  const hostLine = (
    event?.template?.fields?.hostLine?.trim() ||
    (event ? `Hosted by ${event.hostName || event.ownerFirstName}` : "YOU ARE CORDIALLY INVITED")
  ).toUpperCase();
  const title = event?.name || "Celebrate on Givvly";
  const dateLabel = event ? formatDate(event.date) : "Join our celebration";
  const time = event?.template?.fields?.time?.trim();
  const venue = event?.template?.fields?.venue?.trim();
  const dressCode = event?.template?.fields?.dressCode?.trim();

  const metaParts = [dateLabel, time, venue].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: theme.bg,
          padding: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            backgroundColor: theme.panel,
            border: `4px solid ${theme.frame}`,
            borderRadius: "20px",
            padding: "48px 56px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: theme.accent,
              }}
            >
              {hostLine}
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: theme.spot,
              }}
            >
              Givvly
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.12,
                color: theme.ink,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 26,
                color: theme.muted,
              }}
            >
              {metaParts.join("  •  ")}
            </div>
            {dressCode ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 600,
                  color: theme.accent,
                }}
              >
                Dress Code: {dressCode}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `2px solid ${theme.frame}`,
              paddingTop: "20px",
              fontSize: 22,
              color: theme.muted,
            }}
          >
            <span>givvly.store/e/{slug}</span>
            <span style={{ color: theme.spot, fontWeight: 700 }}>
              RSVP &amp; Gift Registry
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
