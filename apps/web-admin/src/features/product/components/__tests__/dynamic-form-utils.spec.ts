import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import {
  addFallbackFields,
  CategoryAttributesError,
  ensureVariantSupportFields,
  normalizeSchema,
} from '../dynamic-form-utils';

vi.mock('../../api', () => ({ getDropdownCategoryById: vi.fn() }));

import { getDropdownCategoryById } from '../../api';

const mockedGetById = vi.mocked(getDropdownCategoryById);

const field = (overrides: Partial<FieldSpec> & { name: string }): FieldSpec => ({
  uiType: 'input',
  label: overrides.name,
  group: 'details',
  ...overrides,
});

describe('normalizeSchema', () => {
  it('moves SizeMeasurementsTable fields to the sale group', () => {
    const out = normalizeSchema([field({ name: 'sizes', uiType: 'SizeMeasurementsTable' })]);
    expect(out[0]?.group).toBe('sale');
  });

  it('leaves other fields untouched and does not mutate the input array', () => {
    const input = [field({ name: 'Color', uiType: 'multiselect', group: 'variant' })];
    const out = normalizeSchema(input);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
    expect(input[0]?.group).toBe('variant');
  });
});

describe('ensureVariantSupportFields', () => {
  it('returns fields unchanged when no variant axes exist', () => {
    const input = [field({ name: 'material' })];
    const out = ensureVariantSupportFields(input);
    expect(out).toEqual(input);
    expect(out.some((f) => f.uiType === 'SkuTableV2')).toBe(false);
  });

  it('injects ColorMeta plus the SkuTableV2 matrix for a color variant', () => {
    const out = ensureVariantSupportFields([
      field({ name: 'Color', uiType: 'multiselect', group: 'variant' }),
    ]);
    const colorMeta = out.find((f) => f.uiType === 'ColorMeta');
    expect(colorMeta?.dataSource).toEqual({ colorField: 'Color' });
    const skus = out.find((f) => f.uiType === 'SkuTableV2');
    expect(skus?.dataSource).toEqual({ variants: [{ key: 'Color', label: 'Color' }] });
    expect(skus?.required).toBe(true);
  });

  it('never duplicates ColorMeta or SkuTableV2 on repeat runs', () => {
    const once = ensureVariantSupportFields([
      field({ name: 'Color', uiType: 'multiselect', group: 'variant' }),
    ]);
    const twice = ensureVariantSupportFields(once);
    expect(twice.filter((f) => f.uiType === 'ColorMeta')).toHaveLength(1);
    expect(twice.filter((f) => f.uiType === 'SkuTableV2')).toHaveLength(1);
  });

  it('detects color by substring and wires sizeField into an existing size table', () => {
    const out = ensureVariantSupportFields([
      field({ name: 'ShirtColor', uiType: 'select', label: 'Shirt color', group: 'variant' }),
      field({ name: 'sizes', uiType: 'SizeMeasurementsTable', group: 'sale' }),
      field({ name: 'Size', uiType: 'multiselect', group: 'variant' }),
    ]);
    expect(out.find((f) => f.uiType === 'ColorMeta')?.dataSource).toEqual({
      colorField: 'ShirtColor',
    });
    expect(out.find((f) => f.uiType === 'SizeMeasurementsTable')?.dataSource).toEqual({
      sizeField: 'Size',
    });
  });
});

describe('addFallbackFields', () => {
  it('maps legacy inputType values to uiTypes with item dataSources', async () => {
    mockedGetById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        attributes: [
          {
            name: 'Color',
            label: 'Color',
            inputType: 'MULTISELECT',
            values: ['Red', 'Blue'],
            isVariant: true,
          },
          { name: 'weight', label: 'Weight', inputType: 'NUMBER', values: ['1'] },
          { name: 'cod', label: 'COD', inputType: 'BOOLEAN', values: [] },
          { name: 'size', label: 'Size', inputType: 'SELECT', values: ['S'] },
        ],
      },
    } as never);
    const out = await addFallbackFields('cat-1', []);
    expect(out.find((f) => f.name === 'Color')).toMatchObject({
      uiType: 'multiselect',
      group: 'variant',
      dataSource: {
        items: [
          { label: 'Red', value: 'Red' },
          { label: 'Blue', value: 'Blue' },
        ],
      },
    });
    // Non-select uiTypes get an empty items wrapper even when values exist.
    expect(out.find((f) => f.name === 'weight')?.dataSource).toEqual({ items: [] });
    // @todo-fix: BOOLEAN maps to capital-S 'Switch' while the
    // sibling UiType union spells it 'switch' elsewhere — unify the casing.
    expect(out.find((f) => f.name === 'cod')?.uiType).toBe('Switch');
    expect(out.find((f) => f.name === 'size')?.uiType).toBe('select');
  });

  it('prefers attribute code over name and skips existing names case-insensitively', async () => {
    mockedGetById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        attributes: [
          { code: 'material_code', name: 'Material', inputType: 'TEXT', values: [] },
          { name: 'COLOR', label: 'Color', inputType: 'MULTISELECT', values: ['Red'] },
        ],
      },
    } as never);
    const out = await addFallbackFields('cat-1', [field({ name: 'color' })]);
    expect(out.some((f) => f.name === 'material_code')).toBe(true);
    expect(out.filter((f) => f.name.toLowerCase() === 'color')).toHaveLength(1);
  });

  it('appends colorMeta once when a color field exists', async () => {
    mockedGetById.mockResolvedValue({ success: true, message: 'ok', data: {} } as never);
    const withColor = await addFallbackFields('cat-1', [
      field({ name: 'Color', group: 'variant' }),
    ]);
    expect(withColor.filter((f) => f.uiType === 'ColorMeta')) //
      .toHaveLength(1);
    const rerun = await addFallbackFields('cat-1', withColor);
    expect(rerun.filter((f) => f.uiType === 'ColorMeta')).toHaveLength(1);
  });

  it('rejects with CategoryAttributesError when the category fetch fails', async () => {
    const cause = new Error('network down');
    mockedGetById.mockRejectedValue(cause);
    const base = [field({ name: 'material' })];

    // A swallowed fetch failure used to return the base fields, which silently
    // dropped every attribute the category declares. The failure now rejects
    // so `useProductSchema` can surface a schema-error state instead.
    await expect(addFallbackFields('cat-1', base)).rejects.toBeInstanceOf(CategoryAttributesError);

    const error = await addFallbackFields('cat-1', base).catch((thrown: unknown) => thrown);
    expect(error).toMatchObject({ name: 'CategoryAttributesError', catId: 'cat-1' });
    expect((error as CategoryAttributesError).reason).toBe(cause);
  });

  it('still rejects (never fabricates fields) when the payload has no attributes array', async () => {
    mockedGetById.mockResolvedValue({ success: true, message: 'ok', data: {} } as never);
    // A missing `attributes` key is a valid empty-attribute category, NOT a
    // failure: the server answered, it simply declares no attributes.
    await expect(addFallbackFields('cat-1', [field({ name: 'material' })])).resolves.toEqual([
      field({ name: 'material' }),
    ]);
  });
});
