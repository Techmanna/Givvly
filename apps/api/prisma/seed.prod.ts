import * as fs from "fs";
import * as path from "path";
import { PrismaClient, Role, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

// Load .env variables directly if running locally
try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore
}

// Sanitize and validate DATABASE_URL
let dbUrl = process.env.DATABASE_URL?.trim();
if (dbUrl) {
  if (
    (dbUrl.startsWith("<") && dbUrl.endsWith(">")) ||
    (dbUrl.startsWith('"') && dbUrl.endsWith('"')) ||
    (dbUrl.startsWith("'") && dbUrl.endsWith("'"))
  ) {
    dbUrl = dbUrl.slice(1, -1).trim();
  }
}

if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
  console.error("❌ Invalid or missing DATABASE_URL!");
  console.error(`Received value: "${dbUrl ?? "undefined"}"`);
  console.error("\n💡 How to fix:");
  console.error("1. Go to your Render Dashboard -> click 'givvly-postgres'.");
  console.error("2. Under 'Connections', copy the 'External Database URL'.");
  console.error("3. Make sure not to include the angle brackets < >.");
  console.error("\nExample command:");
  console.error('DATABASE_URL="postgresql://givvly:your_password@dpg-xxxxxx-a.oregon-postgres.render.com/givvly_prod" pnpm --filter @givvly/api seed:prod\n');
  process.exit(1);
}

