import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { CartPricingEngine, DiscountRule, PricingItem } from '@/modules/cart/cart-pricing.engine';

describe('CartPricingEngine Unit Tests', () => {
  it('should calculate exact decimal totals avoiding JS floating point inaccuracy', () => {
    const items: PricingItem[] = [
      {
        inventoryId: 'inv-1',
        sku: 'SKU-001',
        quantity: 1,
        unitPrice: new Prisma.Decimal('0.10'),
      },
      {
        inventoryId: 'inv-2',
        sku: 'SKU-002',
        quantity: 1,
        unitPrice: new Prisma.Decimal('0.20'),
      },
    ];

    const result = CartPricingEngine.calculateCartTotal(items);

    expect(result.subtotal.toString()).toBe('0.3');
    expect(result.total.toString()).toBe('0.3');
    expect(result.itemCount).toBe(2);
  });

  it('should apply exclusive discount as the ONLY discount when present', () => {
    const items: PricingItem[] = [
      {
        inventoryId: 'inv-1',
        sku: 'SKU-100',
        quantity: 2,
        unitPrice: new Prisma.Decimal('100.00'),
      },
    ];

    const discounts: DiscountRule[] = [
      {
        id: 'disc-combinable-1',
        code: '10OFF',
        discountType: 'PERCENTAGE',
        discountValue: new Prisma.Decimal('10.00'),
        isExclusive: false,
      },
      {
        id: 'disc-exclusive',
        code: 'VIP50',
        discountType: 'PERCENTAGE',
        discountValue: new Prisma.Decimal('50.00'),
        isExclusive: true,
      },
    ];

    const result = CartPricingEngine.calculateCartTotal(items, discounts);

    expect(result.subtotal.toString()).toBe('200');
    expect(result.totalDiscount.toString()).toBe('100');
    expect(result.total.toString()).toBe('100');
    expect(result.appliedDiscounts).toHaveLength(1);
    expect(result.appliedDiscounts[0]?.id).toBe('disc-exclusive');
  });

  it('should cap total discount so total never falls below 0', () => {
    const items: PricingItem[] = [
      {
        inventoryId: 'inv-1',
        sku: 'SKU-200',
        quantity: 1,
        unitPrice: new Prisma.Decimal('50.00'),
      },
    ];

    const discounts: DiscountRule[] = [
      {
        id: 'disc-huge',
        code: 'OVERCAP',
        discountType: 'FIXED_AMOUNT',
        discountValue: new Prisma.Decimal('200.00'),
        isExclusive: false,
      },
    ];

    const result = CartPricingEngine.calculateCartTotal(items, discounts);

    expect(result.subtotal.toString()).toBe('50');
    expect(result.totalDiscount.toString()).toBe('50');
    expect(result.total.toString()).toBe('0');
  });

  it('should generate deterministic idempotencyKey for identical cart states', () => {
    const items: PricingItem[] = [
      {
        inventoryId: 'inv-1',
        sku: 'SKU-1',
        quantity: 2,
        unitPrice: new Prisma.Decimal('150.00'),
      },
    ];

    const res1 = CartPricingEngine.calculateCartTotal(items);
    const res2 = CartPricingEngine.calculateCartTotal(items);

    expect(res1.idempotencyKey).toBeDefined();
    expect(res1.idempotencyKey).toBe(res2.idempotencyKey);
  });
});
