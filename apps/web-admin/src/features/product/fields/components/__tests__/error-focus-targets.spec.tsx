import React from 'react';
import { type Control, FormProvider, useForm } from 'react-hook-form';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { focusFirstError } from '../../../utils/form-focus';
import type { UiProps } from '../../ui-registry';
import { ColorInlineInputField } from '../color-inline-input-field';
import { ColorMetaInputField } from '../color-meta-input-field';
import { DropdownInputField } from '../dropdown-input-field';
import { MultiSelectInputField } from '../multi-select-input-field';
import { SizeMeasurementTable } from '../size-measurement-table';
import { SizeMeasurementsInputField } from '../size-measurements-input-field';
import { SwitchInputField } from '../switch-input-field';
import { VariantListInputField } from '../variant-list-input-field';

// The per-color rows/items own their own nested `data-error-path`; stub them so
// this suite proves the FIELD-level anchors and nothing else.
vi.mock('../color-inline-row', () => ({ ColorInlineRow: () => <div data-testid="color-row" /> }));
vi.mock('../color-meta-item', () => ({ ColorMetaItem: () => <div data-testid="color-item" /> }));

const field = (spec: Record<string, unknown>) => spec as unknown as UiProps['field'];

function Harness({
  defaults,
  children,
}: {
  defaults: Record<string, unknown>;
  children: (control: Control) => React.ReactNode;
}) {
  const methods = useForm({ defaultValues: defaults });
  return <FormProvider {...methods}>{children(methods.control)}</FormProvider>;
}

/** Renders the field, focuses the given error path, returns the focused element. */
function focusFor(
  defaults: Record<string, unknown>,
  ui: (control: Control) => React.ReactNode,
  errors: Record<string, unknown>,
) {
  render(<Harness defaults={defaults}>{ui}</Harness>);
  const first = focusFirstError(errors as never);
  expect(first).toBeDefined();
  return document.activeElement;
}

