import type {
  Bank,
  EventDetail,
  EventStats,
  Gift,
  Order,
  PayoutAccount,
  PoolItem,
  PublicEvent,
  RegistryItem,
  User,
  WallPost,
} from "@givvly/contracts";

export type MockRsvp = {
  id: string;
  eventId: string;
  name: string;
  response: "YES" | "NO" | "MAYBE";
  plusOneName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
};

export type MockCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceKobo: number;
  category: string;
  giftType?: string;
  occasions: string[];
  relationships: string[];
  gender?: "MALE" | "FEMALE" | "UNISEX";
  ageGroup?: string;
  mainCategories?: string[];
  imageUrl?: string;
  vendorName: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  isCombo?: boolean;
  comboItems?: Array<{ name: string; qty: number; tag?: string }>;
  packagingIncluded?: string;
  isDigital?: boolean;
  digitalKind?: "AIRTIME" | "DATA" | "VOUCHER" | "GIFT_CARD";
};

export type MockCatalogCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  productSlugs: string[];
};

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
};

export type MockNotificationPreferences = {
  email: boolean;
  whatsappOrSms: boolean;
  inApp: boolean;
};

export type MockPaymentRecord = {
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  amountKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  eventSlug?: string;
  giverName: string | null;
  anonymous: boolean;
  message?: string;
  createdAt: string;
};

export type MockAdminModerationItem = {
  id: string;
  eventSlug: string;
  eventName: string;
  authorName: string;
  text?: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REMOVED";
  createdAt: string;
};

export type MockLedgerEntry = {
  id: string;
  type: "CREDIT" | "DEBIT" | "FEE" | "PAYOUT";
  description: string;
  amountKobo: number;
  reference: string;
  createdAt: string;
};

export type MockDispute = {
  id: string;
  orderId: string;
  orderNumber: string;
  type: "DAMAGED" | "WRONG_ITEM" | "NOT_DELIVERED" | "OTHER";
  description: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  createdAt: string;
};

// 1. Users across roles (USER, ADMIN)
export const MOCK_USERS: Record<string, User> = {
  user: {
    id: "usr_adaobi_01",
    name: "Adaobi Okafor",
    email: "adaobi@givvly.ng",
    phone: "+2348031234567",
    role: "USER",
    emailVerified: true,
  },
  vendor: {
    id: "usr_vendor_01",
    name: "Lagos Luxe Hampers",
    email: "vendor@givvly.ng",
    phone: "+2348098765432",
    role: "ADMIN",
    emailVerified: true,
  },
  admin: {
    id: "usr_admin_01",
    name: "Tunde Bakare (Admin)",
    email: "admin@givvly.ng",
    phone: "+2348021112233",
    role: "ADMIN",
    emailVerified: true,
  },
};

// 2. Nigerian Commercial Banks (Section 7.2 GET /banks)
export const MOCK_BANKS: Bank[] = [
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "044", name: "Access Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "070", name: "Fidelity Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "035", name: "Wema Bank (ALAT)" },
  { code: "090267", name: "Kuda Bank" },
  { code: "100004", name: "OPay Digital Services" },
  { code: "50515", name: "Moniepoint Microfinance Bank" },
];

// 3. Payout Account (Section 9.F3 & 14.5)
export const INITIAL_PAYOUT_ACCOUNT: PayoutAccount = {
  id: "pa_gtb_01",
  bankCode: "058",
  bankName: "Guaranty Trust Bank (GTBank)",
  accountNumberLast4: "4829",
  accountName: "ADAOBI OKAFOR",
  status: "VERIFIED",
  updatedAt: "2026-10-20T14:30:00Z",
};

// 4. Registry Items & Group Gift Pools (Amounts in Kobo: 1 NGN = 100 Kobo)
export const MOCK_REGISTRY_BY_EVENT: Record<string, RegistryItem[]> = {
  evt_wedding_01: [
    {
      id: "reg_01",
      title: "Kenwood Titanium Chef Baker Stand Mixer",
      productId: "prod_mixer_01",
      priceKobo: 38_500_000, // ₦385,000
      status: "AVAILABLE",
    },
    {
      id: "reg_02",
      title: "Egyptian Cotton 800TC King Bedding Set (Blush)",
      productId: "prod_bedding_02",
      priceKobo: 12_500_000, // ₦125,000
      status: "CLAIMED",
    },
    {
      id: "reg_03",
      title: "Nespresso Lattissima One Espresso Machine",
      productId: "prod_espresso_03",
      priceKobo: 29_000_000, // ₦290,000
      status: "AVAILABLE",
    },
    {
      id: "reg_04",
      title: "Le Creuset Cast Iron Dutch Oven (26cm)",
      productId: "prod_dutch_04",
      priceKobo: 24_000_000, // ₦240,000
      status: "RESERVED",
      reservedUntil: "2026-12-31T23:59:59Z",
    },
  ],
  evt_birthday_02: [
    {
      id: "reg_05",
      title: "Sony WH-1000XM5 Wireless Headphones",
      productId: "prod_sony_05",
      priceKobo: 42_000_000, // ₦420,000
      status: "AVAILABLE",
    },
    {
      id: "reg_06",
      title: "Signature Oud & Amber Perfume Gift Box",
      productId: "prod_oud_06",
      priceKobo: 9_500_000, // ₦95,000
      status: "AVAILABLE",
    },
  ],
  evt_baby_03: [
    {
      id: "reg_07",
      title: "Convertible 3-in-1 Baby Crib & Mattress",
      priceKobo: 32_000_000, // ₦320,000
      status: "AVAILABLE",
    },
  ],
  evt_birthday_pub_04: [
    {
      id: "reg_08",
      title: "Bang & Olufsen Beosound A1 Portable Speaker",
      priceKobo: 31_000_000, // ₦310,000
      status: "AVAILABLE",
    },
    {
      id: "reg_09",
      title: "Aged Single Malt Collector's Flight",
      priceKobo: 18_500_000, // ₦185,000
      status: "CLAIMED",
    },
  ],
  evt_sendforth_05: [
    {
      id: "reg_10",
      title: "Montblanc Meisterstück Fountain Pen (Engraved)",
      priceKobo: 45_000_000, // ₦450,000
      status: "AVAILABLE",
    },
    {
      id: "reg_11",
      title: "Handcrafted Ebony & Brass Desk Plaque",
      priceKobo: 14_000_000, // ₦140,000
      status: "CLAIMED",
    },
  ],
  evt_naming_06: [
    {
      id: "reg_12",
      title: "Organic Muslin Swaddle & Heirloom Blanket Set",
      priceKobo: 8_500_000, // ₦85,000
      status: "AVAILABLE",
    },
    {
      id: "reg_13",
      title: "Stokke Tripp Trapp Newborn Highchair",
      priceKobo: 29_500_000, // ₦295,000
      status: "AVAILABLE",
    },
  ],
  evt_grad_07: [
    {
      id: "reg_14",
      title: "3M Littmann Cardiology IV Stethoscope (Champagne Finish)",
      priceKobo: 26_000_000, // ₦260,000
      status: "CLAIMED",
    },
    {
      id: "reg_15",
      title: "iPad Air M2 for Clinical Rounds",
      priceKobo: 68_000_000, // ₦680,000
      status: "AVAILABLE",
    },
  ],
};

