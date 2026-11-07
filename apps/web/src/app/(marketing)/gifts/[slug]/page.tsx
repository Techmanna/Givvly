import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api-client";
import { ProductDetailView, type CatalogProduct } from "@/features/catalog";

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

  let product: CatalogProduct | null = null;
  try {
    product = await api<CatalogProduct>(
      `/catalog/products/${encodeURIComponent(slug)}`
    );
  } catch {
    product = null;
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailView product={product} />;
}
