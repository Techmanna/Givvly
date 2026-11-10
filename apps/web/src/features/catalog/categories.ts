/**
 * Shared Catalog & Admin Categorization
 * Ensures complete synchronization between Admin product creation/management and Catalog browsing/filtering.
 */

export type CategoryOption = {
  value: string;
  label: string;
  description?: string;
};

export type DepartmentOption = {
  value: string;
  label: string;
  giftType: string;
};

// Main collections matching FilterBar navigation pills and Admin Category selection
export const MAIN_COLLECTIONS: CategoryOption[] = [
  { value: "ALL", label: "All Curated Gifts" },
  { value: "WEDDING", label: "Wedding Gifts", description: "Couples, bridal showers, and marriage ceremonies" },
  { value: "BIRTHDAY", label: "Birthday Gifts", description: "Milestone birthdays and personal celebrations" },
  { value: "CORPORATE", label: "Corporate Gifts", description: "Executive tokens, client appreciation, and promotions" },
  { value: "FOR_HIM", label: "Gifts for Him", description: "Curated selections for husbands, fathers, and gentlemen" },
  { value: "FOR_HER", label: "Gifts for Her", description: "Curated selections for wives, mothers, and ladies" },
  { value: "COMBOS", label: "Combos & Gift Boxes", description: "Multi-item bundled gift boxes and hampers" },
  { value: "LUXURY", label: "Luxury & Keepsakes", description: "Premium, timeless, and high-value keepsakes" },
  { value: "FLOWERS", label: "Flowers & Bouquets", description: "Fresh botanical bouquets and floral arrangements" },
  { value: "CHOCOLATES", label: "Chocolates & Hampers", description: "Belgian pralines, artisanal sweets, and treats" },
  { value: "FOOD_DRINKS", label: "Food & Fine Wine", description: "Champagne, wine, gourmet treats, and hampers" },
  { value: "BEAUTY_WELLNESS", label: "Beauty & Spa", description: "Skincare, perfumery, body oils, and wellness" },
  { value: "HOME_LIVING", label: "Home & Living", description: "Candles, diffusers, dinnerware, and decor" },
  { value: "TECH", label: "Tech & Living", description: "Smart accessories, audio, and gadgets" },
  { value: "CUSTOMIZED", label: "Customized Gifts", description: "Personalized engraved keepsakes and bespoke items" },
];

// Product departments used in Admin creation and Catalog filters
export const PRODUCT_DEPARTMENTS: DepartmentOption[] = [
  { value: "Curated Combos & Boxes", label: "Curated Combos & Boxes", giftType: "COMBOS" },
  { value: "Luxury & Keepsakes", label: "Luxury & Keepsakes", giftType: "LUXURY" },
  { value: "Food & Drinks", label: "Food & Drinks", giftType: "FOOD" },
  { value: "Chocolates & Confectionery", label: "Chocolates & Confectionery", giftType: "CHOCOLATES" },
  { value: "Flowers & Bouquets", label: "Flowers & Bouquets", giftType: "FLOWERS" },
  { value: "Beauty & Fragrance", label: "Beauty & Fragrance", giftType: "BEAUTY" },
  { value: "Spa & Wellness", label: "Spa & Wellness", giftType: "WELLNESS" },
  { value: "Home & Kitchen", label: "Home & Kitchen", giftType: "HOME_KITCHEN" },
  { value: "Fashion & Accessories", label: "Fashion & Accessories", giftType: "FASHION" },
  { value: "Jewelry & Timepieces", label: "Jewelry & Timepieces", giftType: "JEWELRY" },
  { value: "Tech & Living", label: "Tech & Living", giftType: "TECH" },
  { value: "Books & Stationery", label: "Books & Stationery", giftType: "BOOKS" },
  { value: "Baby Items & Nursery", label: "Baby Items & Nursery", giftType: "BABY_ITEMS" },
  { value: "Customized & Engraved Gifts", label: "Customized & Engraved Gifts", giftType: "CUSTOMIZED" },
];

// Target Recipient / Gender options
export const RECIPIENT_GENDER_OPTIONS = [
  { value: "UNISEX", label: "Unisex / Anyone" },
  { value: "MALE", label: "For Him (Male)" },
  { value: "FEMALE", label: "For Her (Female)" },
];

/**
 * Robust category matcher that bridges admin-created products, seed items, and customer filter selections.
 */
