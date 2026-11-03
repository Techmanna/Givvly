import { formatNaira } from "@/lib/format";

export const WHATSAPP_ORDER_NUMBER = "2348029176372";
export const WHATSAPP_DISPLAY_PHONE = "+234 802 917 6372";

export type SingleProductWhatsAppParams = {
  name: string;
  priceKobo: number;
  category?: string;
  slug?: string;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty?: number }>;
  origin?: string;
  recipientName?: string;
  deliveryAddress?: string;
};

export function createSingleProductWhatsAppLink(
  product: SingleProductWhatsAppParams
): string {
  const priceFormatted = formatNaira(product.priceKobo);
  const lines: string[] = [
    "Hello Givvly! 👋🏻",
    "I would like to order this gift item:",
    "",
    `🎁 *Item*: ${product.name}`,
    `💰 *Price*: ${priceFormatted}`,
  ];

  if (product.category) {
    lines.push(`📂 *Category*: ${product.category}`);
  }

  if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
    lines.push("");
    lines.push("📦 *Combo Inclusions*:");
    product.comboItems.forEach((item) => {
      lines.push(`  • ${item.qty && item.qty > 1 ? `${item.qty}x ` : ""}${item.name}`);
    });
  }

  if (product.recipientName) {
    lines.push(`👤 *Recipient*: ${product.recipientName}`);
  }

  if (product.deliveryAddress) {
    lines.push(`📍 *Delivery Address*: ${product.deliveryAddress}`);
  }

  if (product.slug) {
    const baseUrl = product.origin || (typeof window !== "undefined" ? window.location.origin : "");
    if (baseUrl) {
      lines.push(`🔗 *Link*: ${baseUrl}/gifts/${product.slug}`);
    }
  }

  lines.push("");
  lines.push("Please confirm availability and let me know how to proceed with payment and delivery. Thank you!");

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${text}`;
}

export type BoxWhatsAppParams = {
  items: Array<{
    product: { name: string; priceKobo: number };
    quantity: number;
  }>;
  totalKobo: number;
  packagingName?: string;
  recipientName?: string;
  deliveryAddress?: string;
  giftNote?: string;
};

export function createBoxWhatsAppLink({
  items,
  totalKobo,
  packagingName = "Luxury Keepsake Box",
  recipientName,
  deliveryAddress,
  giftNote,
}: BoxWhatsAppParams): string {
  const lines: string[] = [
    "Hello Givvly! 👋🏻",
    "I would like to order a curated Gift Box with the following items:",
    "",
    `📦 *Curated Gift Box* (${items.length} item${items.length === 1 ? "" : "s"}):`,
    "----------------------------------",
  ];

  items.forEach((item, idx) => {
    const itemTotal = formatNaira(item.product.priceKobo * item.quantity);
    lines.push(`${idx + 1}. *${item.quantity}x ${item.product.name}* (${itemTotal})`);
  });

  lines.push("----------------------------------");
  if (packagingName) {
    lines.push(`🎀 *Packaging*: ${packagingName}`);
  }
  lines.push(`💰 *Total Amount*: ${formatNaira(totalKobo)}`);

  if (recipientName) {
    lines.push(`👤 *Recipient*: ${recipientName}`);
  }

  if (deliveryAddress) {
    lines.push(`📍 *Delivery Address*: ${deliveryAddress}`);
  }

  if (giftNote) {
    lines.push(`💌 *Gift Note*: "${giftNote}"`);
  }

  lines.push("");
  lines.push("Please confirm availability and share payment details to process my order. Thank you!");

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${text}`;
}

