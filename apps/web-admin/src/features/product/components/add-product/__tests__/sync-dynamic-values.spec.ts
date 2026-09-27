import type { UseFormReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { ProductFormValues } from '../../../types';
import { DYNAMIC_FIELD_SYNC_RULES, syncDynamicTitleAndBrand } from '../sync-dynamic-values';

function createMockForm(initial: Partial<ProductFormValues> = {}) {
  const values: Record<string, unknown> = {
    name: '',
    brand: '',
    ...initial,
  };

  const getValues = vi.fn((key?: keyof ProductFormValues | (keyof ProductFormValues)[]) => {
    if (typeof key === 'string') return values[key];
    return values;
  });

  const setValue = vi.fn((key: string, value: unknown) => {
    values[key] = value;
  });

  return {
    form: {
      getValues,
      setValue,
    } as unknown as UseFormReturn<ProductFormValues>,
    getValues,
    setValue,
  };
}

describe('syncDynamicTitleAndBrand', () => {
  it('exposes declarative rules for title and brand synchronization', () => {
    expect(DYNAMIC_FIELD_SYNC_RULES).toHaveLength(2);
    expect(DYNAMIC_FIELD_SYNC_RULES[0]?.targetField).toBe('name');
    expect(DYNAMIC_FIELD_SYNC_RULES[1]?.targetField).toBe('brand');
  });

  it('syncs title when matching dynamic key exists and differs from form value', () => {
    const { form, setValue } = createMockForm({ name: 'Old Title' });

    syncDynamicTitleAndBrand(form, { productName: 'New Summer Polo' });

    expect(setValue).toHaveBeenCalledWith('name', 'New Summer Polo', {
      shouldDirty: true,
      shouldValidate: true,
    });
  });

  it('syncs brand when matching dynamic key exists (case-insensitive)', () => {
    const { form, setValue } = createMockForm({ brand: 'Old Brand' });

    syncDynamicTitleAndBrand(form, { ProductBrand: 'Zara Men' });

    expect(setValue).toHaveBeenCalledWith('brand', 'Zara Men', {
      shouldDirty: true,
      shouldValidate: true,
    });
  });

  it('does not trigger setValue if values are already equal', () => {
    const { form, setValue } = createMockForm({ name: 'Matching Name', brand: 'Matching Brand' });

    syncDynamicTitleAndBrand(form, { title: 'Matching Name', brand: 'Matching Brand' });

    expect(setValue).not.toHaveBeenCalled();
  });

  it('safely handles empty or missing keys without error', () => {
    const { form, setValue } = createMockForm({ name: '', brand: '' });

    syncDynamicTitleAndBrand(form, { unrelatedField: 123 });

    expect(setValue).not.toHaveBeenCalled();
  });
});
