"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { QrCard } from "@/components/shared/QrCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { toast } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { formatDate, nairaToKobo } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import {
  buildPastHostSuggestions,
  generateAccessCodeSuggestion,
  readPastHosts,
  savePastHost,
  useEventWizardStore,
  type WizardStep,
} from "@/stores/event-wizard-store";
import { useAuthStore } from "@/stores/auth-store";
import { uploadFileToPresignedUrl } from "../api";
import {
  useCreateAndPublishEventMutation,
  useMyEvents,
  usePayoutAccountQuery,
  usePresignUploadMutation,
  usePublicEventsList,
} from "../hooks/useEvents";
import { useCatalogProducts, type CatalogProduct } from "@/features/catalog";
import {
  buildUniqueEventSlug,
  EVENT_TYPES,
  eventStep1Schema,
  eventStep2Schema,
  eventStep3Schema,
  eventStep4Schema,
  getLagosDateBounds,
  wizardRegistryItemSchema,
} from "../schemas";
import type { AllowedMediaMimeType, EventDetail, EventType } from "../types";

const WIZARD_STEPS = [
  { step: 1, label: "Basics" },
  { step: 2, label: "Story" },
  { step: 3, label: "Privacy" },
  { step: 4, label: "Registry" },
  { step: 5, label: "Review" },
] as const;

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTHDAY: "Birthday",
  WEDDING: "Wedding",
  HOUSEWARMING: "Housewarming",
  ANNIVERSARY: "Anniversary",
  BRIDAL_SHOWER: "Bridal shower",
  BABY_SHOWER: "Baby shower",
  NAMING_CEREMONY: "Naming ceremony",
  GRADUATION: "Graduation",
  SEND_OFF: "Send-off & Relocation",
  RETIREMENT: "Retirement",
  MEMORIAL: "Celebration of life",
  OTHER: "Other celebration",
};

const STORY_TEMPLATES_BY_TYPE: Record<
  EventType,
  Array<{ label: string; text: string }>
> = {
  BIRTHDAY: [
    {
      label: "Milestone Thanksgiving",
      text: "Another year of grace, good health, and unforgettable memories! Thank you for celebrating this new chapter with me—your love and wishes make it truly special.",
    },
    {
      label: "Jollof & Joy",
      text: "Grateful for life, growth, and the best circle of family and friends. Come ready to dance, celebrate, and share in the joy!",
    },
  ],
  WEDDING: [
    {
      label: "Traditional & White Wedding",
      text: "From a chance meeting in Lagos to forever together! Your prayers, presence, and blessings mean the world to our families as we begin our new home.",
    },
    {
      label: "Warm & Grateful",
      text: "We are overjoyed to celebrate our union surrounded by the people who shaped our journey. Thank you for celebrating love, family, and new beginnings with us.",
    },
  ],
  HOUSEWARMING: [
    {
      label: "New Home & New Beginnings",
      text: "We've officially unpacked and found our haven! We can't wait to welcome our favourite people into our new space for an evening of warmth, laughter, and great food.",
    },
    {
      label: "Home Blessing",
      text: "Every brick and corner is a testimony of God's goodness. Thank you for blessing our new home with your love, prayers, and thoughtful gifts as we settle in.",
    },
  ],
  ANNIVERSARY: [
    {
      label: "Celebrating Love & Milestones",
      text: "Years of love, partnership, and laughter! We are gathering our dearest family and friends to toast to our journey and the beautiful years still ahead.",
    },
    {
      label: "Growing Together",
      text: "Through every season, love has carried us. Thank you for walking alongside our family and celebrating this special anniversary milestone with us.",
    },
  ],
  BRIDAL_SHOWER: [
    {
      label: "Shower the Bride",
      text: "The countdown to 'I Do' is on! Join us for an intimate celebration of laughter, pampering, and unforgettable memories as we shower our bride with love.",
    },
  ],
  BABY_SHOWER: [
    {
      label: "Welcome Little Blessing",
      text: "Our hearts are full as we prepare to welcome our little bundle of joy. Thank you for showering our growing family with prayers, love, and thoughtful gifts.",
    },
  ],
  NAMING_CEREMONY: [
    {
      label: "Joyful Naming & Dedication",
      text: "With hearts full of gratitude, we gather to bestow our child's name and dedicate their life to God. Your prayers, blessings, and presence honor our family today.",
    },
  ],
  GRADUATION: [
    {
      label: "Next Chapter Ahead",
      text: "Sleepless nights, dedication, and God's grace brought us to this milestone! Thank you for supporting my journey and cheering me into the next chapter.",
    },
  ],
  SEND_OFF: [
    {
      label: "Bon Voyage & New Horizons",
      text: "As a new adventure calls across borders, we want to gather our favourite people for one last dance, hearty laughs, and warm hugs before wheels up!",
    },
    {
      label: "To New Beginnings",
      text: "Stepping into a new chapter abroad! Thank you for being my rock, my family, and my biggest cheerleaders. Distance will never break our bond.",
    },
  ],
  RETIREMENT: [
    {
      label: "Meritorious Service & Legacy",
      text: "Celebrating decades of passion, hard work, and unforgettable impact! Please join us as we toast to a well-deserved retirement and a vibrant new season of rest and purpose.",
    },
  ],
  MEMORIAL: [
    {
      label: "Celebration of a Beautiful Life",
      text: "In loving memory of a life richly lived and deeply cherished. We gather to give thanks, celebrate their enduring legacy, and comfort one another in love.",
    },
  ],
  OTHER: [
    {
      label: "Thanksgiving & Celebration",
      text: "We are gathering our favourite people to give thanks and celebrate this special milestone together. Your presence and warm wishes mean everything to us!",
    },
  ],
};