export const MOCK_POOLS_BY_EVENT: Record<string, PoolItem[]> = {
  evt_wedding_01: [
    {
      id: "pool_01",
      title: "Zanzibar Honeymoon Getaway Fund",
      priceKobo: 250_000_000, // ₦2,500,000
      targetKobo: 250_000_000,
      raisedKobo: 165_000_000, // ₦1,650,000 raised
      status: "AVAILABLE",
      deadline: "2026-12-10T23:59:59Z",
      mode: "CASH",
    },
    {
      id: "pool_02",
      title: "LG 65-Inch OLED 4K Smart TV",
      productId: "prod_tv_07",
      priceKobo: 180_000_000, // ₦1,800,000
      targetKobo: 180_000_000,
      raisedKobo: 90_000_000, // ₦900,000 raised
      status: "AVAILABLE",
      deadline: "2026-12-05T23:59:59Z",
      mode: "PRODUCT",
    },
  ],
  evt_birthday_02: [
    {
      id: "pool_03",
      title: "MacBook Pro Upgrade Fund",
      priceKobo: 150_000_000, // ₦1,500,000
      targetKobo: 150_000_000,
      raisedKobo: 75_000_000, // ₦750,000
      status: "AVAILABLE",
      deadline: "2026-11-20T23:59:59Z",
      mode: "CASH",
    },
  ],
  evt_baby_03: [],
  evt_birthday_pub_04: [
    {
      id: "pool_04",
      title: "Marrakech 40th Birthday Group Trip Fund",
      priceKobo: 200_000_000, // ₦2,000,000
      targetKobo: 200_000_000,
      raisedKobo: 148_000_000, // ₦1,480,000
      status: "AVAILABLE",
      deadline: "2026-11-25T23:59:59Z",
      mode: "CASH",
    },
  ],
  evt_sendforth_05: [
    {
      id: "pool_05",
      title: "Retiree Mediterranean Cruise & Book Publishing Purse",
      priceKobo: 350_000_000, // ₦3,500,000
      targetKobo: 350_000_000,
      raisedKobo: 294_000_000, // ₦2,940,000
      status: "AVAILABLE",
      deadline: "2026-12-01T23:59:59Z",
      mode: "CASH",
    },
  ],
  evt_naming_06: [
    {
      id: "pool_06",
      title: "Baby Zainab's First Education Trust Purse",
      priceKobo: 120_000_000, // ₦1,200,000
      targetKobo: 120_000_000,
      raisedKobo: 88_000_000, // ₦880,000
      status: "AVAILABLE",
      deadline: "2026-11-30T23:59:59Z",
      mode: "CASH",
    },
  ],
  evt_grad_07: [
    {
      id: "pool_07",
      title: "Housemanship Relocation & Car Deposit Fund",
      priceKobo: 180_000_000, // ₦1,800,000
      targetKobo: 180_000_000,
      raisedKobo: 132_000_000, // ₦1,320,000
      status: "AVAILABLE",
      deadline: "2026-12-15T23:59:59Z",
      mode: "CASH",
    },
  ],
};

// 5. Owner Events & Public Events (Public & Private)
export const INITIAL_EVENTS: EventDetail[] = [
  {
    id: "evt_wedding_01",
    slug: "adaobi-and-chidi-2026",
    name: "Adaobi & Chidi's Forever (#ChidAda26)",
    type: "WEDDING",
    date: "2026-12-12",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 285_000_000, // ₦2,850,000
    giftCount: 18,
    rsvpYesCount: 64,
    story:
      "We met at a mutual friend's dinner in Victoria Island four years ago, bonded over plantain dodo and jazz, and haven't stopped laughing since. We are thrilled to celebrate our union with our favorite people in Lagos!",
    allowPlusOne: true,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-25T12:00:00Z",
  },
  {
    id: "evt_birthday_02",
    slug: "adaobi-golden-30th",
    name: "Adaobi's Golden 30th Soirée",
    type: "BIRTHDAY",
    date: "2026-11-28",
    visibility: "PRIVATE",
    accessCode: "GOLD2026",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 95_000_000, // ₦950,000
    giftCount: 9,
    rsvpYesCount: 28,
    story:
      "Stepping into a new decade surrounded by close friends and family. Dress code: Blush & Warm Gold.",
    allowPlusOne: false,
    createdAt: "2026-10-10T11:00:00Z",
    updatedAt: "2026-10-26T15:00:00Z",
  },
  {
    id: "evt_baby_03",
    slug: "welcome-baby-okafor",
    name: "Welcome Baby Okafor Shower",
    type: "BABY_SHOWER",
    date: "2027-02-14",
    visibility: "PUBLIC",
    status: "DRAFT",
    moneyGiftsEnabled: false,
    totalReceivedKobo: 0,
    giftCount: 0,
    rsvpYesCount: 0,
    story: "Our little bundle of joy arrives in February! Thank you for showering our family with love.",
    allowPlusOne: true,
    createdAt: "2026-10-24T16:00:00Z",
  },
  {
    id: "evt_birthday_pub_04",
    slug: "tunde-golden-40th-lagos",
    name: "Tunde's 40th Rooftop Jubilee (#TundeAt40)",
    type: "BIRTHDAY",
    date: "2026-11-29",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 192_000_000, // ₦1,920,000
    giftCount: 24,
    rsvpYesCount: 82,
    story:
      "Four decades of grace, grit, and unforgettable friendships. Join me on the rooftop in Ikoyi for an evening of highlife, suya, champagne toasts, and good energy.",
    allowPlusOne: true,
    template: {
      templateId: "gold-frame",
      fields: {
        venue: "The Sky Terrace, Ikoyi, Lagos",
        time: "6:00 PM WAT",
        dressCode: "Black Tie & Touch of Gold",
        hostLine: "Celebrating 40 Years of Grace",
      },
    },
    createdAt: "2026-10-08T10:00:00Z",
    updatedAt: "2026-10-26T10:00:00Z",
  },
  {
    id: "evt_sendforth_05",
    slug: "prof-nwosu-send-forth",
    name: "Prof. Ngozi Nwosu's Distinguished Send-Forth & Retirement Honour",
    type: "OTHER",
    date: "2026-12-05",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 340_000_000, // ₦3,400,000
    giftCount: 41,
    rsvpYesCount: 118,
    story:
      "After 32 years of pioneering clinical excellence and mentoring generations of physicians, we gather as colleagues, former students, and family to honour Prof. Ngozi Nwosu as she steps into a joyful retirement.",
    allowPlusOne: true,
    template: {
      templateId: "lagos-classic",
      fields: {
        venue: "Metropolitan Club, Victoria Island, Lagos",
        time: "4:00 PM WAT",
        dressCode: "Traditional Regal / Formal",
        hostLine: "In Honour of 32 Years of Service & Mentorship",
      },
    },
    createdAt: "2026-10-05T09:00:00Z",
    updatedAt: "2026-10-27T11:00:00Z",
  },
  {
    id: "evt_naming_06",
    slug: "welcome-baby-zainab-2026",
    name: "Baby Zainab's Naming & Welcome Ceremony",
    type: "BABY_SHOWER",
    date: "2026-11-21",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 115_000_000, // ₦1,150,000
    giftCount: 19,
    rsvpYesCount: 54,
    story:
      "Alhamdulillah! Our hearts are full as we welcome our daughter Zainab Amina into the world. Thank you for surrounding her first days with prayers, love, and thoughtful blessings.",
    allowPlusOne: true,
    template: {
      templateId: "blush-minimal",
      fields: {
        venue: "Maitama Garden Pavilion, Abuja",
        time: "10:00 AM WAT",
        dressCode: "Soft Ivory & Rose Blush",
        hostLine: "The Bello & Danjuma Families",
      },
    },
    createdAt: "2026-10-12T08:00:00Z",
    updatedAt: "2026-10-27T14:00:00Z",
  },
  {
    id: "evt_grad_07",
    slug: "dr-chisom-mbbs-induction",
    name: "Dr. Chisom Eze's MBBS Induction & Call to Medicine",
    type: "GRADUATION",
    date: "2026-12-18",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    moneyGiftsEnabled: true,
    totalReceivedKobo: 158_000_000, // ₦1,580,000
    giftCount: 27,
    rsvpYesCount: 68,
    story:
      "Six years of sleepless nights, anatomy labs, and clinical postings have led to this moment! Join our family as we celebrate Dr. Chisom's induction into the medical profession.",
    allowPlusOne: true,
    template: {
      templateId: "modern-serif",
      fields: {
        venue: "Radisson Blu Anchorage, Victoria Island, Lagos",
        time: "3:00 PM WAT",
        dressCode: "Smart Cocktail / Emerald & Gold",
        hostLine: "Celebrating the Newest Doctor in the Family",
      },
    },
    createdAt: "2026-10-15T12:00:00Z",
    updatedAt: "2026-10-28T09:00:00Z",
  },
];

