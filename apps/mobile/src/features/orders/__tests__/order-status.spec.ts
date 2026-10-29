import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  getOrderStatusMeta,
  isActiveOrder,
} from '../utils/order-status';

describe('Order Status & Logistics Mapping Utilities', () => {
  it('correctly maps delivery statuses to customer-friendly labels and tones', () => {
    expect(getOrderStatusMeta('CONFIRMED')).toEqual({
      label: 'To Ship',
      tone: 'active',
    });

    expect(getOrderStatusMeta('PACKED')).toEqual({
      label: 'Packed',
      tone: 'active',
    });

    expect(getOrderStatusMeta('HANDED_OVER')).toEqual({
      label: 'In Transit',
      tone: 'active',
    });

    expect(getOrderStatusMeta('OUT_FOR_DELIVERY')).toEqual({
      label: 'Out for Delivery',
      tone: 'active',
    });

    expect(getOrderStatusMeta('DELIVERED')).toEqual({
      label: 'Delivered',
      tone: 'success',
    });

    expect(getOrderStatusMeta('CANCELLED')).toEqual({
      label: 'Cancelled',
      tone: 'danger',
    });
  });

  it('identifies in-flight orders that require live delivery polling', () => {
    expect(isActiveOrder('HANDED_OVER')).toBe(true);
    expect(isActiveOrder('OUT_FOR_DELIVERY')).toBe(true);
    expect(isActiveOrder('CONFIRMED')).toBe(true);
    expect(isActiveOrder('PACKED')).toBe(true);
    expect(isActiveOrder('DELIVERED')).toBe(false);
    expect(isActiveOrder('CANCELLED')).toBe(false);
  });

  it('formats dates into readable human strings', () => {
    const formatted = formatDate('2026-10-27T10:00:00Z');
    expect(formatted).toMatch(/27/);
    expect(formatted).toMatch(/2026/);

    const formattedTime = formatDateTime('2026-10-27T10:00:00Z');
    expect(formattedTime).toMatch(/27/);
  });
});
