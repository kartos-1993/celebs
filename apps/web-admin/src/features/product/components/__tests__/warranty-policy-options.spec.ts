import { describe, expect, it } from 'vitest';

import { PACKAGING_OPTIONS, WARRANTY_OPTIONS } from '../warranty-policy-options';

describe('warranty policy option tables', () => {
  it('exposes the four standard packaging formats in order', () => {
    expect([...PACKAGING_OPTIONS]).toEqual([
      { value: 'FLYER_SMALL', label: 'Flyer Small (1-2 Apparel Items)' },
      { value: 'FLYER_MEDIUM', label: 'Flyer Medium (Hoodies, Jackets)' },
      { value: 'BOX_STANDARD', label: 'Box Standard (Footwear, Electronics)' },
      { value: 'BOX_LARGE', label: 'Box Large (Bulky / Fragile Goods)' },
    ]);
  });

  it('exposes the three warranty guarantees in order', () => {
    expect([...WARRANTY_OPTIONS]).toEqual([
      { value: 'NO_WARRANTY', label: 'No Warranty Applicable' },
      { value: 'BRAND_WARRANTY', label: 'Brand Authorized Warranty' },
      { value: 'SELLER_WARRANTY', label: 'Seller / Shop Guarantee' },
    ]);
  });
});
