import { describe, expect, it } from "vitest";
import {
  WHATSAPP_ORDER_NUMBER,
  WHATSAPP_DISPLAY_PHONE,
  createSingleProductWhatsAppLink,
  createBoxWhatsAppLink,
} from "./whatsapp";

describe("WhatsApp Order Links", () => {
  it("formats international WhatsApp phone number correctly", () => {
    expect(WHATSAPP_ORDER_NUMBER).toBe("2348029176372");
    expect(WHATSAPP_DISPLAY_PHONE).toBe("+234 802 917 6372");
  });

  it("generates single product WhatsApp URL with formatted item and price in Naira", () => {
    const url = createSingleProductWhatsAppLink({
      name: "Luxury Silk Robe",
      priceKobo: 2500000, // ₦25,000
      category: "Fashion",
      slug: "luxury-silk-robe",
      origin: "https://givvly.com",
    });

    expect(url).toContain("https://wa.me/2348029176372?text=");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("🎁 *Item*: Luxury Silk Robe");
    expect(decoded).toContain("💰 *Price*: ₦25,000");
    expect(decoded).toContain("📂 *Category*: Fashion");
    expect(decoded).toContain("🔗 *Link*: https://givvly.com/gifts/luxury-silk-robe");
  });

  it("generates predefined combo inclusions in single product WhatsApp message", () => {
    const url = createSingleProductWhatsAppLink({
      name: "Celebration Champagne Hamper",
      priceKobo: 8500000,
      isCombo: true,
      comboItems: [
        { name: "Moët Champagne", qty: 1 },
        { name: "Belgian Truffles", qty: 2 },
      ],
    });

    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("📦 *Combo Inclusions*:");
    expect(decoded).toContain("• Moët Champagne");
    expect(decoded).toContain("• 2x Belgian Truffles");
  });

  it("generates curated box combo collection WhatsApp URL with multiple items, packaging, and total", () => {
    const url = createBoxWhatsAppLink({
      items: [
        {
          product: { name: "Scented Candle", priceKobo: 1200000 },
          quantity: 2,
        },
        {
          product: { name: "Artisan Chocolate", priceKobo: 800000 },
          quantity: 1,
        },
      ],
      totalKobo: 3200000,
      packagingName: "Blush Keepsake Box",
      recipientName: "Chioma Adeleke",
      deliveryAddress: "Victoria Island, Lagos",
      giftNote: "Happy Birthday my dear sister!",
    });

    expect(url).toContain("https://wa.me/2348029176372?text=");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("📦 *Curated Gift Box* (2 items):");
    expect(decoded).toContain("1. *2x Scented Candle*");
    expect(decoded).toContain("2. *1x Artisan Chocolate*");
    expect(decoded).toContain("🎀 *Packaging*: Blush Keepsake Box");
    expect(decoded).toContain("💰 *Total Amount*: ₦32,000");
    expect(decoded).toContain("👤 *Recipient*: Chioma Adeleke");
    expect(decoded).toContain("📍 *Delivery Address*: Victoria Island, Lagos");
    expect(decoded).toContain('💌 *Gift Note*: "Happy Birthday my dear sister!"');
  });
});

