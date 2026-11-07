import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@givvly/contracts"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/auth/verify-email",
        destination: "/verify-email",
        permanent: false,
      },
      {
        source: "/auth/reset-password",
        destination: "/reset-password",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const backendUrl =
      process.env.API_INTERNAL_URL ||
      process.env.BACKEND_API_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL
        : "") ||
      "";

    if (!backendUrl || !backendUrl.startsWith("http")) {
      return [];
    }

    const cleanBackend = backendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanBackend}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/(dashboard|events|account|orders|admin|vendor)/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
