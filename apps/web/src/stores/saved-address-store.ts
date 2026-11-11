import { create } from "zustand";
import type { SavedAddress } from "@givvly/contracts";

export const SAVED_ADDRESSES_STORAGE_KEY = "givvly.saved_addresses.v1";

export type NewSavedAddressInput = Omit<SavedAddress, "id" | "createdAt"> & {
  id?: string;
};

export type SavedAddressStore = {
  addresses: SavedAddress[];
  selectedId: string | null;
  addAddress: (input: NewSavedAddressInput) => SavedAddress;
  updateAddress: (id: string, updates: Partial<Omit<SavedAddress, "id" | "createdAt">>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  selectAddress: (id: string | null) => void;
  importFromPastOrders: (
    orders: Array<{
      recipientName?: string;
      recipientPhone?: string;
      buyerEmail?: string;
      address?: any;
    }>
  ) => number;
  clearAddresses: () => void;
};

function readStorageAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is SavedAddress =>
          Boolean(item) &&
          typeof item.id === "string" &&
          typeof item.recipientPhone === "string" &&
          typeof item.street === "string"
      );
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function writeStorageAddresses(addresses: SavedAddress[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SAVED_ADDRESSES_STORAGE_KEY,
      JSON.stringify(addresses)
    );
  } catch {
    // Ignore storage write errors
  }
}

function generateAddressId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `addr_${crypto.randomUUID()}`;
  }
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useSavedAddressStore = create<SavedAddressStore>((set, get) => ({
  addresses: readStorageAddresses(),
  selectedId: null,

  addAddress: (input) => {
    const state = get();
    const id = input.id || generateAddressId();
    const isFirst = state.addresses.length === 0;
    const shouldBeDefault = input.isDefault ?? isFirst;

    const newAddress: SavedAddress = {
      id,
      label: input.label?.trim() || undefined,
      recipientName: input.recipientName.trim(),
      recipientPhone: input.recipientPhone.trim(),
      buyerEmail: input.buyerEmail?.trim() || undefined,
      street: input.street.trim(),
      area: input.area.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      isDefault: shouldBeDefault,
      createdAt: new Date().toISOString(),
    };

    const nextAddresses = shouldBeDefault
      ? [
          newAddress,
          ...state.addresses.map((a) => (a.isDefault ? { ...a, isDefault: false } : a)),
        ]
      : [newAddress, ...state.addresses];

    writeStorageAddresses(nextAddresses);
    set({ addresses: nextAddresses, selectedId: id });
    return newAddress;
  },

  updateAddress: (id, updates) => {
    const state = get();
    const nextAddresses = state.addresses.map((a) => {
      if (a.id !== id) {
        if (updates.isDefault) {
          return { ...a, isDefault: false };
        }
        return a;
      }
      return {
        ...a,
        ...updates,
        label: updates.label !== undefined ? updates.label.trim() || undefined : a.label,
        recipientName: updates.recipientName !== undefined ? updates.recipientName.trim() : a.recipientName,
        recipientPhone: updates.recipientPhone !== undefined ? updates.recipientPhone.trim() : a.recipientPhone,
        buyerEmail: updates.buyerEmail !== undefined ? updates.buyerEmail.trim() || undefined : a.buyerEmail,
        street: updates.street !== undefined ? updates.street.trim() : a.street,
        area: updates.area !== undefined ? updates.area.trim() : a.area,
        city: updates.city !== undefined ? updates.city.trim() : a.city,
        state: updates.state !== undefined ? updates.state.trim() : a.state,
      };
    });

    writeStorageAddresses(nextAddresses);
    set({ addresses: nextAddresses });
  },

  deleteAddress: (id) => {
    const state = get();
    const filtered = state.addresses.filter((a) => a.id !== id);
    const wasDefault = state.addresses.find((a) => a.id === id)?.isDefault;

    let nextAddresses = filtered;
    if (wasDefault && filtered.length > 0) {
      nextAddresses = filtered.map((a, idx) => (idx === 0 ? { ...a, isDefault: true } : a));
    }

    writeStorageAddresses(nextAddresses);
    set({
      addresses: nextAddresses,
      selectedId: state.selectedId === id ? null : state.selectedId,
    });
  },

  setDefaultAddress: (id) => {
    const state = get();
    const nextAddresses = state.addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    writeStorageAddresses(nextAddresses);
    set({ addresses: nextAddresses });
  },

  selectAddress: (id) => {
    set({ selectedId: id });
  },

  importFromPastOrders: (orders) => {
    const state = get();
    const existing = new Set(
      state.addresses.map(
        (a) => `${a.recipientPhone.toLowerCase()}__${a.street.toLowerCase()}`
      )
    );

    const newlyImported: SavedAddress[] = [];

    for (const order of orders) {
      if (!order.recipientPhone) continue;
      const addr = order.address;
      if (!addr || typeof addr !== "object" || !addr.street) continue;

      const key = `${order.recipientPhone.toLowerCase()}__${String(addr.street).toLowerCase()}`;
      if (existing.has(key)) continue;
      existing.add(key);

      const label =
        order.recipientName && order.recipientName !== order.recipientPhone
          ? `${order.recipientName} (${addr.area || addr.city || "Delivery"})`
          : `${addr.area || addr.city || "Delivery"}`;

      newlyImported.push({
        id: generateAddressId(),
        label,
        recipientName: (order.recipientName || "").trim() || "Recipient",
        recipientPhone: (order.recipientPhone || "").trim(),
        buyerEmail: order.buyerEmail?.trim() || undefined,
        street: String(addr.street).trim(),
        area: String(addr.area || "").trim() || "City Center",
        city: String(addr.city || "Lagos").trim(),
        state: String(addr.state || "Lagos").trim(),
        isDefault: state.addresses.length === 0 && newlyImported.length === 0,
        createdAt: new Date().toISOString(),
      });
    }

    if (newlyImported.length > 0) {
      const merged = [...state.addresses, ...newlyImported];
      writeStorageAddresses(merged);
      set({ addresses: merged });
    }

    return newlyImported.length;
  },

  clearAddresses: () => {
    writeStorageAddresses([]);
    set({ addresses: [], selectedId: null });
  },
}));
