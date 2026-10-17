import { useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FieldSpec, ProductFormValues } from '../../../types';
import { autofillProductForm } from '../dev-autofill';

const field = (overrides: Partial<FieldSpec> & { name: string }): FieldSpec => ({
  uiType: 'input',
  label: overrides.name,
  group: 'details',
  ...overrides,
});

/** Reads the nested colorMeta rows the autofiller writes. */
const colorRows = (values: Record<string, unknown>): Record<string, Record<string, unknown>> => {
  const variants = values.variants as { colorMeta: Record<string, Record<string, unknown>> };
  return variants.colorMeta;
};

const fill = (defaultValues?: ProductFormValues, schemaFields: FieldSpec[] = []) => {
  const { result } = renderHook(() => {
    const form = useForm<ProductFormValues>({ defaultValues, shouldUnregister: false });
    return form;
  });
  act(() => {
    autofillProductForm(result.current, schemaFields);
  });
  return result.current;
};

describe('autofillProductForm', () => {
  it('fills the base fields, the default SKU, and reports the mock colors', () => {
    const form = fill();

    const values = form.getValues() as Record<string, unknown>;
    expect(values.name).toContain('Manfinity Hypemode');
    expect(values.brand).toBe('Manfinity');
    expect(values.description).toContain('ribbed knit polo shirt');
    // The canonical PLURAL gallery key. Autofill used to write the singular
    // `mainImage`, which nothing downstream reads — the mock photos looked
    // applied in dev and published an empty gallery.
    expect(values.mainImages).toHaveLength(2);
    expect(values.mainImage).toBeUndefined();
    expect(values.sku).toEqual({
      default: { price: '1200', stock: '15', sellerSku: 'POLO-SHIRT-MOCK', available: true },
    });
    // No color axis selected yet → the mock Blue/White swatch rows are written.
    expect(Object.keys(values.variants as Record<string, unknown>).length).toBeGreaterThan(0);
    expect(String(colorRows(values).Blue.swatch)).toContain('res.cloudinary.com');
  });

  it('maps each supported schema field to its mock value', () => {
    const form = fill({}, [
      field({ name: 'name', value: 'ignored' }),
      field({ name: 'origin', uiType: 'input' }),
      field({ name: 'count', uiType: 'number' }),
      field({ name: 'cod', uiType: 'Switch' }),
      field({
        name: 'size',
        uiType: 'select',
        dataSource: { items: [{ value: 'M' }, { value: 'L' }] },
      }),
      field({
        name: 'Color',
        uiType: 'multiselect',
        dataSource: { items: [{ value: 'Red' }, { value: 'Blue' }, { value: 'Green' }] },
      }),
      field({ name: 'Material', uiType: 'VariantList' }),
    ]);

    const values = form.getValues() as Record<string, unknown>;
    expect(values.origin).toBe('Premium Cotton Blend');
    expect(values.count).toBe(12);
    expect(values.cod).toBe(true);
    expect(values.size).toBe('M');
    // Only the first two options are taken, and the color axis drives swatches.
    expect(values.Color).toEqual(['Red', 'Blue']);
    // A VariantList without declared items falls back to the mock pair.
    expect(values.Material).toEqual(['Blue', 'White']);
    expect(colorRows(values).Red.hot).toBe(false);
  });

  it('leaves a declared-but-empty option list empty instead of inventing values', () => {
    const form = fill({}, [
      field({ name: 'Color', uiType: 'multiselect', dataSource: { items: [] } }),
    ]);

    expect((form.getValues() as Record<string, unknown>).Color).toEqual([]);
  });

  it('stamps every measurement of the existing size rows', () => {
    const form = fill({
      sizes: [
        {
          name: 'M',
          productMeasurements: [{ name: 'Shoulder', value: '' }],
          bodyMeasurements: [{ name: 'Height' }],
        },
      ],
    } as ProductFormValues);

    expect((form.getValues() as Record<string, unknown>).sizes).toEqual([
      {
        name: 'M',
        productMeasurements: [{ name: 'Shoulder', value: '45.5' }],
        bodyMeasurements: [{ name: 'Height', value: '45.5' }],
      },
    ]);
  });

  it('tolerates absent color and size axes', () => {
    const form = fill({} as ProductFormValues, [field({ name: 'sizes' })]);

    const values = form.getValues() as Record<string, unknown>;
    expect(values.sizes).toEqual([]);
    expect(Object.keys(colorRows(values))).toEqual(['Blue', 'White']);
  });
});
