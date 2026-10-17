import { useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import type { FieldSpec, ProductFormValues } from '../../types';
import { getNestedValue } from '../add-product-helpers';
import {
  buildProductPayload,
  COVER_FIELD_NAME,
  resolveCoverFieldName,
} from '../add-product-payload';
import { hydrateProductForm } from '../hydrate-product-form';

/**
 * GALLERY round trip: open a stored product, touch NOTHING, save.
 *
 * The cover gallery is a SHARED (product-level) gallery and the per-colour
 * galleries belong to each colour. The defect pinned here: the admin detail
 * applied the storefront's leading-swatch-duplicate strip to `colorVariants`,
 * which is an INPUT the edit form posts straight back — so every save that did
 * not open the gallery dropped one stored image, permanently, with the seller
 * having changed nothing.
 */

const axisOptions = (options: Array<{ value: string; label: string }>) =>
  options as unknown as FieldSpec['dataSource'];

/** The server's published cover field spec: `mainImages`, one name end to end. */
const fields: FieldSpec[] = [
  { name: 'mainImages', uiType: 'MainImage', label: 'Cover Images', group: 'base' },
  { name: 'name', uiType: 'input', label: 'Product Name', group: 'base' },
  {
    name: 'Color',
    uiType: 'multiselect',
    label: 'Color',
    group: 'variant',
    dataSource: axisOptions([{ value: 'Red', label: 'Red' }]),
  },
  {
    name: 'Size',
    uiType: 'multiselect',
    label: 'Size',
    group: 'variant',
    dataSource: axisOptions([{ value: 'M', label: 'M' }]),
  },
];

const SHARED = ['https://cdn.example.com/shared-1.jpg', 'https://cdn.example.com/shared-2.jpg'];
const RED_SWAATCH = 'https://cdn.example.com/red-swatch.png';
/** The legacy shape the strip exists for: the swatch IS the first gallery photo. */
const RED_STORED = [RED_SWAATCH, 'https://cdn.example.com/red-1.jpg'];

const baseProduct = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  id: 'prod-gallery',
  name: 'Handwoven Cotton Kurta',
  price: 2400,
  status: 'published',
  categoryId: 'cat-women',
  subcategoryId: 'sub-kurta',
  mainImages: [...SHARED],
  colorVariants: [
    {
      name: 'Red',
      colorCode: '#B22222',
      swatch: RED_SWAATCH,
      images: [...RED_STORED],
      stocks: [{ size: 'M', quantity: 4 }],
    },
  ],
  sizes: [{ name: 'M' }],
  skus: [
    {
      skuCode: 'ANNA-RED-M',
      selectedOptions: { Color: 'Red', Size: 'M' },
      price: 2400,
      stock: 4,
      isDefault: true,
    },
  ],
  dynamicData: {
    values: {},
    variantFields: [
      { key: 'Color', kind: 'color' },
      { key: 'Size', kind: 'size' },
    ],
  },
  ...overrides,
});

const upload = vi
  .fn()
  .mockImplementation(async (files: unknown[]) =>
    files.map((entry) => (typeof entry === 'string' ? entry : 'https://cdn.example.com/new.jpg')),
  );

/** Real `useForm` + real hydration, so nothing is hand-rolled. */
function hydratedForm(product: AdminProductDetail) {
  const { result } = renderHook(() =>
    useForm<ProductFormValues>({
      defaultValues: {},
      mode: 'onChange',
      shouldUnregister: false,
    }),
  );
  act(() => {
    result.current.reset(hydrateProductForm(product));
  });
  return result.current;
}

const saveWithoutTouchingImages = (product: AdminProductDetail) => {
  const form = hydratedForm(product);
  return buildProductPayload({
    fields,
    status: 'draft',
    values: form.getValues() as Record<string, unknown>,
    upload,
    isUpdate: true,
  });
};

const redImages = (payload: Awaited<ReturnType<typeof saveWithoutTouchingImages>>) =>
  payload.colorVariants?.find((variant) => variant.name === 'Red')?.images;

