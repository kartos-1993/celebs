import { describe, it, expect } from 'vitest';
import { CartPricingEngine } from '../../src/modules/cart/cart-pricing.engine.js';

describe('CartPricingEngine Unit Tests', () => {
  it('calculates regular items without discounts correctly', () => {
    const summary = CartPricingEngine.calculate(
      [
        { id: '1', unitPrice: 1000, quantity: 2 },
        { id: '2', unitPrice: 500, quantity: 1 },
      ],
      { deliveryFee: 150, isCod: false },
    );

    expect(summary.subtotal).toBe(2500);
    expect(summary.totalComboDiscount).toBe(0);
    expect(summary.totalFestivalDiscount).toBe(0);
    expect(summary.deliveryFee).toBe(150);
    expect(summary.codSurcharge).toBe(0);
    expect(summary.grandTotal).toBe(2650);
  });

  it('applies combo percentage discount and COD surcharge correctly', () => {
    const summary = CartPricingEngine.calculate(
      [
        {
          id: '1',
          unitPrice: 2000,
          quantity: 1,
          comboBundleId: 'b-1',
          comboDiscountType: 'PERCENTAGE',
          comboDiscountValue: 20,
        },
      ],
      { deliveryFee: 150, isCod: true, codSurchargeAmount: 50 },
    );

    expect(summary.subtotal).toBe(2000);
    expect(summary.totalComboDiscount).toBe(400); // 20% of 2000
    expect(summary.deliveryFee).toBe(150);
    expect(summary.codSurcharge).toBe(50);
    expect(summary.grandTotal).toBe(1800); // (2000 - 400) + 150 + 50
  });

  it('caps FIXED_AMOUNT combo discount so it never exceeds item subtotal', () => {
    const summary = CartPricingEngine.calculate(
      [
        {
          id: '1',
          unitPrice: 500,
          quantity: 1,
          comboBundleId: 'b-1',
          comboDiscountType: 'FIXED_AMOUNT',
          comboDiscountValue: 1000,
        },
      ],
      { deliveryFee: 150, isCod: false },
    );

    expect(summary.subtotal).toBe(500);
    expect(summary.totalComboDiscount).toBe(250); // Capped at 50% max cap (250)
    expect(summary.grandTotal).toBe(400); // 250 + 150
  });

  it('enforces max discount percentage cap across combo and festival discounts', () => {
    const summary = CartPricingEngine.calculate(
      [
        {
          id: '1',
          unitPrice: 1000,
          quantity: 1,
          comboBundleId: 'b-1',
          comboDiscountType: 'PERCENTAGE',
          comboDiscountValue: 40,
          festivalDiscountPercent: 30,
        },
      ],
      { maxDiscountPercentageCap: 50, deliveryFee: 0, isCod: false },
    );

    expect(summary.subtotal).toBe(1000);
    expect(summary.totalComboDiscount + summary.totalFestivalDiscount).toBeLessThanOrEqual(500); // Max 50%
    expect(summary.grandTotal).toBe(500);
  });
});
