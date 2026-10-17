import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  isSizeOutOfStockForVariant,
  isVariantOutOfStock,
  planCartAdd,
  sizeForColorSwitch,
} from '../../utils/stock';
import { clampColorIndex } from '../use-product-variant-selection';

function readOwned(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

interface StockEntry {
  size: string;
  quantity: number;
}

interface MirrorVariant {
  name: string;
  stocks?: StockEntry[];
}

interface MirrorProduct {
  colorVariants?: MirrorVariant[];
}

const twoVariantProduct: MirrorProduct = {
  colorVariants: [
    { name: 'Red', stocks: [{ size: 'S', quantity: 5 }] },
    { name: 'Blue', stocks: [{ size: 'M', quantity: 3 }] },
  ],
};

const depleted: MirrorVariant = { name: 'Red', stocks: [{ size: 'S', quantity: 0 }] };

describe('variant-selection reset/clamp behavior', () => {
  it('keeps the size when the new variant stocks it', () => {
    const redOnly: MirrorProduct = {
      colorVariants: [
        { name: 'Red', stocks: [{ size: 'S', quantity: 5 }] },
        { name: 'Blue', stocks: [{ size: 'S', quantity: 2 }] },
      ],
    };
    expect(sizeForColorSwitch('S', redOnly.colorVariants?.[1])).toBe('S');
  });

  it('clears the size when the new variant does not carry it', () => {
    expect(sizeForColorSwitch('S', twoVariantProduct.colorVariants?.[1])).toBe('');
  });

  it('clears the size when the new variant lists it as depleted', () => {
    const oosBlue: MirrorProduct = {
      colorVariants: [
        { name: 'Red', stocks: [{ size: 'S', quantity: 5 }] },
        { name: 'Blue', stocks: [{ size: 'S', quantity: 0 }] },
      ],
    };
    expect(sizeForColorSwitch('S', oosBlue.colorVariants?.[1])).toBe('');
  });

  it('clears the size when the new variant tracks no stock at all', () => {
    // The old `if (selectedSize && newVariant?.stocks)` guard kept a size
    // chosen for a different SKU. Unknown availability must never inherit it.
    const untracked: MirrorProduct = {
      colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 5 }] }, { name: 'Blue' }],
    };
    expect(sizeForColorSwitch('S', untracked.colorVariants?.[1])).toBe('');
  });

  it('clears a placeholder size and an empty selection', () => {
    expect(sizeForColorSwitch('Default', twoVariantProduct.colorVariants?.[0])).toBe('');
    expect(sizeForColorSwitch('Standard', twoVariantProduct.colorVariants?.[0])).toBe('');
    expect(sizeForColorSwitch('', twoVariantProduct.colorVariants?.[0])).toBe('');
    expect(sizeForColorSwitch('   ', twoVariantProduct.colorVariants?.[0])).toBe('');
  });
});

