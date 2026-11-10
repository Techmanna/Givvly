import * as fs from "fs";
import * as path from "path";

// Load .env variables directly without external dependencies
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
} catch (e) {
  // Ignore
}

import {
  PrismaClient,
  Role,
  EventType,
  EventStatus,
  Visibility,
  ItemStatus,
  PoolMode,
  PoolStatus,
  GiftType,
  GiftStatus,
  OrderStatus,
  DisputeStatus,
  RsvpResponse,
  PostStatus,
  AccountStatus,
  PayoutStatus,
} from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Givvly database seed...");

  const passwordHash = await argon2.hash("Password123!", {
    type: argon2.argon2id,
  });

  // 1. Users (Admin, Hosts, and Guests)
  console.log("👤 Seeding users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@givvly.store" },
    update: {
      role: Role.ADMIN,
      name: "Tunde Bakare (Admin)",
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+2348021112233",
    },
    create: {
      email: "admin@givvly.store",
      passwordHash,
      name: "Tunde Bakare (Admin)",
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
      phone: "+2348021112233",
    },
  });

  const hostAdaobi = await prisma.user.upsert({
    where: { email: "adaobi@givvly.store" },
    update: {
      name: "Adaobi Okafor",
      role: Role.USER,
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+2348031234567",
    },
    create: {
      email: "adaobi@givvly.store",
      passwordHash,
      name: "Adaobi Okafor",
      role: Role.USER,
      emailVerifiedAt: new Date(),
      phone: "+2348031234567",
    },
  });

  const hostAmara = await prisma.user.upsert({
    where: { email: "amara@givvly.store" },
    update: {
      name: "Amara Nwachukwu",
      role: Role.USER,
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+2348055566778",
    },
    create: {
      email: "amara@givvly.store",
      passwordHash,
      name: "Amara Nwachukwu",
      role: Role.USER,
      emailVerifiedAt: new Date(),
      phone: "+2348055566778",
    },
  });

  const hostTunde = await prisma.user.upsert({
    where: { email: "tunde@givvly.store" },
    update: {
      name: "Dr. Tunde Adeleke",
      role: Role.USER,
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+2348099900011",
    },
    create: {
      email: "tunde@givvly.store",
      passwordHash,
      name: "Dr. Tunde Adeleke",
      role: Role.USER,
      emailVerifiedAt: new Date(),
      phone: "+2348099900011",
    },
  });

  const guestEmeka = await prisma.user.upsert({
    where: { email: "emeka@givvly.store" },
    update: {
      name: "Emeka Chinedu",
      role: Role.USER,
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+2348123456789",
    },
    create: {
      email: "emeka@givvly.store",
      passwordHash,
      name: "Emeka Chinedu",
      role: Role.USER,
      emailVerifiedAt: new Date(),
      phone: "+2348123456789",
    },
  });

  // 2. Verified Payout Account for Host
  console.log("🏦 Seeding payout account...");
  const dummyCipher = "enc_v1:" + Buffer.from("0123456789").toString("base64") + ":" + Buffer.from("tag123").toString("base64");
  const accountHash = crypto.createHash("sha256").update(`058:0123456789`).digest("hex");

  await prisma.payoutAccount.upsert({
    where: {
      userId_accountHash: {
        userId: hostAdaobi.id,
        accountHash,
      },
    },
    update: {
      status: AccountStatus.VERIFIED,
      isDefault: true,
    },
    create: {
      userId: hostAdaobi.id,
      bankCode: "058",
      bankName: "Guaranty Trust Bank (GTBank)",
      accountNumberEnc: dummyCipher,
      accountLast4: "4829",
      accountHash,
      accountName: "ADAOBI OKAFOR",
      status: AccountStatus.VERIFIED,
      isDefault: true,
    },
  });

  // 3. Catalog Products (Physical Gifts, Combo Hampers, Digital Airtime/Data/Vouchers)
  console.log("🎁 Seeding catalog products...");
  const productsData = [
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
      stock: 15,
      ratingAvg: 4.9,
      ratingCount: 28,
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
      stock: 12,
      ratingAvg: 5.0,
      ratingCount: 34,
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
      stock: 20,
      ratingAvg: 4.8,
      ratingCount: 42,
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
      stock: 30,
      ratingAvg: 4.9,
      ratingCount: 19,
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
      stock: 18,
      ratingAvg: 4.9,
      ratingCount: 65,
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
      stock: 25,
      ratingAvg: 4.7,
      ratingCount: 22,
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
      stock: 8,
      ratingAvg: 4.9,
      ratingCount: 15,
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
      stock: 20,
      ratingAvg: 4.8,
      ratingCount: 31,
    },
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
    },
    // Digital Gifts (Airtime, Mobile Data, Vouchers)
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
      },
      create: p,
    });
    createdProducts[p.slug] = record;
  }

  // 4. Curated Collections
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

  // 4b. Product Reviews
  console.log("⭐ Seeding product reviews...");
  const reviewsData = [
    {
      productId: createdProducts["royal-wedding-keepsake-hamper"]?.id,
      rating: 5,
      title: "Exceeded all expectations!",
      authorName: "Vanessa O.",
      comment: "The satin presentation and engraved crystal flute were flawless. The couple was genuinely touched.",
      verified: true,
    },
    {
      productId: createdProducts["royal-wedding-keepsake-hamper"]?.id,
      rating: 5,
      title: "Pristine gift hamper",
      authorName: "Chidi N.",
      comment: "Arrived in Lagos on exact schedule. Beautiful packaging that looked even better than the catalog photos.",
      verified: true,
    },
    {
      productId: createdProducts["kenwood-titanium-stand-mixer"]?.id,
      rating: 5,
      title: "An absolute powerhouse in the kitchen",
      authorName: "Amina Bello",
      comment: "Delivered promptly for my sister's wedding gift. Very sturdy and comes with complete accessories.",
      verified: true,
    },
    {
      productId: createdProducts["oud-amber-luxury-perfume-box"]?.id,
      rating: 5,
      title: "Distinctive and luxurious scent",
      authorName: "Olumide A.",
      comment: "The fragrance notes linger wonderfully. The unboxing experience was truly top tier.",
      verified: true,
    },
  ];

  for (const r of reviewsData) {
    if (!r.productId) continue;
    const existing = await prisma.review.findFirst({
      where: {
        productId: r.productId,
        authorName: r.authorName,
      },
    });
    if (!existing) {
      await prisma.review.create({ data: r });
    }
  }

  // Recalculate rating aggregates on products that have reviews
  for (const slug of [
    "royal-wedding-keepsake-hamper",
    "kenwood-titanium-stand-mixer",
    "oud-amber-luxury-perfume-box",
  ]) {
    const prod = createdProducts[slug];
    if (prod) {
      const agg = await prisma.review.aggregate({
        where: { productId: prod.id },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
      });
    }
  }

  // 5. Events with Registries, Pools, RSVPs, and Wall Posts
  console.log("🎉 Seeding events...");

  // Event 1: Adaobi & Chidi's Wedding
  const weddingEvent = await prisma.event.upsert({
    where: { slug: "adaobi-and-chidi-2026" },
    update: {
      name: "Adaobi & Chidi's Forever (#ChidAda26)",
      type: EventType.WEDDING,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-12-12T10:00:00.000Z"),
      story: "From meeting at University of Lagos to 8 years of joy, laughter, and endless suya runs. We cannot wait to celebrate our holy matrimony with our loved ones in Victoria Island, Lagos!",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
    create: {
      ownerId: hostAdaobi.id,
      slug: "adaobi-and-chidi-2026",
      name: "Adaobi & Chidi's Forever (#ChidAda26)",
      type: EventType.WEDDING,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-12-12T10:00:00.000Z"),
      story: "From meeting at University of Lagos to 8 years of joy, laughter, and endless suya runs. We cannot wait to celebrate our holy matrimony with our loved ones in Victoria Island, Lagos!",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
  });

  // Clear existing items/pools for idempotent re-seed
  await prisma.registryItem.deleteMany({ where: { eventId: weddingEvent.id } });
  await prisma.pool.deleteMany({ where: { eventId: weddingEvent.id } });
  await prisma.rsvp.deleteMany({ where: { eventId: weddingEvent.id } });
  await prisma.wallPost.deleteMany({ where: { eventId: weddingEvent.id } });

  // Wedding Registry Items
  await prisma.registryItem.createMany({
    data: [
      {
        eventId: weddingEvent.id,
        productId: createdProducts["kenwood-titanium-stand-mixer"].id,
        title: "Kenwood Titanium Chef Baker Stand Mixer",
        priceKobo: 38500000,
        status: ItemStatus.AVAILABLE,
        position: 1,
      },
      {
        eventId: weddingEvent.id,
        productId: createdProducts["le-creuset-cast-iron-dutch-oven"].id,
        title: "Le Creuset Cast Iron Dutch Oven (26cm Cerise)",
        priceKobo: 24000000,
        status: ItemStatus.RESERVED,
        reservedUntil: new Date(Date.now() + 600 * 1000), // 10 min hold
        reservationToken: "res_seed_wedding_01",
        position: 2,
      },
      {
        eventId: weddingEvent.id,
        productId: createdProducts["nespresso-lattissima-one"].id,
        title: "Nespresso Lattissima One Espresso Machine",
        priceKobo: 29000000,
        status: ItemStatus.AVAILABLE,
        position: 3,
      },
      {
        eventId: weddingEvent.id,
        productId: createdProducts["egyptian-cotton-800tc-bedding"].id,
        title: "Egyptian Cotton 800TC King Bedding Set (Blush)",
        priceKobo: 12500000,
        status: ItemStatus.CLAIMED,
        position: 4,
      },
      {
        eventId: weddingEvent.id,
        productId: createdProducts["royal-wedding-keepsake-hamper"].id,
        title: "The Royal Wedding Keepsake Hamper Box",
        priceKobo: 15000000,
        status: ItemStatus.AVAILABLE,
        position: 5,
      },
    ],
  });

  // Wedding Pools
  await prisma.pool.createMany({
    data: [
      {
        eventId: weddingEvent.id,
        title: "Zanzibar Honeymoon Getaway Fund",
        mode: PoolMode.CASH,
        targetKobo: 250000000, // ₦2,500,000
        raisedKobo: 165000000, // ₦1,650,000 raised
        allowOverfund: false,
        deadline: new Date("2026-12-10T23:59:59Z"),
        status: PoolStatus.OPEN,
      },
      {
        eventId: weddingEvent.id,
        title: "LG 65-Inch OLED 4K Smart TV",
        productId: createdProducts["kenwood-titanium-stand-mixer"].id,
        mode: PoolMode.PRODUCT,
        targetKobo: 180000000, // ₦1,800,000
        raisedKobo: 90000000, // ₦900,000 raised
        allowOverfund: false,
        deadline: new Date("2026-12-05T23:59:59Z"),
        status: PoolStatus.OPEN,
      },
    ],
  });

  // Wedding RSVPs
  await prisma.rsvp.createMany({
    data: [
      {
        eventId: weddingEvent.id,
        contactKey: "emeka@givvly.store",
        name: "Emeka Chinedu",
        email: "emeka@givvly.store",
        phone: "+2348123456789",
        response: RsvpResponse.YES,
        plusOneName: "Chioma Chinedu",
      },
      {
        eventId: weddingEvent.id,
        contactKey: "femi.adebayo@gmail.com",
        name: "Femi Adebayo",
        email: "femi.adebayo@gmail.com",
        phone: "+2348033334444",
        response: RsvpResponse.YES,
        plusOneName: "Dr. Kemi Adebayo",
      },
      {
        eventId: weddingEvent.id,
        contactKey: "zainab.danladi@yahoo.com",
        name: "Zainab Danladi",
        email: "zainab.danladi@yahoo.com",
        response: RsvpResponse.MAYBE,
      },
      {
        eventId: weddingEvent.id,
        contactKey: "victor.okoro@outlook.com",
        name: "Victor Okoro",
        email: "victor.okoro@outlook.com",
        response: RsvpResponse.NO,
      },
    ],
  });

  // Wedding Wall of Love Posts
  await prisma.wallPost.createMany({
    data: [
      {
        eventId: weddingEvent.id,
        authorName: "Uncle Jude & Family",
        authorEmail: "jude.okafor@gmail.com",
        text: "May the Almighty crown your union with joy, peace, and long life. Congratulations my beloved niece Adaobi!",
        status: PostStatus.VISIBLE,
      },
      {
        eventId: weddingEvent.id,
        authorName: "Chioma & Emeka",
        authorEmail: "chioma.c@gmail.com",
        text: "You two are the sweetest couple! Cannot wait to dance until 3am on the 12th! 💃🥂",
        status: PostStatus.VISIBLE,
      },
      {
        eventId: weddingEvent.id,
        authorName: "Tolu from Unilag",
        authorEmail: "tolu.unilag@gmail.com",
        text: "Best love story since campus days! Cheers to forever Chidi and Ada!",
        status: PostStatus.VISIBLE,
      },
    ],
  });

  // Event 2: Amara's 30th Birthday Soirée
  const birthdayEvent = await prisma.event.upsert({
    where: { slug: "amara-turns-30" },
    update: {
      name: "Amara's 30th Birthday Soirée",
      type: EventType.BIRTHDAY,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-11-20T18:00:00.000Z"),
      story: "Stepping into my golden thirties surrounded by the warmest hearts, twinkling lights, and sparkling memories!",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
    create: {
      ownerId: hostAmara.id,
      slug: "amara-turns-30",
      name: "Amara's 30th Birthday Soirée",
      type: EventType.BIRTHDAY,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-11-20T18:00:00.000Z"),
      story: "Stepping into my golden thirties surrounded by the warmest hearts, twinkling lights, and sparkling memories!",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
  });

  await prisma.registryItem.deleteMany({ where: { eventId: birthdayEvent.id } });
  await prisma.pool.deleteMany({ where: { eventId: birthdayEvent.id } });

  await prisma.registryItem.createMany({
    data: [
      {
        eventId: birthdayEvent.id,
        productId: createdProducts["sony-wh1000xm5-headphones"].id,
        title: "Sony WH-1000XM5 Noise-Cancelling Headphones",
        priceKobo: 42000000,
        status: ItemStatus.AVAILABLE,
        position: 1,
      },
      {
        eventId: birthdayEvent.id,
        productId: createdProducts["oud-amber-luxury-perfume-box"].id,
        title: "Signature Oud & Amber Perfume Keepsake Box",
        priceKobo: 9500000,
        status: ItemStatus.AVAILABLE,
        position: 2,
      },
      {
        eventId: birthdayEvent.id,
        productId: createdProducts["luxury-spa-wellness-voucher-50k"].id,
        title: "Luxury Spa & Wellness Digital Gift Card (₦50,000)",
        priceKobo: 5000000,
        status: ItemStatus.AVAILABLE,
        position: 3,
      },
    ],
  });

  await prisma.pool.create({
    data: {
      eventId: birthdayEvent.id,
      title: "MacBook Pro Upgrade Fund",
      mode: PoolMode.CASH,
      targetKobo: 150000000, // ₦1,500,000
      raisedKobo: 75000000, // ₦750,000
      deadline: new Date("2026-11-20T23:59:59Z"),
      status: PoolStatus.OPEN,
    },
  });

  // Event 3: Baby Shower (Tunde & Zainab)
  const babyEvent = await prisma.event.upsert({
    where: { slug: "tunde-baby-shower" },
    update: {
      name: "Welcoming Baby Zainab",
      type: EventType.BABY_SHOWER,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-11-30T14:00:00.000Z"),
      story: "A little miracle is on the way! Join our family as we prepare the nursery and shower baby Zainab with love and blessings.",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
    create: {
      ownerId: hostTunde.id,
      slug: "tunde-baby-shower",
      name: "Welcoming Baby Zainab",
      type: EventType.BABY_SHOWER,
      status: EventStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      date: new Date("2026-11-30T14:00:00.000Z"),
      story: "A little miracle is on the way! Join our family as we prepare the nursery and shower baby Zainab with love and blessings.",
      allowPlusOne: true,
      keepsakePublic: true,
      currency: "NGN",
    },
  });

  await prisma.registryItem.deleteMany({ where: { eventId: babyEvent.id } });
  await prisma.pool.deleteMany({ where: { eventId: babyEvent.id } });

  await prisma.registryItem.createMany({
    data: [
      {
        eventId: babyEvent.id,
        productId: createdProducts["convertible-3in1-baby-crib"].id,
        title: "Convertible 3-in-1 Baby Crib & Premium Mattress",
        priceKobo: 32000000,
        status: ItemStatus.AVAILABLE,
        position: 1,
      },
    ],
  });

  await prisma.pool.create({
    data: {
      eventId: babyEvent.id,
      title: "Baby Zainab's First Education Trust Purse",
      mode: PoolMode.CASH,
      targetKobo: 120000000, // ₦1,200,000
      raisedKobo: 88000000, // ₦880,000
      deadline: new Date("2026-11-30T23:59:59Z"),
      status: PoolStatus.OPEN,
    },
  });

  // 6. Orders with Tracking Tokens
  console.log("📦 Seeding mock orders...");
  const ordersData = [
    {
      number: "GV-2026-ORD001",
      buyerEmail: "emeka@givvly.store",
      recipientName: "Adaobi Okafor",
      recipientPhone: "+2348031234567",
      status: OrderStatus.CONFIRMED,
      subtotalKobo: 15000000,
      deliveryFeeKobo: 350000,
      feeKobo: 22500,
      totalKobo: 15372500,
      trackingToken: "trk_2026_001_deliv",
      giftNote: "Wishing you both a lifetime of happiness!",
      items: [
        {
          productId: createdProducts["royal-wedding-keepsake-hamper"].id,
          title: "The Royal Wedding Keepsake Hamper Box",
          unitPriceKobo: 15000000,
          qty: 1,
        },
      ],
    },
    {
      number: "GV-2026-ORD002",
      buyerEmail: "chioma@gmail.com",
      recipientName: "Amara Nwachukwu",
      recipientPhone: "+2348055566778",
      status: OrderStatus.PACKED,
      subtotalKobo: 9500000,
      deliveryFeeKobo: 250000,
      feeKobo: 14250,
      totalKobo: 9764250,
      trackingToken: "trk_2026_002_pack",
      giftNote: "Happy 30th Birthday gorgeous Amara!",
      items: [
        {
          productId: createdProducts["oud-amber-luxury-perfume-box"].id,
          title: "Signature Oud & Amber Perfume Keepsake Box",
          unitPriceKobo: 9500000,
          qty: 1,
        },
      ],
    },
    {
      number: "GV-2026-ORD003",
      buyerEmail: "femi@gmail.com",
      recipientName: "Dr. Tunde Adeleke",
      recipientPhone: "+2348099900011",
      status: OrderStatus.SHIPPED,
      subtotalKobo: 32000000,
      deliveryFeeKobo: 500000,
      feeKobo: 48000,
      totalKobo: 32548000,
      trackingToken: "trk_2026_003_ship",
      giftNote: "Congratulations to the new parents!",
      items: [
        {
          productId: createdProducts["convertible-3in1-baby-crib"].id,
          title: "Convertible 3-in-1 Baby Crib & Premium Mattress",
          unitPriceKobo: 32000000,
          qty: 1,
        },
      ],
    },
    {
      number: "GV-2026-ORD004",
      buyerEmail: "zainab@yahoo.com",
      recipientName: "Adaobi Okafor",
      recipientPhone: "+2348031234567",
      status: OrderStatus.DELIVERED,
      subtotalKobo: 5000000,
      deliveryFeeKobo: 0,
      feeKobo: 7500,
      totalKobo: 5007500,
      trackingToken: "trk_2026_004_done",
      giftNote: "Take some time for yourself to relax before the big day!",
      items: [
        {
          productId: createdProducts["luxury-spa-wellness-voucher-50k"].id,
          title: "Luxury Spa & Wellness Digital Gift Card (₦50,000)",
          unitPriceKobo: 5000000,
          qty: 1,
        },
      ],
    },
  ];

  for (const o of ordersData) {
    const existingOrder = await prisma.order.findUnique({ where: { number: o.number } });
    if (existingOrder) {
      await prisma.dispute.deleteMany({ where: { orderId: existingOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: existingOrder.id } });
      await prisma.order.delete({ where: { id: existingOrder.id } });
    }

    await prisma.order.create({
      data: {
        number: o.number,
        buyerEmail: o.buyerEmail,
        recipientName: o.recipientName,
        recipientPhone: o.recipientPhone,
        status: o.status,
        subtotalKobo: o.subtotalKobo,
        deliveryFeeKobo: o.deliveryFeeKobo,
        feeKobo: o.feeKobo,
        totalKobo: o.totalKobo,
        trackingToken: o.trackingToken,
        giftNote: o.giftNote,
        items: {
          create: o.items,
        },
        history: {
          create: [
            {
              status: OrderStatus.CONFIRMED,
              note: "Payment captured successfully.",
            },
            ...(o.status === OrderStatus.PACKED || o.status === OrderStatus.SHIPPED || o.status === OrderStatus.DELIVERED
              ? [{ status: OrderStatus.PACKED, note: "Order packaged in luxury gift presentation." }]
              : []),
            ...(o.status === OrderStatus.SHIPPED || o.status === OrderStatus.DELIVERED
              ? [{ status: OrderStatus.SHIPPED, note: "Dispatched with courier partner. Tracking active." }]
              : []),
            ...(o.status === OrderStatus.DELIVERED
              ? [{ status: OrderStatus.DELIVERED, note: "Delivered directly to recipient." }]
              : []),
          ],
        },
      },
    });
  }

  // 7. Seed Sample Dispute for Admin Review
  const sampleOrder = await prisma.order.findFirst({
    where: { number: "GV-2026-ORD003" },
  });
  if (sampleOrder) {
    await prisma.dispute.deleteMany({ where: { orderId: sampleOrder.id } });
    await prisma.dispute.create({
      data: {
        orderId: sampleOrder.id,
        openedById: adminUser.id,
        type: "DAMAGED_IN_TRANSIT",
        description:
          "Outer luxury box dented during courier transit to Abuja; customer requesting replacement ribbon and packaging.",
        status: DisputeStatus.OPEN,
      },
    });
  }

  // 8. Seed Sample Payouts
  const hostAccount = await prisma.payoutAccount.findFirst({
    where: { userId: hostAdaobi.id },
  });
  if (hostAccount) {
    await prisma.payout.deleteMany({ where: { userId: hostAdaobi.id } });
    await prisma.payout.create({
      data: {
        reference: `po_test_failed_${Date.now()}`,
        userId: hostAdaobi.id,
        eventId: weddingEvent.id,
        payoutAccountId: hostAccount.id,
        amountKobo: 50000000, // ₦500,000
        status: PayoutStatus.FAILED,
        failureReason: "NIP bank switch timeout on beneficiary account verification",
        attempts: 1,
      },
    });
    await prisma.payout.create({
      data: {
        reference: `po_test_success_${Date.now()}`,
        userId: hostAdaobi.id,
        eventId: weddingEvent.id,
        payoutAccountId: hostAccount.id,
        amountKobo: 120000000, // ₦1,200,000
        status: PayoutStatus.SUCCESS,
        completedAt: new Date(),
        attempts: 1,
      },
    });
  }

  console.log("✨ Givvly database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
