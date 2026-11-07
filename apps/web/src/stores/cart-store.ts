import { create } from "zustand";

export const CART_STORAGE_KEY = "givvly.cart.v1";
const CART_STORAGE_VERSION = 1;

export type DirectGiftDraft = {
  productSlug: string;
  buyerEmail?: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  area: string;
  city: string;
  state: string;
  giftNote: string;
  wrapping: boolean;
  idempotencyKey: string;
};

type PersistedCartPayload = {
  version: number;
  draft: DirectGiftDraft;
};

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem_cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultCartDraft(productSlug = ""): DirectGiftDraft {
  return {
    productSlug,
    buyerEmail: "",
    recipientName: "",
    recipientPhone: "",
    street: "",
    area: "",
    city: "Lagos",
    state: "Lagos",
    giftNote: "",
    wrapping: false,
    idempotencyKey: generateIdempotencyKey(),
  };
}

function readCartStorage(expectedSlug?: string): DirectGiftDraft {
  const fallback = createDefaultCartDraft(expectedSlug ?? "");

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedCartPayload> | null;
    if (
      !parsed ||
      parsed.version !== CART_STORAGE_VERSION ||
      !parsed.draft ||
      typeof parsed.draft !== "object"
    ) {
      window.sessionStorage.removeItem(CART_STORAGE_KEY);
      return fallback;
    }

    if (
      expectedSlug &&
      parsed.draft.productSlug &&
      parsed.draft.productSlug !== expectedSlug
    ) {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed.draft,
      productSlug: expectedSlug || parsed.draft.productSlug || "",
      idempotencyKey: parsed.draft.idempotencyKey || generateIdempotencyKey(),
    };
  } catch {
    try {
      window.sessionStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    return fallback;
  }
}

function writeCartStorage(draft: DirectGiftDraft): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedCartPayload = {
      version: CART_STORAGE_VERSION,
      draft,
    };
    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export type CartStoreState = {
  draft: DirectGiftDraft;
  hydrateForProduct: (productSlug: string) => void;
  updateDraft: (patch: Partial<DirectGiftDraft>) => void;
  clearCart: (productSlug?: string) => void;
};

export const useCartStore = create<CartStoreState>((set, get) => ({
  draft: createDefaultCartDraft(),

  hydrateForProduct: (productSlug) => {
    const loaded = readCartStorage(productSlug);
    writeCartStorage(loaded);
    set({ draft: loaded });
  },

  updateDraft: (patch) => {
    const nextDraft = {
      ...get().draft,
      ...patch,
    };
    writeCartStorage(nextDraft);
    set({ draft: nextDraft });
  },

  clearCart: (productSlug = "") => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    set({ draft: createDefaultCartDraft(productSlug) });
  },
}));
