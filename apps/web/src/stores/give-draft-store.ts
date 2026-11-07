import { create } from "zustand";
import type { GiftType } from "@givvly/contracts";

export const GIVE_DRAFT_STORAGE_KEY = "givvly.give.v1";
const GIVE_DRAFT_STORAGE_VERSION = 1;

export type GiveDraft = {
  eventSlug: string;
  type: GiftType;
  amountKobo: number;
  name: string;
  message: string;
  anonymous: boolean;
  email: string;
  idempotencyKey: string;
};

type PersistedGiveDraftPayload = {
  version: number;
  draft: GiveDraft;
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultGiveDraft(eventSlug = ""): GiveDraft {
  return {
    eventSlug,
    type: "MONEY",
    amountKobo: 1_000_000, // ₦10,000 smart social-norm default (Contrast & Anchoring)
    name: "",
    message: "",
    anonymous: false,
    email: "",
    idempotencyKey: generateIdempotencyKey(),
  };
}

function readGiveDraftStorage(expectedSlug?: string): GiveDraft {
  const fallback = createDefaultGiveDraft(expectedSlug ?? "");

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(GIVE_DRAFT_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PersistedGiveDraftPayload> | null;
    if (
      !parsed ||
      parsed.version !== GIVE_DRAFT_STORAGE_VERSION ||
      !parsed.draft ||
      typeof parsed.draft !== "object"
    ) {
      window.sessionStorage.removeItem(GIVE_DRAFT_STORAGE_KEY);
      return fallback;
    }

    if (
      expectedSlug &&
      parsed.draft.eventSlug &&
      parsed.draft.eventSlug !== expectedSlug
    ) {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed.draft,
      eventSlug: expectedSlug || parsed.draft.eventSlug || "",
      idempotencyKey: parsed.draft.idempotencyKey || generateIdempotencyKey(),
    };
  } catch {
    try {
      window.sessionStorage.removeItem(GIVE_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    return fallback;
  }
}

function writeGiveDraftStorage(draft: GiveDraft): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedGiveDraftPayload = {
      version: GIVE_DRAFT_STORAGE_VERSION,
      draft,
    };
    window.sessionStorage.setItem(
      GIVE_DRAFT_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage errors
  }
}

export type GiveDraftState = {
  draft: GiveDraft;
  hydrateForSlug: (eventSlug: string) => void;
  updateDraft: (patch: Partial<GiveDraft>) => void;
  rotateIdempotencyKey: () => string;
  clearGiveDraft: (eventSlug?: string) => void;
};

export const useGiveDraftStore = create<GiveDraftState>((set, get) => ({
  draft: createDefaultGiveDraft(),
  hydrateForSlug: (eventSlug) => {
    const loaded = readGiveDraftStorage(eventSlug);
    writeGiveDraftStorage(loaded);
    set({ draft: loaded });
  },
  updateDraft: (patch) => {
    const nextDraft: GiveDraft = {
      ...get().draft,
      ...patch,
    };
    writeGiveDraftStorage(nextDraft);
    set({ draft: nextDraft });
  },
  rotateIdempotencyKey: () => {
    const nextKey = generateIdempotencyKey();
    const nextDraft: GiveDraft = {
      ...get().draft,
      idempotencyKey: nextKey,
    };
    writeGiveDraftStorage(nextDraft);
    set({ draft: nextDraft });
    return nextKey;
  },
  clearGiveDraft: (eventSlug = "") => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(GIVE_DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    set({ draft: createDefaultGiveDraft(eventSlug) });
  },
}));