const EVENT_HOST_NAMES: Record<string, string> = {
  evt_wedding_01: "Adaobi",
  evt_birthday_02: "Adaobi",
  evt_baby_03: "Adaobi",
  evt_birthday_pub_04: "Tunde",
  evt_sendforth_05: "Prof. Ngozi",
  evt_naming_06: "Farida & Sadiq",
  evt_grad_07: "Dr. Chisom",
};

export function buildPublicEventFromDetail(detail: EventDetail): PublicEvent {
  return {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    type: detail.type,
    date: detail.date,
    coverUrl: detail.coverUrl,
    visibility: detail.visibility,
    status: detail.status,
    moneyGiftsEnabled: detail.moneyGiftsEnabled,
    totalReceivedKobo: detail.totalReceivedKobo,
    giftCount: detail.giftCount,
    rsvpYesCount: detail.rsvpYesCount,
    story: detail.story,
    ownerFirstName: EVENT_HOST_NAMES[detail.id] ?? "Adaobi",
    allowPlusOne: detail.allowPlusOne,
    registry: MOCK_REGISTRY_BY_EVENT[detail.id] ?? [],
    pools: MOCK_POOLS_BY_EVENT[detail.id] ?? [],
    template: detail.template ?? {
      templateId: "blush-minimal",
      fields: {
        venue: "The Monarch Event Centre, Lekki Phase 1, Lagos",
        time: "2:00 PM WAT",
        dressCode: "Champagne Gold & Blush Rose",
        hostLine: "Together with their families",
      },
    },
  };
}

export const MOCK_EVENT_STATS: Record<string, EventStats> = {
  evt_wedding_01: {
    totalReceivedKobo: 285_000_000,
    giftCount: 18,
    rsvpYesCount: 64,
    rsvpMaybeCount: 9,
    rsvpNoCount: 5,
    payoutStatus: "VERIFIED",
  },
  evt_birthday_02: {
    totalReceivedKobo: 95_000_000,
    giftCount: 9,
    rsvpYesCount: 28,
    rsvpMaybeCount: 4,
    rsvpNoCount: 2,
    payoutStatus: "VERIFIED",
  },
  evt_baby_03: {
    totalReceivedKobo: 0,
    giftCount: 0,
    rsvpYesCount: 0,
    rsvpMaybeCount: 0,
    rsvpNoCount: 0,
    payoutStatus: "NOT_SET",
  },
};

// 6. Gifts Feed per Event (Section 12)
export const INITIAL_GIFTS_BY_EVENT: Record<string, Gift[]> = {
  evt_wedding_01: [
    {
      id: "gft_01",
      type: "MONEY",
      amountKobo: 50_000_000, // ₦500,000
      giverName: "Chief & Mrs. Nwosu",
      anonymous: false,
      message: "Wishing you both a lifetime of peace, joy, and abundance! Happy married life.",
      status: "PAID",
      thanked: true,
      createdAt: "2026-10-27T18:20:00Z",
    },
    {
      id: "gft_02",
      type: "POOL",
      amountKobo: 25_000_000, // ₦250,000
      giverName: "Kemi Adesanya",
      anonymous: false,
      message: "Enjoy sunset drinks in Zanzibar on me!",
      status: "PAID",
      thanked: false,
      createdAt: "2026-10-27T20:45:00Z",
    },
    {
      id: "gft_03",
      type: "MONEY",
      amountKobo: 15_000_000, // ₦150,000
      giverName: null,
      anonymous: true,
      message: "May your home always be filled with laughter.",
      status: "PAID",
      thanked: false,
      createdAt: "2026-10-28T07:10:00Z",
    },
    {
      id: "gft_04",
      type: "PRODUCT",
      amountKobo: 12_500_000, // ₦125,000
      giverName: "Ifeanyi & Zainab",
      anonymous: false,
      message: "Hope you love the Egyptian cotton bedding set!",
      status: "PAID",
      thanked: true,
      createdAt: "2026-10-28T09:15:00Z",
    },
  ],
  evt_birthday_02: [
    {
      id: "gft_05",
      type: "MONEY",
      amountKobo: 20_000_000, // ₦200,000
      giverName: "Seyi & Bolanle",
      anonymous: false,
      message: "Happy 30th Ada! Welcome to the 3rd floor!",
      status: "PAID",
      thanked: false,
      createdAt: "2026-10-27T14:00:00Z",
    },
  ],
};

