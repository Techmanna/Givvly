import { describe, it, expect, beforeEach } from "vitest";
import {
  useSavedAddressStore,
  SAVED_ADDRESSES_STORAGE_KEY,
} from "./saved-address-store";

describe("useSavedAddressStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSavedAddressStore.getState().clearAddresses();
  });

  it("adds and persists a saved address with default setting", () => {
    const store = useSavedAddressStore.getState();
    const created = store.addAddress({
      label: "Home",
      recipientName: "David Enabulele",
      recipientPhone: "08031234567",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    });

    expect(created.id).toBeDefined();
    expect(created.label).toBe("Home");
    expect(created.isDefault).toBe(true);

    const storedRaw = window.localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();
    expect(JSON.parse(storedRaw!)).toHaveLength(1);
  });

  it("manages multiple addresses and supports switching default and deleting", () => {
    const store = useSavedAddressStore.getState();

    const addr1 = store.addAddress({
      label: "Home",
      recipientName: "David Enabulele",
      recipientPhone: "08031234567",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    });

    const addr2 = store.addAddress({
      label: "Office",
      recipientName: "David Work",
      recipientPhone: "08099887766",
      street: "Plot 5 Victoria Island",
      area: "VI",
      city: "Lagos",
      state: "Lagos",
      isDefault: true,
    });

    const current = useSavedAddressStore.getState().addresses;
    expect(current).toHaveLength(2);
    expect(current.find((a) => a.id === addr2.id)?.isDefault).toBe(true);
    expect(current.find((a) => a.id === addr1.id)?.isDefault).toBe(false);

    // Switch default back to addr1
    useSavedAddressStore.getState().setDefaultAddress(addr1.id);
    const updated = useSavedAddressStore.getState().addresses;
    expect(updated.find((a) => a.id === addr1.id)?.isDefault).toBe(true);
    expect(updated.find((a) => a.id === addr2.id)?.isDefault).toBe(false);

    // Delete addr1
    useSavedAddressStore.getState().deleteAddress(addr1.id);
    const afterDelete = useSavedAddressStore.getState().addresses;
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0]?.id).toBe(addr2.id);
    expect(afterDelete[0]?.isDefault).toBe(true); // Automatically promotes remaining address to default
  });

  it("imports unique delivery addresses from past orders history", () => {
    const store = useSavedAddressStore.getState();

    const pastOrders = [
      {
        recipientName: "Mom",
        recipientPhone: "08011223344",
        address: {
          street: "12 Airport Road",
          area: "Ikeja",
          city: "Lagos",
          state: "Lagos",
        },
      },
      {
        recipientName: "Mom Duplicate",
        recipientPhone: "08011223344",
        address: {
          street: "12 Airport Road",
          area: "Ikeja",
          city: "Lagos",
          state: "Lagos",
        },
      },
    ];

    const count = store.importFromPastOrders(pastOrders);
    expect(count).toBe(1);
    expect(useSavedAddressStore.getState().addresses).toHaveLength(1);
    expect(useSavedAddressStore.getState().addresses[0]?.street).toBe("12 Airport Road");
  });
});
