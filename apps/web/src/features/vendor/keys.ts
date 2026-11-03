export const vendorKeys = {
  all: ["vendor"] as const,
  orders: () => ["vendor", "orders"] as const,
  products: () => ["vendor", "products"] as const,
};

