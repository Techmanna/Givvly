import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  calculateVendorSellingPrice,
  DEFAULT_PUBLIC_MARKUP_TIERS,
  VendorPricingMode,
  VendorPricingTier,
} from "../apps/api/src/modules/admin/vendor-pricing.util";

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: "simple" | "variable";
  short_description?: string;
  description?: string;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
  };
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  attributes?: Array<{
    name: string;
    has_variations?: boolean;
    terms?: Array<{ name: string; slug: string }>;
  }>;
  variations?: Array<{
    id: number;
    attributes?: Array<{ name: string; value: string }>;
  }>;
  is_in_stock?: boolean;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EXCLUDE_PATTERNS = [
  /personalized/i,
  /personalised/i,
  /custom name/i,
  /sublimation/i,
  /photo collage/i,
  /teacher/i,
  /ramadan/i,
  /fasting today/i,
  /sabr/i,
  /islamic/i,
  /muslim/i,
  /christmas/i,
  /cotton rope/i,
  /crocodile leather gift hamper trunk/i,
  /wicker gift basket/i,
  /succulent plant/i,
];

function shouldExclude(p: WooProduct): boolean {
  if (!p.is_in_stock) return true;
  const title = decodeEntities(p.name || "");
  const catNames = (p.categories || []).map((c) => decodeEntities(c.name));
  if (catNames.some((c) => /personalized|teacher|ramadan|packaging|christmas/i.test(c))) {
    return true;
  }
  return EXCLUDE_PATTERNS.some((rx) => rx.test(title));
}

function mapToGivvlyTaxonomy(p: WooProduct): {
  occasions: string[];
  relationships: string[];
  boxRole: "ITEM" | "GIFT_BOX";
} {
  const catText = (p.categories || [])
    .map((c) => decodeEntities(c.name))
    .join(" ")
    .toLowerCase();
  const title = decodeEntities(p.name || "").toLowerCase();
  const combined = `${catText} ${title}`;

  const occasions = new Set<string>();
  const relationships = new Set<string>();

  if (combined.includes("birthday")) occasions.add("BIRTHDAY");
  if (combined.includes("anniversary") || combined.includes("wedding")) {
    occasions.add("ANNIVERSARY");
    occasions.add("WEDDING");
  }
  if (combined.includes("valentine") || combined.includes("love")) {
    occasions.add("ANNIVERSARY");
    occasions.add("JUST_BECAUSE");
  }
  if (combined.includes("corporate") || combined.includes("executive")) {
    occasions.add("CORPORATE");
    occasions.add("PROMOTION");
  }
  if (occasions.size === 0) {
    occasions.add("BIRTHDAY");
    occasions.add("JUST_BECAUSE");
    occasions.add("APPRECIATION");
  }

  if (combined.includes("for him") || combined.includes("husband") || combined.includes("men")) {
    relationships.add("HUSBAND");
    relationships.add("BOYFRIEND");
    relationships.add("FRIEND");
  }
  if (combined.includes("for her") || combined.includes("mom") || combined.includes("mother")) {
    relationships.add("WIFE");
    relationships.add("GIRLFRIEND");
    relationships.add("MOTHER");
    relationships.add("FRIEND");
  }
  if (combined.includes("couple") || combined.includes("mr & mrs")) {
    relationships.add("COUPLE");
    relationships.add("PARTNER");
  }
  if (relationships.size === 0) {
    relationships.add("FRIEND");
    relationships.add("PARTNER");
    relationships.add("COLLEAGUE");
  }

  return {
    occasions: Array.from(occasions),
    relationships: Array.from(relationships),
    boxRole: "ITEM",
  };
}

