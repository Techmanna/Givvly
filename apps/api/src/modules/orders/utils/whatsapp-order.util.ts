export const GIVVLY_WHATSAPP_NUMBER = "2348029176372";
export const GIVVLY_WHATSAPP_DISPLAY = "+234 802 917 6372";

export type OrderWhatsAppDetails = {
  orderNumber: string;
  trackingToken: string;
  items: Array<{ title: string; qty: number; unitPriceKobo: number }>;
  totalKobo: number;
  currency?: string;
  recipientName: string;
  deliveryCity?: string;
  giftNote?: string;
  baseUrl?: string;
};

export function formatSubunitsToDisplay(amountSubunits: number, currency = "NGN"): string {
  const amount = (amountSubunits / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (currency.toUpperCase() === "NGN") return `₦${amount}`;
  if (currency.toUpperCase() === "USD") return `$${amount}`;
  if (currency.toUpperCase() === "GBP") return `£${amount}`;
  if (currency.toUpperCase() === "EUR") return `€${amount}`;
  return `${currency} ${amount}`;
}

export function generateOrderWhatsAppLink(details: OrderWhatsAppDetails): string {
  const currency = details.currency || "NGN";
  const lines: string[] = [
    "Hello Givvly! 🌸",
    `I have an inquiry regarding my order *${details.orderNumber}*:`,
    "",
    "📦 *Order Details*:",
    "----------------------------------",
  ];

  details.items.forEach((item, idx) => {
    const itemTotal = formatSubunitsToDisplay(item.unitPriceKobo * item.qty, currency);
    lines.push(`${idx + 1}. *${item.qty}x ${item.title}* (${itemTotal})`);
  });

  lines.push("----------------------------------");
  lines.push(`💰 *Total*: ${formatSubunitsToDisplay(details.totalKobo, currency)}`);
  lines.push(`👤 *Recipient*: ${details.recipientName}`);

  if (details.deliveryCity) {
    lines.push(`📍 *Location*: ${details.deliveryCity}`);
  }

  if (details.giftNote) {
    lines.push(`💌 *Gift Note*: "${details.giftNote}"`);
  }

  const host = details.baseUrl || "https://givvly.com";
  lines.push(`🔗 *Track Order*: ${host}/orders/track/${details.trackingToken}`);
  lines.push("");
  lines.push("Please assist with tracking and delivery updates. Thank you!");

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${GIVVLY_WHATSAPP_NUMBER}?text=${text}`;
}

