import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import { ProductDetailView, type CatalogProduct } from "@/features/catalog";

export default async function GiftProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