async function main() {
  const applyMode = process.argv.includes("--apply");
  const jsonPath = path.resolve(__dirname, "giftsbysisi-products.json");
  let rawText = fs.readFileSync(jsonPath, "utf8");
  const startIdx = rawText.indexOf("[");
  if (startIdx > 0) {
    rawText = rawText.slice(startIdx);
  }
  const allProducts: WooProduct[] = JSON.parse(rawText);
  const filtered = allProducts.filter((p) => !shouldExclude(p));

  const prisma = new PrismaClient();

  try {
    let vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { slug: "giftsbysisi" },
          { name: { contains: "GiftBySisi", mode: "insensitive" } },
          { name: { contains: "GiftsBySisi", mode: "insensitive" } },
        ],
      },
    });

    if (!vendor && applyMode) {
      vendor = await prisma.vendor.create({
        data: {
          name: "GiftsBySisi",
          slug: "giftsbysisi",
          contactEmail: "orders@giftsbysisi.com",
          phone: "08000000000",
          location: "Lagos",
          active: true,
          pricingMode: "PUBLIC_MARKUP",
          markupBps: 1500,
          discountBps: 0,
          commissionBps: 0,
          roundingStepKobo: 50_000,
          pricingTiers: DEFAULT_PUBLIC_MARKUP_TIERS as any,
        },
      });
      console.log(`Created vendor: ${vendor.name} (${vendor.id})`);
    }

    const rule = {
      pricingMode: (vendor?.pricingMode ?? "PUBLIC_MARKUP") as VendorPricingMode,
      markupBps: vendor?.markupBps ?? 1500,
      discountBps: vendor?.discountBps ?? 0,
      commissionBps: vendor?.commissionBps ?? 0,
      roundingStepKobo: vendor?.roundingStepKobo ?? 50_000,
      pricingTiers: Array.isArray(vendor?.pricingTiers)
        ? (vendor.pricingTiers as VendorPricingTier[])
        : DEFAULT_PUBLIC_MARKUP_TIERS,
    };

    console.log(
      `\nFiltered ${filtered.length} Givvly-fit products from ${allProducts.length} total.`
    );
    console.log(
      `Mode: ${applyMode ? "APPLY (writing drafts with active=false)" : "DRY RUN (preview only)"}\n`
    );

    let created = 0;
    let skippedExisting = 0;

    for (const p of filtered) {
      const title = decodeEntities(p.name).trim();
      const costNaira = Number(p.prices?.price ?? 0);
      if (!costNaira || costNaira <= 0) continue;

      const costPriceKobo = Math.round(costNaira * 100);
      const calc = calculateVendorSellingPrice(costPriceKobo, rule);
      const taxonomy = mapToGivvlyTaxonomy(p);
      const description =
        stripHtml(p.description || p.short_description || title).slice(0, 1900) ||
        title;

      const variants =
        p.type === "variable" && Array.isArray(p.variations) && p.variations.length > 0
          ? p.variations.map((v, idx) => {
              const label =
                (v.attributes || []).map((a) => a.value).filter(Boolean).join(" / ") ||
                `Option ${idx + 1}`;
              return {
                id: `gbs_${v.id}`,
                name: decodeEntities(label),
                priceKobo: calc.sellingPriceKobo,
                costPriceKobo,
                priceOverridden: false,
                stock: null,
                sku: `GBS-${v.id}`,
                active: true,
              };
            })
          : undefined;

      console.log(
        `- ${title.slice(0, 52).padEnd(52)} | Cost ₦${costNaira.toLocaleString().padStart(8)} -> Givvly ₦${Math.round(calc.sellingPriceKobo / 100).toLocaleString().padStart(8)} (+${(calc.appliedMarkupBps / 100).toFixed(0)}%) | ${taxonomy.occasions.join(",")}${variants ? ` | ${variants.length} variants` : ""}`
      );

      if (applyMode && vendor) {
        const slug = `gbs-${p.slug}`.slice(0, 90);
        const exists = await prisma.product.findUnique({ where: { slug } });
        if (exists) {
          skippedExisting++;
          continue;
        }
        await prisma.product.create({
          data: {
            slug,
            title,
            description,
            priceKobo: calc.sellingPriceKobo,
            costPriceKobo,
            priceOverridden: false,
            vendorId: vendor.id,
            occasions: taxonomy.occasions,
            relationships: taxonomy.relationships,
            images: ["/images/gifts/box-luxury.jpg"],
            stock: 50,
            isDigital: false,
            active: false, // Draft until clean unwatermarked photos are uploaded
            boxRole: taxonomy.boxRole,
            variants: variants ? (variants as any) : undefined,
          },
        });
        created++;
      }
    }

    if (applyMode) {
      console.log(`\nDone! Created ${created} draft products (active: false), skipped ${skippedExisting} existing.`);
    } else {
      console.log(`\nDry run complete. Run with --apply to insert as drafts (active: false).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
