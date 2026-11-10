import { create } from "zustand";

export const BOX_STORAGE_KEY = "givvly.box.v1";
export const CART_STORAGE_KEY = "givvly.cart.v1";
const CART_STORAGE_VERSION = 1;

export type BoxItem = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  imageUrl?: string;
  vendorName?: string;
  qty: number;
  inStock?: boolean;
  isDigital?: boolean;
};

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

function readBoxStorage(): BoxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(BOX_STORAGE_KEY) ||
      window.sessionStorage.getItem(BOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (i) => i && typeof i.slug === "string" && typeof i.priceKobo === "number"
      );
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

function writeBoxStorage(items: BoxItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOX_STORAGE_KEY, JSON.stringify(items));
    window.sessionStorage.setItem(BOX_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
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
  // Box (Cart) State
  items: BoxItem[];
  isOpen: boolean;
  openBox: () => void;
  closeBox: () => void;
  toggleBox: () => void;
  addItem: (
    product: {
      id?: string;
      slug: string;
      name: string;
      priceKobo: number;
      imageUrl?: string;
      vendorName?: string;
      inStock?: boolean;
      isDigital?: boolean;
    },
    qty?: number
  ) => void;
  removeItem: (slug: string) => void;
  updateItemQty: (slug: string, qty: number) => void;
  clearBox: () => void;

  // Single Direct Gift Draft (preserved for direct /checkout/[slug])
  draft: DirectGiftDraft;
  hydrateForProduct: (productSlug: string) => void;
  updateDraft: (patch: Partial<DirectGiftDraft>) => void;
  clearCart: (productSlug?: string) => void;
};

export const useCartStore = create<CartStoreState>((set, get) => ({
  items: readBoxStorage(),
  isOpen: false,

  openBox: () => set({ isOpen: true }),
  closeBox: () => set({ isOpen: false }),
  toggleBox: () => set((state) => ({ isOpen: !state.isOpen })),

  addItem: (product, qty = 1) => {
    const currentItems = get().items;
    const existingIndex = currentItems.findIndex((i) => i.slug === product.slug);

    let nextItems: BoxItem[];
    if (existingIndex > -1) {
      nextItems = currentItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, qty: item.qty + Math.max(1, qty) }
          : item
      );
    } else {
      const newItem: BoxItem = {
        id: product.id || product.slug,
        slug: product.slug,
        name: product.name,
        priceKobo: product.priceKobo,
        imageUrl: product.imageUrl,
        vendorName: product.vendorName,
        qty: Math.max(1, qty),
        inStock: product.inStock ?? true,
        isDigital: product.isDigital,
      };
      nextItems = [...currentItems, newItem];
    }

    writeBoxStorage(nextItems);
    set({ items: nextItems });
  },

  removeItem: (idOrSlug) => {
    const nextItems = get().items.filter(
      (item) => item.slug !== idOrSlug && item.id !== idOrSlug
    );
    writeBoxStorage(nextItems);
    set({ items: nextItems });
  },

  updateItemQty: (idOrSlug, qty) => {
    if (qty <= 0) {
      get().removeItem(idOrSlug);
      return;
    }
    const nextItems = get().items.map((item) =>
      item.slug === idOrSlug || item.id === idOrSlug
        ? { ...item, qty }
        : item
    );
    writeBoxStorage(nextItems);
    set({ items: nextItems });
  },

  clearBox: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(BOX_STORAGE_KEY);
        window.sessionStorage.removeItem(BOX_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    set({ items: [] });
  },

  // Direct checkout draft implementation
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
