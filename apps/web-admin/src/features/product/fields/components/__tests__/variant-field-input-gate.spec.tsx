import React from 'react';
import { type FieldValues, FormProvider, useForm, useFormState } from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiProps } from '../../ui-registry';
import { getPathError } from '../shared-utils';
import { VariantFieldInput } from '../variant-field-input';

const RED_PRICE = 'sku.variants.Color.Red.price';
const BLUE_PRICE = 'sku.variants.Color.Blue.price';
const RED_SKU = 'sku.variants.Color.Red.sku';

function SkuCellHarness({
  defaults,
  children,
}: {
  defaults: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const methods = useForm<FieldValues>({ defaultValues: defaults, mode: 'onChange' as const });
  return (
    <form>
      <FormProvider {...methods}>
        <RedPriceErrorProbe control={methods.control} />
        {children}
        <button
          type="button"
          onClick={() => methods.setValue(RED_PRICE, '', { shouldValidate: true })}
        >
          validate-red-price
        </button>
        <button
          type="button"
          onClick={() =>
            methods.setValue(RED_PRICE, '', { shouldTouch: true, shouldValidate: true })
          }
        >
          touch-red-price
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(BLUE_PRICE, '', { shouldValidate: true })}
        >
          validate-blue-price
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(RED_SKU, '', { shouldValidate: true })}
        >
          validate-red-sku
        </button>
        <button
          type="button"
          onClick={() => methods.setValue(RED_SKU, '', { shouldTouch: true, shouldValidate: true })}
        >
          touch-red-sku
        </button>
        <button type="button" onClick={() => methods.handleSubmit(() => undefined)()}>
          submit
        </button>
      </FormProvider>
    </form>
  );
}

/** RHF's raw error for the Red price cell, kept off-screen so it cannot match. */
function RedPriceErrorProbe({ control }: { control: UiProps['control'] }) {
  const { errors } = useFormState({ control });
  return (
    <span
      data-testid="rhf-red-price-error"
      data-message={String(getPathError(errors, RED_PRICE)?.message ?? '')}
    />
  );
}

function renderCells() {
  return render(
    <SkuCellHarness defaults={{ [RED_PRICE]: '', [BLUE_PRICE]: '', [RED_SKU]: '' }}>
      <VariantFieldInput name={RED_PRICE} type="number" required />
      <VariantFieldInput name={BLUE_PRICE} type="number" required />
      <VariantFieldInput name={RED_SKU} required />
    </SkuCellHarness>,
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
});

describe('inline gate — SKU matrix cells', () => {
  it('shows nothing on a pristine matrix even though every required cell is blank', () => {
    renderCells();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stays silent when a failing cell error exists but the cell was not touched', async () => {
    renderCells();
    fireEvent.click(screen.getByText('validate-red-price'));
    await waitFor(() =>
      expect(screen.getByTestId('rhf-red-price-error').dataset.message).toBe('Price is required'),
    );
    expect(screen.queryByText('Price is required')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reveals every cell once a submit has been attempted', async () => {
    renderCells();
    fireEvent.click(screen.getByText('submit'));
    // Red and Blue price cells plus the Red SKU cell.
    expect(await screen.findAllByText('Price is required')).toHaveLength(2);
    expect(screen.getByText('This field is required')).toBeTruthy();
  });

  it('reveals only the cell that was touched, never its row sibling', async () => {
    renderCells();
    // Every cell already holds a failing error; only Red.price is touched.
    fireEvent.click(screen.getByText('validate-blue-price'));
    fireEvent.click(screen.getByText('validate-red-sku'));
    fireEvent.click(screen.getByText('touch-red-price'));
    expect(await screen.findByText('Price is required')).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('This field is required')).toBeNull();
  });

  it('a Red price edit does not surface the Red SKU complaint beside it', async () => {
    renderCells();
    fireEvent.click(screen.getByText('validate-red-sku'));
    fireEvent.click(screen.getByText('touch-red-price'));
    expect(await screen.findByText('Price is required')).toBeTruthy();
    expect(screen.queryByText('This field is required')).toBeNull();
  });

  it('the non-numeric sibling cell reveals on its own path', async () => {
    renderCells();
    fireEvent.click(screen.getByText('validate-blue-price'));
    fireEvent.click(screen.getByText('touch-red-sku'));
    expect(await screen.findByText('This field is required')).toBeTruthy();
    expect(screen.queryByText('Price is required')).toBeNull();
  });
});