// 7. Wall of Love Posts per Event (Section 12)
export const INITIAL_WALL_POSTS_BY_EVENT: Record<string, WallPost[]> = {
  evt_wedding_01: [
    {
      id: "wall_01",
      authorName: "Chief & Mrs. Nwosu",
      text: "Wishing you both a lifetime of peace, joy, and abundance! Happy married life.",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-27T18:20:00Z",
    },
    {
      id: "wall_02",
      authorName: "Kemi Adesanya",
      text: "My favorite couple! Counting down the days to December 12th.",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-27T20:46:00Z",
    },
    {
      id: "wall_03",
      authorName: "Anonymous Well-Wisher",
      text: "May your home always be filled with laughter.",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-28T07:10:00Z",
    },
  ],
  evt_birthday_02: [
    {
      id: "wall_04",
      authorName: "Seyi & Bolanle",
      text: "Happy 30th Ada! Welcome to the 3rd floor!",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-27T14:00:00Z",
    },
  ],
  evt_birthday_pub_04: [
    {
      id: "wall_05",
      authorName: "Bankole & The Boys",
      text: "Happy 40th Tunde! Life truly begins at 40—here's to Marrakech and many more wins.",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-28T09:15:00Z",
    },
  ],
  evt_sendforth_05: [
    {
      id: "wall_06",
      authorName: "Class of 2018 Residents",
      text: "Thank you Prof. Nwosu for teaching us compassion alongside clinical excellence. Enjoy every moment of retirement!",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-28T11:30:00Z",
    },
  ],
  evt_naming_06: [
    {
      id: "wall_07",
      authorName: "Hajiya Maryam & Family",
      text: "May Allah bless Baby Zainab with health, wisdom, and a life full of light.",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-28T12:10:00Z",
    },
  ],
  evt_grad_07: [
    {
      id: "wall_08",
      authorName: "Uncle Emeka (Toronto)",
      text: "So proud of you Dr. Chisom! All the late nights paid off. Go heal the world!",
      media: [],
      status: "VISIBLE",
      createdAt: "2026-10-28T13:45:00Z",
    },
  ],
};

// 8. RSVPs per Event
export const INITIAL_RSVPS_BY_EVENT: Record<string, MockRsvp[]> = {
  evt_wedding_01: [
    {
      id: "rsvp_01",
      eventId: "evt_wedding_01",
      name: "Kemi Adesanya",
      response: "YES",
      plusOneName: "Damilola Adesanya",
      email: "kemi@example.com",
      phone: "+2348035550101",
      createdAt: "2026-10-25T10:00:00Z",
    },
    {
      id: "rsvp_02",
      eventId: "evt_wedding_01",
      name: "Ifeanyi Eze",
      response: "YES",
      email: "ifeanyi@example.com",
      phone: "+2348065550199",
      createdAt: "2026-10-26T11:30:00Z",
    },
    {
      id: "rsvp_03",
      eventId: "evt_wedding_01",
      name: "Ngozi Obi",
      response: "MAYBE",
      email: "ngozi@example.com",
      createdAt: "2026-10-27T08:15:00Z",
    },
  ],
  evt_birthday_02: [
    {
      id: "rsvp_04",
      eventId: "evt_birthday_02",
      name: "Seyi Martins",
      response: "YES",
      email: "seyi@example.com",
      createdAt: "2026-10-26T19:00:00Z",
    },
  ],
};

