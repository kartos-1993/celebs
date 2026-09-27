import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { act, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductFormSidebar from '../../components/product-form-sidebar';
import { useSubmissionState } from '../../hooks/use-submission-state';
import type { FieldSpec, ProductFormValues, ProductSidebarSection } from '../../types';
import { flattenFormErrors as flattenValidationErrors } from '../add-product-validation';
import {
  flattenFormErrors,
  focusFirstError,
  focusMissingField,
  formatFieldLabel,
} from '../form-focus';

const repoFile = (rel: string) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', rel), 'utf8');

describe('form-focus flattenFormErrors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('flattens nested RHF errors including arrays', () => {
    const flat = flattenFormErrors({
      name: { message: 'Product name is required' },
      sizes: [{ bodyMeasurements: [{ value: { message: 'Bust measurement is required' } }] }],
    } as never);
    expect(flat).toEqual([
      { path: 'name', message: 'Product name is required' },
      { path: 'sizes.0.bodyMeasurements.0.value', message: 'Bust measurement is required' },
    ]);
  });

  it('keeps the parent message and nested children from the single core', () => {
    const flat = flattenFormErrors({
      sku: { message: 'SKU invalid', default: { price: { message: 'Bad price' } } },
    } as never);
    expect(flat).toEqual([
      { path: 'sku', message: 'SKU invalid' },
      { path: 'sku.default.price', message: 'Bad price' },
    ]);

    // One core: both modules must produce byte-identical output.
    const validationFlat = flattenValidationErrors({
      sku: { message: 'SKU invalid', default: { price: { message: 'Bad price' } } },
    } as never);
    expect(validationFlat).toEqual(flat);
  });

  it('returns [] for empty errors', () => {
    expect(flattenFormErrors({} as never)).toEqual([]);
  });
});

describe('formatFieldLabel', () => {
  it('maps known paths to friendly labels', () => {
    expect(formatFieldLabel('sizes.0.bodyMeasurements.0.value')).toBe('Body Measurements');
    expect(formatFieldLabel('sizes.1.productMeasurements.2.value')).toBe('Product Measurements');
    expect(formatFieldLabel('sku.variants.Color.Red.stock')).toBe('Price & Stock (SKU)');
    expect(formatFieldLabel('sku.default.price')).toBe('Price & Stock (SKU)');
    expect(formatFieldLabel('variants.colorMeta.Red.images')).toBe('Color Images & Swatches');
    expect(formatFieldLabel('name')).toBe('Product Name');
    expect(formatFieldLabel('brand')).toBe('Brand');
    expect(formatFieldLabel('categoryId')).toBe('Category');
    expect(formatFieldLabel('subcategoryId')).toBe('Subcategory');
    expect(formatFieldLabel('mainImage')).toBe('Product Images');
    // The form writes the plural gallery field; both spellings must resolve.
    expect(formatFieldLabel('mainImages')).toBe('Product Images');
    expect(formatFieldLabel('price')).toBe('Regular Price');
    expect(formatFieldLabel('discountedPrice')).toBe('Special Price');
  });

  it('never leaks internal field names for shipping and warranty paths', () => {
    expect(formatFieldLabel('packageWeightKg')).toBe('Package Weight (kg)');
    expect(formatFieldLabel('packageLengthCm')).toBe('Parcel Length (cm)');
    expect(formatFieldLabel('isFragile')).toBe('Fragile Handling');
    expect(formatFieldLabel('hasBatteryOrLiquid')).toBe('Battery or Liquid');
  });

  it('falls back to a humanized last path segment', () => {
    expect(formatFieldLabel('warrantyPeriod')).toBe('Warranty Duration');
    expect(formatFieldLabel('someFutureField')).toBe('Some Future Field');
  });
});

