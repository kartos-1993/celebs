import { useController, useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import type { FieldSpec, ProductFormValues } from '../../types';
import { getNestedValue, skuVariantPath } from '../add-product-helpers';
import { buildProductPayload } from '../add-product-payload';
import { hydrateProductForm } from '../hydrate-product-form';

/**
 * Edit-mode save round-trip.
 *
 * The journey a seller actually takes: open a stored product, read the SKU
 * matrix cells, change ONE price, save. Nothing here may silently fall back to
 * a stale stored number — that is unrecoverable data loss the seller only
 * notices after the product is already live.
 *
 * A real `useForm` + real `useController` cell is used (not a hand-rolled
 * values object) because the whole defect lives in how RHF stores what
 * `hydrateProductForm` produced: hydration writes literal dotted keys while a
 * registered controller reads and writes nested paths.
 */

const CELL_PATH = 'sku.variants.Color.Blue.Size.M.price' as const;

/**
 * `FieldSpec['dataSource']` is declared as `Record<string, unknown>`, but a
 * variant axis's option list is read as an ARRAY of `{ value, label }` (see
 * `add-product-helpers.getLabelMap`). The declared type is under-specified, so
 * the fixture is widened here rather than typed as `any`.
 */
const axisOptions = (options: Array<{ value: string; label: string }>) =>
  options as unknown as FieldSpec['dataSource'];

const fields: FieldSpec[] = [
  { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
  {
    name: 'Color',
    uiType: 'multiselect',
    label: 'Color',
    group: 'variant',
    dataSource: axisOptions([
      { value: 'Red', label: 'Red' },
      { value: 'Blue', label: 'Blue' },
    ]),
  },
  {
    name: 'Size',
    uiType: 'multiselect',
    label: 'Size',
    group: 'variant',
    dataSource: axisOptions([{ value: 'M', label: 'M' }]),
  },
];

const storedProduct: AdminProductDetail = {
  id: 'prod-1',
  name: 'Handwoven Cotton Kurta',
  brand: 'Annapurna',
  description: 'A handwoven kurta with side pockets.',
  price: 2400,
  status: 'published',
  categoryId: 'cat-women',
  subcategoryId: 'sub-kurta',
  mainImages: ['https://cdn.example.com/cover-1.jpg'],
  colorVariants: [
    {
      name: 'Red',
      colorCode: '#B22222',
      images: ['https://cdn.example.com/red-1.jpg'],
      stocks: [{ size: 'M', quantity: 4 }],
    },
    {
      name: 'Blue',
      colorCode: '#1B3A6B',
      images: ['https://cdn.example.com/blue-1.jpg'],
      stocks: [{ size: 'M', quantity: 6 }],
    },
  ],
  skus: [
    {
      skuCode: 'ANNA-RED-M',
      selectedOptions: { Color: 'Red', Size: 'M' },
      price: 2400,
      stock: 4,
      isDefault: true,
    },
    {
      skuCode: 'ANNA-BLUE-M',
      selectedOptions: { Color: 'Blue', Size: 'M' },
      price: 2650,
      stock: 6,
    },
  ],
  sizes: [{ name: 'M' }],
  dynamicData: {
    values: {},
    variantFields: [
      { key: 'Color', kind: 'color' },
      { key: 'Size', kind: 'size' },
    ],
    uploadedAssets: {
      colorMeta: {
        Red: { swatch: '#B22222', images: ['https://cdn.example.com/red-1.jpg'] },
        Blue: { swatch: '#1B3A6B', images: ['https://cdn.example.com/blue-1.jpg'] },
      },
    },
  },
};

const upload = vi
  .fn()
  .mockImplementation(async (files: unknown[]) =>
    files.map((entry) => (typeof entry === 'string' ? entry : 'https://cdn.example.com/new.jpg')),
  );

/**
 * The same product as stored after a save that also carried a `sku` block in
 * `dynamicData.values` — a shape `hydrateProductForm` explicitly supports
 * (`if (k === 'sku') values.sku = v`). It matters because the nested `sku`
 * object is then written BEFORE the flat dotted keys, which is the ordering
 * that decides whose copy of a cell price wins.
 */
const storedProductWithNestedSkuBlock: AdminProductDetail = {
  ...storedProduct,
  dynamicData: {
    ...storedProduct.dynamicData,
    values: {
      sku: {
        variants: {
          Color: {
            Red: { Size: { M: { price: 2400, stock: 4, sellerSku: 'ANNA-RED-M' } } },
            Blue: { Size: { M: { price: 2650, stock: 6, sellerSku: 'ANNA-BLUE-M' } } },
          },
        },
      },
    },
  },
};

/**
 * The same product as stored by a build that persisted `dynamicData.values`
 * with LITERAL dotted keys — the shape that produced the original defect. It
 * matters because those keys are rehydrated through the shared nested writer, so
 * a legacy record cannot reintroduce the flat sibling that used to shadow the
 * seller's edit.
 */
const storedProductWithLegacyFlatKeys: AdminProductDetail = {
  ...storedProduct,
  dynamicData: {
    ...storedProduct.dynamicData,
    values: {
      'sku.variants.Color.Blue.Size.M.price': 2650,
      'sku.variants.Color.Blue.Size.M.stock': 6,
      'sku.variants.Color.Red.Size.M.price': 2400,
      'sku.variants.Color.Red.Size.M.stock': 4,
    },
  },
};

/** Mirrors `useProductForm`'s form configuration exactly. */
function renderEditForm(cellPath: string = CELL_PATH) {
  return renderHook(() => {
    const form = useForm<ProductFormValues>({
      defaultValues: {
        name: '',
        brand: '',
        description: '',
        categoryId: '',
        subcategoryId: '',
        status: 'draft',
      },
      mode: 'onChange',
      shouldUnregister: false,
    });
    // One real matrix cell, registered exactly like `VariantFieldInput` does.
    const cell = useController({ name: cellPath, control: form.control });
    return { form, cell };
  });
}

const buildPayload = (form: { getValues: () => ProductFormValues }) =>
  buildProductPayload({
    fields,
    status: 'draft',
    values: form.getValues() as Record<string, unknown>,
    upload,
    isUpdate: true,
  });

const priceFor = (
  payload: { skus?: Array<{ selectedOptions?: Record<string, string>; price: number }> },
  color: string,
) => payload.skus?.find((sku) => sku.selectedOptions?.Color === color)?.price;

describe('edit → save round-trip keeps the seller\u2019s price', () => {
  it('shows the stored price in the SKU matrix cell after hydration', () => {
    const { result } = renderEditForm();

    act(() => {
      result.current.form.reset(hydrateProductForm(storedProduct));
    });

    // The stored Blue / M SKU is priced at 2650; the cell the seller edits on
    // screen must read that number, not a blank.
    expect(result.current.cell.field.value).toBe('2650');
  });

  it('writes the stored price into the payload for every variant row', async () => {
    const { result } = renderEditForm();

    act(() => {
      result.current.form.reset(hydrateProductForm(storedProduct));
    });

    const payload = await buildPayload(result.current.form);

    expect(priceFor(payload, 'Red')).toBe(2400);
    expect(priceFor(payload, 'Blue')).toBe(2650);
  });

  it('ships the NEW price after the seller edits a single matrix cell', async () => {
    const { result } = renderEditForm();

    act(() => {
      result.current.form.reset(hydrateProductForm(storedProduct));
    });

    act(() => {
      result.current.cell.field.onChange('2900');
    });

    const payload = await buildPayload(result.current.form);

    // The one cell the seller touched is the one that must change. The other
    // row must stay on its stored value.
    expect(priceFor(payload, 'Blue')).toBe(2900);
    expect(priceFor(payload, 'Red')).toBe(2400);
  });

  it('ships the NEW price when the stored product also carries a nested sku block', async () => {
    const { result } = renderEditForm();

    act(() => {
      result.current.form.reset(hydrateProductForm(storedProductWithNestedSkuBlock));
    });

    act(() => {
      result.current.cell.field.onChange('2900');
    });

    const payload = await buildPayload(result.current.form);

    expect(priceFor(payload, 'Blue')).toBe(2900);
  });

  it('ships the NEW price from a legacy record that stored literal dotted keys', async () => {
    const { result } = renderEditForm();

    act(() => {
      result.current.form.reset(hydrateProductForm(storedProductWithLegacyFlatKeys));
    });

    // The legacy flat spelling is rehydrated NESTED, so the cell reads it…
    expect(result.current.cell.field.value).toBe('2650');

    act(() => {
      result.current.cell.field.onChange('2900');
    });

    const payload = await buildPayload(result.current.form);

    // …and the edit is not shadowed by a resurrected flat sibling.
    expect(priceFor(payload, 'Blue')).toBe(2900);
    expect(priceFor(payload, 'Red')).toBe(2400);
  });

  it('round-trips a cell on a differently-named, sanitised axis instead of leaving it blank', async () => {
    // The second half of the wave: the writer used to hardcode `Color`/`Size`
    // segments, so a category whose axes are `Shade`/`Length` with a `28.5` size
    // had its cell register a path the writer never produced — permanently
    // blank in edit mode, and therefore silently unsavable.
    const shadedProduct: AdminProductDetail = {
      ...storedProduct,
      skus: [
        {
          skuCode: 'CB-NAVY-28_5',
          selectedOptions: { Shade: 'Blue', Length: '28.5' },
          price: 2650,
          stock: 6,
        },
      ],
      dynamicData: {
        ...storedProduct.dynamicData,
        variantFields: [
          { key: 'Shade', kind: 'color', label: 'Shade' },
          { key: 'Length', kind: 'size', label: 'Length' },
        ],
      },
      // The selected axis values must match the rows the SKU table was stored
      // with, or the payload walks axis pairs the matrix never wrote.
      sizes: [{ name: '28.5' }],
    };
    // The schema must name the same axes the product was stored with, or the
    // payload prunes the `Shade`/`Length` paths as orphans before it reads them.
    const shadedFields: FieldSpec[] = [
      fields[0],
      {
        name: 'Shade',
        uiType: 'multiselect',
        label: 'Shade',
        group: 'variant',
        dataSource: axisOptions([
          { value: 'Red', label: 'Red' },
          { value: 'Blue', label: 'Blue' },
        ]),
      },
      {
        name: 'Length',
        uiType: 'multiselect',
        label: 'Length',
        group: 'variant',
        dataSource: axisOptions([
          { value: '28.5', label: '28.5' },
          { value: '32', label: '32' },
        ]),
      },
    ];
    const shadedPath = skuVariantPath('Shade', 'Blue', 'Length', '28.5', 'price');
    const { result } = renderEditForm(shadedPath);

    act(() => {
      result.current.form.reset(hydrateProductForm(shadedProduct));
    });

    // Not blank: the registered path is exactly the one the writer produced.
    expect(result.current.cell.field.value).toBe('2650');

    act(() => {
      result.current.cell.field.onChange('2900');
    });

    const payload = await buildProductPayload({
      fields: shadedFields,
      status: 'draft',
      values: result.current.form.getValues() as Record<string, unknown>,
      upload,
      isUpdate: true,
    });

    expect(payload.skus?.find((sku) => sku.selectedOptions?.Shade === 'Blue')?.price).toBe(2900);
  });

  it('stores a differently-named axis under its REAL key, so the NEXT edit can read it', async () => {
    // The other half of the same defect, on the write side: the payload keyed
    // `selectedOptions` by the literals `Color`/`Size` regardless of the schema.
    // A `Shade`/`Length` category therefore saved rows that
    // `resolveSkuAxes` — which reads the real axis keys — cannot resolve on the
    // next edit, so the cell went blank again one save later. This pins the
    // stored record, not just the price.
    const shadedProduct: AdminProductDetail = {
      ...storedProduct,
      // One colour only, so the stored row count is the axis cross product and
      // the assertion below is about KEYS, not about row count.
      colorVariants: [storedProduct.colorVariants?.[1] as never],
      skus: [
        {
          skuCode: 'CB-NAVY-28_5',
          selectedOptions: { Shade: 'Blue', Length: '28.5' },
          price: 2650,
          stock: 6,
        },
      ],
      dynamicData: {
        ...storedProduct.dynamicData,
        variantFields: [
          { key: 'Shade', kind: 'color', label: 'Shade' },
          { key: 'Length', kind: 'size', label: 'Length' },
        ],
      },
      sizes: [{ name: '28.5' }],
    };
    const shadedFields: FieldSpec[] = [
      fields[0],
      {
        name: 'Shade',
        uiType: 'multiselect',
        label: 'Shade',
        group: 'variant',
        dataSource: axisOptions([{ value: 'Blue', label: 'Blue' }]),
      },
      {
        name: 'Length',
        uiType: 'multiselect',
        label: 'Length',
        group: 'variant',
        dataSource: axisOptions([{ value: '28.5', label: '28.5' }]),
      },
    ];
    const { result } = renderEditForm(skuVariantPath('Shade', 'Blue', 'Length', '28.5', 'price'));

    act(() => {
      result.current.form.reset(hydrateProductForm(shadedProduct));
    });

    const payload = await buildProductPayload({
      fields: shadedFields,
      status: 'draft',
      values: result.current.form.getValues() as Record<string, unknown>,
      upload,
      isUpdate: true,
    });

    // The row is stored under the axes the product actually declares, and NOT
    // under the `Color`/`Size` literals the old writer forced.
    expect(payload.skus).toHaveLength(1);
    expect(payload.skus?.[0].selectedOptions).toEqual({ Shade: 'Blue', Length: '28.5' });
    expect(payload.skus?.[0].selectedOptions?.Color).toBeUndefined();
    expect(payload.skus?.[0].selectedOptions?.Size).toBeUndefined();

    // And the round trip is closed: rehydrating what was just saved puts the
    // seller's number back in the cell, with no second edit needed.
    const rehydrated = hydrateProductForm({
      ...shadedProduct,
      skus: payload.skus as AdminProductDetail['skus'],
    } as AdminProductDetail);

    expect(
      getNestedValue(rehydrated, skuVariantPath('Shade', 'Blue', 'Length', '28.5', 'price')),
    ).toBe('2650');
  });
});