// 9. Curated Catalog Products & Collections (Phase 3)
export const MOCK_CATALOG_PRODUCTS: MockCatalogProduct[] = [
  // --- SINGLE GIFT ITEMS ---
  {
    id: "prod_mixer_01",
    slug: "kenwood-titanium-chef-baker-mixer",
    name: "Kenwood Titanium Chef Baker Stand Mixer",
    description:
      "Built-in EasyWeigh scales, 1200W digitally controlled motor, and dual stainless steel bowls for effortless baking.",
    priceKobo: 38_500_000, // ₦385,000
    category: "Home & Kitchen",
    giftType: "HOME_KITCHEN",
    mainCategories: ["WEDDING"],
    occasions: ["WEDDING", "HOUSEWARMING"],
    relationships: ["COUPLE", "FAMILY", "FRIEND"],
    gender: "UNISEX",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 4.9,
    reviewCount: 34,
  },
  {
    id: "prod_bedding_02",
    slug: "egyptian-cotton-800tc-king-bedding-blush",
    name: "Egyptian Cotton 800TC King Bedding Set (Blush)",
    description:
      "Hotel-grade 100% long-staple Egyptian cotton duvet cover, fitted sheet, and 4 pillowcases.",
    priceKobo: 12_500_000, // ₦125,000
    category: "Home & Kitchen",
    giftType: "HOME_KITCHEN",
    mainCategories: ["WEDDING"],
    occasions: ["WEDDING", "ANNIVERSARY"],
    relationships: ["COUPLE", "PARTNER"],
    gender: "UNISEX",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 4.8,
    reviewCount: 51,
  },
  {
    id: "prod_oud_06",
    slug: "signature-oud-and-amber-gift-box",
    name: "Signature Oud & Amber Perfume Gift Box",
    description:
      "Hand-poured 100ml Eau de Parfum paired with a scented soy candle and gold-trimmed gift note.",
    priceKobo: 9_500_000, // ₦95,000
    category: "Beauty & Fragrance",
    giftType: "BEAUTY",
    mainCategories: ["FOR_HIM", "FOR_HER", "BIRTHDAY"],
    occasions: ["BIRTHDAY", "WEDDING", "GRADUATION", "VALENTINES_DAY"],
    relationships: ["PARTNER", "HUSBAND", "WIFE", "BOYFRIEND", "GIRLFRIEND", "FRIEND", "COLLEAGUE"],
    gender: "UNISEX",
    ageGroup: "YOUNG_ADULT",
    vendorName: "Scents of Ikoyi",
    inStock: true,
    rating: 4.7,
    reviewCount: 29,
  },
  {
    id: "prod_flowers_01",
    slug: "signature-blush-rose-and-eucalyptus-bouquet",
    name: "Signature Blush Rose & Eucalyptus Hand-Tied Bouquet",
    description:
      "Fresh Kenyan blush garden roses, fragrant eucalyptus sprigs, and imported baby's breath wrapped in Italian silk paper.",
    priceKobo: 7_500_000, // ₦75,000
    category: "Flowers & Bouquets",
    giftType: "FLOWERS",
    mainCategories: ["FOR_HER", "WEDDING", "BIRTHDAY"],
    occasions: ["BIRTHDAY", "ANNIVERSARY", "VALENTINES_DAY", "MOTHERS_DAY", "BRIDAL_SHOWER", "JUST_BECAUSE"],
    relationships: ["WIFE", "GIRLFRIEND", "FIANCE", "PARENT", "FRIEND"],
    gender: "FEMALE",
    ageGroup: "ADULT",
    vendorName: "Victoria Island Florals",
    inStock: true,
    rating: 4.9,
    reviewCount: 42,
  },
  {
    id: "prod_chocolates_03",
    slug: "handcrafted-lagos-artisan-truffles-box",
    name: "Handcrafted Single-Origin Artisan Truffles Box (24pc)",
    description:
      "Artisanal dark chocolate ganache, salted caramel, and roasted Ondo cocoa nibs in a gold-embossed gift box.",
    priceKobo: 4_500_000, // ₦45,000
    category: "Chocolates & Confectionery",
    giftType: "CHOCOLATES",
    mainCategories: ["FOR_HIM", "FOR_HER", "BIRTHDAY", "CORPORATE"],
    occasions: ["BIRTHDAY", "VALENTINES_DAY", "CHRISTMAS", "APPRECIATION", "JUST_BECAUSE"],
    relationships: ["FRIEND", "COLLEAGUE", "CLIENT", "BOSS", "PARTNER", "TEACHER"],
    gender: "UNISEX",
    ageGroup: "ADULT",
    vendorName: "Lagos Cocoa Atelier",
    inStock: true,
    rating: 4.9,
    reviewCount: 38,
  },
  {
    id: "prod_pen_04",
    slug: "montblanc-meisterstuck-gold-fountain-pen",
    name: "Montblanc Meisterstück Classique Gold-Coated Fountain Pen",
    description:
      "Precious black resin with gold-coated details and handcrafted 14K gold nib. Includes optional complimentary initials engraving.",
    priceKobo: 48_000_000, // ₦480,000
    category: "Luxury & Keepsakes",
    giftType: "LUXURY",
    mainCategories: ["FOR_HIM", "CORPORATE"],
    occasions: ["RETIREMENT", "PROMOTION", "GRADUATION", "NEW_JOB"],
    relationships: ["HUSBAND", "BOSS", "CLIENT", "PASTOR", "PARENT"],
    gender: "MALE",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 5.0,
    reviewCount: 19,
  },
  {
    id: "prod_tech_05",
    slug: "bang-and-olufsen-beosound-a1-speaker",
    name: "Bang & Olufsen Beosound A1 (2nd Gen) Waterproof Speaker",
    description:
      "Superior 360-degree True360 sound, waterproof aluminum dome, and 18-hour battery life with genuine leather strap.",
    priceKobo: 32_000_000, // ₦320,000
    category: "Tech & Living",
    giftType: "TECH",
    mainCategories: ["FOR_HIM", "BIRTHDAY", "CORPORATE"],
    occasions: ["BIRTHDAY", "GRADUATION", "HOUSEWARMING"],
    relationships: ["BOYFRIEND", "HUSBAND", "FRIEND", "COLLEAGUE"],
    gender: "UNISEX",
    ageGroup: "YOUNG_ADULT",
    vendorName: "Sound & Vision Lekki",
    inStock: true,
    rating: 4.8,
    reviewCount: 27,
  },

  // --- PREDEFINED GIFT COMBOS (CURATED BOXES) ---
  {
    id: "prod_combo_gentleman",
    slug: "the-gentlemans-executive-box",
    name: "The Gentleman's Executive Box",
    description:
      "A distinguished pairing of Tom Ford Ombré Leather EDP (50ml), aged single-barrel Scotch whiskey flagon, Italian full-grain leather wallet, and gold-foil artisan truffles.",
    priceKobo: 28_500_000, // ₦285,000
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    mainCategories: ["FOR_HIM", "CORPORATE", "BIRTHDAY", "COMBOS"],
    occasions: ["BIRTHDAY", "PROMOTION", "RETIREMENT", "FATHERS_DAY", "CHRISTMAS"],
    relationships: ["HUSBAND", "BOYFRIEND", "BOSS", "CLIENT", "FATHER"],
    gender: "MALE",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 5.0,
    reviewCount: 48,
    isCombo: true,
    packagingIncluded: "Blush & Gold Rigid Keepsake Box with Satin Ribbon",
    comboItems: [
      { name: "Tom Ford Ombré Leather EDP (50ml)", qty: 1, tag: "Perfumery" },
      { name: "Italian Full-Grain Leather Cardholder", qty: 1, tag: "Leather" },
      { name: "Single-Barrel Scotch Whiskey Flagon (200ml)", qty: 1, tag: "Spirits" },
      { name: "Single-Origin Dark Truffles (8pc)", qty: 1, tag: "Chocolates" },
      { name: "Gold Foil Handwritten Note Card", qty: 1, tag: "Stationery" },
    ],
  },
  {
    id: "prod_combo_bridal",
    slug: "the-radiant-bridal-luxury-box",
    name: "The Radiant Bridal Luxury Keepsake Box",
    description:
      "Handcrafted for the bride: Pure mulberry silk bride robe, Moët & Chandon Rosé Imperial, hand-poured jasmine candle, rose quartz facial roller, and bridal memory journal.",
    priceKobo: 34_000_000, // ₦340,000
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    mainCategories: ["WEDDING", "FOR_HER", "COMBOS"],
    occasions: ["WEDDING", "BRIDAL_SHOWER", "ENGAGEMENT"],
    relationships: ["WIFE", "FIANCE", "FRIEND"],
    gender: "FEMALE",
    ageGroup: "YOUNG_ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 4.9,
    reviewCount: 56,
    isCombo: true,
    packagingIncluded: "Blush & Gold Rigid Keepsake Box with Silk Bow",
    comboItems: [
      { name: "100% Mulberry Silk Robe (Blush)", qty: 1, tag: "Fashion" },
      { name: "Moët & Chandon Rosé Impérial (375ml)", qty: 1, tag: "Champagne" },
      { name: "French Jasmine Soy Candle (250g)", qty: 1, tag: "Home Fragrance" },
      { name: "Natural Rose Quartz Facial Roller", qty: 1, tag: "Wellness" },
      { name: "Gold-Edged Keepsake Wedding Journal", qty: 1, tag: "Keepsake" },
    ],
  },
  {
    id: "prod_combo_baby",
    slug: "welcome-sweet-baby-royal-hamper",
    name: "Welcome Sweet Baby Royal Hamper",
    description:
      "A gentle newborn welcome: GOTS-certified organic cotton swaddle wrap, hand-knit merino booties, organic shea baby balm, plush heirloom lamb, and wooden milestone cards.",
    priceKobo: 16_500_000, // ₦165,000
    category: "Curated Combos & Boxes",
    giftType: "BABY_ITEMS",
    mainCategories: ["BABY_SHOWER", "COMBOS"],
    occasions: ["BABY_SHOWER", "NAMING_CEREMONY", "CHILD_DEDICATION"],
    relationships: ["PARENT", "FRIEND", "COLLEAGUE", "FAMILY"],
    gender: "UNISEX",
    ageGroup: "BABY",
    vendorName: "Little Palms Baby House",
    inStock: true,
    rating: 5.0,
    reviewCount: 39,
    isCombo: true,
    packagingIncluded: "Handwoven Northern Cane Hamper Basket",
    comboItems: [
      { name: "Organic Cotton Muslin Swaddle", qty: 2, tag: "Nursery" },
      { name: "Hand-Knit Merino Baby Booties", qty: 1, tag: "Clothing" },
      { name: "Whipped Organic Shea Butter Balm (150g)", qty: 1, tag: "Skincare" },
      { name: "Heirloom Plush Cuddle Lamb", qty: 1, tag: "Toy" },
      { name: "Wooden Engraved Milestone Discs (Set of 12)", qty: 1, tag: "Keepsake" },
    ],
  },
  {
    id: "prod_combo_jubilee",
    slug: "golden-jubilee-celebration-hamper",
    name: "Golden Jubilee Milestone Celebration Hamper",
    description:
      "Veuve Clicquot Yellow Label Brut, a pair of hand-blown gold rim crystal champagne flutes, Belgian champagne truffles, roasted jumbo cashews, and a commemorative brass table plaque.",
    priceKobo: 42_000_000, // ₦420,000
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    mainCategories: ["BIRTHDAY", "WEDDING", "CORPORATE", "COMBOS"],
    occasions: ["ANNIVERSARY", "BIRTHDAY", "RETIREMENT", "THANKSGIVING"],
    relationships: ["PARENT", "GRANDPARENT", "BOSS", "PASTOR", "COUPLE"],
    gender: "UNISEX",
    ageGroup: "SENIOR",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 5.0,
    reviewCount: 31,
    isCombo: true,
    packagingIncluded: "Handwoven Northern Cane Hamper Basket with Satin Ribbon",
    comboItems: [
      { name: "Veuve Clicquot Brut Champagne (750ml)", qty: 1, tag: "Champagne" },
      { name: "Gold Rim Crystal Champagne Flutes", qty: 2, tag: "Glassware" },
      { name: "Belgian Champagne Cocoa Truffles (16pc)", qty: 1, tag: "Chocolates" },
      { name: "Artisanal Roasted Sea Salt Cashews (300g)", qty: 1, tag: "Gourmet" },
      { name: "Custom Engraved Brass Commemorative Plaque", qty: 1, tag: "Keepsake" },
    ],
  },
  {
    id: "prod_combo_corporate",
    slug: "executive-appreciation-gratitude-box",
    name: "Executive Appreciation & Gratitude Box",
    description:
      "A premium corporate token of esteem: Double-walled matte black insulated flask, Italian leather notebook with pen loop, single-origin roasted coffee beans, and natural raw forest honey.",
    priceKobo: 19_500_000, // ₦195,000
    category: "Curated Combos & Boxes",
    giftType: "FOOD",
    mainCategories: ["CORPORATE", "COMBOS"],
    occasions: ["APPRECIATION", "PROMOTION", "END_OF_YEAR", "RETIREMENT"],
    relationships: ["CLIENT", "BOSS", "COLLEAGUE", "EMPLOYEE", "TEACHER"],
    gender: "UNISEX",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 4.8,
    reviewCount: 44,
    isCombo: true,
    packagingIncluded: "Eco Luxury Kraft Ribbon Box",
    comboItems: [
      { name: "Matte Black Insulated Thermal Flask (500ml)", qty: 1, tag: "Lifestyle" },
      { name: "Italian Leather Bound Daily Journal", qty: 1, tag: "Stationery" },
      { name: "Mambilla Plateau Medium Roast Coffee Beans (250g)", qty: 1, tag: "Coffee" },
      { name: "Ondo Wildflower Raw Honey (200g)", qty: 1, tag: "Gourmet" },
      { name: "Embossed Thank You Note Card", qty: 1, tag: "Stationery" },
    ],
  },
  {
    id: "prod_combo_spa",
    slug: "botanical-wellness-spa-sanctuary-box",
    name: "Botanical Wellness & Spa Sanctuary Box",
    description:
      "Restore calm: Mineral-rich Dead Sea lavender bath salts, hand-whipped raw shea butter cream, pure botanical body glow oil, mulberry silk eye sleep mask, and wood-wick soy candle.",
    priceKobo: 18_000_000, // ₦180,000
    category: "Curated Combos & Boxes",
    giftType: "WELLNESS",
    mainCategories: ["FOR_HER", "BIRTHDAY", "COMBOS"],
    occasions: ["BIRTHDAY", "MOTHERS_DAY", "GET_WELL_SOON", "JUST_BECAUSE"],
    relationships: ["WIFE", "GIRLFRIEND", "PARENT", "FRIEND", "COLLEAGUE"],
    gender: "FEMALE",
    ageGroup: "ADULT",
    vendorName: "Botanica Lagos",
    inStock: true,
    rating: 4.9,
    reviewCount: 35,
    isCombo: true,
    packagingIncluded: "Blush & Gold Rigid Keepsake Box",
    comboItems: [
      { name: "Dead Sea Lavender Bath Soak (300g)", qty: 1, tag: "Spa" },
      { name: "Whipped Unrefined Shea Butter Cream (200g)", qty: 1, tag: "Skincare" },
      { name: "Botanical Glow Jojoba & Neroli Oil (100ml)", qty: 1, tag: "Beauty" },
      { name: "Pure Mulberry Silk Sleep Eye Mask", qty: 1, tag: "Sleep" },
      { name: "Crackling Wood-Wick Vanilla Soy Candle", qty: 1, tag: "Aromatherapy" },
    ],
  },
  {
    id: "prod_hamper_08",
    slug: "royal-celebration-champagne-hamper",
    name: "Royal Celebration Champagne & Artisan Chocolate Hamper",
    description:
      "Moët & Chandon Impérial Brut, Belgian pralines, roasted cashews, and a keepsake woven basket.",
    priceKobo: 18_500_000, // ₦185,000
    category: "Food & Drinks",
    giftType: "DRINKS",
    mainCategories: ["WEDDING", "BIRTHDAY", "CORPORATE"],
    occasions: ["WEDDING", "BIRTHDAY", "GRADUATION"],
    relationships: ["COUPLE", "BOSS", "FRIEND"],
    gender: "UNISEX",
    ageGroup: "ADULT",
    vendorName: "Lagos Luxe Hampers",
    inStock: true,
    rating: 5.0,
    reviewCount: 62,
  },
];

