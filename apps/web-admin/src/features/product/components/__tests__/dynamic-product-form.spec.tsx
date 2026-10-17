import React, { useMemo } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec, ProductFormValues } from '../../types';
import { DynamicProductForm } from '../dynamic-product-form';

vi.mock('../../fields/ui-registry', () => ({
  uiTypeRegistry: {
    input: () => null,
    number: () => null,
    select: () => null,
    multiselect: () => null,
  },
}));

type ProductForm = UseFormReturn<ProductFormValues>;

const field = (overrides: Partial<FieldSpec> & { name: string }): FieldSpec => ({
  uiType: 'input',
  label: overrides.name,
  group: 'details',
  ...overrides,
});

interface HarnessProps {
  schemaFields: FieldSpec[];
  catId?: string;
  schemaError?: Error | null;
  isSchemaLoading?: boolean;
  onValuesChange?: (values: Record<string, unknown>, sectionKey: string) => void;
  /** Runs during the harness render — i.e. before any child effect. */
  captureForm?: (form: ProductForm) => void;
  defaultValues?: ProductFormValues;
}

const Harness = ({
  schemaFields,
  catId = 'cat-1',
  schemaError = null,
  isSchemaLoading = false,
  onValuesChange,
  captureForm,
  defaultValues,
}: HarnessProps) => {
  const form = useForm<ProductFormValues>({ shouldUnregister: false, defaultValues });
  const methods = useMemo(() => {
    captureForm?.(form);
    return form;
  }, [form, captureForm]);
  return (
    <FormProvider {...methods}>
      <DynamicProductForm
        catId={catId}
        schemaFields={schemaFields}
        isSchemaLoading={isSchemaLoading}
        schemaError={schemaError}
        onValuesChange={onValuesChange}
      />
    </FormProvider>
  );
};

describe('DynamicProductForm server defaults', () => {
  it('applies declared defaults without marking the form dirty', async () => {
    const captured: ProductForm[] = [];
    const onValuesChange = vi.fn();

    render(
      <Harness
        captureForm={(instance) => captured.push(instance)}
        onValuesChange={onValuesChange}
        schemaFields={[
          field({ name: 'origin', value: 'Nepal' }),
          field({ name: 'warranty', group: 'termcondition', value: 12 }),
        ]}
      />,
    );

    const [form] = captured;
    await waitFor(() => expect(form.getValues('origin')).toBe('Nepal'));
    expect(form.getValues('warranty')).toBe(12);
    expect(form.formState.isDirty).toBe(false);
    expect(onValuesChange).toHaveBeenCalledWith({ origin: 'Nepal' }, 'details');
    expect(onValuesChange).toHaveBeenCalledWith({ warranty: 12 }, 'termcondition');
  });

  it('re-validates exactly the applied default names so an invalid one surfaces', async () => {
    const trigger = vi.fn().mockResolvedValue(false);
    const captureForm = (form: ProductForm) => {
      vi.spyOn(form, 'trigger').mockImplementation(trigger);
    };

    render(
      <Harness
        captureForm={captureForm}
        schemaFields={[
          field({ name: 'origin', value: 'Nepal' }),
          field({ name: 'warranty', value: 12 }),
          field({ name: 'untouched' }),
        ]}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
    // Scoped to the fields that were actually written — not the whole form.
    expect(trigger).toHaveBeenCalledWith(['origin', 'warranty']);
  });

  it('skips re-validation when the schema declares no defaults', async () => {
    const trigger = vi.fn().mockResolvedValue(true);
    const captureForm = (form: ProductForm) => {
      vi.spyOn(form, 'trigger').mockImplementation(trigger);
    };

    render(<Harness captureForm={captureForm} schemaFields={[field({ name: 'origin' })]} />);

    await waitFor(() => expect(trigger).not.toHaveBeenCalled());
  });

  it('never overrides a value the seller already typed', async () => {
    const captured: ProductForm[] = [];
    const captureForm = (instance: ProductForm) => {
      captured.push(instance);
    };

    render(
      <Harness
        captureForm={captureForm}
        defaultValues={{ origin: 'Typed by the seller' }}
        schemaFields={[field({ name: 'origin', value: 'Nepal' })]}
      />,
    );

    await waitFor(() => expect(captured[0]?.getValues('origin')).toBe('Typed by the seller'));
  });
});

describe('DynamicProductForm schema states', () => {
  it('blocks on an explicit schema error instead of rendering an empty schema', () => {
    render(
      <Harness
        schemaFields={[]}
        schemaError={new Error('Failed to load category attributes for "cat-1"')}
      />,
    );

    expect(screen.getByText(/Failed to load category specifications/)).toBeDefined();
    expect(screen.getByText(/Failed to load category attributes/)).toBeDefined();
    expect(screen.queryByText('This category has no additional fields configured.')).toBeNull();
  });

  it('shows the loading state and the no-category prompt', () => {
    const { rerender } = render(<Harness schemaFields={[]} isSchemaLoading />);
    expect(screen.getByText('Loading category specifications...')).toBeDefined();

    rerender(<Harness schemaFields={[]} catId="" />);
    expect(screen.getByText('Select a category to continue.')).toBeDefined();
  });
});
