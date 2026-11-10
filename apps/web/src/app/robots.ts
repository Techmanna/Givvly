import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://givvly.store").replace(
    /\/$/,
    ""
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/celebrations",
          "/gifts",
          "/gifts/*",
          "/help",
          "/privacy",
          "/terms",
          "/e/*",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/account",
          "/account/*",
          "/admin",
          "/admin/*",
          "/vendor",
          "/vendor/*",
          "/checkout/*",
          "/track/*",
          "/api/*",
          "/e/*/unlock",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Anthropic-AI",
          "Google-Extended",
          "Applebot-Extended",
          "cohere-ai",
        ],
        allow: [
          "/",
          "/celebrations",
          "/gifts",
          "/gifts/*",
          "/help",
          "/privacy",
          "/terms",
          "/e/*",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/dashboard",
          "/account",
          "/admin",
          "/vendor",
          "/checkout",
          "/api",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
