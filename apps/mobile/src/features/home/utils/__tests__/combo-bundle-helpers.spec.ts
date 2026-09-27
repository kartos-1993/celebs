import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ComboBundleData } from '../../types';
import { calculateComboPricing, getComboDisplayItems } from '../combo-bundle-helpers';

const SHOWCASE_SRC = readFileSync(
  resolve(__dirname, '../../components/combo-bundle-showcase.tsx'),
  'utf8',
);
const MODAL_SRC = readFileSync(
  resolve(__dirname, '../../components/combo-bundle-modal.tsx'),
  'utf8',
);

function combo(overrides: Partial<ComboBundleData> = {}): ComboBundleData {
  return {
    id: 'c1',
    title: 'Bundle',
    slug: 'bundle',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    isFirstParty: true,
    createdAt: '',
    ...overrides,
  };
}

describe('combo-bundle-helpers', () => {
  it('renders nothing for a null/empty combo instead of demo bundles', () => {
    expect(getComboDisplayItems(null)).toEqual([]);
    expect(getComboDisplayItems(combo())).toEqual([]);
  });

  it('drops a row whose product was not hydrated — no Unsplash/2499/S-M-L-XL invention', () => {
    const out = getComboDisplayItems(combo({ itemDetails: [{ id: 'x', productId: 'p' }] }));
    expect(out).toEqual([]);
  });

  it('never substitutes a demo image or a default price for a missing field', () => {
    const partial = getComboDisplayItems(
      combo({
        itemDetails: [
          { id: 'x', productId: 'p', product: { id: 'p', name: 'Parka', mainImages: [] } },
        ],
      }),
    );
    expect(partial[0].image).toBe('');
    expect(partial[0].originalPrice).toBe(0);
    expect(partial[0].sizes).toEqual([]);
    expect(partial[0].colors).toEqual([]);
  });

  it('derives sizes from colorVariant stocks + colors from names, dropping empties', () => {
    const out = getComboDisplayItems(
      combo({
        itemDetails: [
          {
            id: 'x',
            productId: 'p',
            product: {
              id: 'p',
              name: 'Parka',
              price: 5000,
              mainImages: ['m1'],
              colorVariants: [
                { name: 'Black', images: [], stocks: [{ size: 'M', quantity: 2 }] },
                { name: '', images: [], stocks: [{ size: '', quantity: 1 }] },
              ],
            },
          },
        ],
      }),
    );
    expect(out[0]).toMatchObject({ name: 'Parka', originalPrice: 5000, image: 'm1' });
    expect(out[0].sizes).toEqual(['M']);
    expect(out[0].colors).toEqual(['Black']);
  });

  it('tolerates a NULL API price without producing NaN', () => {
    const out = getComboDisplayItems(
      combo({
        itemDetails: [
          { id: 'x', productId: 'p', product: { id: 'p', name: 'Parka', mainImages: ['m'] } },
        ],
      }),
    );
    expect(Number.isFinite(out[0].originalPrice)).toBe(true);
    expect(calculateComboPricing(combo(), Number.NaN).finalPrice).toBe(0);
  });

  it('calculateComboPricing handles PERCENTAGE (rounded) + FIXED + null combo', () => {
    expect(
      calculateComboPricing(combo({ discountType: 'PERCENTAGE', discountValue: 20 }), 1000),
    ).toEqual({ finalPrice: 800, savings: 200 });
    expect(
      calculateComboPricing(combo({ discountType: 'FIXED_AMOUNT', discountValue: 2500 }), 5000),
    ).toEqual({ finalPrice: 2500, savings: 2500 });
    expect(
      calculateComboPricing(combo({ discountType: 'FIXED_AMOUNT', discountValue: 9999 }), 100),
    ).toEqual({ finalPrice: 0, savings: 9999 });
    expect(calculateComboPricing(null, 1234)).toEqual({ finalPrice: 1234, savings: 0 });
  });

  it('the showcase renders a real empty/error state instead of DEMO_COMBOS', () => {
    expect(SHOWCASE_SRC).not.toContain('DEMO_COMBOS');
    expect(SHOWCASE_SRC).toContain('useCombos');
    expect(SHOWCASE_SRC).toContain('refetch()');
    expect(SHOWCASE_SRC).toMatch(/Bundles are unavailable right now/);
    expect(SHOWCASE_SRC).toMatch(/No bundles to show/);
  });

  it('the modal passes the selected colors through to add-to-cart', () => {
    expect(MODAL_SRC).toContain('selectedColors');
    expect(MODAL_SRC).toMatch(/onAddToCart\?\.\(combo,\s*selectedVariants\)/);
    expect(MODAL_SRC).not.toMatch(/onAddToCart\?\.\(combo, selectedSizes\)/);
  });

  it('the modal derives its draft state from an effect, not setState during render', () => {
    expect(MODAL_SRC).not.toContain('prevComboId');
    expect(MODAL_SRC).toMatch(/useEffect\(\(\) => \{/);
  });
});
