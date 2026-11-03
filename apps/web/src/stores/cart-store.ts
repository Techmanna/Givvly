import { create } from "zustand";
import {
  BOX_PACKAGING_OPTIONS,
  type BoxPackagingOption,
  type CatalogProduct,
} from "@givvly/contracts";

export const CART_STORAGE_KEY = "givvly.cart.v1";
export const BOX_STORAGE_KEY = "givvly.cart.box.v1";
const CART_STORAGE_VERSION = 1;

export type DirectGiftDraft = {
  productSlug: string;
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

export type GiftBoxCartItem = {
  product: CatalogProduct;
  quantity: number;
};

export type GiftBoxPayload = {
  items: GiftBoxCartItem[];
  packagingId: string;
  giftCardMessage: string;
  giftCardRecipient: string;
  comboTitle?: string;
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

function readBoxStorage(): GiftBoxPayload {
  const fallback: GiftBoxPayload = {
    items: [],
    packagingId: "blush-gold",
    giftCardMessage: "",
    giftCardRecipient: "",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(BOX_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GiftBoxPayload> | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      window.sessionStorage.removeItem(BOX_STORAGE_KEY);
      return fallback;
    }
    return {
      items: parsed.items,
      packagingId: parsed.packagingId || "blush-gold",
      giftCardMessage: parsed.giftCardMessage || "",
      giftCardRecipient: parsed.giftCardRecipient || "",
      comboTitle: parsed.comboTitle,
    };
  } catch {
    return fallback;
  }
}

function writeBoxStorage(payload: GiftBoxPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BOX_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export type CartStoreState = {
  // Single product direct checkout draft (backward compatible)
  draft: DirectGiftDraft;
  hydrateForProduct: (productSlug: string) => void;
  updateDraft: (patch: Partial<DirectGiftDraft>) => void;
  clearCart: (productSlug?: string) => void;

  // Multi-item Gift Box / Curated Combo Cart
  box: GiftBoxPayload;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addToBox: (product: CatalogProduct, quantity?: number) => void;
  removeFromBox: (productId: string) => void;
  updateBoxItemQty: (productId: string, quantity: number) => void;
  setBoxPackaging: (packagingId: string) => void;
  setGiftCard: (message: string, recipient?: string) => void;
  setComboTitle: (title?: string) => void;
  clearBox: () => void;
  loadPredefinedCombo: (comboProduct: CatalogProduct) => void;
  getBoxItemCount: () => number;
  getItemsSubtotalKobo: () => number;
  getPackagingOption: () => BoxPackagingOption;
  getTotalKobo: () => number;
};

export const useCartStore = create<CartStoreState>((set, get) => ({
  draft: createDefaultCartDraft(),
  box: typeof window !== "undefined" ? readBoxStorage() : {
    items: [],
    packagingId: "blush-gold",
    giftCardMessage: "",
    giftCardRecipient: "",
  },
  isDrawerOpen: false,

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

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  addToBox: (product, quantity = 1) => {
    const currentBox = get().box;
    const existingIndex = currentBox.items.findIndex(
      (item) => item.product.id === product.id
    );

    let nextItems: GiftBoxCartItem[];
    if (existingIndex >= 0) {
      nextItems = currentBox.items.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      nextItems = [...currentBox.items, { product, quantity }];
    }

    const nextBox: GiftBoxPayload = {
      ...currentBox,
      items: nextItems,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox, isDrawerOpen: true });
  },

  removeFromBox: (productId) => {
    const currentBox = get().box;
    const nextItems = currentBox.items.filter(
      (item) => item.product.id !== productId
    );
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      items: nextItems,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox });
  },

  updateBoxItemQty: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromBox(productId);
      return;
    }
    const currentBox = get().box;
    const nextItems = currentBox.items.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      items: nextItems,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox });
  },

  setBoxPackaging: (packagingId) => {
    const currentBox = get().box;
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      packagingId,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox });
  },

  setGiftCard: (message, recipient = "") => {
    const currentBox = get().box;
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      giftCardMessage: message,
      giftCardRecipient: recipient,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox });
  },

  setComboTitle: (title) => {
    const currentBox = get().box;
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      comboTitle: title,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox });
  },

  clearBox: () => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(BOX_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    const emptyBox: GiftBoxPayload = {
      items: [],
      packagingId: "blush-gold",
      giftCardMessage: "",
      giftCardRecipient: "",
      comboTitle: undefined,
    };
    set({ box: emptyBox });
  },

  loadPredefinedCombo: (comboProduct) => {
    // Adds predefined combo product as a single curated pack in the box with custom title
    const currentBox = get().box;
    const nextBox: GiftBoxPayload = {
      ...currentBox,
      items: [{ product: comboProduct, quantity: 1 }],
      comboTitle: comboProduct.name,
      giftCardMessage: `Celebrating you with the ${comboProduct.name}!`,
    };
    writeBoxStorage(nextBox);
    set({ box: nextBox, isDrawerOpen: true });
  },

  getBoxItemCount: () => {
    return get().box.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getItemsSubtotalKobo: () => {
    return get().box.items.reduce(
      (sum, item) => sum + item.product.priceKobo * item.quantity,
      0
    );
  },

  getPackagingOption: () => {
    const pkgId = get().box.packagingId;
    return (
      BOX_PACKAGING_OPTIONS.find((opt) => opt.id === pkgId) ??
      BOX_PACKAGING_OPTIONS[0]!
    );
  },

  getTotalKobo: () => {
    const subtotal = get().getItemsSubtotalKobo();
    if (subtotal === 0) return 0;
    const packagingExtra = get().getPackagingOption().extraKobo;
    return subtotal + packagingExtra;
  },
}));
