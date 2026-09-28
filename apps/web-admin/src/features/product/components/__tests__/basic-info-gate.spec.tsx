import React from 'react';
import {
  type Control,
  type FieldValues,
  FormProvider,
  useForm,
  useFormState,
} from 'react-hook-form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BasicInfoInputs } from '../basic-info-inputs';

vi.mock('../brand-selector', () => ({
  BrandSelector: () => <div data-testid="brand-selector" />,
}));

const NAME_REQUIRED = 'Product name is required';
const NAME_MIN = 'Product name must be at least 2 characters';
const DESC_MAX = 'Description must be less than 4000 characters';
const BRAND_REQUIRED = 'Brand is required';

function BasicInfoHarness() {
  const methods = useForm<FieldValues>({
    defaultValues: { name: '', brandId: '', description: '' },
    mode: 'onChange' as const,
  });
  return (
    <form>
      <FormProvider {...methods}>
        <Probe control={methods.control} />
        <SubmittedProbe control={methods.control} />
        <BasicInfoInputs
          control={methods.control}
          onFieldChange={() => undefined}
          onBrandSelect={() => undefined}
        />
        <button
          type="button"
          onClick={() => methods.setValue('name', 'a', { shouldValidate: true })}
        >
          validate-name
        </button>
        <button
          type="button"
          onClick={() => methods.setValue('name', 'a', { shouldTouch: true, shouldValidate: true })}
        >
          touch-name
        </button>
        <button
          type="button"
          onClick={() =>
            methods.setValue('description', 'x'.repeat(4001), { shouldValidate: true })
          }
        >
          validate-description
        </button>
        <button
          type="button"
          onClick={() =>
            methods.setValue('description', 'x'.repeat(4001), {
              shouldTouch: true,
              shouldValidate: true,
            })
          }
        >
          touch-description
        </button>
        <button
          type="button"
          onClick={() => methods.setError('brandId', { type: 'validate', message: BRAND_REQUIRED })}
        >
          mark-brand
        </button>
        <button
          type="button"
          onClick={() => methods.setValue('brandId', 'b1', { shouldTouch: true })}
        >
          touch-brand
        </button>
        <button type="button" onClick={() => methods.handleSubmit(() => undefined)()}>
          submit
        </button>
      </FormProvider>
    </form>
  );
}

/** RHF's own errors, held in attributes so they can never match a query. */
function Probe({ control }: { control: Control<FieldValues> }) {
  const { errors } = useFormState({ control });
  return (
    <>
      {(['name', 'description', 'brandId'] as const).map((path) => (
        <span
          key={path}
          data-testid={`rhf-${path}`}
          data-message={String(
            (errors as Record<string, { message?: string }>)[path]?.message ?? '',
          )}
        />
      ))}
    </>
  );
}

function SubmittedProbe({ control }: { control: Control<FieldValues> }) {
  const { isSubmitted } = useFormState({ control });
  return <span data-testid="rhf-submitted" data-value={String(isSubmitted)} />;
}

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

describe('inline gate — basic info card', () => {
  it('shows nothing on a pristine card', () => {
    render(<BasicInfoHarness />);
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(BRAND_REQUIRED)).toBeNull();
  });

  it('stays silent when a failing error exists that nobody has touched', async () => {
    render(<BasicInfoHarness />);
    fireEvent.click(screen.getByText('validate-name'));
    await waitFor(() => expect(screen.getByTestId('rhf-name').dataset.message).toBe(NAME_MIN));
    expect(screen.queryByText(NAME_MIN)).toBeNull();
  });

  it('reveals only the name when only the name is touched', async () => {
    render(<BasicInfoHarness />);
    fireEvent.click(screen.getByText('touch-name'));
    expect(await screen.findByText(NAME_MIN)).toBeTruthy();
    expect(screen.queryByText(BRAND_REQUIRED)).toBeNull();
  });

  it('reveals only the description when only the description is touched', async () => {
    render(<BasicInfoHarness />);
    fireEvent.click(screen.getByText('touch-description'));
    expect(await screen.findByText(DESC_MAX)).toBeTruthy();
    expect(screen.queryByText(NAME_MIN)).toBeNull();
  });

  it('reveals only the brand when only the brand is touched', async () => {
    render(<BasicInfoHarness />);
    fireEvent.click(screen.getByText('mark-brand'));
    fireEvent.click(screen.getByText('touch-brand'));
    expect(await screen.findByText(BRAND_REQUIRED)).toBeTruthy();
    expect(screen.queryByText(NAME_MIN)).toBeNull();
  });

  it('reveals everything once a submit has been attempted', async () => {
    render(<BasicInfoHarness />);
    fireEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(screen.getByTestId('rhf-submitted').dataset.value).toBe('true'));
    fireEvent.click(screen.getByText('mark-brand'));
    expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
    expect(await screen.findByText(BRAND_REQUIRED)).toBeTruthy();
  });
});

describe('name length rule matches the Zod source of truth', () => {
  it('accepts a two-character name — the old 30-character floor rejected it', async () => {
    render(<BasicInfoHarness />);
    const input = screen.getByTestId('product-name-input');
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByTestId('rhf-name').dataset.message).toBe(''));
    expect(screen.queryByText(NAME_MIN)).toBeNull();
  });

  it('still rejects a one-character name', async () => {
    render(<BasicInfoHarness />);
    const input = screen.getByTestId('product-name-input');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByTestId('rhf-name').dataset.message).toBe(NAME_MIN));
    expect(await screen.findByText(NAME_MIN)).toBeTruthy();
  });

  it('enforces the 200-character cap', () => {
    render(<BasicInfoHarness />);
    expect((screen.getByTestId('product-name-input') as HTMLTextAreaElement).maxLength).toBe(200);
  });

  it('no longer advertises a 30-character minimum in the placeholder', () => {
    render(<BasicInfoHarness />);
    const input = screen.getByTestId('product-name-input') as HTMLTextAreaElement;
    expect(input.placeholder).not.toMatch(/30/);
    expect(input.placeholder).toMatch(/min\. 2 characters/);
    expect(screen.getByText('0/200')).toBeTruthy();
  });
});
