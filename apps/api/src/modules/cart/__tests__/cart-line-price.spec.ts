import { describe, expect, it } from 'vitest';

import {
  resolveCartLineBasePrice,
  resolveCartLineUnitPrice,
  resolveComboLineUnitDiscounts,
} from '../cart-line-price';

describe('resolveCartLineBasePrice — sale price only when it is a real discount', () => {
  it('uses discountedPrice when it is below the list price', () => {
    expect(resolveCartLineBasePrice({ price: 1000, discountedPrice: 800 }).toNumber()).toBe(800);
  });

  it('ignores zero, absent and above-list discounted prices', () => {
    expect(resolveCartLineBasePrice({ price: 1000, discountedPrice: 0 }).toNumber()).toBe(1000);
    expect(resolveCartLineBasePrice({ price: 1000, discountedPrice: null }).toNumber()).toBe(1000);
    expect(resolveCartLineBasePrice({ price: 1000, discountedPrice: 1500 }).toNumber()).toBe(1000);
  });

  it('accepts string inputs and a zero list price', () => {
    expect(resolveCartLineBasePrice({ price: '1000', discountedPrice: '800.50' }).toNumber()).toBe(
      800.5,
    );
    expect(resolveCartLineBasePrice({ price: 0 }).toNumber()).toBe(0);
  });
});

describe('resolveCartLineUnitPrice — the one charged figure', () => {
  it('equals the base price without an applied discount', () => {
    expect(resolveCartLineUnitPrice({ price: 1000, discountedPrice: 800 }).toNumber()).toBe(800);
  });

  it('subtracts the per-unit combo discount from the effective base', () => {
    expect(
      resolveCartLineUnitPrice({
        price: 1000,
        discountedPrice: 800,
        appliedDiscount: 100,
      }).toNumber(),
    ).toBe(700);
  });

  it('never goes below zero when the discount exceeds the base', () => {
    expect(
      resolveCartLineUnitPrice({
        price: 1000,
        discountedPrice: 0,
        appliedDiscount: 1500,
      }).toNumber(),
    ).toBe(0);
  });

  it('treats zero and absent discounts as no discount', () => {
    expect(resolveCartLineUnitPrice({ price: 500, appliedDiscount: 0 }).toNumber()).toBe(500);
    expect(resolveCartLineUnitPrice({ price: 500, appliedDiscount: null }).toNumber()).toBe(500);
  });
});

describe('resolveComboLineUnitDiscounts — runbook 4.4 proration', () => {
  it('PERCENTAGE: discounts the list price per unit', () => {
    const [first, second] = resolveComboLineUnitDiscounts(
      { discountType: 'PERCENTAGE', discountValue: 10 },
      [
        { listPrice: 1000, quantity: 1 },
        { listPrice: 500, quantity: 1 },
      ],
    );

    expect(first!.toNumber()).toBe(100);
    expect(second!.toNumber()).toBe(50);
  });

  it('FIXED_AMOUNT: splits the value per line, then per unit', () => {
    const [first, second] = resolveComboLineUnitDiscounts(
      { discountType: 'FIXED_AMOUNT', discountValue: 500 },
      [
        { listPrice: 1000, quantity: 1 },
        { listPrice: 500, quantity: 2 },
      ],
    );

    expect(first!.toNumber()).toBe(250);
    expect(second!.toNumber()).toBe(125);
  });

  it('rounds to 2dp half-up', () => {
    const [first] = resolveComboLineUnitDiscounts(
      { discountType: 'PERCENTAGE', discountValue: 12.5 },
      [{ listPrice: 333.33, quantity: 1 }],
    );

    expect(first!.toNumber()).toBe(41.67);
  });
});
