import React from 'react';
import { type FieldValues, FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { UiProps } from '../../ui-registry';
import type { SizeEntry } from '../use-size-measurements-state';
import { useSizeMeasurementsState } from '../use-size-measurements-state';

const CHARTS = [
  { key: 'body', label: 'Body Measurements', columns: ['Chest', 'Waist'] },
  { key: 'product', label: 'Product Measurements', columns: ['Length'] },
];

const FIELD = {
  name: 'sizes',
  label: 'Size Chart',
  dataSource: { charts: CHARTS, sizeField: 'Size' },
} as unknown as UiProps['field'];

const seed = (): SizeEntry[] => [
  {
    name: 'M',
    bodyMeasurements: [
      { name: 'Chest', value: '40', unit: 'cm' },
      { name: 'Waist', value: '', unit: 'cm' },
    ],
    productMeasurements: [{ name: 'Length', value: '28.5', unit: 'cm' }],
  },
];

function renderState(sizes: SizeEntry[]) {
  const box: { form?: UseFormReturn<FieldValues> } = {};
  function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<FieldValues>({
      defaultValues: { Size: ['M'], sizes },
      mode: 'onChange',
    });
    box.form = methods;
    return <FormProvider {...methods}>{children}</FormProvider>;
  }
  const view = renderHook(() => useSizeMeasurementsState({ field: FIELD }), { wrapper: Wrapper });
  return { ...view, form: () => box.form as UseFormReturn<FieldValues> };
}

const sizesAfter = (form: UseFormReturn<FieldValues>) =>
  form.getValues('sizes') as Required<SizeEntry>[];

/** 1dp-per-hop rounding, so a cm→in→cm trip is within 0.1 of the original. */
const closeTo = (actual: string | number, expected: number) =>
  expect(Math.round(Math.abs(Number(actual) - expected) * 100) / 100).toBeLessThanOrEqual(0.1);

describe('CM/IN toggle must convert the measurement, not just relabel it', () => {
  it('converts every numeric cell and flips the unit on the same write', () => {
    const { result, form } = renderState(seed());
    expect(result.current.unit).toBe('CM');

    act(() => result.current.handleUnitToggle('IN'));

    const [size] = sizesAfter(form());
    // 40 cm is 15.7 in, 28.5 cm is 11.2 in. Before the fix both kept their cm
    // number and were relabelled "in" — the chart published 40 INCHES.
    expect(size.bodyMeasurements).toEqual([
      { name: 'Chest', value: '15.7', unit: 'in' },
      { name: 'Waist', value: '', unit: 'in' },
    ]);
    expect(size.productMeasurements).toEqual([{ name: 'Length', value: '11.2', unit: 'in' }]);
  });

  it('converts back on the way to CM instead of only flipping the label', () => {
    const { result, form } = renderState(seed());

    act(() => result.current.handleUnitToggle('IN'));
    act(() => result.current.handleUnitToggle('CM'));

    const [size] = sizesAfter(form());
    // Rounded to 1dp on each hop, so a round trip can land 0.1 off the original
    // (40 → 15.7 → 39.9). What must never happen is the pre-fix outcome: the cm
    // number coming back verbatim under an "in" label.
    expect(size.bodyMeasurements[0].unit).toBe('cm');
    closeTo(size.bodyMeasurements[0].value, 40);
    expect(size.productMeasurements[0].unit).toBe('cm');
    closeTo(size.productMeasurements[0].value, 28.5);
  });

  it('leaves a blank cell blank and a non-numeric cell untouched', () => {
    const { result, form } = renderState([
      {
        name: 'M',
        bodyMeasurements: [
          { name: 'Chest', value: '  ', unit: 'cm' },
          { name: 'Waist', value: 'n/a', unit: 'cm' },
        ],
      },
    ]);

    act(() => result.current.handleUnitToggle('IN'));

    const [size] = sizesAfter(form());
    expect(size.bodyMeasurements[0].value).toBe('');
    expect(size.bodyMeasurements[1].value).toBe('n/a');
    expect(size.bodyMeasurements[1].unit).toBe('in');
  });

  it('is a no-op when the same unit is tapped again', () => {
    const { result, form } = renderState(seed());

    act(() => result.current.handleUnitToggle('CM'));

    expect(sizesAfter(form())[0].bodyMeasurements[0]).toEqual({
      name: 'Chest',
      value: '40',
      unit: 'cm',
    });
  });
});
