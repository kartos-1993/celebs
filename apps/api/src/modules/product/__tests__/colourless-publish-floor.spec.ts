import type { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { inventoryRepository } from '@/modules/inventory/inventory.repository';
import { ProductService } from '@/modules/product/product.service';
import {
  COVER_PHOTO_BLOCKER,
  getColorImageBlockers,
  type PublishFloorInput,
  sumVariantStock,
} from '@/modules/product/utils/product-qc';

/**
 * A product with NO colour axis is a first-class product: one cover photo and
 * one (or more) plain SKUs. It must publish, and it must own inventory rows —
 * otherwise it is invisible to checkout the moment it goes live.
 *
 * The publish floor is the guard that decides this, and it is reached from two
 * directions: `product.service`'s `assertPublishFloor` (via the two exported
 * helpers it composes) and `syncProductInventory`.
 */

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

/** Minimal transaction double: records writes, no database involved. */
const createMockTx = (
  existingRows: Array<{
    id: string;
    colorVariantName: string;
    size: string;
    sku: string;
    quantity: number;
  }> = [],
) => {
  const created: unknown[] = [];
  const updated: unknown[] = [];

  const tx = {
    productInventory: {
      findMany: vi.fn().mockResolvedValue(existingRows),
      createMany: vi.fn().mockImplementation(({ data }) => {
        created.push(...data);
        return Promise.resolve({ count: data.length });
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $executeRaw: vi
      .fn()
      .mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
        updated.push({ strings, values });
        return Promise.resolve(1);
      }),
  } as unknown as Prisma.TransactionClient;

  return { tx, created, updated };
};

let productService: ProductService;

/**
 * `assertPublishFloor` is the private gate on `ProductService` shared by create
 * and the draft→published transition. Bracket access reaches it without
 * exporting internals; the public entry points that call it are pinned by
 * `product-lifecycle.spec.ts` / `product-published-safeguards.spec.ts`.
 *
 * It takes the widened floor input, because a colourless product's gallery and
 * stock live outside `colorVariants` (`mainImages` / `skus`).
 */
const assertPublishFloor = (input: PublishFloorInput): void => {
  productService['assertPublishFloor'](input);
};

const COLOURLESS = { colorVariants: [], mainImages: ['cover.jpg'], skus: [{ stock: 5 }] };

beforeEach(() => {
  productService = new ProductService();
});

describe('a product with no colour axis', () => {
  it('has no colour-image blockers when it carries only a cover photo', () => {
    // `mainImages` is non-empty and there is no colour axis at all, so there is
    // no per-colour gallery to satisfy.
    expect(getColorImageBlockers([])).toEqual([]);
    expect(getColorImageBlockers([], COLOURLESS)).toEqual([]);
  });

  it('has no colour-image blockers when colourVariants is absent entirely', () => {
    expect(getColorImageBlockers(undefined)).toEqual([]);
  });

  it('is blocked on the cover photo, never on a colour variant, when it has no image', () => {
    expect(getColorImageBlockers([], { colorVariants: [], mainImages: [] })).toEqual([
      COVER_PHOTO_BLOCKER,
    ]);
  });

  it('is unblocked by a colorMeta-only product, which today is wrongly blocked', () => {
    const colorMetaOnly = {
      colorVariants: [],
      mainImages: [],
      dynamicData: {
        variants: { colorMeta: { '#ff0000': { name: 'Red', images: ['red-1.jpg'] } } },
      },
    };

    expect(getColorImageBlockers([], colorMetaOnly)).toEqual([]);
  });

  it('sums to zero colour-held stock, so the floor must read stock elsewhere', () => {
    // The floor's stock check reads `colorVariants[].stocks[].quantity`. For a
    // colourless product its stock lives on `skus[].stock`, which is why
    // sumVariantStock alone must not be read as "this product has no stock".
    expect(sumVariantStock([])).toBe(0);
    expect(sumVariantStock([], [{ stock: 5 }])).toBe(5);
  });

  it('clears the publish floor with stock carried on its SKUs', () => {
    // A colourless product is stocked through `skus[].stock` (5 units), which is
    // what `syncProductInventory` turns into its inventory row. `colorVariants:
    // []` must not veto that.
    expect(() => assertPublishFloor(COLOURLESS)).not.toThrow();
  });

  it('is blocked on the cover photo when it has neither a cover nor a colour', () => {
    expect(() => assertPublishFloor({ ...COLOURLESS, mainImages: [] })).toThrow(
      COVER_PHOTO_BLOCKER,
    );
  });

  it('is blocked on stock when its SKUs hold nothing', () => {
    expect(() => assertPublishFloor({ ...COLOURLESS, skus: [{ stock: 0 }] })).toThrow(
      /Add at least 1 unit in one size to publish\./,
    );
  });

  it('produces an inventory row for its default SKU', async () => {
    const { tx, created } = createMockTx();

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-colourless',
      [],
      [{ skuCode: 'CLB-MUG-STD', selectedOptions: {}, isDefault: true }],
      'HOME',
      { isPublished: false },
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      productId: 'prod-colourless',
      colorVariantName: 'Default',
      size: 'Default',
      sku: 'CLB-MUG-STD',
    });
  });

  it('produces one carrier row per size, with that size carried through from the SKU', async () => {
    const { tx, created } = createMockTx();

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-colourless-sizes',
      [],
      [
        { skuCode: 'CLB-MUG-S', selectedOptions: { Size: 'S' }, stock: 2 },
        { skuCode: 'CLB-MUG-M', selectedOptions: { Size: 'M' }, stock: 4 },
      ],
      'HOME',
      { isPublished: false },
    );

    expect(created).toEqual([
      {
        productId: 'prod-colourless-sizes',
        colorVariantName: 'Default',
        size: 'M',
        sku: 'CLB-MUG-M',
        quantity: 4,
      },
      {
        productId: 'prod-colourless-sizes',
        colorVariantName: 'Default',
        size: 'S',
        sku: 'CLB-MUG-S',
        quantity: 2,
      },
    ]);
  });
});