const POPULAR_REGISTRY_PRESETS: ReadonlyArray<{
  title: string;
  targetPriceNaira: number;
  tag: string;
}> = [
  {
    title: "Honeymoon & Getaway Fund",
    targetPriceNaira: 250_000,
    tag: "Wedding",
  },
  {
    title: "New Home Kitchen Appliances Pool",
    targetPriceNaira: 150_000,
    tag: "Housewarming",
  },
  {
    title: "Birthday Cash Blessing Pot",
    targetPriceNaira: 100_000,
    tag: "Birthday",
  },
  {
    title: "Relocation & Departure Travel Fund",
    targetPriceNaira: 200_000,
    tag: "Send-Off",
  },
  {
    title: "Baby Nursery & Essentials Fund",
    targetPriceNaira: 120_000,
    tag: "Baby & Naming",
  },
  {
    title: "Career & Induction Starter Pool",
    targetPriceNaira: 180_000,
    tag: "Graduation",
  },
];

const FLEXIBLE_GIFT_PREFERENCES: ReadonlyArray<{
  title: string;
  subtitle: string;
  category: "AIRTIME_DATA" | "CUSTOM";
}> = [
    {
      title: "Airtime Top-Up (Any Network)",
      subtitle: "Guest chooses network & amount",
      category: "AIRTIME_DATA",
    },
    {
      title: "Mobile Data Bundles (MTN, Airtel, Glo, 9mobile)",
      subtitle: "Guest chooses data plan & bundle",
      category: "AIRTIME_DATA",
    },
    {
      title: "Airtime & Data Gift Wish",
      subtitle: "Guest chooses airtime or data",
      category: "AIRTIME_DATA",
    },
    {
      title: "Surprise Gift from Givvly Catalog",
      subtitle: "Guest picks any gift they love for you",
      category: "CUSTOM",
    },
  ];

function computeQuickDate(offsetType: "next_saturday" | "one_month" | "three_months"): string {
  const now = new Date();
  const target = new Date(now);
  if (offsetType === "next_saturday") {
    const day = target.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + daysUntilSaturday);
  } else if (offsetType === "one_month") {
    target.setDate(target.getDate() + 30);
  } else {
    target.setDate(target.getDate() + 90);
  }
  return target.toISOString().slice(0, 10);
}

function parseYmdToLocalDate(ymd: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatLocalDateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface WizardRecommendationContext {
  type: EventType;
  name: string;
  date: string;
  story: string;
}

export interface RecommendedRegistryProduct {
  product: CatalogProduct;
  score: number;
  matchReason: string;
}

const STOP_WORDS = new Set([
  "with",
  "from",
  "that",
  "this",
  "your",
  "ours",
  "have",
  "will",
  "thank",
  "thanks",
  "celebrate",
  "celebrating",
  "celebration",
  "event",
  "party",
  "lagos",
  "abuja",
  "nigeria",
  "come",
  "join",
  "together",
  "family",
  "friends",
  "love",
  "special",
  "milestone",
  "into",
  "they",
  "them",
  "their",
  "what",
  "when",
  "where",
]);

function extractContextKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    )
  );
}

/**
 * Intelligently ranks backend catalog products for Step 4 Registry suggestions
 * using the host's pre-provided Event type, Event name, Event date, and Our story.
 */
