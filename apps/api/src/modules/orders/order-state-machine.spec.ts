import { OrderStatus } from "@prisma/client";
import { canOrderTransition } from "./order-state-machine";

describe("Order State Machine", () => {
  it("allows SYSTEM to confirm a PENDING_PAYMENT order upon payment success", () => {
    expect(
      canOrderTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, "SYSTEM")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, "BUYER")
    ).toBe(false);
  });

  it("allows BUYER or ADMIN to cancel a PENDING_PAYMENT order", () => {
    expect(
      canOrderTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, "BUYER")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, "ADMIN")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, "SYSTEM")
    ).toBe(true);
  });

  it("allows ADMIN to pack a CONFIRMED order", () => {
    expect(
      canOrderTransition(OrderStatus.CONFIRMED, OrderStatus.PACKED, "ADMIN")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.CONFIRMED, OrderStatus.PACKED, "BUYER")
    ).toBe(false);
  });

  it("allows cancellation of CONFIRMED before packed by BUYER or ADMIN", () => {
    expect(
      canOrderTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED, "BUYER")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED, "ADMIN")
    ).toBe(true);
  });

  it("allows ADMIN to advance PACKED to SHIPPED", () => {
    expect(
      canOrderTransition(OrderStatus.PACKED, OrderStatus.SHIPPED, "ADMIN")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.PACKED, OrderStatus.SHIPPED, "BUYER")
    ).toBe(false);
  });

  it("allows ADMIN to advance SHIPPED to DELIVERED", () => {
    expect(
      canOrderTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED, "ADMIN")
    ).toBe(true);
  });

  it("allows BUYER to dispute a SHIPPED or DELIVERED order", () => {
    expect(
      canOrderTransition(OrderStatus.SHIPPED, OrderStatus.DISPUTED, "BUYER")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.DELIVERED, OrderStatus.DISPUTED, "BUYER")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.CONFIRMED, OrderStatus.DISPUTED, "BUYER")
    ).toBe(false);
  });

  it("allows ADMIN to resolve a DISPUTED order with REFUNDED or back to DELIVERED", () => {
    expect(
      canOrderTransition(OrderStatus.DISPUTED, OrderStatus.REFUNDED, "ADMIN")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.DISPUTED, OrderStatus.DELIVERED, "ADMIN")
    ).toBe(true);
    expect(
      canOrderTransition(OrderStatus.DISPUTED, OrderStatus.CANCELLED, "ADMIN")
    ).toBe(false);
  });

  it("blocks transitions from terminal states", () => {
    expect(
      canOrderTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED, "ADMIN")
    ).toBe(false);
    expect(
      canOrderTransition(OrderStatus.REFUNDED, OrderStatus.DELIVERED, "ADMIN")
    ).toBe(false);
  });
});