describe('clampColorIndex — refetch that shrinks the variant list', () => {
  it('clamps an out-of-range index back into the list', () => {
    expect(clampColorIndex(2, 1)).toBe(0);
    expect(clampColorIndex(1, 2)).toBe(1);
    expect(clampColorIndex(0, 3)).toBe(0);
    expect(clampColorIndex(-4, 3)).toBe(0);
  });

  it('falls back to 0 for an empty list or a non-finite index', () => {
    expect(clampColorIndex(2, 0)).toBe(0);
    expect(clampColorIndex(Number.NaN, 3)).toBe(0);
    expect(clampColorIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
  });

  it('the selection hook really uses the clamp', () => {
    const source = readOwned('../use-product-variant-selection.ts');
    expect(source).toContain('appliedForRef');
    expect(source).toContain('clamp');
    expect(source).toContain('sizeForColorSwitch');
  });
});

describe('cart add-to-cart: fresh variant index + sentinel filtering', () => {
  it('judges the variant itself when no size is picked', () => {
    const freshVariant = twoVariantProduct.colorVariants?.[0];
    const finalSize = '';
    const isFreshOos = finalSize
      ? isSizeOutOfStockForVariant(freshVariant, finalSize)
      : isVariantOutOfStock(freshVariant);
    expect(isFreshOos).toBe(false);

    const depleted: MirrorVariant = { name: 'Red', stocks: [{ size: 'S', quantity: 0 }] };
    expect(isVariantOutOfStock(depleted)).toBe(true);
  });

  it('planCartAdd blocks a depleted variant even with no size chosen', () => {
    expect(
      planCartAdd({
        product: { id: 'p', colorVariants: [depleted] } as never,
        variantIndex: 0,
        requestedSize: '',
        isFullyOutOfStock: false,
      }),
    ).toEqual({ kind: 'out-of-stock' });
  });

  it('planCartAdd asks for a size when the variant stocks one', () => {
    expect(
      planCartAdd({
        product: {
          id: 'p',
          colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 2 }] }],
        } as never,
        variantIndex: 0,
        requestedSize: '',
        isFullyOutOfStock: false,
      }),
    ).toEqual({ kind: 'pick-size' });
  });

  it('planCartAdd treats a placeholder selection as no selection', () => {
    const product = {
      id: 'p',
      colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 2 }] }],
    } as never;
    expect(
      planCartAdd({
        product,
        variantIndex: 0,
        requestedSize: 'Standard',
        isFullyOutOfStock: false,
      }),
    ).toEqual({
      kind: 'pick-size',
    });
    expect(
      planCartAdd({ product, variantIndex: 0, requestedSize: 'Default', isFullyOutOfStock: false }),
    ).toEqual({
      kind: 'pick-size',
    });
  });

  it('planCartAdd never fabricates a sentinel for a missing variant', () => {
    expect(
      planCartAdd({
        product: { id: 'p' } as never,
        variantIndex: 0,
        requestedSize: 'M',
        isFullyOutOfStock: false,
      }),
    ).toEqual({ kind: 'out-of-stock' });
  });

  it('planCartAdd returns the real color + size of the fresh variant', () => {
    expect(
      planCartAdd({
        product: {
          id: 'p',
          colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 2 }] }],
        } as never,
        variantIndex: 0,
        requestedSize: 'S',
        isFullyOutOfStock: false,
      }),
    ).toEqual({ kind: 'add', size: 'S', color: 'Red' });
  });

  it('planCartAdd reads the backend sizeless token verbatim instead of inventing one', () => {
    // web-admin's payload builder writes size:'default' for a variant with no
    // size axis, and the cart schema demands a non-empty size. That stored value
    // is read back; the client never makes one up.
    expect(
      planCartAdd({
        product: {
          id: 'p',
          colorVariants: [{ name: 'Default', stocks: [{ size: 'default', quantity: 4 }] }],
        } as never,
        variantIndex: 0,
        requestedSize: '',
        isFullyOutOfStock: false,
      }),
    ).toEqual({ kind: 'add', size: 'default', color: 'Default' });
  });

  it('planCartAdd blocks on a product flagged fully out of stock', () => {
    expect(
      planCartAdd({
        product: {
          id: 'p',
          colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 5 }] }],
        } as never,
        variantIndex: 0,
        requestedSize: 'S',
        isFullyOutOfStock: true,
      }),
    ).toEqual({ kind: 'out-of-stock' });
  });

  it('pins the cart to a clamped fresh index and never fabricates a sentinel', () => {
    const source = readOwned('../use-product-detail-cart.ts');
    // Fresh, clamped variant index for both the stock verdict and the size modal.
    expect(source).toContain('clampColorIndex');
    expect(source).toContain('freshProduct.colorVariants?.length ?? 0');
    expect(source).toContain('planCartAdd({');
    expect(source).toContain('variantIndex,');
    expect(source).not.toContain("|| 'Default'");
    expect(source).not.toContain("|| 'Standard'");
  });

  it('the plan lives in the pure stock util, not in the React hook', () => {
    const stockSrc = readOwned('../../utils/stock.ts');
    // Placeholder selection is filtered with the shared helper at submit time.
    expect(stockSrc).toContain('isPlaceholderSelection(requestedSize)');
    expect(stockSrc).toContain('export function planCartAdd');
    expect(stockSrc).toContain('isVariantOutOfStock(variant)');
    expect(stockSrc).toContain('resolveProductSizes(product, variantIndex)');
  });
});

