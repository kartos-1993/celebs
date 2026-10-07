import { ConsignmentStatus, OrderStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  isForwardConsignmentMove,
  mapPathaoEventToConsignmentStatus,
  mapPathaoEventToStatus,
} from '../pathao-webhook-events';

/**
 * Pathao's event strings are a long tail; only delivery progress moves
 * anything. Everything else is recorded on the timeline and moves nothing.
 */
describe('mapPathaoEventToStatus', () => {
  it('maps delivery progress onto our lifecycle', () => {
    expect(mapPathaoEventToStatus('Delivered')).toBe(OrderStatus.DELIVERED);
    expect(mapPathaoEventToStatus('In Transit')).toBe(OrderStatus.OUT_FOR_DELIVERY);
    expect(mapPathaoEventToStatus('Partial Delivery')).toBe(OrderStatus.OUT_FOR_DELIVERY);
    expect(mapPathaoEventToStatus('Pickup')).toBe(OrderStatus.HANDED_OVER);
    expect(mapPathaoEventToStatus('Return')).toBe(OrderStatus.RETURNED);
  });

  it('is case- and padding-tolerant, because couriers are neither', () => {
    expect(mapPathaoEventToStatus('  delivered ')).toBe(OrderStatus.DELIVERED);
  });

  it('records but does not move on bookkeeping events', () => {
    for (const event of [
      'order.created',
      'order.updated',
      'Payment Invoice',
      'Store Created',
      'On Hold',
      'Pickup Cancelled',
      'something-entirely-new',
    ]) {
      expect(mapPathaoEventToStatus(event)).toBeNull();
    }
  });
});

describe('mapPathaoEventToConsignmentStatus', () => {
  it('keeps a partially delivered parcel short of delivered', () => {
    expect(mapPathaoEventToConsignmentStatus('Partial Delivery')).toBe(
      ConsignmentStatus.HANDED_OVER,
    );
    expect(mapPathaoEventToConsignmentStatus('Delivered')).toBe(ConsignmentStatus.DELIVERED);
  });

  it('moves nothing on bookkeeping events', () => {
    expect(mapPathaoEventToConsignmentStatus('order.updated')).toBeNull();
  });

  it('never regresses a parcel on a stale event', () => {
    expect(
      isForwardConsignmentMove(ConsignmentStatus.HANDED_OVER, ConsignmentStatus.DELIVERED),
    ).toBe(true);
    expect(
      isForwardConsignmentMove(ConsignmentStatus.DELIVERED, ConsignmentStatus.HANDED_OVER),
    ).toBe(false);
    expect(isForwardConsignmentMove(ConsignmentStatus.DELIVERED, ConsignmentStatus.DELIVERED)).toBe(
      false,
    );
  });
});