export const MOCK_BILLSPOT_PROVIDERS = [
  {
    id: 1,
    name: "MTN",
    slug: "mtn",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839210304125856595365919707",
  },
  {
    id: 2,
    name: "Airtel",
    slug: "airtel",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011971210304130554599549680517",
  },
  {
    id: 3,
    name: "Glo",
    slug: "glo",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011360210304130041596415277062",
  },
  {
    id: 4,
    name: "T2mobile",
    slug: "t2mobile",
    logo: "https://kudatestblob.blob.core.windows.net/kuda-biller-mgmt/011839260317172647652078968234",
  },
];

export const MOCK_BILLSPOT_PLANS: Record<
  string,
  Array<{ name: string; bill_item_identifier: string; amount: number }>
> = {
  mtn: [
    { name: "1GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-008", amount: 1000 },
    { name: "1.5TB Data (1 Year)", bill_item_identifier: "KUD-DAT-MTND-038", amount: 225000 },
    { name: "3.5GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-071", amount: 1500 },
    { name: "34GB For 30 Days", bill_item_identifier: "KUD-DAT-MTND-070", amount: 10000 },
    { name: "5.5GB For 2 Days", bill_item_identifier: "KUD-DAT-MTND-069", amount: 1500 },
    { name: "4GB FOR 2 Days", bill_item_identifier: "KUD-DAT-MTND-068", amount: 1200 },
    { name: "3.5GB FOR 1 Day", bill_item_identifier: "KUD-DAT-MTND-067", amount: 1000 },
    { name: "20GB Weekly Data Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-066", amount: 5000 },
    { name: "2.5GB Daily Data Plan (1 Day)", bill_item_identifier: "KUD-DAT-MTND-065", amount: 750 },
    { name: "450GB 3-Month Broadband Plan", bill_item_identifier: "KUD-DAT-MTND-064", amount: 75000 },
    { name: "60GB HyNetFlex Router Only (30 Days)", bill_item_identifier: "KUD-DAT-MTND-063", amount: 14500 },
    { name: "150GB 2-Month Plan", bill_item_identifier: "KUD-DAT-MTND-062", amount: 40000 },
    { name: "75GB FOR 1 MONTH", bill_item_identifier: "KUD-DAT-MTND-061", amount: 18000 },
    { name: "36GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-060", amount: 11000 },
    { name: "5GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-032", amount: 2500 },
    { name: "6GB Weekly Data Plan", bill_item_identifier: "KUD-DAT-MTND-043", amount: 2500 },
    { name: "165GB FOR 1 MONTH", bill_item_identifier: "KUD-DAT-MTND-042", amount: 35000 },
    { name: "14.5GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-041", amount: 5000 },
    { name: "1.5GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-039", amount: 1000 },
    { name: "480GB FOR 3 MONTHS", bill_item_identifier: "KUD-DAT-MTND-037", amount: 90000 },
    { name: "3.2GB FOR 2 DAYS", bill_item_identifier: "KUD-DAT-MTND-036", amount: 1000 },
    { name: "150GB + 2GB daily 5G Router (30 Days)", bill_item_identifier: "KUD-DAT-MTND-035", amount: 30000 },
    { name: "7GB Daily Plan (2 Days)", bill_item_identifier: "KUD-DAT-MTND-034", amount: 1800 },
    { name: "40GB Weekly Plan (14 Days)", bill_item_identifier: "KUD-DAT-MTND-033", amount: 10000 },
    { name: "18GB Weekly Plan (14 Days)", bill_item_identifier: "KUD-DAT-MTND-031", amount: 6000 },
    { name: "12.5 GB Weekly Plan (14 Days)", bill_item_identifier: "KUD-DAT-MTND-030", amount: 4500 },
    { name: "15GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-029", amount: 4000 },
    { name: "28GB Weekly Plan (14 Days)", bill_item_identifier: "KUD-DAT-MTND-028", amount: 8000 },
    { name: "120GB + 5 GB Youtube/MS Teams / Zoom", bill_item_identifier: "KUD-DAT-MTND-027", amount: 24000 },
    { name: "3GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-026", amount: 2000 },
    { name: "1.5GB FOR 2 DAYS", bill_item_identifier: "KUD-DAT-MTND-025", amount: 600 },
    { name: "6.75GB Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-024", amount: 3000 },
    { name: "7GB Monthly Plan", bill_item_identifier: "KUD-DAT-MTND-023", amount: 3500 },
    { name: "20GB FOR 1 MONTH", bill_item_identifier: "KUD-DAT-MTND-022", amount: 7500 },
    { name: "65GB FOR 30 DAYS", bill_item_identifier: "KUD-DAT-MTND-021", amount: 16000 },
    { name: "16.5GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-020", amount: 6500 },
    { name: "2.7GB + 2 Mins Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-019", amount: 2000 },
    { name: "11GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-018", amount: 3500 },
    { name: "10GB + 10Mins Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-017", amount: 4500 },
    { name: "3.5GB + 5 Mins Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-016", amount: 2500 },
    { name: "1.8GB Xtra Bundle Monthly Data (30 Days)", bill_item_identifier: "KUD-DAT-MTND-015", amount: 1500 },
    { name: "2.7GB Xtra Bundle Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-014", amount: 3000 },
    { name: "1GB + 1GB Youtube Night (7 Days)", bill_item_identifier: "KUD-DAT-MTND-013", amount: 800 },
    { name: "2GB + 2 Mins Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-012", amount: 1500 },
    { name: "2GB FOR 2 DAYS", bill_item_identifier: "KUD-DAT-MTND-011", amount: 750 },
    { name: "2.5GB FOR 2 DAYS", bill_item_identifier: "KUD-DAT-MTND-010", amount: 900 },
    { name: "500MB + 1GB Youtube (7 Days)", bill_item_identifier: "KUD-DAT-MTND-009", amount: 500 },
    { name: "1GB Daily Data + 1.5 Mins (1 Day)", bill_item_identifier: "KUD-DAT-MTND-007", amount: 500 },
    { name: "500MB FOR 1 DAY", bill_item_identifier: "KUD-DAT-MTND-006", amount: 350 },
    { name: "230MB FOR 1 DAY", bill_item_identifier: "KUD-DAT-MTND-005", amount: 200 },
    { name: "600MB + 2 Mins Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-MTND-004", amount: 500 },
    { name: "30GB HyNetFlex Router Only Data Plan (30 Days)", bill_item_identifier: "KUD-DAT-MTND-001", amount: 9000 },
    { name: "110MB FOR 1 DAY", bill_item_identifier: "KUD-DAT-MTND-003", amount: 100 },
  ],
  airtel: [
    { name: "500MB Daily Plan (1 Day)", bill_item_identifier: "KUD-DAT-AIRT-001", amount: 300 },
    { name: "1.5GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-AIRT-002", amount: 1000 },
    { name: "3GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRT-003", amount: 2000 },
    { name: "6GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRT-004", amount: 3000 },
    { name: "10GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRT-005", amount: 4000 },
    { name: "15GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRT-006", amount: 5000 },
    { name: "40GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-AIRT-007", amount: 10000 },
  ],
  glo: [
    { name: "1GB Daily Plan (1 Day)", bill_item_identifier: "KUD-DAT-GLOD-001", amount: 350 },
    { name: "2.5GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-GLOD-002", amount: 1000 },
    { name: "5.8GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-003", amount: 2000 },
    { name: "10GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-005", amount: 3000 },
    { name: "18GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-006", amount: 5000 },
    { name: "50GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-GLOD-007", amount: 10000 },
  ],
  t2mobile: [
    { name: "1GB Daily Plan (1 Day)", bill_item_identifier: "KUD-DAT-T2MB-001", amount: 300 },
    { name: "2GB Weekly Plan (7 Days)", bill_item_identifier: "KUD-DAT-T2MB-002", amount: 1000 },
    { name: "4.5GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MB-003", amount: 2000 },
    { name: "11GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MB-004", amount: 4000 },
    { name: "15GB Monthly Plan (30 Days)", bill_item_identifier: "KUD-DAT-T2MB-005", amount: 5000 },
  ],
};