describe('owned UI/modal source pins', () => {
  it('renders a size prompt instead of the "Default" label', () => {
    const source = readOwned('../../components/product-variant-selector.tsx');
    expect(source).not.toContain("{selectedSize || 'Default'}");
    expect(source).toContain('SIZE_PROMPT');
  });

  it('renders a color prompt instead of the "Standard" label', () => {
    const source = readOwned('../../components/product-variant-selector.tsx');
    expect(source).not.toContain("|| 'Standard'");
    expect(source).toContain('COLOR_PROMPT');
  });

  it('makes an out-of-stock color swatch non-selectable with the size-box toast', () => {
    const swatch = readOwned('../../components/color-swatch-item.tsx');
    expect(swatch).toContain("showToast('No stock available', { type: 'error' })");
    expect(swatch).toContain('if (variantOos)');
    expect(swatch).not.toContain('onPress={onSelect}');
    expect(swatch).toContain('accessibilityState={{ selected: isSelected, disabled: variantOos }}');
  });

  it('memoizes the swatch press handlers (no per-render closure in the list)', () => {
    const selector = readOwned('../../components/product-variant-selector.tsx');
    expect(selector).not.toContain('onSelect={() => onSelectColor(idx)}');
    expect(selector).toContain('onSelectColor={onSelectColor}');
    expect(selector).toContain('variantIndex={idx}');
  });

  it('prices the size modal from the per-color combo figure, not the base', () => {
    const modal = readOwned('../../components/product-detail-size-modal.tsx');
    expect(modal).toContain('resolveVariantPrice(product, variant?.name)');
    expect(modal).not.toContain('price={product.price}');
    const source = readOwned('../../components/size-required-modal.tsx');
    expect(source).not.toContain('discountedPrice || price || 0');
    expect(source).toContain('validDiscount');
  });

  it('toasts on an out-of-stock / missing confirm instead of silently returning', () => {
    const source = readOwned('../../components/size-required-modal.tsx');
    expect(source).not.toContain(
      'if (!selectedSize || disabledSizes.includes(selectedSize)) return;',
    );
    expect(source).toContain('showToast');
  });

  it('derives modal state from an effect, not setState during render', () => {
    const source = readOwned('../../components/size-required-modal.tsx');
    expect(source).not.toContain('prevVisible');
    expect(source).not.toContain('if (visible !== prevVisible');
    expect(source).toContain('useEffect(() => {\n    if (visible) setSelectedSize(initialSize);');
  });

  it('guards every price render against undefined/NaN with a dash', () => {
    const priceCard = readOwned('../../components/product-price-card.tsx');
    expect(priceCard).not.toContain('currentPrice.toLocaleString()');
    expect(priceCard).toContain('formatAmount');
    expect(priceCard).toContain('validDiscount');
    const modal = readOwned('../../components/size-required-modal.tsx');
    expect(modal).not.toContain('currentPrice.toLocaleString()');
    expect(modal).toContain('formatAmount');
  });

  it('shows a "from {min}" range when no size is selected', () => {
    const source = readOwned('../../components/product-price-card.tsx');
    expect(source).toContain("isRange ? 'from ' : ''");
    const scroll = readOwned('../../components/product-detail-scroll-content.tsx');
    expect(scroll).toContain('isRange={resolvedPrice.isRange}');
  });

  it('defers the reviews add-to-cart so it cannot read a stale selection', () => {
    const source = readOwned('../../components/product-detail-scroll-content.tsx');
    expect(source).toContain('reviewAddRequest');
    expect(source).toContain('setReviewAddRequest((prev) => prev + 1)');
    expect(source).toMatch(
      /handledReviewAddRef\.current = reviewAddRequest;\s*\n\s*onAddToCart\?\.\(\);/,
    );
  });
});
