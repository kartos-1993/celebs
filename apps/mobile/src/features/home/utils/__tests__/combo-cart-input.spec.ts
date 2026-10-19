import { describe, expect, it } from 'vitest';

import type { ComboBundleData } from '../../types';
import { buildComboCartInput } from '../combo-cart-input';

function combo(overrides: Partial<ComboBundleData> = {}): ComboBundleData {
  return {
    id: 'combo-1',
    title: 'Streetwear Duo',
    slug: 'streetwear-duo',
    discountType: 'PERCENTAGE',
    discountValue: 25,
    isFirstParty: true,
    createdAt: '',
    ...overrides,
  };
}

const parka = {
  id: 'bi-1',
  productId: 'prod-parka',
  defaultQuantity: 2,
  product: {
    id: 'prod-parka',
    name: 'Parka',
    price: 5000,
    cover: 'parka.jpg',
    colorVariants: [{ name: 'Black', images: [], stocks: [{ size: 'M', quantity: 3 }] }],
  },
};

const boots = {
  id: 'bi-2',
  productId: 'prod-boots',
  defaultQuantity: 1,
  product: {
    id: 'prod-boots',
    name: 'Boots',
    price: 3000,
    cover: 'boots.jpg',
    colorVariants: [{ name: 'Tan', images: [], stocks: [{ size: '42', quantity: 3 }] }],
  },
};

describe('buildComboCartInput', () => {
  it('resolves the bundle-item id to the real product id and keeps the chosen variant', () => {
    const input = buildComboCartInput(combo({ itemDetails: [parka, boots] }), {
      'bi-1': { size: 'M', color: 'Black' },
      'bi-2': { size: '42', color: 'Tan' },
    });

    expect(input).toEqual({
      comboBundleId: 'combo-1',
      items: [
        { productId: 'prod-parka', colorVariantName: 'Black', size: 'M' },
        { productId: 'prod-boots', colorVariantName: 'Tan', size: '42' },
      ],
    });
    // The bundle-item id is a join-row id, never a product id.
    expect(input.items[0].productId).not.toBe('bi-1');
  });

  it('omits quantity so the server applies each bundle item defaultQuantity', () => {
    const input = buildComboCartInput(combo({ itemDetails: [parka] }), {
      'bi-1': { size: 'M', color: 'Black' },
    });

    expect(input.items[0]).not.toHaveProperty('quantity');
  });

  it('supports the legacy items array when itemDetails is absent', () => {
    const input = buildComboCartInput(combo({ items: [boots] }), {
      'bi-2': { size: '42', color: 'Tan' },
    });

    expect(input.items).toEqual([{ productId: 'prod-boots', colorVariantName: 'Tan', size: '42' }]);
  });

  it('refuses a missing size before the request, naming the product', () => {
    expect(() =>
      buildComboCartInput(combo({ itemDetails: [parka] }), { 'bi-1': { color: 'Black' } }),
    ).toThrow(/choose a size for parka/i);
  });

  it('refuses a missing colour before the request, naming the product', () => {
    expect(() =>
      buildComboCartInput(combo({ itemDetails: [parka] }), { 'bi-1': { size: 'M' } }),
    ).toThrow(/choose a colou?r for parka/i);
  });

  it('refuses a bundle row the API could not hydrate instead of sending a partial combo', () => {
    expect(() =>
      buildComboCartInput(
        combo({ itemDetails: [parka, { id: 'bi-3', productId: 'prod-ghost' }] }),
        { 'bi-1': { size: 'M', color: 'Black' } },
      ),
    ).toThrow(/unavailable/i);
  });

  it('refuses an empty combo', () => {
    expect(() => buildComboCartInput(combo(), {})).toThrow(/no items/i);
  });
});