export const MOCK_CATALOG_COLLECTIONS: MockCatalogCollection[] = [
  {
    id: "col_wedding",
    slug: "wedding-favourites",
    title: "Wedding Registry Favourites",
    description: "Timeless home and kitchen essentials loved by couples.",
    productSlugs: [
      "kenwood-titanium-chef-baker-mixer",
      "egyptian-cotton-800tc-king-bedding-blush",
      "royal-celebration-champagne-hamper",
    ],
  },
  {
    id: "col_under_150k",
    slug: "thoughtful-gifts-under-150k",
    title: "Thoughtful Gifts Under ₦150,000",
    description: "Memorable gifts wrapped and delivered across Lagos and Abuja.",
    productSlugs: [
      "egyptian-cotton-800tc-king-bedding-blush",
      "signature-oud-and-amber-gift-box",
    ],
  },
];

// 10. Orders & Tracking (Section 12)
export const INITIAL_ORDERS: Order[] = [
  {
    id: "ord_01",
    number: "GIV-2026-8841",
    items: [
      {
        name: "Royal Celebration Champagne & Artisan Chocolate Hamper",
        qty: 1,
        unitPriceKobo: 18_500_000,
      },
    ],
    totalKobo: 18_500_000,
    status: "SHIPPED",
    timeline: [
      { status: "PENDING_PAYMENT", at: "2026-10-26T09:00:00Z" },
      { status: "CONFIRMED", at: "2026-10-26T09:02:00Z" },
      { status: "PACKED", at: "2026-10-26T15:30:00Z" },
      { status: "SHIPPED", at: "2026-10-27T10:15:00Z" },
    ],
    recipientName: "Chidi Okafor",
  },
  {
    id: "ord_02",
    number: "GIV-2026-8790",
    items: [
      {
        name: "Signature Oud & Amber Perfume Gift Box",
        qty: 1,
        unitPriceKobo: 9_500_000,
      },
    ],
    totalKobo: 9_500_000,
    status: "DELIVERED",
    timeline: [
      { status: "PENDING_PAYMENT", at: "2026-10-20T12:00:00Z" },
      { status: "CONFIRMED", at: "2026-10-20T12:01:00Z" },
      { status: "PACKED", at: "2026-10-21T09:00:00Z" },
      { status: "SHIPPED", at: "2026-10-21T14:00:00Z" },
      { status: "DELIVERED", at: "2026-10-22T16:40:00Z" },
    ],
    recipientName: "Amaka Nnaji",
  },
];

