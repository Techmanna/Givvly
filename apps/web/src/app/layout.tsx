import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { QueryProvider } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://givvly.store";

export const viewport: Viewport = {
  themeColor: "#8C6A3E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Givvly — Events-first Gifting, Registries & Cash Blessings",
    template: "%s | Givvly",
  },
  description:
    "Givvly is Nigeria's modern gifting and registry platform. Create elegant wedding & celebration registries, collect cash gifts in Naira and diaspora currencies, and receive curated gifts across Nigeria.",
  keywords: [
    "wedding registry Nigeria",
    "cash gift registry",
    "diaspora gifting",
    "Lagos wedding gifts",
    "Nigerian wedding wishlist",
    "honeymoon cash fund",
    "bridal shower registry",
    "milestone birthday registry",
    "give cash in Naira",
    "digital wedding invitation",
    "wall of love",
    "Givvly",
    "Aso-Ebi gift registry",
    "VTU airtime gift",
    "data bundle gift Nigeria",
  ],
  authors: [{ name: "Givvly Inc.", url: "https://givvly.store" }],
  creator: "Givvly Inc.",
  publisher: "Givvly Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Givvly — The Right Gift, For Every Right Moment",
    description:
      "Modern gifting and cash registries for Nigerian weddings, birthdays, and celebrations. Receive cash blessings from Lagos to London, settled directly into your bank.",
    url: siteUrl,
    siteName: "Givvly",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1024,
        height: 614,
        alt: "Givvly — A Gift, Chosen with Love",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Givvly — Events-first Gifting & Registries",
    description:
      "The right gift, for every right moment. Digital stationery, cash funds, and curated keepsakes for weddings and celebrations across Nigeria and the diaspora.",
    images: ["/images/og-preview.jpg"],
    creator: "@givvly_ng",
    site: "@givvly_ng",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/images/favicon-icons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/images/favicon-icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/images/favicon-icons/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/images/favicon-icons/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/images/favicon-icons/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      {
        url: "/images/favicon-icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/images/favicon-icons/favicon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/images/favicon-icons/favicon-512x512.png",
        color: "#8C6A3E",
      },
    ],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const rootStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Givvly",
      url: siteUrl,
      logo: `${siteUrl}/images/givvly-logo.png`,
      image: `${siteUrl}/images/og-preview.jpg`,
      description:
        "Events-first gifting and registry platform for Nigerian weddings, milestone birthdays, and celebrations worldwide.",
      slogan: "The right gift, for every right moment...",
      sameAs: [
        "https://www.instagram.com/givvly.store",
        "https://twitter.com/givvly_ng",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support & Concierge",
        email: "concierge@givvly.store",
        availableLanguage: ["English", "Yoruba", "Igbo", "Hausa"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "Givvly",
      description:
        "Create digital event stationery, cash blessing registries, and curated gift wishlists.",
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/celebrations?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "en-NG",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}#webapplication`,
      name: "Givvly Web App",
      url: siteUrl,
      applicationCategory: "LifestyleApplication, FinanceApplication",
      operatingSystem: "All modern web browsers (Chrome, Safari, Firefox, Edge)",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "NGN",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(rootStructuredData),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
