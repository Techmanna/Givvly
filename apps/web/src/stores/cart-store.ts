import { create } from "zustand";

export const BAG_STORAGE_KEY = "givvly.bag.v1";
export const BOX_STORAGE_KEY = "givvly.box.v1";
export const CART_STORAGE_KEY = "givvly.cart.v1";
const CART_STORAGE_VERSION = 1;

export type CuratedBoxBundleItem = {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  qty: number;
  variantId?: string;
  variantName?: string;
  imageUrl?: string;
};

export type CuratedBoxBundle = {
  boxProductId: string;
  boxSlug: string;
  boxName: string;
  boxPriceKobo: number;
  boxImageUrl?: string;
  items: CuratedBoxBundleItem[];
  giftNote?: string;
  discountKobo?: number;
};

export type BagItem = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  imageUrl?: string;
  vendorName?: string;
  qty: number;
  inStock?: boolean;
  isDigital?: boolean;
  variantId?: string;
  variantName?: string;
  curatedBox?: CuratedBoxBundle;
};

export type BoxItem = BagItem;

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

function readBagStorage(): BagItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(BAG_STORAGE_KEY) ||
      window.sessionStorage.getItem(BAG_STORAGE_KEY) ||
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

function writeBagStorage(items: BagItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(items);
    window.localStorage.setItem(BAG_STORAGE_KEY, json);
    window.sessionStorage.setItem(BAG_STORAGE_KEY, json);
    // Also write to legacy box key for transition compatibility
    window.localStorage.setItem(BOX_STORAGE_KEY, json);
    window.sessionStorage.setItem(BOX_STORAGE_KEY, json);
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
  // Bag (Shopping Cart) State
  items: BagItem[];
  isOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  toggleBag: () => void;
  clearBag: () => void;

  // Backward compatibility aliases for Box
  openBox: () => void;
  closeBox: () => void;
  toggleBox: () => void;
  clearBox: () => void;

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
      variantId?: string;
      variantName?: string;
    },
    qty?: number
  ) => void;
  addCuratedBox: (bundle: CuratedBoxBundle, totalPriceKobo: number) => void;
  removeItem: (idOrSlug: string) => void;
  updateItemQty: (idOrSlug: string, qty: number) => void;

  // Single Direct Gift Draft (preserved for direct /checkout/[slug])
  draft: DirectGiftDraft;
  hydrateForProduct: (productSlug: string) => void;
  updateDraft: (patch: Partial<DirectGiftDraft>) => void;
  clearCart: (productSlug?: string) => void;
};

export const useCartStore = create<CartStoreState>((set, get) => ({
  items: readBagStorage(),
  isOpen: false,

  openBag: () => set({ isOpen: true }),
  closeBag: () => set({ isOpen: false }),
  toggleBag: () => set((state) => ({ isOpen: !state.isOpen })),
  clearBag: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(BAG_STORAGE_KEY);
        window.sessionStorage.removeItem(BAG_STORAGE_KEY);
        window.localStorage.removeItem(BOX_STORAGE_KEY);
        window.sessionStorage.removeItem(BOX_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    set({ items: [] });
  },

  // Aliases for backward compatibility
  openBox: () => set({ isOpen: true }),
  closeBox: () => set({ isOpen: false }),
  toggleBox: () => set((state) => ({ isOpen: !state.isOpen })),
  clearBox: () => get().clearBag(),

  addItem: (product, qty = 1) => {
    const currentItems = get().items;
    const targetKey = product.variantId
      ? `${product.slug}__${product.variantId}`
      : product.slug;

    const existingIndex = currentItems.findIndex((i) => {
      const existingKey = i.variantId ? `${i.slug}__${i.variantId}` : i.slug;
      return existingKey === targetKey || (i.id && i.id === product.id);
    });

    let nextItems: BagItem[];
    if (existingIndex > -1) {
      nextItems = currentItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, qty: item.qty + Math.max(1, qty) }
          : item
      );
    } else {
      const newItem: BagItem = {
        id: product.variantId
          ? `${product.id || product.slug}__${product.variantId}`
          : product.id || product.slug,
        slug: product.slug,
        name: product.variantName
          ? `${product.name} (${product.variantName})`
          : product.name,
        priceKobo: product.priceKobo,
        imageUrl: product.imageUrl,
        vendorName: product.vendorName,
        qty: Math.max(1, qty),
        inStock: product.inStock ?? true,
        isDigital: product.isDigital,
        variantId: product.variantId,
        variantName: product.variantName,
      };
      nextItems = [...currentItems, newItem];
    }

    writeBagStorage(nextItems);
    set({ items: nextItems });
  },

  addCuratedBox: (bundle, totalPriceKobo) => {
    const currentItems = get().items;
    const uniqueKey = `curated-box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const totalInnerCount = bundle.items.reduce((sum, i) => sum + i.qty, 0);
    const newItem: BagItem = {
      id: uniqueKey,
      slug: uniqueKey,
      name: `Curated Box: ${bundle.boxName}`,
      priceKobo: totalPriceKobo,
      imageUrl: bundle.boxImageUrl,
      vendorName: `${totalInnerCount} curated item${totalInnerCount === 1 ? "" : "s"}`,
      qty: 1,
      inStock: true,
      isDigital: false,
      curatedBox: bundle,
    };
    const nextItems = [...currentItems, newItem];
    writeBagStorage(nextItems);
    set({ items: nextItems, isOpen: true });
  },

  removeItem: (idOrSlug) => {
    const nextItems = get().items.filter((item) => {
      const itemKey = item.variantId ? `${item.slug}__${item.variantId}` : item.slug;
      return item.slug !== idOrSlug && item.id !== idOrSlug && itemKey !== idOrSlug;
    });
    writeBagStorage(nextItems);
    set({ items: nextItems });
  },

  updateItemQty: (idOrSlug, qty) => {
    if (qty <= 0) {
      get().removeItem(idOrSlug);
      return;
    }
    const nextItems = get().items.map((item) => {
      const itemKey = item.variantId ? `${item.slug}__${item.variantId}` : item.slug;
      return item.slug === idOrSlug || item.id === idOrSlug || itemKey === idOrSlug
        ? { ...item, qty }
        : item;
    });
    writeBagStorage(nextItems);
    set({ items: nextItems });
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
