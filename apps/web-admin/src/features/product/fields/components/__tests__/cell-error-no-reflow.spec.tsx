import React from 'react';
import { type FieldValues, FormProvider, useForm, useFormState } from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SizeMeasurementTable } from '../size-measurement-table';
import { SkuDefaultTable } from '../sku-default-table';
import { SkuMatrixTable } from '../sku-matrix-table';
import { SkuSingleAxisTable } from '../sku-single-axis-table';
import type { VariantSelection } from '../sku-table-types';
import type { MeasurementChartSpec } from '../use-size-measurements-state';

const PRICE = 'sku.default.price';
const BUST = 'sizes.0.bodyMeasurements.0.value';
const BUST_MSG = 'Bust measurement is required';
const PRICE_MSG = 'Price is required';
const CHART = { key: 'body', columns: ['Bust'] } as unknown as MeasurementChartSpec;
const labelOf = (_key: string, value: string) => value;
const COLOR: VariantSelection = { key: 'Color', label: 'Color', values: ['Red'] };
const SIZE: VariantSelection = { key: 'Size', label: 'Size', values: ['M'] };

// Radix's checkbox measures its trigger; jsdom has no ResizeObserver, so the
// layout effect throws before anything is asserted.
beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  globalThis.ResizeObserver = vi.fn(function fake() {
    return { observe() {}, unobserve() {}, disconnect() {} };
  }) as unknown as typeof ResizeObserver;
});
/**
 * The SKU matrix and the size chart are TABLES, not stacked fields. An in-flow
 * error made its `TableCell` taller and `align-middle` then re-centred every
 * sibling control in the row, so the grid jumped whenever a cell failed — and a
 * ~15%-wide Price column wrapped "Must be lower than price" over 40-60px. These
 * assertions pin both halves of the fix: the message takes zero layout space (an
 * `sr-only` `role="alert"` plus a `title` on the control), and every control cell
 * is top-aligned so nothing beside it can ever move.
 */
function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<FieldValues>({
    defaultValues: { sku: { default: { price: '', stock: '5' } }, sizes: [] },
  });
  // `control` is explicit: this hook runs ABOVE the `<FormProvider>` it renders.
  const { isSubmitted } = useFormState({ control: methods.control });
  return (
    <form>
      <FormProvider {...methods}>
        {children}
        {/* The gate is `submitCount > 0 || isSubmitted`; assert it before using it. */}
        <span data-testid="rhf-submitted" data-value={String(isSubmitted)} />
        <button type="button" onClick={() => void methods.handleSubmit(() => undefined)()}>
          submit
        </button>
        <button
          type="button"
          onClick={() => methods.setError(BUST, { type: 'validate', message: BUST_MSG })}
        >
          mark-bust
        </button>
      </FormProvider>
    </form>
  );
}

const bodyCells = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .flatMap((row) => Array.from(row.querySelectorAll('td')));

/**
 * Every cell hosting a control must be immune to a taller row sibling. Radix's
 * checkbox contributes a hidden `input[type=checkbox]` bubble, so the status
 * cell is excluded — only a real text/number control can host an error.
 */
function expectControlCellsTopAligned() {
  const cells = bodyCells().filter((c) => c.querySelector('input:not([type="checkbox"])'));
  expect(cells.length).toBeGreaterThan(0);
  for (const cell of cells) expect(cell.className).toContain('align-top');
}

const renderDefaultTable = () =>
  render(
    <Harness>
      <SkuDefaultTable />
    </Harness>,
  );

describe('grid cells: an error never reflows the row', () => {
  it('a revealed SKU error takes no vertical space and rides the control title', async () => {
    renderDefaultTable();
    fireEvent.click(screen.getByText('submit'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(PRICE_MSG);
    // `sr-only` is the point: still announced, still in the DOM for the gate
    // specs, but zero height, so a failing cell can never push its row open.
    expect(alert.className).toContain('sr-only');
    const price = document.querySelector(`input[name="${PRICE}"]`) as HTMLInputElement;
    expect(price.title).toBe(PRICE_MSG);
    expect(price.getAttribute('aria-invalid')).toBe('true');
  });

  it('all three SKU tables top-align every control cell', () => {
    render(
      <Harness>
        <SkuMatrixTable primaryVariant={COLOR} secondaryVariant={SIZE} labelOf={labelOf} />
      </Harness>,
    );
    expectControlCellsTopAligned();
    render(
      <Harness>
        <SkuSingleAxisTable variant={COLOR} labelOf={labelOf} />
      </Harness>,
    );
    expectControlCellsTopAligned();
    renderDefaultTable();
    expectControlCellsTopAligned();
  });

  it('a size-chart cell error is out of flow for the same reason', async () => {
    render(
      <Harness>
        <SizeMeasurementTable chart={CHART} selectedSizes={['S']} unit="CM" />
      </Harness>,
    );
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('rhf-submitted').dataset.value).toBe('true'));
    fireEvent.click(screen.getByText('mark-bust'));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(BUST_MSG);
    expect(alert.className).toContain('sr-only');
    const cell = document.querySelector(`input[name="${BUST}"]`)?.closest('td') as HTMLElement;
    expect(cell.className).toContain('align-top');
    expect((cell.querySelector('input[type="text"]') as HTMLInputElement).title).toBe(BUST_MSG);
  });

  it('a SKU table keeps one scroll container and one height per control', () => {
    const { container } = renderDefaultTable();
    // `Table` already wraps itself in `relative w-full overflow-auto`; the old
    // `border rounded-md overflow-x-auto` around it was a second nested scroller.
    expect(container.querySelectorAll('[class*="overflow-"]')).toHaveLength(1);
    // `size="sm"` drives BOTH the NumberInput wrapper and its inner input, so
    // the primitive's hardcoded inner `h-9` can no longer overflow the border.
    const price = document.querySelector(`input[name="${PRICE}"]`) as HTMLInputElement;
    expect((price.parentElement as HTMLElement).className).toContain('h-8');
    expect(price.className).toContain('h-8');
    expect(price.className).not.toContain('h-9');
  });
});