describe('locateErrorElement (via focus helpers)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focusFirstError targets an exact [name] match', () => {
    const input = document.createElement('input');
    input.setAttribute('name', 'name');
    input.focus = vi.fn();
    input.scrollIntoView = vi.fn();
    document.body.appendChild(input);

    const result = focusFirstError({ name: { message: 'Required' } } as never);
    expect(result).toEqual({ path: 'name', message: 'Required' });
    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(input.focus).toHaveBeenCalled();
  });

  it('focusFirstError lands nested color paths on the color row anchor', () => {
    const row = document.createElement('div');
    row.setAttribute('data-error-path', 'variants.colorMeta.Red');
    row.scrollIntoView = vi.fn();
    (row as HTMLElement).focus = vi.fn();
    document.body.appendChild(row);

    const result = focusFirstError({
      variants: { colorMeta: { Red: { images: { message: 'Add photo' } } } },
    } as never);
    expect(result?.path).toBe('variants.colorMeta.Red.images');
    expect(row.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('focusFirstError falls back to the section anchor id', () => {
    const section = document.createElement('div');
    section.id = 'product-section-sale';
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    const result = focusFirstError(
      { custom_field: { message: 'Custom field is invalid' } } as never,
      'product-section-sale',
    );
    expect(result).toBeDefined();
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('focusFirstError returns undefined for empty errors', () => {
    expect(focusFirstError({} as never)).toBeUndefined();
  });

  it('focusMissingField returns the element or null with anchor fallback', () => {
    const input = document.createElement('input');
    input.setAttribute('name', 'brand');
    input.focus = vi.fn();
    input.scrollIntoView = vi.fn();
    document.body.appendChild(input);

    expect(focusMissingField('brand')?.getAttribute('name')).toBe('brand');

    const section = document.createElement('div');
    section.id = 'product-section-basic';
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);
    expect(focusMissingField('nope.missing', 'product-section-basic')).toBeNull();
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});

describe('ProductFormSidebar status derivation and error truncation', () => {
  const sections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: 'product-section-basic',
      status: false,
      errors: ['e1', 'e2', 'e3', 'e4', 'e5'],
    },
    {
      key: 'images',
      label: 'Product Images',
      anchorId: 'product-section-base',
      status: true,
      errors: [],
    },
  ];

  it('derives done-count and score copy from section statuses', () => {
    render(<ProductFormSidebar completionPercentage={50} sections={sections} showErrors={false} />);
    expect(screen.getByText('1 of 2 sections done')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('Fair')).toBeDefined();
    expect(screen.getByText('In progress')).toBeDefined();
  });

  it('shows Ready to submit at 100% with Excellent badge', () => {
    render(
      <ProductFormSidebar
        completionPercentage={100}
        sections={sections.map((s) => ({ ...s, status: true, errors: [] }))}
        showErrors
      />,
    );
    expect(screen.getByText('Ready to submit')).toBeDefined();
    expect(screen.getByText('Excellent')).toBeDefined();
  });

  it('hides errors until attempted submit, then slices each section to 3 with an exact count', () => {
    const { rerender } = render(
      <ProductFormSidebar completionPercentage={50} sections={sections} showErrors={false} />,
    );
    expect(screen.queryByText('e1')).toBeNull();

    rerender(<ProductFormSidebar completionPercentage={50} sections={sections} showErrors />);
    expect(screen.getByText('e1')).toBeDefined();
    expect(screen.getByText('e2')).toBeDefined();
    expect(screen.getByText('e3')).toBeDefined();
    expect(screen.queryByText('e4')).toBeNull();
    expect(screen.queryByText('e5')).toBeNull();
    // The slice must never hide blockers silently: exact remainder + a way out.
    expect(screen.getByText('+2 more — view section')).toBeDefined();
  });

  it('shows every error and no overflow link when a section has 3 or fewer', () => {
    render(
      <ProductFormSidebar
        completionPercentage={0}
        sections={[{ ...sections[0], errors: ['only', 'two'] }]}
        showErrors
      />,
    );
    expect(screen.getByText('only')).toBeDefined();
    expect(screen.getByText('two')).toBeDefined();
    expect(screen.queryByText(/more/)).toBeNull();
  });

  it('derives completion as round(done/total*100), 0 when empty', () => {
    // Mirrors use-submission-state.ts completionPercentage derivation.
    const pct = (list: ProductSidebarSection[]) =>
      list.length === 0 ? 0 : Math.round((list.filter((s) => s.status).length / list.length) * 100);
    expect(pct(sections)).toBe(50);
    expect(pct([])).toBe(0);
  });
});

describe('useSubmissionState showErrors timing', () => {
  const schemaFields: FieldSpec[] = [
    { name: 'mainImage', uiType: 'MainImage', label: 'Cover', group: 'base' },
  ];

  type SubmissionState = ReturnType<typeof useSubmissionState>;

  const renderSubmissionState = () => {
    const box: { state?: SubmissionState; form?: UseFormReturn<ProductFormValues> } = {};

    const Probe = () => {
      const form = useForm<ProductFormValues>({
        defaultValues: { name: '', categoryId: '', subcategoryId: '' },
        mode: 'onChange',
      });
      box.form = form;
      return (
        <FormProvider {...form}>
          <Consumer />
        </FormProvider>
      );
    };

    const Consumer = () => {
      box.state = useSubmissionState({
        schemaFields,
        schemaHasName: false,
        variantMeta: [],
      });
      return null;
    };

    render(<Probe />);
    return box;
  };

  it('keeps a pristine form quiet', () => {
    const { state } = renderSubmissionState();
    expect(state?.hasAttemptedSubmit).toBe(false);
    expect(state?.hasTouchedFields).toBe(false);
    expect(state?.showErrors).toBe(false);
  });

  it('reveals errors immediately once a field is touched', async () => {
    const box = renderSubmissionState();
    act(() => {
      box.form?.setValue('name', 'x', { shouldTouch: true, shouldValidate: true });
    });
    await waitFor(() => {
      expect(box.state?.hasTouchedFields).toBe(true);
    });
    expect(box.state?.showErrors).toBe(true);
  });

  it('reveals errors after a submit attempt even with nothing touched', async () => {
    const box = renderSubmissionState();
    act(() => {
      box.form?.setError('name', { type: 'server', message: 'name is taken' });
    });
    await waitFor(() => {
      expect(box.state?.fieldErrors).toHaveLength(1);
    });
    expect(box.state?.hasTouchedFields).toBe(false);
    expect(box.state?.showErrors).toBe(false);

    await act(async () => {
      await box.form?.handleSubmit(() => undefined)();
    });
    expect(box.state?.hasAttemptedSubmit).toBe(true);
    expect(box.state?.showErrors).toBe(true);
  });
});

describe('server error parsing on submit', () => {
  const source = () => repoFile(join('components', 'add-product', 'use-add-product-submit.ts'));

  it('reads the {field?, message} errors[] contract first', () => {
    // A mapped entry (field) is routed into RHF so focusFirstError can find it;
    // an unmapped one is surfaced in the toast, never silently dropped.
    expect(source()).toContain('readServerErrorEntries');
    expect(source()).toContain(
      "form.setError(path as Path<ProductFormValues>, { type: 'server', message })",
    );
    expect(source()).toContain('unmappedMessages');
  });

  it('no longer chains nested optional lookups for the error list', () => {
    expect(source()).not.toContain('errObj?.response?.data?.errors');
  });
});

describe('submit-gate wiring', () => {
  it('awaits form.trigger() before reading formState.errors', () => {
    // Reading formState.errors without trigger() gates on stale state, so
    // untouched invalid fields slip through the sidebar gate.
    const source = repoFile(join('components', 'add-product', 'use-add-product-submit.ts'));
    expect(source).toContain('await form.trigger()');
    expect(source.indexOf('await form.trigger()')).toBeLessThan(
      source.indexOf('flattenFormErrors(form.formState.errors)'),
    );
  });

  it('wires Save Draft straight to draft storage, bypassing validation', () => {
    // Intentional for drafts: type="button" never runs the sidebar/RHF gates so
    // partial work is never blocked. Pinned so the fix does not leak into drafts.
    const body = repoFile(join('components', 'add-product', 'add-product-form-body.tsx'));
    expect(body).toContain('onSaveAsDraft={draft.saveDraftNow}');
    const actions = repoFile(join('components', 'product-form-action.tsx'));
    expect(actions).toContain('Save Draft');
    expect(actions).toContain('type="button"');
  });
});
