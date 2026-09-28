import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import { VariantFieldInput } from '../../fields/components/variant-field-input';
import type { FieldSpec, ProductFormValues } from '../../types';
import { buildProductPayload } from '../add-product-payload';
import { hydrateProductForm } from '../hydrate-product-form';

/**
 * STEP 1 — the edit→save round trip settled against a REAL FORM, not a
 * hand-rolled values object.
 *
 * Everything the browser actually does is in play here:
 *   - the real `useForm` config copied from `hooks/use-product-form.ts`
 *     (`mode`, `shouldUnregister`, `defaultValues`);
 *   - the real `VariantFieldInput` cell, which is a `useController` bound
 *     through `useFormContext` — the same component `SkuMatrixTable` renders;
 *   - the real `form.reset(hydrateProductForm(product, form.getValues()))`
 *     that `use-product-form.ts` runs in its hydration effect;
 *   - a real DOM keystroke (`fireEvent.change` on the mounted `<input>`), so
 *     the value travels React → RHF `field.onChange` → `setValue` exactly as a
 *     seller's typing does;
 *   - the real `buildProductPayload` submit path.
 *
 * Why this file exists separately from `edit-save-roundtrip.spec.ts`: that spec
 * drives `field.onChange` directly on a controller it owns. It cannot observe
 * the flat/nested dual shape, because a controller it registered itself never
 * has one. A pass there is therefore not evidence about the shipped form.
 */

const CELL = 'sku.variants.Color.Blue.Size.M.price' as const;

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
  id: 'prod-real-1',
  name: 'Handwoven Cotton Kurta',
  brand: 'Annapurna',
  description: 'A handwoven kurta with side pockets.',
  price: 2400,
  status: 'published',
  categoryId: 'cat-women',
  subcategoryId: 'sub-kurta',
  mainImages: ['https://cdn.example.com/cover-1.jpg'],
  colorVariants: [
    { name: 'Red', colorCode: '#B22222', images: [], stocks: [] },
    { name: 'Blue', colorCode: '#1B3A6B', images: [], stocks: [] },
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
    {
      skuCode: 'ANNA-BLUE-M',
      selectedOptions: { Color: 'Blue', Size: 'M' },
      price: 2650,
      stock: 6,
    },
  ],
  dynamicData: {
    values: {},
    variantFields: [
      { key: 'Color', kind: 'color' },
      { key: 'Size', kind: 'size' },
    ],
    uploadedAssets: { colorMeta: {} },
  },
};

/** The hazard shape: a nested `sku` block AND legacy literal dotted keys. */
const dualShapeProduct: AdminProductDetail = {
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
      'sku.variants.Color.Blue.Size.M.price': 2650,
      'sku.variants.Color.Blue.Size.M.stock': 6,
      'sku.variants.Color.Red.Size.M.price': 2400,
      'sku.variants.Color.Red.Size.M.stock': 4,
    },
  },
};

const upload = vi
  .fn()
  .mockImplementation(async (files: unknown[]) =>
    files.map((entry) => (typeof entry === 'string' ? entry : 'https://cdn.example.com/new.jpg')),
  );

type FormBox = { form?: UseFormReturn<ProductFormValues> };

/**
 * `useProductForm`'s config, verbatim (`mode`, `shouldUnregister`,
 * `defaultValues`) — the settings that decide whether hydration's output and a
 * registered controller can ever agree on one value.
 */
function RealEditForm({ box, path = CELL }: { box: FormBox; path?: string }) {
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
  box.form = form;
  return (
    <FormProvider {...form}>
      {/* The exact cell SkuMatrixTable renders for a `.price` path. */}
      <VariantFieldInput name={path} type="number" required />
    </FormProvider>
  );
}

const mountEditForm = (path?: string) => {
  const box: FormBox = {};
  render(<RealEditForm box={box} path={path} />);
  const form = box.form as UseFormReturn<ProductFormValues>;
  return { form, input: screen.getByRole('spinbutton') as HTMLInputElement };
};

/** `use-product-form.ts`'s hydration effect, run against a real form. */
const hydrateInto = (form: UseFormReturn<ProductFormValues>, product: AdminProductDetail) => {
  act(() => {
    form.reset(hydrateProductForm(product, form.getValues()));
  });
};

/** A real keystroke into the mounted cell — React → RHF → `setValue`. */
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
};

const buildPayload = (form: UseFormReturn<ProductFormValues>) =>
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

/** Every dotted key at every depth — the dual shape is detectable, not assumed. */
function collectDottedKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [...(key.includes('.') ? [path] : []), ...collectDottedKeys(entry, path)];
  });
}

describe('edit → save under a real form: the cell, the keystroke, the payload', () => {
  it('displays the stored price and ships the NEW price the seller typed', async () => {
    const { form, input } = mountEditForm();
    hydrateInto(form, storedProduct);

    // 1. The cell DISPLAYS the stored price (2650), not a blank.
    expect(input.value).toBe('2650');

    // 2. The seller types a new price through the mounted input.
    await typeInto(input, '2900');
    expect(input.value).toBe('2900');

    // 3. The submit path builds the payload from `form.getValues()`.
    const payload = await buildPayload(form);

    // 4. The payload carries the NEW price, and the untouched row keeps its own.
    expect(priceFor(payload, 'Blue')).toBe(2900);
    expect(priceFor(payload, 'Red')).toBe(2400);
  });

  it('ships the NEW price when the record carries BOTH a nested sku block and flat dotted keys', async () => {
    const { form, input } = mountEditForm();
    hydrateInto(form, dualShapeProduct);

    // Whichever copy hydration resolved, the cell must show the stored 2650…
    expect(input.value).toBe('2650');
    // …and the hydrated form must be NESTED-ONLY: no flat sibling exists for a
    // flat-first reader to prefer over the value the seller is about to type.
    expect(collectDottedKeys(form.getValues())).toEqual([]);

    await typeInto(input, '2900');

    const payload = await buildPayload(form);
    expect(priceFor(payload, 'Blue')).toBe(2900);
    expect(priceFor(payload, 'Red')).toBe(2400);
  });

  it('reports whether a later refetch reset reverts an unsaved edit', async () => {
    const { form, input } = mountEditForm();
    hydrateInto(form, storedProduct);
    await typeInto(input, '2900');
    expect(priceFor(await buildPayload(form), 'Blue')).toBe(2900);

    // A refetch re-runs the same effect with the SAME (still-unsaved) server
    // record. This is the honest observation of that path, not a wish: the
    // server copy is 2650, and hydration writes the server copy over the cell.
    hydrateInto(form, storedProduct);

    expect({ cell: input.value, payloadBlue: priceFor(await buildPayload(form), 'Blue') }).toEqual({
      cell: '2650',
      payloadBlue: 2650,
    });
  });
});