beforeEach(() => {
  // jsdom has no layout: stub the scroll call form-focus makes before focusing.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('error focus targets for controlled custom fields', () => {
  it('addresses a select field by data-field-name', () => {
    const focused = focusFor(
      {},
      (control) => (
        <DropdownInputField
          field={field({ name: 'brand', uiType: 'select', label: 'Brand', dataSource: ['Acme'] })}
          control={control}
        />
      ),
      { brand: { type: 'validate', message: 'Brand is required' } },
    );
    expect(focused).toBe(document.querySelector('[data-field-name="brand"]'));
    expect(focused).not.toBe(document.body);
  });

  it('addresses a multiselect field by data-field-name', () => {
    const focused = focusFor(
      {},
      (control) => (
        <MultiSelectInputField
          field={field({ name: 'tags', uiType: 'multiselect', label: 'Tags', dataSource: ['new'] })}
          control={control}
        />
      ),
      { tags: { type: 'validate', message: 'Tags is required' } },
    );
    expect(focused).toBe(document.querySelector('[data-field-name="tags"]'));
  });

  it('addresses a VariantList field by data-field-name', () => {
    const focused = focusFor(
      {},
      (control) => (
        <VariantListInputField
          field={field({
            name: 'Size',
            uiType: 'VariantList',
            label: 'Available Sizes',
            dataSource: ['M'],
          })}
          control={control}
        />
      ),
      { Size: { type: 'validate', message: 'Available Sizes is required' } },
    );
    expect(focused).toBe(document.querySelector('[data-field-name="Size"]'));
  });

  it('addresses a Switch field on the focusable checkbox itself', () => {
    const focused = focusFor(
      {},
      (control) => (
        <SwitchInputField
          field={field({ name: 'isFragile', uiType: 'Switch', label: 'Fragile' })}
          control={control}
        />
      ),
      { isFragile: { type: 'validate', message: 'Fragile is required' } },
    );
    const anchor = document.querySelector('[data-field-name="isFragile"]');
    expect(focused).toBe(anchor);
    // The real focusable control, not a wrapper.
    expect(anchor?.tagName).toBe('BUTTON');
  });

  it('resolves a nested color path to the ColorInline field anchor', () => {
    const focused = focusFor(
      { Color: ['Red'] },
      (control) => (
        <ColorInlineInputField
          field={field({
            name: 'variants.colorMeta',
            uiType: 'ColorInline',
            label: 'Color Photos',
            dataSource: { colorField: 'Color' },
          })}
          control={control}
        />
      ),
      {
        variants: { colorMeta: { Red: { images: { type: 'validate', message: 'Add a photo' } } } },
      },
    );
    expect(focused).toBe(document.querySelector('[data-error-path="variants.colorMeta"]'));
  });

  it('resolves a nested color path to the ColorMeta field anchor', () => {
    const focused = focusFor(
      { Color: ['Red'] },
      (control) => (
        <ColorMetaInputField
          field={field({
            name: 'variants.colorMeta',
            uiType: 'ColorMeta',
            label: 'Color Photos',
            dataSource: { colorField: 'Color' },
          })}
          control={control}
        />
      ),
      {
        variants: { colorMeta: { Red: { swatch: { type: 'validate', message: 'Add a swatch' } } } },
      },
    );
    expect(focused).toBe(document.querySelector('[data-error-path="variants.colorMeta"]'));
  });

  it('resolves a size-list error to the size-chart anchor', () => {
    const focused = focusFor(
      { Size: ['M'] },
      (control) => (
        <SizeMeasurementsInputField
          field={field({
            name: 'sizes',
            uiType: 'SizeMeasurementsTable',
            label: 'Size Chart',
            dataSource: {
              sizeField: 'Size',
              charts: [{ key: 'product', label: 'Product', columns: ['Length'] }],
            },
          })}
          control={control}
        />
      ),
      { sizes: { type: 'validate', message: 'Add at least one size' } },
    );
    expect(focused).toBe(document.querySelector('[data-error-path="sizes"]'));
  });

  it('addresses the size-chart card while no size is selected yet', () => {
    const focused = focusFor(
      {},
      (control) => (
        <SizeMeasurementsInputField
          field={field({
            name: 'sizes',
            uiType: 'SizeMeasurementsTable',
            label: 'Size Chart',
            dataSource: {
              sizeField: 'Size',
              charts: [{ key: 'product', label: 'Product', columns: ['Length'] }],
            },
          })}
          control={control}
        />
      ),
      { sizes: { type: 'validate', message: 'Add at least one size' } },
    );
    expect(focused).toBe(document.querySelector('[data-error-path="sizes"]'));
  });

  it('prefers the exact registered cell over the size-chart table anchor', () => {
    const focused = focusFor(
      {},
      () => (
        <SizeMeasurementTable
          chart={{ key: 'product', label: 'Product', columns: ['Length'] }}
          selectedSizes={['M']}
          unit="CM"
        />
      ),
      {
        sizes: [
          { productMeasurements: [{ value: { type: 'validate', message: 'Length required' } }] },
        ],
      },
    );
    const cell = document.querySelector('[name="sizes.0.productMeasurements.0.value"]');
    expect(cell).not.toBeNull();
    expect(focused).toBe(cell);
    expect(document.querySelector('table[data-error-path="sizes"]')).not.toBeNull();
  });

  it('absorbs a nested measurement path into the size-chart table anchor', () => {
    // fix: the data-error-path walk only ever matched a node STRICTLY longer
    // than a popped path prefix, so `sizes.0.bodyMeasurements.0.value` could
    // never match its own `sizes` container and the focus fell through to the
    // caller's section anchor (document.body here). The walk now also accepts a
    // node whose anchor EQUALS the prefix, so an error on a measurement that
    // has no rendered cell (inactive tab, blank column) still lands the user
    // on the size chart instead of nowhere.
    const focused = focusFor(
      {},
      () => (
        <SizeMeasurementTable
          chart={{ key: 'product', label: 'Product', columns: ['Length'] }}
          selectedSizes={['M']}
          unit="CM"
        />
      ),
      {
        sizes: [{ bodyMeasurements: [{ value: { type: 'validate', message: 'Chest required' } }] }],
      },
    );
    expect(focused).toBe(document.querySelector('table[data-error-path="sizes"]'));
    expect(focused).not.toBe(document.body);
  });
});