describe('a save that touches no images round-trips byte-identically', () => {
  it('posts the stored per-colour gallery, swatch head included', async () => {
    const product = baseProduct();
    const payload = await saveWithoutTouchingImages(product);

    // The stored array, exactly — same length, same order, same strings. The
    // old admin strip made this `['…/red-1.jpg']`, i.e. one image shorter on
    // every single save.
    expect(redImages(payload)).toEqual(RED_STORED);
    expect(JSON.stringify(redImages(payload))).toBe(JSON.stringify(RED_STORED));
  });

  it('posts the stored shared gallery under the write contract key', async () => {
    const payload = await saveWithoutTouchingImages(baseProduct());

    expect(payload.mainImages).toEqual(SHARED);
  });

  it('keeps the canonical colorMeta mirror identical to the stored gallery', async () => {
    // The storefront reads `dynamicData.variants.colorMeta`, so a mirror that
    // disagrees with `colorVariants` would show the storefront a different
    // gallery than the one that was saved.
    const payload = await saveWithoutTouchingImages(baseProduct());
    const colorMeta = getNestedValue(payload, 'dynamicData.variants.colorMeta') as
      | Record<string, { images: string[] }>
      | undefined;

    expect(colorMeta?.Red?.images).toEqual(RED_STORED);
  });

  it('survives a second open-and-save cycle unchanged', async () => {
    // Converging-after-one-loss is still data loss. Three cycles of
    // hydrate → save must keep returning the stored bytes.
    const product = baseProduct();
    const first = await saveWithoutTouchingImages(product);
    const second = await saveWithoutTouchingImages(
      baseProduct({ colorVariants: first.colorVariants as AdminProductDetail['colorVariants'] }),
    );

    expect(redImages(second)).toEqual(RED_STORED);
  });

  it('still strips the duplicate for DISPLAY, and records what it removed', () => {
    const values = hydratedForm(baseProduct()).getValues() as Record<string, unknown>;

    // The swatch renders as its own tile, so the form must not show the same
    // photo twice…
    expect(getNestedValue(values, 'variants.colorMeta.Red.images')).toEqual([
      'https://cdn.example.com/red-1.jpg',
    ]);
    // …but the exact URL removed is kept, so the save can put it back.
    expect(getNestedValue(values, 'variants.colorMeta.Red.strippedSwatchHead')).toBe(RED_SWAATCH);
  });

  it('never invents a swatch head for a gallery the seller curated', async () => {
    const curated = baseProduct({
      colorVariants: [
        {
          name: 'Red',
          colorCode: '#B22222',
          swatch: RED_SWAATCH,
          images: ['https://cdn.example.com/red-1.jpg', 'https://cdn.example.com/red-2.jpg'],
        },
      ],
    });

    const payload = await saveWithoutTouchingImages(curated);

    expect(redImages(payload)).toEqual([
      'https://cdn.example.com/red-1.jpg',
      'https://cdn.example.com/red-2.jpg',
    ]);
  });
});

describe('one name end to end: mainImages', () => {
  it('reads the cover off the schema field name the server publishes', () => {
    expect(resolveCoverFieldName(fields)).toBe(COVER_FIELD_NAME);
    expect(COVER_FIELD_NAME).toBe('mainImages');
  });

  it('falls back to the write-contract key when a schema declares no cover field', () => {
    expect(resolveCoverFieldName([])).toBe('mainImages');
  });

  it('reaches the schema field name even if a schema publishes a different one', async () => {
    // The payload follows the SPEC, not a hardcoded literal: a category served
    // by `useProductSchema`'s success-path fallback still declares `mainImage`,
    // and the gallery must not be dropped for it.
    const legacySchemaFields: FieldSpec[] = [
      { name: 'mainImage', uiType: 'MainImage', label: 'Main Product Image', group: 'media' },
      ...fields.slice(1),
    ];
    const form = hydratedForm(baseProduct());
    const payload = await buildProductPayload({
      fields: legacySchemaFields,
      status: 'draft',
      values: form.getValues() as Record<string, unknown>,
      upload,
      isUpdate: true,
    });

    expect(payload.mainImages).toEqual(SHARED);
  });
});

describe('the shared gallery is reachable in the edit form', () => {
  it('re-populates the stored shared gallery into the cover field', () => {
    const values = hydratedForm(baseProduct()).getValues() as Record<string, unknown>;

    expect(values.mainImages).toEqual(SHARED);
    // A seller who uploaded a shared gallery must SEE it in the only form that
    // can write it back — otherwise it is invisible and unchangeable.
    expect(values[resolveCoverFieldName(fields)]).toEqual(SHARED);
  });

  it('leaves the cover field empty for a product that has no shared gallery', () => {
    const coverless = baseProduct({ mainImages: undefined });
    const values = hydratedForm(coverless).getValues() as Record<string, unknown>;

    // Empty is the honest representation: the cover then comes from the first
    // colour's first photo (the server's cover rule), and a save does not
    // resurrect one the seller cleared.
    expect(values.mainImages).toBeUndefined();
  });
});