process.env.DATABASE_URL = dbUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log("🚀 Starting Givvly Production Database Seed (Admin + Catalog + Digital Gifts)...");

  // ---------------------------------------------------------------------------
  // 1. Admin User
  // ---------------------------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL || "admin@givvly.vercel.app";
  const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";
  const adminName = process.env.ADMIN_NAME || "Givvly Administrator";
  const adminPhone = process.env.ADMIN_PHONE || "+2348021112233";

  console.log(`👤 Seeding Admin user (${adminEmail})...`);

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      name: adminName,
      phone: adminPhone,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: adminEmail,
      name: adminName,
      phone: adminPhone,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Admin user ready: ${admin.email} (ID: ${admin.id})`);

  // ---------------------------------------------------------------------------
  // 2. Production Catalog Products
  // ---------------------------------------------------------------------------
  console.log("🎁 Seeding catalog products, hampers, and digital gifts...");

  const productsData = [
    // --- Physical Gifts & Appliances ---
    {
      slug: "kenwood-titanium-stand-mixer",
      title: "Kenwood Titanium Chef Baker Stand Mixer",
      description: "Precision planetary mixing, built-in EasyWeigh scales, 1200W motor, and 5L brushed stainless steel bowl.",
      priceKobo: 38500000, // ₦385,000
      images: [
        "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop",
      ],
      occasions: ["WEDDING", "ANNIVERSARY", "HOUSEWARMING"],
      relationships: ["PARTNER", "COUPLE", "PARENTS"],
      isDigital: false,
      stock: 50,
      ratingAvg: 4.9,
      ratingCount: 28,
      active: true,
    },
    {
      slug: "le-creuset-cast-iron-dutch-oven",
      title: "Le Creuset Cast Iron Dutch Oven (26cm Cerise)",
      description: "Iconic French enameled cast iron round casserole. Superior heat retention and vibrant, crack-resistant enamel finish.",
      priceKobo: 24000000, // ₦240,000
      images: [
        "https://images.unsplash.com/photo-1584990347449-399b1bb54848?w=800&auto=format&fit=crop",
      ],
      occasions: ["WEDDING", "HOUSEWARMING"],
      relationships: ["COUPLE", "FAMILY"],
      isDigital: false,
      stock: 40,
      ratingAvg: 5.0,
      ratingCount: 34,
      active: true,
    },
    {
      slug: "nespresso-lattissima-one",
      title: "Nespresso Lattissima One Espresso Machine",
      description: "One-touch fresh milk system for creamy cappuccinos and lattes. 19-bar high-pressure extraction.",
      priceKobo: 29000000, // ₦290,000
      images: [
        "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop",
      ],
      occasions: ["WEDDING", "BIRTHDAY", "HOUSEWARMING"],
      relationships: ["FRIEND", "COUPLE"],
      isDigital: false,
      stock: 35,
      ratingAvg: 4.8,
      ratingCount: 42,
      active: true,
    },
    {
      slug: "egyptian-cotton-800tc-bedding",
      title: "Egyptian Cotton 800TC King Bedding Set (Blush)",
      description: "Ultra-silky sateen weave crafted from 100% certified long-staple Giza cotton. Includes duvet cover and 4 pillowcases.",
      priceKobo: 12500000, // ₦125,000
      images: [
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop",
      ],
      occasions: ["WEDDING", "ANNIVERSARY"],
      relationships: ["PARTNER", "COUPLE"],
      isDigital: false,
      stock: 60,
      ratingAvg: 4.9,
      ratingCount: 19,
      active: true,
    },
    {
      slug: "sony-wh1000xm5-headphones",
      title: "Sony WH-1000XM5 Noise-Cancelling Headphones",
      description: "Industry-leading wireless active noise cancellation with 8 microphones, Auto NC Optimizer, and 30-hour battery life.",
      priceKobo: 42000000, // ₦420,000
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY", "GRADUATION"],
      relationships: ["FRIEND", "PARTNER", "SIBLING"],
      isDigital: false,
      stock: 30,
      ratingAvg: 4.9,
      ratingCount: 65,
      active: true,
    },
    {
      slug: "b-and-o-beosound-a1-speaker",
      title: "Bang & Olufsen Beosound A1 2nd Gen Portable Speaker",
      description: "Waterproof Bluetooth speaker with 360-degree True360 sound dispersion and Alexa voice assistant built-in.",
      priceKobo: 31000000, // ₦310,000
      images: [
        "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY", "GRADUATION"],
      relationships: ["FRIEND", "COLLEAGUE"],
      isDigital: false,
      stock: 25,
      ratingAvg: 4.8,
      ratingCount: 31,
      active: true,
    },
    {
      slug: "convertible-3in1-baby-crib",
      title: "Convertible 3-in-1 Baby Crib & Premium Mattress",
      description: "Sustainable solid pine craftsmanship, converting seamlessly from infant bassinet to toddler safety bed.",
      priceKobo: 32000000, // ₦320,000
      images: [
        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop",
      ],
      occasions: ["BABY_SHOWER", "NAMING_CEREMONY"],
      relationships: ["FAMILY", "FRIEND"],
      isDigital: false,
      stock: 20,
      ratingAvg: 4.9,
      ratingCount: 15,
      active: true,
    },

    // --- Curated Gift Hampers & Keepsake Boxes ---
    {
      slug: "royal-wedding-keepsake-hamper",
      title: "The Royal Wedding Keepsake Hamper Box",
      description: "Handcrafted wooden keepsake crate with personalised champagne flutes, Belgian chocolates, scented candle, and luxury Turkish throws.",
      priceKobo: 15000000, // ₦150,000
      images: [
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop",
      ],
      occasions: ["WEDDING", "ANNIVERSARY"],
      relationships: ["COUPLE"],
      isDigital: false,
      stock: 50,
      ratingAvg: 5.0,
      ratingCount: 18,
      active: true,
    },
    {
      slug: "lagos-luxury-birthday-box",
      title: "Lagos Luxury Celebration Hamper Box",
      description: "Curated celebration box with imported gourmet truffles, artisanal gold-rimmed mug, silk sleep mask, and celebration cards.",
      priceKobo: 8500000, // ₦85,000
      images: [
        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY"],
      relationships: ["FRIEND", "SISTER", "COLLEAGUE"],
      isDigital: false,
      stock: 45,
      ratingAvg: 4.9,
      ratingCount: 27,
      active: true,
    },
    {
      slug: "oud-amber-luxury-perfume-box",
      title: "Signature Oud & Amber Perfume Keepsake Box",
      description: "Exquisite artisanal parfum extract with aged Cambodian oud, Moroccan amber, and golden velvet gift presentation.",
      priceKobo: 9500000, // ₦95,000
      images: [
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY", "ANNIVERSARY"],
      relationships: ["PARTNER", "FRIEND"],
      isDigital: false,
      stock: 40,
      ratingAvg: 4.7,
      ratingCount: 22,
      active: true,
    },

    // --- Digital Gifts (Airtime, Mobile Data, Vouchers) ---
    {
      slug: "mtn-airtime-voucher-5000",
      title: "MTN ₦5,000 Instant Airtime Voucher",
      description: "Direct instant VTU top-up delivered to the recipient's phone number powered by BillSpot.",
      priceKobo: 500000, // ₦5,000
      images: [
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop",
      ],
      occasions: ["mtn", "BIRTHDAY", "OTHER"],
      relationships: ["FRIEND", "COLLEAGUE"],
      isDigital: true,
      digitalKind: "AIRTIME",
      stock: null,
      ratingAvg: 5.0,
      ratingCount: 88,
      active: true,
    },
    {
      slug: "airtel-data-bundle-10gb",
      title: "Airtel 10GB High-Speed Mobile Data Bundle",
      description: "Instant data bundle credited directly to recipient's Airtel SIM via BillSpot partner API.",
      priceKobo: 450000, // ₦4,500
      images: [
        "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop",
      ],
      occasions: ["airtel", "GRADUATION", "OTHER"],
      relationships: ["FRIEND", "SIBLING"],
      isDigital: true,
      digitalKind: "DATA",
      stock: null,
      ratingAvg: 4.9,
      ratingCount: 54,
      active: true,
    },
    {
      slug: "glo-airtime-voucher-2000",
      title: "Glo ₦2,000 Instant Airtime",
      description: "Direct airtime top-up for Glo mobile lines with zero shipping.",
      priceKobo: 200000, // ₦2,000
      images: [
        "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=800&auto=format&fit=crop",
      ],
      occasions: ["glo", "OTHER"],
      relationships: ["FRIEND"],
      isDigital: true,
      digitalKind: "AIRTIME",
      stock: null,
      ratingAvg: 4.8,
      ratingCount: 32,
      active: true,
    },
    {
      slug: "luxury-spa-wellness-voucher-50k",
      title: "Luxury Spa & Wellness Digital Gift Card (₦50,000)",
      description: "Redeemable for full-body Swedish massage, facial treatment, and aromatherapy at premier wellness spas across Lagos and Abuja.",
      priceKobo: 5000000, // ₦50,000
      images: [
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY", "ANNIVERSARY", "WEDDING"],
      relationships: ["PARTNER", "FRIEND", "MOM"],
      isDigital: true,
      digitalKind: "GIFT_CARD",
      stock: null,
      ratingAvg: 5.0,
      ratingCount: 40,
      active: true,
    },
    {
      slug: "givvly-store-credit-voucher-25k",
      title: "Givvly ₦25,000 Universal Store Credit Voucher",
      description: "Universal digital voucher with unique redemption PIN. Can be applied at checkout toward any gift in the Givvly catalog.",
      priceKobo: 2500000, // ₦25,000
      images: [
        "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop",
      ],
      occasions: ["BIRTHDAY", "WEDDING", "GRADUATION"],
      relationships: ["FRIEND", "COLLEAGUE", "FAMILY"],
      isDigital: true,
      digitalKind: "VOUCHER",
      stock: null,
      ratingAvg: 4.9,
      ratingCount: 76,
      active: true,
    },
  ];

  const createdProducts: Record<string, any> = {};

  for (const p of productsData) {
    const record = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        priceKobo: p.priceKobo,
        images: p.images,
        occasions: p.occasions,
        relationships: p.relationships,
        isDigital: p.isDigital,
        digitalKind: p.digitalKind,
        stock: p.stock,
        active: p.active,
      },
      create: p,
    });
    createdProducts[p.slug] = record;
  }

  console.log(`✅ Seeded ${Object.keys(createdProducts).length} catalog products & digital gifts.`);

  // ---------------------------------------------------------------------------
  // 3. Curated Collections
  // ---------------------------------------------------------------------------
  console.log("📂 Seeding curated collections...");

  const collectionsData = [
    {
      slug: "wedding-essentials",
      name: "The Ultimate Wedding Registry Collection",
      kind: "CURATED",
      productIds: [
        createdProducts["kenwood-titanium-stand-mixer"].id,
        createdProducts["le-creuset-cast-iron-dutch-oven"].id,
        createdProducts["nespresso-lattissima-one"].id,
        createdProducts["egyptian-cotton-800tc-bedding"].id,
        createdProducts["royal-wedding-keepsake-hamper"].id,
      ],
    },
    {
      slug: "anniversary-specials",
      name: "Anniversary Celebration Hampers & Escapes",
      kind: "CELEBRATION",
      productIds: [
        createdProducts["oud-amber-luxury-perfume-box"].id,
        createdProducts["luxury-spa-wellness-voucher-50k"].id,
        createdProducts["royal-wedding-keepsake-hamper"].id,
      ],
    },
    {
      slug: "digital-delights",
      name: "Instant Digital Gifts, Vouchers & Top-Ups",
      kind: "DIGITAL",
      productIds: [
        createdProducts["mtn-airtime-voucher-5000"].id,
        createdProducts["airtel-data-bundle-10gb"].id,
        createdProducts["glo-airtime-voucher-2000"].id,
        createdProducts["luxury-spa-wellness-voucher-50k"].id,
        createdProducts["givvly-store-credit-voucher-25k"].id,
      ],
    },
  ];

  for (const c of collectionsData) {
    await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        kind: c.kind,
        productIds: c.productIds,
      },
      create: c,
    });
  }

  console.log(`✅ Seeded ${collectionsData.length} curated collections.`);
  console.log("✨ Production seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Production seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

