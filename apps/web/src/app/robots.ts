import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://givvly.ng";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gifts", "/e/"],
        disallow: [
          "/dashboard",
          "/events",
          "/orders",
          "/account",
          "/vendor",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

