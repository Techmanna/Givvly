import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api-client";
import { ProductDetailView, type CatalogProduct } from "@/features/catalog";

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://givvly.store").replace(
  /\/$/,
  ""
);

async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  try {
    return await api<CatalogProduct>(
      `/catalog/products/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 3600, tags: [`product:${slug}`] },
      }
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lower = slug.toLowerCase();
  if (
    lower === "data" ||
    lower === "billspot-vtu-data-bundle-gift" ||
    lower.includes("data-bundle") ||
    lower === "airtime" ||
    lower === "billspot-vtu-airtime-gift" ||
    lower.includes("airtime-voucher")
  ) {
    return {
      title: "Digital Gift Voucher",
      description: "Send mobile airtime or data bundle gifts instantly across Nigerian networks.",
    };
  }

  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: "Gift Item",
      description: "Curated gifts and registry items on Givvly.",
    };
  }

  const priceNaira = (product.priceKobo / 100).toLocaleString();
  const canonicalUrl = `${siteUrl}/gifts/${product.slug}`;
  const description = `${product.name} by ${product.vendorName} (₦${priceNaira}). ${product.description.slice(0, 140)}... Perfect for weddings, birthdays, and anniversaries on Givvly.`;
  const previewImage = product.imageUrl || `${siteUrl}/images/og-preview.jpg`;

  return {
    title: `${product.name} — Gift Registry`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} — ₦${priceNaira}`,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Givvly",
      images: [
        {
          url: previewImage,
          width: 1024,
          height: 614,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ₦${priceNaira}`,
      description,
      images: [previewImage],
    },
  };
}

export default async function GiftProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lower = slug.toLowerCase();

  if (
    lower === "data" ||
    lower === "billspot-vtu-data-bundle-gift" ||
    lower.includes("data-bundle")
  ) {
    redirect("/checkout/data");
  }
  if (
    lower === "airtime" ||
    lower === "billspot-vtu-airtime-gift" ||
    lower.includes("airtime-voucher")
  ) {
    redirect("/checkout/airtime");
  }

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const canonicalUrl = `${siteUrl}/gifts/${product.slug}`;
  const previewImage = product.imageUrl || `${siteUrl}/images/og-preview.jpg`;

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: previewImage,
    sku: product.id || product.slug,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: product.vendorName || "Givvly Curated",
    },
    offers: {
      "@type": "Offer",
      price: (product.priceKobo / 100).toFixed(2),
      priceCurrency: "NGN",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: canonicalUrl,
      seller: {
        "@type": "Organization",
        name: product.vendorName || "Givvly",
      },
    },
    ...(product.rating
      ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          reviewCount: product.reviewCount || 1,
          bestRating: 5,
          worstRating: 1,
        },
      }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData),
        }}
      />
      <ProductDetailView product={product} />
    </>
  );
}
