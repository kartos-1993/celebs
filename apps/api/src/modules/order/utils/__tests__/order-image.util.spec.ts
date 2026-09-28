import { describe, expect, it } from 'vitest';

import { resolveCover } from '../../../product/product-presenters';
import { resolveOrderItemImageUrl } from '../order-image.util';

/**
 * The canonical rule, restated here so the assertion below is about the
 * PRECEDENCE and not about one hardcoded string:
 *
 *   cover = mainImages[0] ?? first-colour-gallery-image
 */
const item = (product: Record<string, unknown> | null, colorVariantName?: string) => ({
  colorVariantName: colorVariantName ?? null,
  inventory: { colorVariantName: colorVariantName ?? null, product },
});

describe('resolveOrderItemImageUrl — order emails share the storefront cover precedence', () => {
  it('prefers the shared gallery over the selected colour gallery', () => {
    // The inversion this replaced: the colour gallery won, so an order email
    // showed a different picture than the storefront card/PDP for the very
    // product the customer bought.
    const product = {
      mainImages: ['https://cdn.example.com/shared-cover.jpg', 'https://cdn.example.com/s2.jpg'],
      colorVariants: [{ name: 'Red', images: ['https://cdn.example.com/red-1.jpg'] }],
    };
    expect(resolveOrderItemImageUrl(item(product, 'Red'))).toBe(
      'https://cdn.example.com/shared-cover.jpg',
    );
  });

  it('agrees with resolveCover on every cover-less product', () => {
    const coverless = {
      mainImages: [] as string[],
      colorVariants: [
        { name: 'Red', images: [] },
        { name: 'Blue', images: ['https://cdn.example.com/blue-1.jpg'] },
      ],
    };
    // No shared cover: the first colour that actually has a photo becomes the
    // cover, exactly as the storefront resolves it.
    expect(resolveOrderItemImageUrl(item(coverless, 'Red'))).toBe(
      'https://cdn.example.com/blue-1.jpg',
    );
    expect(resolveOrderItemImageUrl(item(coverless, 'Blue'))).toBe(
      'https://cdn.example.com/blue-1.jpg',
    );
    expect(resolveOrderItemImageUrl(item(coverless))).toBe(
      resolveCover(coverless.mainImages, coverless.colorVariants),
    );
  });

  it('never returns a different answer from the shared resolver', () => {
    const products: Array<Record<string, unknown>> = [
      { mainImages: ['https://cdn.example.com/a.jpg'], colorVariants: [] },
      {
        mainImages: [],
        colorVariants: [{ name: 'Red', images: ['https://cdn.example.com/r.jpg'] }],
      },
      { mainImages: ['', '  ', 'https://cdn.example.com/c.jpg'], colorVariants: [] },
      {
        mainImages: [],
        colorVariants: [{ name: 'Red', images: ['', 'https://cdn.example.com/d.jpg'] }],
      },
      { mainImages: undefined, colorVariants: undefined },
      { mainImages: [], colorVariants: [] },
    ];
    for (const product of products) {
      expect(resolveOrderItemImageUrl(item(product, 'Red'))).toBe(
        resolveCover(product.mainImages, product.colorVariants) ?? null,
      );
    }
  });

  it('returns null for a missing product or an image-less product', () => {
    expect(resolveOrderItemImageUrl({ colorVariantName: 'Red', inventory: null })).toBeNull();
    expect(resolveOrderItemImageUrl(item({ mainImages: [], colorVariants: [] }))).toBeNull();
  });
});
