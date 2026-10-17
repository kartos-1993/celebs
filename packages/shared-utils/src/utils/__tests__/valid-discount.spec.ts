import { describe, expect, it } from 'vitest';

import { validDiscount } from '../sku-generator';

describe('validDiscount — shared discount choke point', () => {
  it('keeps a genuine below-list discount', () => {
    expect(validDiscount(1500, 1200)).toBe(1200);
  });

  it('drops above-list / equal / zero / negative discounts', () => {
    expect(validDiscount(1500, 1900)).toBeUndefined();
    expect(validDiscount(1500, 1500)).toBeUndefined();
    expect(validDiscount(1500, 0)).toBeUndefined();
    expect(validDiscount(1500, -50)).toBeUndefined();
  });

  it('drops NaN / null / undefined / non-numeric discounts', () => {
    expect(validDiscount(1500, NaN)).toBeUndefined();
    expect(validDiscount(1500, null)).toBeUndefined();
    expect(validDiscount(1500, undefined)).toBeUndefined();
    expect(validDiscount(1500, 'abc')).toBeUndefined();
  });

  it('coerces numeric strings but rejects non-positive list prices', () => {
    expect(validDiscount(1500, '1200')).toBe(1200);
    expect(validDiscount(0, 0)).toBeUndefined();
    expect(validDiscount(NaN, 100)).toBeUndefined();
  });
});
