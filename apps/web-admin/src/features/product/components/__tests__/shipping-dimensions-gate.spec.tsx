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

import { getPathError } from '../../fields/components/shared-utils';
import { ShippingDimensionsCard } from '../shipping-dimensions-card';

type Box = 'packageWeightKg' | 'packageLengthCm' | 'packageWidthCm' | 'packageHeightCm';

const BOXES: Array<[Box, string]> = [
  [
    'packageWeightKg',
    'Package weight must be greater than 0 kg (leave blank to use the 0.3 kg default).',
  ],
  ['packageLengthCm', 'Parcel length must be a positive number in cm.'],
  ['packageWidthCm', 'Parcel width must be a positive number in cm.'],
  ['packageHeightCm', 'Parcel height must be a positive number in cm.'],
];

function ShippingCardForm({ children }: { children: React.ReactNode }) {
  const methods = useForm<FieldValues>({ defaultValues: {}, mode: 'onChange' as const });
  return (
    <form>
      <FormProvider {...methods}>
        <Probe control={methods.control} />
        {children}
        {BOXES.map(([path, message]) => (
          <React.Fragment key={path}>
            <button
              type="button"
              onClick={() => methods.setError(path, { type: 'server', message })}
            >
              mark-{path}
            </button>
            <button type="button" onClick={() => methods.setValue(path, 1, { shouldTouch: true })}>
              touch-{path}
            </button>
          </React.Fragment>
        ))}
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

/** RHF's own errors for the four boxes, held in attributes so they never match. */
function Probe({ control }: { control: Control<FieldValues> }) {
  const { errors } = useFormState({ control });
  return (
    <>
      {BOXES.map(([path]) => (
        <span
          key={path}
          data-testid={`rhf-${path}`}
          data-message={String(getPathError(errors, path)?.message ?? '')}
        />
      ))}
    </>
  );
}

function renderCard() {
  return render(
    <ShippingCardForm>
      <ShippingDimensionsCard />
    </ShippingCardForm>,
  );
}

describe('inline gate — shipping dimensions card', () => {
  it('shows nothing on a pristine card', () => {
    renderCard();
    expect(screen.queryByRole('alert')).toBeNull();
    BOXES.forEach(([, message]) => expect(screen.queryByText(message)).toBeNull());
  });

  it('stays silent when the server has already reported all four but none was touched', async () => {
    renderCard();
    for (const [path] of BOXES) {
      fireEvent.click(screen.getByText(`mark-${path}`));
    }
    await waitFor(() =>
      expect(screen.getByTestId('rhf-packageWeightKg').dataset.message).toMatch(
        /greater than 0 kg/,
      ),
    );
    BOXES.forEach(([, message]) => expect(screen.queryByText(message)).toBeNull());
  });

  it('reveals all four boxes once a submit has been attempted', async () => {
    renderCard();
    // Submit first, then land the server errors: RHF's built-in pass rewrites
    // `errors` for every registered field, so a pre-submit `setError` would be
    // wiped. The submit attempt is what the gate keys off, not the ordering.
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('rhf-submitted').dataset.value).toBe('true'));
    for (const [path] of BOXES) {
      fireEvent.click(screen.getByText(`mark-${path}`));
    }
    for (const [, message] of BOXES) {
      expect(await screen.findByText(message)).toBeTruthy();
    }
  });

  it('reveals only the touched box, not its three siblings', async () => {
    renderCard();
    for (const [path] of BOXES) {
      fireEvent.click(screen.getByText(`mark-${path}`));
    }
    fireEvent.click(screen.getByText('touch-packageWidthCm'));
    expect(await screen.findByText('Parcel width must be a positive number in cm.')).toBeTruthy();
    expect(screen.queryByText('Parcel length must be a positive number in cm.')).toBeNull();
    expect(screen.queryByText('Parcel height must be a positive number in cm.')).toBeNull();
    expect(screen.queryByText(/Package weight must be greater than 0 kg/)).toBeNull();
  });

  it('each of the four boxes reveals on its own path', async () => {
    for (const [path, message] of BOXES) {
      const { unmount } = renderCard();
      for (const [other] of BOXES) {
        fireEvent.click(screen.getByText(`mark-${other}`));
      }
      fireEvent.click(screen.getByText(`touch-${path}`));
      expect(await screen.findByText(message)).toBeTruthy();
      BOXES.filter(([other]) => other !== path).forEach(([, otherMessage]) => {
        expect(screen.queryByText(otherMessage)).toBeNull();
      });
      unmount();
    }
  });
});
