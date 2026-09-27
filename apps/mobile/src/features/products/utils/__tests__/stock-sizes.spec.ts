import { describe, expect, it } from 'vitest';

import { resolveProductSizes } from '../stock';

describe('resolveProductSizes', () => {
  it('filters out dummy default size names when resolving product sizes', () => {
    const singleProduct = {
      colorVariants: [
        {
          name: 'Default',
          stocks: [{ size: 'default', quantity: 15 }],
        },
      ],
    };

    const sizes = resolveProductSizes(singleProduct);
    expect(sizes).toEqual([]);
  });

  it('preserves legitimate size variants like S, M, L', () => {
    const sizedProduct = {
      colorVariants: [
        {
          name: 'Default',
          stocks: [
            { size: 'S', quantity: 5 },
            { size: 'M', quantity: 10 },
            { size: 'L', quantity: 0 },
          ],
        },
      ],
    };

    const sizes = resolveProductSizes(sizedProduct);
    expect(sizes).toEqual([{ name: 'S' }, { name: 'M' }, { name: 'L' }]);
  });
});
