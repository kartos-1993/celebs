import { OrderStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  canTransition,
  isForwardOrderMove,
  validateTransition,
} from '@/modules/order/order.state-machine';

describe('OrderStateMachine Unit Tests', () => {
  it('should allow valid transitions', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PACKED)).toBe(true);
    expect(canTransition(OrderStatus.PACKED, OrderStatus.HANDED_OVER)).toBe(true);
    expect(canTransition(OrderStatus.HANDED_OVER, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
  });

  it('should allow cancelling from active non-terminal states', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.PACKED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.HANDED_OVER, OrderStatus.CANCELLED)).toBe(true);
  });

  it('should reject invalid transitions like skipping steps or cancelling delivered orders', () => {
    expect(canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
  });

  it('should throw AppError when validateTransition is called on illegal path', () => {
    expect(() => validateTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toThrow(
      "Invalid order status transition from 'DELIVERED' to 'CANCELLED'.",
    );
  });

  it('should let webhook moves skip forward but never regress', () => {
    // A missed intermediate must not stall a real delivery.
    expect(isForwardOrderMove(OrderStatus.CONFIRMED, OrderStatus.DELIVERED)).toBe(true);
    expect(isForwardOrderMove(OrderStatus.DELIVERED, OrderStatus.RETURNED)).toBe(true);
    // A stale or forged event must never move an order backwards or revive it.
    expect(isForwardOrderMove(OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY)).toBe(false);
    expect(isForwardOrderMove(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).toBe(false);
    expect(isForwardOrderMove(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
  });
});
