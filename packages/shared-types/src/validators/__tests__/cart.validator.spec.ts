import { describe, expect, it } from 'vitest';

import { addComboToCartSchema } from '../cart.validator';

describe('addComboToCartSchema', () => {
  it('parses a combo add payload with explicit quantities', () => {
    const parsed = addComboToCartSchema.parse({
      comboBundleId: 'cmb-123456789012345678901234',
      items: [
        {
          productId: 'prod-1',
          colorVariantName: 'Black',
          size: 'M',
          quantity: 1,
        },
      ],
    });

    expect(parsed.comboBundleId).toBe('cmb-123456789012345678901234');
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.quantity).toBe(1);
  });

  it('leaves quantity optional so the service can apply the bundle default', () => {
    const parsed = addComboToCartSchema.parse({
      comboBundleId: 'cmb-123456789012345678901234',
      items: [{ productId: 'prod-1', colorVariantName: 'Black', size: 'M' }],
    });

    expect(parsed.items[0]!.quantity).toBeUndefined();
  });

  it('rejects an empty items array', () => {
    expect(() =>
      addComboToCartSchema.parse({
        comboBundleId: 'cmb-123456789012345678901234',
        items: [],
      }),
    ).toThrow();
  });

  it('rejects non-positive quantities', () => {
    expect(() =>
      addComboToCartSchema.parse({
        comboBundleId: 'cmb-123456789012345678901234',
        items: [{ productId: 'prod-1', colorVariantName: 'Black', size: 'M', quantity: 0 }],
      }),
    ).toThrow();
  });
});
