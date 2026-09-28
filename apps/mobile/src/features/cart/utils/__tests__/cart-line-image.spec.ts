import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { CartItemHydrated } from '@celebs/shared-types';

import { resolveCartLineImage } from '../cart-selectors';

/**
 * A cart row must always show a picture. The picture lives on the PRODUCT, not
 * on the cart line: the line only knows which colour variant it is, so the
 * display image is derived at render time — the variant's own photo when the
 * line has a colour, the product cover otherwise.
 *
 * The optimistic "adding…" row is the worst case: it is built locally from what
 * the caller submitted, so it has no image at all. Reading `item.image` off it
 * hands `<Image source={{ uri: '' }}>` to expo-image, which renders a broken
 * thumbnail for the whole time the add is in flight.
 *
 * ASSUMED CONTRACT (not shipped): `resolveCartLineImage(line, product)` in
 * `../cart-selectors`, returning a non-empty display URL or `undefined` — never
 * `''`. The two production call sites are pinned by source below because the
 * mobile test environment is `node` (no component rendering).
 */

const CART_ITEM_CARD_SRC = readFileSync(
  resolve(__dirname, '../../components/cart-item-card.tsx'),
  'utf8',
);
const USE_CART_QUERIES_SRC = readFileSync(
  resolve(__dirname, '../../hooks/use-cart-queries.ts'),
  'utf8',
);
const USE_CART_LINE_PRODUCT_SRC = readFileSync(
  resolve(__dirname, '../../hooks/use-cart-line-product.ts'),
  'utf8',
);

function line(overrides: Partial<CartItemHydrated> = {}): CartItemHydrated {
  return {
    id: 'item-1',
    cartId: 'cart-1',
    inventoryId: 'inv-1',
    productId: 'prod-1',
    productName: 'Cotton Mug',
    productSlug: 'cotton-mug',
    price: 1000,
    colorVariantName: '',
    colorCode: '',
    image: '',
    size: 'Default',
    quantity: 1,
    availableStock: 5,
    isAvailable: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const product = {
  cover: 'products/mug-cover.jpg',
  colorVariants: [
    { name: 'Red', images: ['products/mug-red-1.jpg', 'products/mug-red-2.jpg'] },
    { name: 'Blue', images: ['products/mug-blue-1.jpg'] },
  ],
};

describe('cart line display image', () => {
  it("uses the line's colour variant photo when the line has a colour", () => {
    expect(resolveCartLineImage(line({ colorVariantName: 'Red' }), product)).toBe(
      'products/mug-red-1.jpg',
    );
  });

  it('matches the colour variant case-insensitively', () => {
    expect(resolveCartLineImage(line({ colorVariantName: 'blue' }), product)).toBe(
      'products/mug-blue-1.jpg',
    );
  });

  it('falls back to the product cover when the line has no colour', () => {
    expect(resolveCartLineImage(line({ colorVariantName: '' }), product)).toBe(
      'products/mug-cover.jpg',
    );
  });

  it("prefers the product's own data over a stale image stored on the line", () => {
    // The line was hydrated before the seller swapped the gallery.
    expect(
      resolveCartLineImage(
        line({ colorVariantName: 'Red', image: 'products/old-red.jpg' }),
        product,
      ),
    ).toBe('products/mug-red-1.jpg');
  });

  it('never returns an empty string for a colourless line with no stored image', () => {
    const resolved = resolveCartLineImage(line({ colorVariantName: '' }), product);
    expect(resolved).not.toBe('');
    expect(resolved).toBeTruthy();
  });

  it('never returns an empty string for an optimistic row that has no image yet', () => {
    // The optimistic row is exactly `image: ''` with an empty colour.
    const optimistic = line({ id: 'optimistic-prod-1', productName: '', image: '' });
    const resolved = resolveCartLineImage(optimistic, product);
    expect(resolved).not.toBe('');
    expect(resolved).toBeTruthy();
  });

  it('returns undefined rather than an empty uri when the product has no picture', () => {
    // The card then renders a placeholder tile — never a broken image.
    expect(
      resolveCartLineImage(line({ colorVariantName: '' }), {
        cover: '',
        colorVariants: [],
      }),
    ).toBeUndefined();
  });
});

describe('the cart line itself is a usable image source once it carries cover', () => {
  it('paints a colourless line straight from the cover the line carries', () => {
    // The API now denormalises the canonical cover onto every line, so the
    // colourless case needs no product at all. Structurally a `CartLineImageSource`
    // is `{ cover?, colorVariants? }`, so a line carrying `cover` satisfies it.
    const lineWithCover = { ...line({ colorVariantName: '' }), cover: 'products/line-cover.jpg' };
    expect(resolveCartLineImage(lineWithCover, lineWithCover)).toBe('products/line-cover.jpg');
  });

  it('still never yields an empty uri for a line whose cover has not arrived', () => {
    // The optimistic "adding…" row has no cover until the server answers.
    const optimistic = { ...line({ id: 'optimistic-1' }), cover: undefined };
    const resolved = resolveCartLineImage(optimistic, undefined);
    expect(resolved).not.toBe('');
  });

  it('keeps preferring the line colour gallery over the cover', () => {
    // The product is the only carrier of `colorVariants`, which is exactly why
    // the live lookup stays even though the line now carries `cover`.
    const lineWithCover = {
      ...line({ colorVariantName: 'Blue' }),
      cover: 'products/line-cover.jpg',
    };
    expect(resolveCartLineImage(lineWithCover, product)).toBe('products/mug-blue-1.jpg');
  });
});

describe('cart row renders the resolved display image', () => {
  it('no longer builds the thumbnail uri from the line image alone', () => {
    // `item.image` is empty on optimistic rows and stale on re-hydrated lines.
    expect(CART_ITEM_CARD_SRC).not.toContain("resolveImageUrl(item.image || '')");
  });

  it('routes the thumbnail through the shared cart image resolver', () => {
    expect(CART_ITEM_CARD_SRC).toContain('resolveCartLineImage');
  });

  it('no longer seeds the optimistic row with an empty image', () => {
    expect(USE_CART_QUERIES_SRC).not.toMatch(/^\s*image:\s*''/m);
  });

  it('still reads the product for the line colour gallery, not only for the cover', () => {
    // `cover` on the line covers the colourless case; the colour-variant photo
    // needs `colorVariants`, which only the product carries.
    expect(USE_CART_LINE_PRODUCT_SRC).toContain('PRODUCT_QUERY_KEYS.detail');
  });
});