export function getIntelligentRegistrySuggestions(
  products: CatalogProduct[],
  context: WizardRecommendationContext,
  limit = 6
): {
  recommendations: RecommendedRegistryProduct[];
  activeSignals: string[];
} {
  const eligible = products.filter((p) => p.inStock);
  if (eligible.length === 0) {
    return { recommendations: [], activeSignals: [] };
  }

  const nameLower = context.name.trim().toLowerCase();
  const storyLower = context.story.trim().toLowerCase();
  const combinedText = `${nameLower} ${storyLower}`.trim();
  const nameKeywords = extractContextKeywords(nameLower);
  const storyKeywords = extractContextKeywords(storyLower);

  const activeSignals: string[] = [
    `Event: ${EVENT_TYPE_LABELS[context.type] ?? context.type}`,
  ];

  // Detect theme cues from Event Name + Our Story
  const hasHomeKitchenCue =
    /\b(housewarming|new home|apartment|kitchen|cook|cooking|baking|chef|move-in|home|appliances)\b/i.test(
      combinedText
    );
  const hasBridalOrFemaleCue =
    /\b(bridal|bride|bachelorette|mrs|wife|queen|sister|sis|lady|madam|mom|mother|mama|iya)\b/i.test(
      combinedText
    );
  const hasGroomOrMaleCue =
    /\b(groom|bachelor|husband|chief|king|bro|brother|gentleman|dad|father|papa|baba)\b/i.test(
      combinedText
    );
  const hasBabyCue =
    /\b(baby|naming|dedication|christening|newborn|nursery|bundle|little|twins|maternity)\b/i.test(
      combinedText
    );
  const hasMilestoneSeniorCue =
    /\b(40th|50th|60th|70th|80th|90th|jubilee|golden|diamond|retirement|retire|send-forth|sendforth|elder|prof|honour|thanksgiving)\b/i.test(
      combinedText
    );
  const hasYouthGradTechCue =
    /\b(18th|20th|21st|25th|30th|convocation|induction|mbbs|bar|degree|masters|phd|nysc|tech|gadget|music|work|office|startup)\b/i.test(
      combinedText
    );
  const hasWellnessSpaCue =
    /\b(spa|relax|wellness|self-care|pamper|honeymoon|getaway|retreat|peace|calm|scent|candle)\b/i.test(
      combinedText
    );
  const hasToastPartyCue =
    /\b(champagne|toast|wine|drinks|rooftop|turnup|soiree|dinner|chocolate|sweet|cake|treats|jollof)\b/i.test(
      combinedText
    );

  if (context.name.trim().length >= 3) {
    activeSignals.push(`Name: "${context.name.trim().slice(0, 28)}"`);
  }

  // Detect seasonal cues from Event Date
  let dateMonth: number | null = null;
  let dateDay: number | null = null;
  if (context.date) {
    const parsedDate = new Date(`${context.date}T00:00:00+01:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      dateMonth = parsedDate.getMonth() + 1;
      dateDay = parsedDate.getDate();
    }
  }

  const isFestiveSeason =
    dateMonth === 12 || (dateMonth === 11 && (dateDay ?? 0) >= 20);
  const isValentineSeason = dateMonth === 2 && (dateDay ?? 0) <= 16;
  const isMothersSeason = dateMonth === 3 || dateMonth === 5;
  const isFathersSeason = dateMonth === 6;

  if (isFestiveSeason) {
    activeSignals.push("Date: Festive Season (Dec)");
  } else if (isValentineSeason) {
    activeSignals.push("Date: Valentine's Season (Feb)");
  } else if (context.date) {
    activeSignals.push(`Date: ${formatDate(context.date)}`);
  }

  if (context.story.trim().length > 0) {
    activeSignals.push("Story: Personalized cues active");
  }

  const scored: RecommendedRegistryProduct[] = eligible.map((product) => {
    let score = 0;
    const reasons: Array<{ weight: number; label: string }> = [];

    const occasions = product.occasions ?? [];
    const mainCats = product.mainCategories ?? [];
    const relationships = product.relationships ?? [];
    const productSearchText = [
      product.name,
      product.description,
      product.category,
      ...(product.comboItems ?? []),
    ]
      .join(" ")
      .toLowerCase();

    // 1. Event Type alignment
    if (context.type === "WEDDING") {
      if (
        occasions.includes("WEDDING") ||
        mainCats.includes("WEDDING") ||
        occasions.includes("ANNIVERSARY") ||
        occasions.includes("BRIDAL_SHOWER") ||
        occasions.includes("ENGAGEMENT")
      ) {
        score += 42;
        reasons.push({ weight: 42, label: "Matched to your Wedding" });
      } else if (
        occasions.includes("HOUSEWARMING") ||
        product.giftType === "HOME_KITCHEN" ||
        relationships.includes("COUPLE")
      ) {
        score += 34;
        reasons.push({ weight: 34, label: "New Home & Couple pick" });
      }
    } else if (context.type === "BIRTHDAY") {
      if (occasions.includes("BIRTHDAY") || mainCats.includes("BIRTHDAY")) {
        score += 40;
        reasons.push({ weight: 40, label: "Matched to Birthday" });
      } else if (occasions.includes("THANKSGIVING")) {
        score += 24;
        reasons.push({ weight: 24, label: "Birthday Thanksgiving pick" });
      }
    } else if (context.type === "BABY_SHOWER") {
      if (
        occasions.includes("BABY_SHOWER") ||
        occasions.includes("NAMING_CEREMONY") ||
        occasions.includes("CHILD_DEDICATION") ||
        mainCats.includes("BABY_SHOWER") ||
        product.giftType === "BABY_ITEMS" ||
        product.ageGroup === "BABY"
      ) {
        score += 48;
        reasons.push({ weight: 48, label: "Matched to Baby Shower" });
      }
    } else if (context.type === "GRADUATION") {
      if (
        occasions.includes("GRADUATION") ||
        occasions.includes("PROMOTION") ||
        occasions.includes("NEW_JOB")
      ) {
        score += 44;
        reasons.push({ weight: 44, label: "Matched to Graduation" });
      } else if (
        product.giftType === "TECH" ||
        mainCats.includes("CORPORATE") ||
        product.ageGroup === "YOUNG_ADULT"
      ) {
        score += 28;
        reasons.push({ weight: 28, label: "Graduate & Career essential" });
      }
    } else if (context.type === "OTHER") {
      if (
        occasions.includes("HOUSEWARMING") ||
        occasions.includes("RETIREMENT") ||
        occasions.includes("THANKSGIVING") ||
        occasions.includes("APPRECIATION") ||
        occasions.includes("PROMOTION")
      ) {
        score += 35;
        reasons.push({ weight: 35, label: "Celebration & Thanksgiving pick" });
      }
    }

    // 2. Event Name & Our Story semantic theme cues
    if (
      hasHomeKitchenCue &&
      (product.giftType === "HOME_KITCHEN" ||
        occasions.includes("HOUSEWARMING"))
    ) {
      score += 32;
      reasons.push({ weight: 32, label: "Matched to Home & Kitchen cues" });
    }

    if (
      hasBridalOrFemaleCue &&
      (occasions.includes("BRIDAL_SHOWER") ||
        mainCats.includes("FOR_HER") ||
        product.gender === "FEMALE" ||
        product.giftType === "BEAUTY" ||
        product.giftType === "WELLNESS")
    ) {
      score += 28;
      reasons.push({ weight: 28, label: "Tailored for Her / Bridal" });
    }

    if (
      hasGroomOrMaleCue &&
      (mainCats.includes("FOR_HIM") ||
        product.gender === "MALE" ||
        product.giftType === "LUXURY" ||
        product.giftType === "TECH")
    ) {
      score += 28;
      reasons.push({ weight: 28, label: "Tailored for Him" });
    }

    if (
      hasBabyCue &&
      (product.giftType === "BABY_ITEMS" ||
        product.ageGroup === "BABY" ||
        occasions.includes("BABY_SHOWER") ||
        occasions.includes("NAMING_CEREMONY"))
    ) {
      score += 34;
      reasons.push({ weight: 34, label: "Matched to Baby & Nursery cues" });
    }

    if (
      hasMilestoneSeniorCue &&
      (occasions.includes("RETIREMENT") ||
        occasions.includes("THANKSGIVING") ||
        product.ageGroup === "SENIOR" ||
        product.giftType === "LUXURY" ||
        product.giftType === "DRINKS")
    ) {
      score += 30;
      reasons.push({ weight: 30, label: "Milestone & Jubilee pick" });
    }

    if (
      hasYouthGradTechCue &&
      (product.giftType === "TECH" ||
        occasions.includes("GRADUATION") ||
        occasions.includes("NEW_JOB") ||
        product.ageGroup === "YOUNG_ADULT")
    ) {
      score += 28;
      reasons.push({ weight: 28, label: "Next-Chapter & Tech match" });
    }

    if (
      hasWellnessSpaCue &&
      (product.giftType === "WELLNESS" || product.giftType === "BEAUTY")
    ) {
      score += 26;
      reasons.push({ weight: 26, label: "Matched to Relaxation & Spa cues" });
    }

    if (
      hasToastPartyCue &&
      (product.giftType === "DRINKS" ||
        product.giftType === "CHOCOLATES" ||
        product.giftType === "FOOD")
    ) {
      score += 26;
      reasons.push({ weight: 26, label: "Celebration Toast & Treats" });
    }

    // Direct keyword overlap from Event Name
    for (const kw of nameKeywords) {
      if (productSearchText.includes(kw)) {
        score += 22;
        reasons.push({
          weight: 22,
          label: `Matches "${kw}" in event name`,
        });
      }
    }

    // Direct keyword overlap from Our Story
    for (const kw of storyKeywords) {
      if (productSearchText.includes(kw)) {
        score += 20;
        reasons.push({
          weight: 20,
          label: `Matches "${kw}" in your story`,
        });
      }
    }

    // 3. Event Date seasonal intelligence
    if (
      isFestiveSeason &&
      (occasions.includes("CHRISTMAS") ||
        occasions.includes("END_OF_YEAR") ||
        occasions.includes("THANKSGIVING") ||
        product.isCombo)
    ) {
      score += 20;
      reasons.push({ weight: 20, label: "December Festive pick" });
    }

    if (
      isValentineSeason &&
      (occasions.includes("VALENTINES_DAY") ||
        product.giftType === "FLOWERS" ||
        product.giftType === "CHOCOLATES")
    ) {
      score += 20;
      reasons.push({ weight: 20, label: "February Valentine's pick" });
    }

    if (isMothersSeason && occasions.includes("MOTHERS_DAY")) {
      score += 16;
      reasons.push({ weight: 16, label: "Mother's Season pick" });
    }

    if (isFathersSeason && occasions.includes("FATHERS_DAY")) {
      score += 16;
      reasons.push({ weight: 16, label: "Father's Season pick" });
    }

    // 4. Quality & Curated Gift Box boost
    if (product.isCombo) {
      score += 8;
      reasons.push({ weight: 8, label: "Curated Gift Box" });
    }
    if (product.rating >= 4.9) {
      score += 5;
    }

    reasons.sort((a, b) => b.weight - a.weight);
    const topReason =
      reasons[0]?.label ??
      `Popular in ${product.category}`;

    return {
      product,
      score,
      matchReason: topReason,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.product.rating !== a.product.rating) {
      return b.product.rating - a.product.rating;
    }
    return b.product.reviewCount - a.product.reviewCount;
  });

  return {
    recommendations: scored.slice(0, limit),
    activeSignals,
  };
}

export function CreateEventWizard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthed = Boolean(user && user.id);
  const step = useEventWizardStore((s) => s.step);
  const draft = useEventWizardStore((s) => s.draft);
  const setStep = useEventWizardStore((s) => s.setStep);
  const updateDraft = useEventWizardStore((s) => s.updateDraft);
  const addRegistryItem = useEventWizardStore((s) => s.addRegistryItem);
  const removeRegistryItem = useEventWizardStore((s) => s.removeRegistryItem);
  const hydrateFromStorage = useEventWizardStore((s) => s.hydrateFromStorage);
  const clearWizard = useEventWizardStore((s) => s.clearWizard);

  const payoutQuery = usePayoutAccountQuery(isAuthed);
  const myEventsQuery = useMyEvents(isAuthed);
  const publicEventsQuery = usePublicEventsList();
  const catalogQuery = useCatalogProducts();
  const presignMutation = usePresignUploadMutation();
  const publishMutation = useCreateAndPublishEventMutation();

  const [storedPastHosts, setStoredPastHosts] = React.useState<string[]>([]);

  const existingEventSlugs = React.useMemo(() => {
    const slugs = new Set<string>();
    for (const ev of myEventsQuery.data ?? []) {
      if (ev.slug) slugs.add(ev.slug.toLowerCase());
    }
    for (const ev of publicEventsQuery.data ?? []) {
      if (ev.slug) slugs.add(ev.slug.toLowerCase());
    }
    return slugs;
  }, [myEventsQuery.data, publicEventsQuery.data]);

  const previewSlug = React.useMemo(
    () =>
      buildUniqueEventSlug(
        draft.name.trim() || "your-celebration-2026",
        draft.slugSuffix,
        existingEventSlugs
      ),
    [draft.name, draft.slugSuffix, existingEventSlugs]
  );

  const creatorDefaultHost = React.useMemo(
    () => user?.name?.trim().split(" ")[0] || "Adaobi",
    [user?.name]
  );

  const pastHostSuggestions = React.useMemo(
    () =>
      buildPastHostSuggestions(
        myEventsQuery.data ?? [],
        storedPastHosts,
        creatorDefaultHost
      ),
    [myEventsQuery.data, storedPastHosts, creatorDefaultHost]
  );

  const effectiveHostName = draft.hostName.trim() || creatorDefaultHost;

  const { recommendations: intelligentProducts, activeSignals } =
    React.useMemo(
      () =>
        getIntelligentRegistrySuggestions(catalogQuery.data ?? [], {
          type: draft.type,
          name: `${draft.name} ${draft.hostName}`.trim(),
          date: draft.date,
          story: draft.story,
        }),
      [
        catalogQuery.data,
        draft.type,
        draft.name,
        draft.hostName,
        draft.date,
        draft.story,
      ]
    );

  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>(
    {}
  );
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [newItemTitle, setNewItemTitle] = React.useState("");
  const [newItemPrice, setNewItemPrice] = React.useState("");
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [publishedEvent, setPublishedEvent] =
    React.useState<EventDetail | null>(null);

  React.useEffect(() => {
    hydrateFromStorage();
    setStoredPastHosts(readPastHosts());
  }, [hydrateFromStorage]);

  React.useEffect(() => {
    trackEvent("wizard_step_viewed", {
      step,
      eventType: draft.type,
    });
  }, [step, draft.type]);

  const { minDate, maxDate } = React.useMemo(() => getLagosDateBounds(), []);
  const selectedDateObj = React.useMemo(
    () => parseYmdToLocalDate(draft.date),
    [draft.date]
  );
  const minDateObj = React.useMemo(
    () => parseYmdToLocalDate(minDate),
    [minDate]
  );
  const maxDateObj = React.useMemo(
    () => parseYmdToLocalDate(maxDate),
    [maxDate]
  );

  const validateCurrentStep = (targetStep: WizardStep): boolean => {
    setStepErrors({});
    if (targetStep === 1) {
      const parsed = eventStep1Schema.safeParse({
        type: draft.type,
        name: draft.name,
        hostName: draft.hostName,
        date: draft.date,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 2) {
      const parsed = eventStep2Schema.safeParse({
        coverKey: draft.coverKey,
        coverUrl: draft.coverUrl,
        story: draft.story,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 3) {
      const parsed = eventStep3Schema.safeParse({
        visibility: draft.visibility,
        accessCode: draft.accessCode,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 4) {
      const parsed = eventStep4Schema.safeParse({
        registryItems: draft.registryItems,
      });
      if (!parsed.success) {
        setStepErrors({ registry: parsed.error.issues[0]?.message ?? "Invalid registry items" });
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep(step)) return;
    trackEvent("wizard_step_completed", {
      step,
      eventType: draft.type,
      registryCount: draft.registryItems.length,
    });
    if (step < 5) {
      setStep((step + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    setStepErrors({});
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setStepErrors({});

    try {
      const contentType = (file.type || "image/jpeg") as AllowedMediaMimeType;
      const presigned = await presignMutation.mutateAsync({
        fileName: file.name,
        contentType,
        mime: contentType,
        sizeBytes: file.size,
        purpose: "EVENT_COVER",
      });

      await uploadFileToPresignedUrl(presigned, file, (pct) =>
        setUploadProgress(pct)
      );

      const previewUrl =
        presigned.publicUrl ?? presigned.url ?? URL.createObjectURL(file);
      updateDraft({
        coverKey: presigned.key,
        coverUrl: previewUrl,
      });
      toast.success(
        contentType.startsWith("video/")
          ? "Cover video uploaded"
          : "Cover image uploaded"
      );
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not upload cover media. Please try again.";
      setStepErrors({ cover: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddRegistryItem = () => {
    setStepErrors({});
    const isAirtimeOrData = /\b(airtime|data|vtu|bundle|mtn|airtel|glo|9mobile)\b/i.test(
      newItemTitle
    );
    const resolvedPrice =
      newItemPrice.trim() === "" ? 0 : Number(newItemPrice.trim());

    const parsed = wizardRegistryItemSchema.safeParse({
      id: crypto.randomUUID(),
      category: isAirtimeOrData ? "AIRTIME_DATA" : "CUSTOM",
      title: newItemTitle,
      targetPriceNaira: resolvedPrice,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "registry");
        if (!errs[key]) errs[key] = issue.message;
      }
      setStepErrors(errs);
      return;
    }

    addRegistryItem(parsed.data);
    trackEvent("wizard_registry_preset_added", {
      title: parsed.data.title,
      targetPriceNaira: parsed.data.targetPriceNaira,
      category: parsed.data.category ?? "CUSTOM",
      source: "custom",
    });
    setNewItemTitle("");
    setNewItemPrice("");
  };

  const handleAddPresetItem = (
    title: string,
    targetPriceNaira: number,
    category: "AIRTIME_DATA" | "CASH_FUND" | "CUSTOM" = "CASH_FUND"
  ) => {
    if (draft.registryItems.length >= 50) return;
    if (draft.registryItems.some((item) => item.title === title)) {
      toast.info(`"${title}" is already in your registry`);
      return;
    }
    setStepErrors({});
    addRegistryItem({
      id: crypto.randomUUID(),
      category,
      title,
      targetPriceNaira,
    });
    trackEvent("wizard_registry_preset_added", {
      title,
      targetPriceNaira,
      category,
      source: "preset",
    });
  };

  const handleAddCatalogProduct = (
    product: CatalogProduct,
    matchReason: string
  ) => {
    if (draft.registryItems.length >= 50) return;
    const normalizedTitle = product.name.trim().slice(0, 80);
    if (
      draft.registryItems.some(
        (item) =>
          item.productId === product.id || item.title === normalizedTitle
      )
    ) {
      toast.info(`"${normalizedTitle}" is already in your registry`);
      return;
    }
    const isDigitalOrVtu =
      Boolean(product.isDigital) ||
      /\b(airtime|data|vtu)\b/i.test(`${product.name} ${product.category}`);
    const targetPriceNaira = isDigitalOrVtu
      ? 0
      : Math.max(
        500,
        Math.min(5_000_000, Math.round(product.priceKobo / 100))
      );
    setStepErrors({});
    addRegistryItem({
      id: crypto.randomUUID(),
      productId: product.id,
      category: isDigitalOrVtu ? "AIRTIME_DATA" : "CATALOG",
      title: normalizedTitle,
      targetPriceNaira,
    });
    trackEvent("wizard_registry_preset_added", {
      productId: product.id,
      title: normalizedTitle,
      targetPriceNaira,
      matchReason,
      source: "catalog_intelligent",
    });
  };

  const handlePublish = async () => {
    for (const s of [1, 2, 3, 4] as const) {
      if (!validateCurrentStep(s)) {
        setStep(s);
        return;
      }
    }

    if (!isAuthed) {
      toast.info("Please sign in or create an account to publish your celebration.");
      router.push("/login?next=/events/new");
      return;
    }

    setStepErrors({});
    try {
      const resolvedHostName = draft.hostName.trim() || creatorDefaultHost;
      if (
        draft.hostName.trim() &&
        draft.hostName.trim().toLowerCase() !==
        creatorDefaultHost.toLowerCase()
      ) {
        setStoredPastHosts(savePastHost(draft.hostName.trim()));
      }

      const published = await publishMutation.mutateAsync({
        type: draft.type,
        name: draft.name.trim(),
        slug: previewSlug,
        hostName: resolvedHostName,
        date: draft.date,
        coverKey: draft.coverKey,
        coverUrl:
          draft.coverUrl && !draft.coverUrl.startsWith("blob:")
            ? draft.coverUrl
            : undefined,
        story: draft.story.trim() || undefined,
        visibility: draft.visibility,
        accessCode:
          draft.visibility === "PRIVATE" ? draft.accessCode.trim() : undefined,
        registryItems: draft.registryItems.map((item) => ({
          productId: item.productId,
          title: item.title,
          priceKobo: nairaToKobo(item.targetPriceNaira),
        })),
      });

      trackEvent("event_published", {
        eventId: published.id,
        slug: published.slug,
        eventType: published.type,
        visibility: published.visibility,
        registryCount: draft.registryItems.length,
      });
      clearWizard();
      setPublishedEvent(published);
      toast.success("Event published");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not publish event. Check your connection and try again.";
      setStepErrors({ publish: message });
    }
  };

  const payoutVerified = payoutQuery.data?.status === "VERIFIED";
  const storyTemplates = STORY_TEMPLATES_BY_TYPE[draft.type] ?? STORY_TEMPLATES_BY_TYPE.OTHER;

  if (publishedEvent) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/e/${publishedEvent.slug}`;

    return (
      <div className="space-y-6" aria-live="polite">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-success">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Your event is live</CardTitle>
            <CardDescription>
              Share your link on WhatsApp with family and friends so they can
              RSVP, post blessings, and send gifts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!payoutVerified && !publishedEvent.moneyGiftsEnabled ? (
              <div className="flex flex-col justify-between gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-2.5 text-sm">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Money gifts are currently off
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Verify your Nigerian bank account (takes 30 seconds) so
                      guests can send cash blessings directly to your purse.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/account/payout">Save payout details</Link>
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Public event link
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                    {publicUrl}
                  </p>
                </div>
                <ShareMenu url={publicUrl} title={publishedEvent.name} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="default">
                    <Link href={`/e/${publishedEvent.slug}`}>
                      View public page
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/events/${publishedEvent.id}`}>
                      Manage event
                    </Link>
                  </Button>
                </div>
              </div>
              <QrCard url={publicUrl} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator
        steps={WIZARD_STEPS}
        currentStep={step}
        onSelectStep={(s) => setStep(s as WizardStep)}
      />

      {/* Live Ownership Preview & Auto-Save Assurance (Endowment + Loss Aversion) */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {EVENT_TYPE_LABELS[draft.type]}
            </span>
            <p className="truncate font-heading text-sm font-semibold text-foreground">
              {draft.name.trim() || "Your Celebration Title"}
            </p>
            {draft.date ? (
              <span className="text-xs text-muted-foreground">
                • {formatDate(draft.date)}
              </span>
            ) : null}
          </div>
          <p className="break-all font-mono text-[11px] text-muted-foreground">
            Link preview:{" "}
            <span className="font-medium text-foreground">
              givvly.store/e/{previewSlug}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Draft auto-saved on this device</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Event details"}
            {step === 2 && "Cover photo and story"}
            {step === 3 && "Visibility and access"}
            {step === 4 && "Gift registry (optional)"}
            {step === 5 && "Review and publish"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Choose the occasion, celebration title, and date. You can edit everything later."}
            {step === 2 && "Add a cover photo or pick a 1-tap story starter to welcome your guests."}
            {step === 3 && "Choose whether anyone with your link can view or require a private guest code."}
            {step === 4 && "Share what you would love to receive (Airtime, Data, catalog gifts, or cash funds)—guests can still gift you anything even if you skip this."}
            {step === 5 && "Confirm everything looks right before publishing your celebration link."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateDraft({ type: t })}
                      aria-pressed={draft.type === t}
                      className={`min-h-11 rounded-control border px-3 py-2 text-left text-sm font-medium transition-colors ${draft.type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                    >
                      {EVENT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {stepErrors.type ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.type}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-name">Event name</Label>
                <Input
                  id="wizard-event-name"
                  placeholder="e.g. Adaobi & Chidi's Forever 2026"
                  enterKeyHint="next"
                  value={draft.name}
                  maxLength={80}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
                {stepErrors.name ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/25 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Label htmlFor="wizard-host-name" className="text-xs font-semibold">
                    Hosted by / Celebrant
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Defaults to{" "}
                    <strong className="font-semibold text-foreground">
                      {creatorDefaultHost}
                    </strong>{" "}
                    (You)
                  </span>
                </div>

                {/* 1-Tap Host Chips: Creator (Default) + Past Hosts Created For */}
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  role="group"
                  aria-label="Choose event host or reuse a past host"
                >
                  <button
                    type="button"
                    onClick={() => updateDraft({ hostName: "" })}
                    aria-pressed={
                      !draft.hostName.trim() ||
                      draft.hostName.trim().toLowerCase() ===
                      creatorDefaultHost.toLowerCase()
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${!draft.hostName.trim() ||
                      draft.hostName.trim().toLowerCase() ===
                      creatorDefaultHost.toLowerCase()
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                  >
                    {creatorDefaultHost} (You • Default)
                  </button>

                  {pastHostSuggestions.map((pastHost) => {
                    const isSelected =
                      draft.hostName.trim().toLowerCase() ===
                      pastHost.toLowerCase();
                    return (
                      <button
                        key={pastHost}
                        type="button"
                        onClick={() => updateDraft({ hostName: pastHost })}
                        aria-pressed={isSelected}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                          }`}
                      >
                        {pastHost}
                      </button>
                    );
                  })}
                </div>

                <Input
                  id="wizard-host-name"
                  placeholder={`Default: ${creatorDefaultHost} — or enter another host (e.g. Chidi & Amaka, Mum & Dad)`}
                  enterKeyHint="next"
                  value={draft.hostName}
                  maxLength={80}
                  onChange={(e) => updateDraft({ hostName: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Creating for a client, couple, or family member? Tap a host you created for in the past above or type a new name.
                </p>
                {stepErrors.hostName ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.hostName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="wizard-event-date">Event date</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "next_saturday", label: "Next Saturday" },
                        { id: "one_month", label: "In 1 Month" },
                        { id: "three_months", label: "In 3 Months" },
                      ] as const
                    ).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          const nextDate = computeQuickDate(chip.id);
                          updateDraft({ date: nextDate });
                          trackEvent("wizard_quick_date_selected", {
                            preset: chip.id,
                            date: nextDate,
                          });
                        }}
                        className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="wizard-event-date"
                      type="button"
                      variant="outline"
                      aria-expanded={datePickerOpen}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !draft.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon
                        className="mr-2 h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      {draft.date ? (
                        <span>{formatDate(draft.date, "EEEE, d MMMM yyyy")}</span>
                      ) : (
                        <span>Pick an event date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDateObj}
                      defaultMonth={selectedDateObj ?? minDateObj}
                      onSelect={(day) => {
                        if (!day) return;
                        updateDraft({ date: formatLocalDateToYmd(day) });
                        setDatePickerOpen(false);
                      }}
                      disabled={(day) => {
                        const dayStr = formatLocalDateToYmd(day);
                        return dayStr < minDate || dayStr > maxDate;
                      }}
                      startMonth={minDateObj}
                      endMonth={maxDateObj}
                    />
                  </PopoverContent>
                </Popover>
                {stepErrors.date ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.date}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cover image (optional)</Label>
                <FileDropzone
                  previewUrl={draft.coverUrl}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  onSelectFile={handleFileUpload}
                  onRemove={() =>
                    updateDraft({ coverKey: undefined, coverUrl: undefined })
                  }
                />
                {stepErrors.cover ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.cover}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wizard-event-story">Our story (optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {draft.story.length}/1500
                  </span>
                </div>

                {/* 1-Tap Nigerian Ceremony Story Starters (Reciprocity + Friction Reduction) */}
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Need inspiration? Tap a starter note and make it yours:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {storyTemplates.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => {
                          updateDraft({ story: tpl.text });
                          trackEvent("wizard_story_template_applied", {
                            eventType: draft.type,
                            templateLabel: tpl.label,
                          });
                        }}
                        className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        + {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  id="wizard-event-story"
                  maxLength={1500}
                  rows={5}
                  placeholder="Share how you met, what you're celebrating, or a warm welcome note for family and friends..."
                  value={draft.story}
                  onChange={(e) => updateDraft({ story: e.target.value })}
                />
                {stepErrors.story ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.story}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateDraft({ visibility: "PUBLIC" })}
                  aria-pressed={draft.visibility === "PUBLIC"}
                  className={`rounded-card border p-4 text-left transition-colors ${draft.visibility === "PUBLIC"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-heading text-base font-semibold text-foreground">
                      Public
                    </p>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Recommended for WhatsApp
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Anyone with your link can view your event page, RSVP, and send gifts immediately.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateDraft({
                      visibility: "PRIVATE",
                      accessCode:
                        draft.accessCode || generateAccessCodeSuggestion(8),
                    })
                  }
                  aria-pressed={draft.visibility === "PRIVATE"}
                  className={`rounded-card border p-4 text-left transition-colors ${draft.visibility === "PRIVATE"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted"
                    }`}
                >
                  <p className="font-heading text-base font-semibold text-foreground">
                    Private with access code
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Guests must enter a 6 to 12 character code before viewing.
                  </p>
                </button>
              </div>

              {draft.visibility === "PRIVATE" ? (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="wizard-access-code">Access code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wizard-access-code"
                      value={draft.accessCode}
                      maxLength={12}
                      spellCheck={false}
                      autoCapitalize="characters"
                      onChange={(e) =>
                        updateDraft({
                          accessCode: e.target.value.replace(/[^A-Za-z0-9]/g, ""),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateDraft({
                          accessCode: generateAccessCodeSuggestion(8),
                        })
                      }
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Suggest</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    6 to 12 letters and numbers. Share this code with your invited guests.
                  </p>
                  {stepErrors.accessCode ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.accessCode}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {/* Reassurance Banner: Registry is a wishlist, not a restriction */}
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Your registry is a wishlist, not a restriction
                </p>
                <p className="mt-0.5 leading-relaxed">
                  Whether you add items below or skip this step, guests can
                  always gift you <strong>Cash</strong>,{" "}
                  <strong>Airtime &amp; Data</strong>, or{" "}
                  <strong>any gift from the Givvly Catalog</strong>. Adding
                  items simply lets guests know what you would love most.
                </p>
              </div>

              {/* 1-Tap Airtime, Data & Open Gift Wishes (No amount, bundle, or quantity required) */}
              <div className="space-y-2.5 rounded-xl border border-accent/45 bg-accent/10 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Airtime, Data &amp; Open Gift Wishes (no amount or bundle
                    needed):
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Let guests know you welcome airtime, mobile data, or a
                    surprise gift—they pick the network, bundle, or amount when
                    gifting.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FLEXIBLE_GIFT_PREFERENCES.map((pref) => {
                    const alreadyAdded = draft.registryItems.some(
                      (i) => i.title.toLowerCase() === pref.title.toLowerCase()
                    );
                    return (
                      <button
                        key={pref.title}
                        type="button"
                        disabled={
                          alreadyAdded || draft.registryItems.length >= 50
                        }
                        onClick={() =>
                          handleAddPresetItem(pref.title, 0, pref.category)
                        }
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="block truncate font-semibold text-foreground">
                            {pref.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {pref.subtitle}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                          {alreadyAdded ? "Added ✓" : "+ Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intelligent Backend Catalog Recommendations (tailored by Event type, Name, Date & Story) */}
              <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold text-foreground">
                      Tailored catalog gifts for your celebration (1 tap):
                    </p>
                  </div>
                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Live from Givvly Catalog
                  </span>
                </div>

                {activeSignals.length > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    aria-label="Personalization signals"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      Matched using:
                    </span>
                    {activeSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : null}

                {catalogQuery.isLoading ? (
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    aria-busy="true"
                    aria-label="Loading tailored catalog suggestions"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-16 animate-pulse rounded-lg border border-border/60 bg-card/60 p-3"
                      />
                    ))}
                  </div>
                ) : intelligentProducts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {intelligentProducts.map(({ product, matchReason }) => {
                      const normalizedTitle = product.name.trim().slice(0, 80);
                      const isDigitalOrVtu =
                        Boolean(product.isDigital) ||
                        /\b(airtime|data|vtu)\b/i.test(
                          `${product.name} ${product.category}`
                        );
                      const alreadyAdded = draft.registryItems.some(
                        (i) =>
                          i.productId === product.id ||
                          i.title === normalizedTitle
                      );
                      return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={
                            alreadyAdded || draft.registryItems.length >= 50
                          }
                          onClick={() =>
                            handleAddCatalogProduct(product, matchReason)
                          }
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block truncate font-semibold text-foreground">
                              {product.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {isDigitalOrVtu ? (
                                "Flexible • Guest chooses bundle/amount"
                              ) : (
                                <>
                                  <Money amountKobo={product.priceKobo} /> •{" "}
                                  {product.category}
                                </>
                              )}
                            </span>
                            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {matchReason}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                            {alreadyAdded ? "Added ✓" : "+ Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* 1-Tap Group Cash Fund Presets */}
                <div className="border-t border-border/60 pt-2.5">
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                    Or quick-add a group cash fund pool:
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {POPULAR_REGISTRY_PRESETS.map((preset) => {
                      const alreadyAdded = draft.registryItems.some(
                        (i) => i.title === preset.title
                      );
                      return (
                        <button
                          key={preset.title}
                          type="button"
                          disabled={
                            alreadyAdded || draft.registryItems.length >= 50
                          }
                          onClick={() =>
                            handleAddPresetItem(
                              preset.title,
                              preset.targetPriceNaira,
                              "CASH_FUND"
                            )
                          }
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {preset.title}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              <Money
                                amountKobo={nairaToKobo(
                                  preset.targetPriceNaira
                                )}
                              />{" "}
                              • {preset.tag}
                            </span>
                          </div>
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {alreadyAdded ? "Added ✓" : "+ Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor="registry-item-title">
                    Gift wish or item title
                  </Label>
                  <Input
                    id="registry-item-title"
                    placeholder="e.g. Airtime, MTN Data, Deep Freezer, or Honeymoon"
                    value={newItemTitle}
                    maxLength={80}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                  />
                  {stepErrors.title ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.title}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="registry-item-price">
                    Target price (₦, optional)
                  </Label>
                  <Input
                    id="registry-item-price"
                    inputMode="numeric"
                    placeholder="Leave blank if guest chooses"
                    value={newItemPrice}
                    onChange={(e) =>
                      setNewItemPrice(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  {stepErrors.targetPriceNaira ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.targetPriceNaira}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={draft.registryItems.length >= 50}
                    onClick={handleAddRegistryItem}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {draft.registryItems.length > 0 ? (
                <ul className="divide-y divide-border rounded-card border border-border">
                  {draft.registryItems.map((item) => {
                    const isAirtimeOrData =
                      item.category === "AIRTIME_DATA" ||
                      /\b(airtime|data)\b/i.test(item.title);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium text-foreground">
                              {item.title}
                            </p>
                            {isAirtimeOrData ? (
                              <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                Airtime &amp; Data
                              </span>
                            ) : item.productId ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                Catalog Gift
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.targetPriceNaira > 0 ? (
                              <Money
                                amountKobo={nairaToKobo(item.targetPriceNaira)}
                              />
                            ) : (
                              "Flexible • Guest chooses amount or bundle"
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${item.title}`}
                          onClick={() => removeRegistryItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No registry wishes added yet. Even if you leave this empty,
                  guests can still gift you Cash, Airtime &amp; Data, or any
                  item from the Givvly Catalog.
                </p>
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              {stepErrors.publish ? (
                <div
                  role="alert"
                  className="rounded-control border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {stepErrors.publish}
                </div>
              ) : null}

              <dl className="divide-y divide-border rounded-card border border-border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-foreground">
                    {EVENT_TYPE_LABELS[draft.type]}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Event name</dt>
                  <dd className="font-medium text-foreground">{draft.name}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Public link</dt>
                  <dd className="break-all font-mono text-xs font-medium text-foreground text-right">
                    givvly.store/e/{previewSlug}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Hosted by</dt>
                  <dd className="font-medium text-foreground">
                    {effectiveHostName}
                    {!draft.hostName.trim() ||
                      draft.hostName.trim().toLowerCase() ===
                      creatorDefaultHost.toLowerCase()
                      ? " (You)"
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium text-foreground">
                    {draft.date ? formatDate(draft.date) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Visibility</dt>
                  <dd className="font-medium text-foreground">
                    {draft.visibility === "PRIVATE"
                      ? `Private (Code: ${draft.accessCode})`
                      : "Public"}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Registry items</dt>
                  <dd className="font-medium text-foreground">
                    {draft.registryItems.length > 0
                      ? `${draft.registryItems.length} (${draft.registryItems.length === 1 ? "wish" : "wishes"} + open gifting)`
                      : "Open gifting (Cash, Airtime/Data & Catalog)"}
                  </dd>
                </div>
                {isAuthed ? (
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Payout status</dt>
                    <dd className="flex items-center gap-2">
                      <StatusBadge
                        status={payoutQuery.data?.status ?? "NOT_SET"}
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>

              {!isAuthed ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Sign in or create an account to publish
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        All your celebration details, date, and registry wishlist are saved on this device. Sign in or create a free account so your guests can RSVP, send gifts, and write on your Wall of Love.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pl-12">
                    <Button asChild size="sm" className="font-semibold text-xs">
                      <Link href="/login?next=/events/new">
                        Sign In &amp; Publish
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <Link href="/signup?next=/events/new">
                        Create Free Account
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : !payoutVerified ? (
                <div className="flex flex-col justify-between gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <span>
                      Payout details are not verified yet. You can publish now
                      to start collecting RSVPs and wishes, and money gifts will
                      turn on automatically once you verify your bank account.
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/account/payout">Save payout details</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isUploading}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>{isAuthed ? "Publish event" : "Sign In to Publish"}</span>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