// 11. Notifications & Preferences
export const INITIAL_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif_01",
    title: "New ₦250,000 contribution!",
    body: "Kemi Adesanya contributed to your Zanzibar Honeymoon Getaway Fund.",
    read: false,
    createdAt: "2026-10-27T20:45:00Z",
    href: "/events/evt_wedding_01",
  },
  {
    id: "notif_02",
    title: "New RSVP confirmed",
    body: "Ifeanyi Eze responded YES to Adaobi & Chidi's Forever.",
    read: true,
    createdAt: "2026-10-26T11:30:00Z",
    href: "/events/evt_wedding_01",
  },
];

export const INITIAL_NOTIFICATION_PREFS: MockNotificationPreferences = {
  email: true,
  whatsappOrSms: true,
  inApp: true,
};

// 12. Admin Queue, Ledger & Disputes
export const INITIAL_MODERATION_QUEUE: MockAdminModerationItem[] = [
  {
    id: "mod_01",
    eventSlug: "adaobi-and-chidi-2026",
    eventName: "Adaobi & Chidi's Forever (#ChidAda26)",
    authorName: "Guest User",
    text: "Check out this photo from the introduction ceremony!",
    reason: "Contains uploaded photo (pending review)",
    status: "PENDING",
    createdAt: "2026-10-28T08:30:00Z",
  },
];

export const INITIAL_LEDGER_ENTRIES: MockLedgerEntry[] = [
  {
    id: "led_01",
    type: "CREDIT",
    description: "Money gift from Chief & Mrs. Nwosu",
    amountKobo: 50_000_000,
    reference: "PAY_GIV_9001",
    createdAt: "2026-10-27T18:20:00Z",
  },
  {
    id: "led_02",
    type: "PAYOUT",
    description: "Automated payout to GTBank ••••4829",
    amountKobo: 50_000_000,
    reference: "OUT_GIV_3001",
    createdAt: "2026-10-28T06:00:00Z",
  },
];

export const INITIAL_DISPUTES: MockDispute[] = [
  {
    id: "disp_01",
    orderId: "ord_02",
    orderNumber: "GIV-2026-8790",
    type: "OTHER",
    description: "Gift note card was missing the sender signature.",
    status: "OPEN",
    createdAt: "2026-10-24T11:20:00Z",
  },
];

