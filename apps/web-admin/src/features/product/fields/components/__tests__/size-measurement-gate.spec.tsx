import React from 'react';
import {
  type Control,
  type FieldValues,
  FormProvider,
  useForm,
  useFormState,
} from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getPathError } from '../shared-utils';
import { SizeMeasurementTable } from '../size-measurement-table';
import type { MeasurementChartSpec } from '../use-size-measurements-state';

const BUST = 'sizes.0.bodyMeasurements.0.value';
const WAIST = 'sizes.0.bodyMeasurements.1.value';
const LENGTH = 'sizes.0.bodyMeasurements.2.value';

const BUST_MSG = 'Bust measurement is required';
const WAIST_MSG = 'Waist measurement is required';
const LENGTH_MSG = 'Length measurement is required';

const CHART: MeasurementChartSpec = {
  key: 'body',
  columns: ['Bust', 'Waist', 'Length'],
} as unknown as MeasurementChartSpec;

function TableHarness({ children }: { children: React.ReactNode }) {
  const methods = useForm<FieldValues>({ defaultValues: { sizes: [] }, mode: 'onChange' as const });
  return (
    <form>
      <FormProvider {...methods}>
        <Probe control={methods.control} />
        {children}
        <button
          type="button"
          onClick={() => methods.setError(BUST, { type: 'validate', message: BUST_MSG })}
        >
          mark-bust
        </button>
        <button
          type="button"
          onClick={() => methods.setError(WAIST, { type: 'validate', message: WAIST_MSG })}
        >
          mark-waist
        </button>
        <button
          type="button"
          onClick={() => methods.setError(LENGTH, { type: 'validate', message: LENGTH_MSG })}
        >
          mark-length
        </button>
        <button type="button" onClick={() => methods.setValue(BUST, '', { shouldTouch: true })}>
          touch-bust
        </button>
        <button type="button" onClick={() => methods.setValue(WAIST, '', { shouldTouch: true })}>
          touch-waist
        </button>
        <button type="button" onClick={() => methods.handleSubmit(() => undefined)()}>
          submit
        </button>
        <SubmittedProbe control={methods.control} />
      </FormProvider>
    </form>
  );
}

function SubmittedProbe({ control }: { control: Control<FieldValues> }) {
  const { isSubmitted } = useFormState({ control });
  return <span data-testid="rhf-submitted" data-value={String(isSubmitted)} />;
}

/** RHF's own cell errors, held in attributes so they can never match a query. */
function Probe({ control }: { control: Control<FieldValues> }) {
  const { errors } = useFormState({ control });
  return (
    <>
      {[BUST, WAIST, LENGTH].map((path) => (
        <span
          key={path}
          data-testid={`rhf-${path}`}
          data-message={String(getPathError(errors, path)?.message ?? '')}
        />
      ))}
    </>
  );
}

function renderTable() {
  return render(
    <TableHarness>
      <SizeMeasurementTable chart={CHART} selectedSizes={['S']} unit="CM" />
    </TableHarness>,
  );
}

describe('inline gate — size measurement cells', () => {
  it('shows nothing on a pristine chart', () => {
    renderTable();
    expect(screen.queryByText(BUST_MSG)).toBeNull();
    expect(screen.queryByText(WAIST_MSG)).toBeNull();
  });

  it('stays silent when every cell holds a failing error nobody touched', async () => {
    renderTable();
    fireEvent.click(screen.getByText('mark-bust'));
    fireEvent.click(screen.getByText('mark-waist'));
    fireEvent.click(screen.getByText('mark-length'));
    await waitFor(() => expect(screen.getByTestId(`rhf-${BUST}`).dataset.message).toBe(BUST_MSG));
    expect(screen.queryByText(BUST_MSG)).toBeNull();
    expect(screen.queryByText(WAIST_MSG)).toBeNull();
    expect(screen.queryByText(LENGTH_MSG)).toBeNull();
  });

  it('reveals only the cell that was touched, not its row siblings', async () => {
    renderTable();
    fireEvent.click(screen.getByText('mark-bust'));
    fireEvent.click(screen.getByText('mark-waist'));
    fireEvent.click(screen.getByText('mark-length'));
    fireEvent.click(screen.getByText('touch-waist'));
    expect(await screen.findByText(WAIST_MSG)).toBeTruthy();
    expect(screen.queryByText(BUST_MSG)).toBeNull();
    expect(screen.queryByText(LENGTH_MSG)).toBeNull();
  });

  it('the first column reveals on its own path', async () => {
    renderTable();
    fireEvent.click(screen.getByText('mark-bust'));
    fireEvent.click(screen.getByText('mark-waist'));
    fireEvent.click(screen.getByText('touch-bust'));
    expect(await screen.findByText(BUST_MSG)).toBeTruthy();
    expect(screen.queryByText(WAIST_MSG)).toBeNull();
  });

  it('reveals every cell once a submit has been attempted', async () => {
    renderTable();
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('rhf-submitted').dataset.value).toBe('true'));
    fireEvent.click(screen.getByText('mark-bust'));
    fireEvent.click(screen.getByText('mark-waist'));
    fireEvent.click(screen.getByText('mark-length'));
    expect(await screen.findByText(BUST_MSG)).toBeTruthy();
    expect(screen.getByText(WAIST_MSG)).toBeTruthy();
    expect(screen.getByText(LENGTH_MSG)).toBeTruthy();
  });
});