export function matchesProductCategory(
  p: {
    category?: string;
    giftType?: string;
    mainCategories?: string[];
    occasions?: string[];
    relationships?: string[];
    gender?: string;
    isCombo?: boolean;
    name?: string;
    title?: string;
    description?: string;
  },
  filterValue: string
): boolean {
  if (!filterValue || filterValue === "ALL") {
    return true;
  }

  const clean = filterValue.trim().toUpperCase();
  const prodCategory = (p.category || "").trim().toUpperCase();
  const prodGiftType = (p.giftType || "").trim().toUpperCase();
  const prodMainCats = (p.mainCategories || []).map((m) => m.trim().toUpperCase());
  const prodOccasions = (p.occasions || []).map((o) => o.trim().toUpperCase());
  const prodRels = (p.relationships || []).map((r) => r.trim().toUpperCase());
  const prodGender = (p.gender || "").trim().toUpperCase();
  const prodTitle = (p.name || p.title || "").toUpperCase();
  const prodDesc = (p.description || "").toUpperCase();

  // Direct category or giftType exact match
  if (
    prodCategory === clean ||
    prodCategory.replace(/[^A-Z0-9]/g, "_") === clean ||
    prodGiftType === clean
  ) {
    return true;
  }

  // 1. Predefined Combos & Boxes
  if (clean === "COMBOS" || clean.includes("COMBO") || clean === "CURATED COMBOS & BOXES") {
    return (
      Boolean(p.isCombo) ||
      prodMainCats.includes("COMBOS") ||
      prodCategory.includes("COMBO") ||
      prodCategory.includes("BOX") ||
      prodTitle.includes("COMBO") ||
      prodTitle.includes("HAMPER") ||
      prodTitle.includes("GIFT BOX")
    );
  }

  // 2. Wedding Gifts
  if (clean === "WEDDING" || clean.includes("WEDDING")) {
    return (
      prodMainCats.includes("WEDDING") ||
      prodOccasions.some((o) =>
        o.includes("WEDDING") ||
        o.includes("BRIDAL") ||
        o.includes("ENGAGEMENT")
      ) ||
      prodCategory.includes("WEDDING") ||
      prodTitle.includes("WEDDING") ||
      prodTitle.includes("BRIDE") ||
      prodTitle.includes("BRISTLE") ||
      prodTitle.includes("CHAMPAGNE")
    );
  }

  // 3. Birthday Gifts
  if (clean === "BIRTHDAY" || clean.includes("BIRTHDAY")) {
    return (
      prodMainCats.includes("BIRTHDAY") ||
      prodOccasions.some((o) => o.includes("BIRTHDAY")) ||
      prodCategory.includes("BIRTHDAY") ||
      prodTitle.includes("BIRTHDAY")
    );
  }

  // 4. Corporate Gifts
  if (clean === "CORPORATE" || clean.includes("CORPORATE")) {
    return (
      prodMainCats.includes("CORPORATE") ||
      prodOccasions.some((o) =>
        o.includes("CORPORATE") ||
        o.includes("APPRECIATION") ||
        o.includes("PROMOTION") ||
        o.includes("RETIREMENT") ||
        o.includes("END_OF_YEAR")
      ) ||
      prodRels.some((r) =>
        r.includes("CLIENT") ||
        r.includes("BOSS") ||
        r.includes("EMPLOYEE") ||
        r.includes("COLLEAGUE") ||
        r.includes("TEACHER")
      ) ||
      prodCategory.includes("CORPORATE") ||
      prodTitle.includes("EXECUTIVE") ||
      prodTitle.includes("CORPORATE") ||
      prodTitle.includes("JOURNAL")
    );
  }

  // 5. Gifts for Him
  if (
    clean === "FOR_HIM" ||
    clean.includes("FOR HIM") ||
    clean.includes("GIFT FOR HIM")
  ) {
    return (
      prodMainCats.includes("FOR_HIM") ||
      prodGender === "MALE" ||
      prodRels.some((r) =>
        r.includes("HUSBAND") ||
        r.includes("BOYFRIEND") ||
        r.includes("FATHER") ||
        r.includes("DAD") ||
        r.includes("BROTHER") ||
        r.includes("HIM") ||
        r.includes("SON")
      ) ||
      prodTitle.includes("FOR HIM") ||
      prodTitle.includes("GENTLEMAN") ||
      prodTitle.includes("BEARD") ||
      prodTitle.includes("MEN") ||
      prodDesc.includes("FOR HIM")
    );
  }

  // 6. Gifts for Her
  if (
    clean === "FOR_HER" ||
    clean.includes("FOR HER") ||
    clean.includes("GIFT FOR HER")
  ) {
    return (
      prodMainCats.includes("FOR_HER") ||
      prodGender === "FEMALE" ||
      prodRels.some((r) =>
        r.includes("WIFE") ||
        r.includes("GIRLFRIEND") ||
        r.includes("MOTHER") ||
        r.includes("MOM") ||
        r.includes("SISTER") ||
        r.includes("HER") ||
        r.includes("DAUGHTER")
      ) ||
      prodTitle.includes("FOR HER") ||
      prodTitle.includes("BRIDE") ||
      prodTitle.includes("SPA") ||
      prodTitle.includes("BLUSH") ||
      prodTitle.includes("WOMEN") ||
      prodDesc.includes("FOR HER")
    );
  }

  // 7. Luxury Keepsakes
  if (clean === "LUXURY" || clean.includes("LUXURY")) {
    return (
      prodGiftType === "LUXURY" ||
      prodCategory.includes("LUXURY") ||
      prodCategory.includes("KEEPSAKE") ||
      prodTitle.includes("ROYAL") ||
      prodTitle.includes("GOLDEN") ||
      prodTitle.includes("CHAMPAGNE") ||
      prodTitle.includes("SILK")
    );
  }

  // 8. Flowers & Bouquets
  if (clean === "FLOWERS" || clean.includes("FLOWER")) {
    return (
      prodGiftType === "FLOWERS" ||
      prodCategory.includes("FLOWER") ||
      prodCategory.includes("BOUQUET") ||
      prodTitle.includes("ROSE") ||
      prodTitle.includes("FLOWER") ||
      prodTitle.includes("BOUQUET")
    );
  }

  // 9. Chocolates & Confectionery / Hampers
  if (clean === "CHOCOLATES" || clean.includes("CHOCOLATE")) {
    return (
      prodGiftType === "CHOCOLATES" ||
      prodCategory.includes("CHOCOLATE") ||
      prodCategory.includes("CONFECTIONERY") ||
      prodTitle.includes("CHOCOLATE") ||
      prodTitle.includes("TRUFFLE") ||
      prodTitle.includes("PRALINE")
    );
  }

  // 10. Food & Drinks
  if (clean === "FOOD" || clean === "DRINKS" || clean === "FOOD_DRINKS" || clean.includes("FOOD") || clean.includes("DRINK")) {
    return (
      prodGiftType === "FOOD" ||
      prodGiftType === "DRINKS" ||
      prodCategory.includes("FOOD") ||
      prodCategory.includes("DRINK") ||
      prodCategory.includes("WINE") ||
      prodTitle.includes("CHAMPAGNE") ||
      prodTitle.includes("WINE") ||
      prodTitle.includes("COFFEE")
    );
  }

  // 11. Beauty & Spa / Wellness
  if (clean === "BEAUTY" || clean === "WELLNESS" || clean === "BEAUTY_WELLNESS" || clean.includes("BEAUTY") || clean.includes("SPA")) {
    return (
      prodGiftType === "BEAUTY" ||
      prodGiftType === "WELLNESS" ||
      prodCategory.includes("BEAUTY") ||
      prodCategory.includes("FRAGRANCE") ||
      prodCategory.includes("SPA") ||
      prodCategory.includes("WELLNESS") ||
      prodTitle.includes("PERFUME") ||
      prodTitle.includes("OUD") ||
      prodTitle.includes("BODY GLOW")
    );
  }

  // 12. Home & Living / Kitchen
  if (clean === "HOME_KITCHEN" || clean === "HOME_LIVING" || clean.includes("HOME") || clean.includes("KITCHEN")) {
    return (
      prodGiftType === "HOME_KITCHEN" ||
      prodCategory.includes("HOME") ||
      prodCategory.includes("KITCHEN") ||
      prodTitle.includes("CANDLE") ||
      prodTitle.includes("KETTLE") ||
      prodTitle.includes("FLASK")
    );
  }

  // 13. Tech & Living
  if (clean === "TECH" || clean.includes("TECH")) {
    return (
      prodGiftType === "TECH" ||
      prodCategory.includes("TECH") ||
      prodTitle.includes("SMART") ||
      prodTitle.includes("AUDIO") ||
      prodTitle.includes("SPEAKER")
    );
  }

  // 14. Customized Gifts
  if (clean === "CUSTOMIZED" || clean.includes("CUSTOM")) {
    return (
      prodGiftType === "CUSTOMIZED" ||
      prodCategory.includes("CUSTOM") ||
      prodTitle.includes("ENGRAVED") ||
      prodTitle.includes("PERSONALIZED") ||
      prodTitle.includes("LEATHER")
    );
  }

  return false;
}
