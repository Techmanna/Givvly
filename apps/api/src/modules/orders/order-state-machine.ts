import { OrderStatus } from "@prisma/client";

export type OrderActorRole = "SYSTEM" | "BUYER" | "ADMIN";

/**
 * Pure transition guard for Order state machine (Section 9.6 & 13.2)
 */
export function canOrderTransition(
  current: OrderStatus,
  next: OrderStatus,
  actor: OrderActorRole
): boolean {
  if (current === next) return false;

  switch (current) {
    case OrderStatus.PENDING_PAYMENT:
      if (next === OrderStatus.CONFIRMED && actor === "SYSTEM") return true;
      if (next === OrderStatus.CANCELLED) return true; // System (expiry), buyer, or admin
      return false;

    case OrderStatus.CONFIRMED:
      if (next === OrderStatus.PACKED && actor === "ADMIN") return true;
      if (next === OrderStatus.CANCELLED && (actor === "BUYER" || actor === "ADMIN")) return true;
      return false;

    case OrderStatus.PACKED:
      if (next === OrderStatus.SHIPPED && actor === "ADMIN") return true;
      return false;

    case OrderStatus.SHIPPED:
      if (next === OrderStatus.DELIVERED && actor === "ADMIN") return true;
      if (next === OrderStatus.DISPUTED && actor === "BUYER") return true;
      return false;

    case OrderStatus.DELIVERED:
      if (next === OrderStatus.DISPUTED && actor === "BUYER") return true;
      return false;

    case OrderStatus.DISPUTED:
      if (next === OrderStatus.REFUNDED && actor === "ADMIN") return true;
      if (next === OrderStatus.DELIVERED && actor === "ADMIN") return true; // Rejection of dispute
      return false;

    case OrderStatus.CANCELLED:
    case OrderStatus.REFUNDED:
      return false; // Terminal states

    default:
      return false;
  }
}

