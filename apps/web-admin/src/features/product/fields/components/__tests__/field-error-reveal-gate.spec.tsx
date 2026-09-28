import React from 'react';
import { type FieldValues, FormProvider, useForm, useFormState } from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiProps } from '../../ui-registry';
import { DropdownInputField } from '../dropdown-input-field';
import { MultiSelectInputField } from '../multi-select-input-field';
import { NumberInputField } from '../number-input-field';
import { SwitchInputField } from '../switch-input-field';
import { TextInputField } from '../text-input-field';
import { VariantListInputField } from '../variant-list-input-field';

const field = (spec: Record<string, unknown>) => spec as unknown as UiProps['field'];

const FABRIC = 'Fabric';
const PRICE = 'Base Price';
const FRAGILE = 'Fragile';

// Radix's checkbox/select internals measure their trigger; jsdom has no
// ResizeObserver, so the layout effect throws before anything is asserted.
beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined;
  globalThis.ResizeObserver = class {
    observe() {
      /* no layout in jsdom */
    }
    unobserve() {
      /* no layout in jsdom */
    }
    disconnect() {
      /* no layout in jsdom */
    }
  } as unknown as typeof ResizeObserver;
});

/**
 * `Fabric` is the sibling: it stands in for the field the seller is actually
 * working on. Every rule below is `required`, so a blank value is an error in
 * RHF at all times — the ONLY thing that decides visibility is the gate.
 */
function GateHarness({ children }: { children: (api: GateApi) => React.ReactNode }) {
  const methods = useForm<FieldValues>({
    defaultValues: { Fabric: '', price: '' },
    mode: 'onChange' as const,
  });
  const validateOnly = (name: 'Fabric' | 'price' | 'isFragile') =>
    methods.setValue(name, '', { shouldValidate: true });
  const touch = (name: 'Fabric' | 'price' | 'isFragile') =>
    methods.setValue(name, '', { shouldTouch: true, shouldValidate: true });
  return (
    <form>
      <FormProvider {...methods}>
        {children({
          control: methods.control,
          submit: () => methods.handleSubmit(() => undefined)(),
          validateOnly,
          touch,
        })}
      </FormProvider>
    </form>
  );
}

interface GateApi {
  control: UiProps['control'];
  submit: () => void;
  validateOnly: (name: 'Fabric' | 'price' | 'isFragile') => void;
  touch: (name: 'Fabric' | 'price' | 'isFragile') => void;
}

/**
 * Reads RHF's raw error for `price` straight from the form state. Proves the
 * error genuinely EXISTS in the failing-but-untouched case, so "nothing
 * rendered" can only be the gate's doing and not an absent error.
 */
function PriceErrorProbe({ control }: { control: UiProps['control'] }) {
  const { errors } = useFormState({ control });
  // Held in an attribute, not as text, so the "is it rendered?" assertions
  // below can never accidentally match the probe itself.
  return <span data-testid="rhf-price-error" data-message={String(errors.price?.message ?? '')} />;
}

function PricePair({ priceUi }: { priceUi: 'number' | 'select' | 'multiselect' | 'variantList' }) {
  return (
    <GateHarness>
      {(api) => (
        <>
          <PriceErrorProbe control={api.control} />
          <TextInputField
            field={field({ name: FABRIC, uiType: 'input', label: FABRIC, required: true })}
            control={api.control}
          />
          {priceUi === 'number' && (
            <NumberInputField
              field={field({ name: 'price', uiType: 'number', label: PRICE, required: true })}
              control={api.control}
            />
          )}
          {priceUi === 'select' && (
            <DropdownInputField
              field={field({
                name: 'price',
                uiType: 'select',
                label: PRICE,
                required: true,
                dataSource: ['a', 'b'],
              })}
              control={api.control}
            />
          )}
          {priceUi === 'multiselect' && (
            <MultiSelectInputField
              field={field({
                name: 'price',
                uiType: 'multiselect',
                label: PRICE,
                required: true,
                dataSource: ['a', 'b'],
              })}
              control={api.control}
            />
          )}
          {priceUi === 'variantList' && (
            <VariantListInputField
              field={field({
                name: 'price',
                uiType: 'VariantList',
                label: PRICE,
                required: true,
                dataSource: ['a', 'b'],
              })}
              control={api.control}
            />
          )}
          <SwitchInputField
            field={field({ name: 'isFragile', uiType: 'Switch', label: FRAGILE, required: true })}
            control={api.control}
          />
          <button type="button" onClick={api.submit}>
            submit
          </button>
          <button type="button" onClick={() => api.validateOnly('price')}>
            validate-price
          </button>
          <button type="button" onClick={() => api.touch('price')}>
            touch-price
          </button>
          <button type="button" onClick={() => api.touch('Fabric')}>
            touch-fabric
          </button>
        </>
      )}
    </GateHarness>
  );
}

describe.each(['number', 'select', 'multiselect', 'variantList'] as const)(
  'inline gate — %s field',
  (priceUi) => {
    it('shows nothing on a pristine form', () => {
      render(<PricePair priceUi={priceUi} />);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('still shows nothing when RHF holds a failing error nobody has touched', async () => {
      // The error EXISTS here (price validated, not touched) — this is the
      // pristine-with-a-failing-rule case the gate exists for.
      render(<PricePair priceUi={priceUi} />);
      fireEvent.click(screen.getByText('validate-price'));
      await waitFor(() =>
        expect(screen.getByTestId('rhf-price-error').dataset.message).toBe(`${PRICE} is required`),
      );
      expect(screen.queryByText(`${PRICE} is required`)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('renders every message once a submit has been attempted', async () => {
      render(<PricePair priceUi={priceUi} />);
      fireEvent.click(screen.getByText('submit'));
      expect(await screen.findByText(`${PRICE} is required`)).toBeTruthy();
      expect(screen.getByText(`${FABRIC} is required`)).toBeTruthy();
      expect(screen.getByText(`${FRAGILE} is required`)).toBeTruthy();
    });

    it('reveals only the price when the price field is the one that was touched', async () => {
      render(<PricePair priceUi={priceUi} />);
      fireEvent.click(screen.getByText('touch-price'));
      expect(await screen.findByText(`${PRICE} is required`)).toBeTruthy();
      expect(screen.queryByText(`${FABRIC} is required`)).toBeNull();
      expect(screen.queryByText(`${FRAGILE} is required`)).toBeNull();
    });

    it('never surfaces the price error just because Fabric was typed into', async () => {
      render(<PricePair priceUi={priceUi} />);
      fireEvent.click(screen.getByText('touch-fabric'));
      expect(await screen.findByText(`${FABRIC} is required`)).toBeTruthy();
      expect(screen.queryByText(`${PRICE} is required`)).toBeNull();
      expect(screen.queryByText(`${FRAGILE} is required`)).toBeNull();
    });
  },
);
