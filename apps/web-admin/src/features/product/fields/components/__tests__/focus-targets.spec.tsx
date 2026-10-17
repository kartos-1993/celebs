import React from 'react';
import { type Control, FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BasicInfoSection from '../../../components/basic-info-section';
import { focusMissingField } from '../../../utils/form-focus';
import type { UiProps } from '../../ui-registry';
import { MainImageInputField } from '../main-image-input-field';
import { NumberInputField } from '../number-input-field';
import { SizeMeasurementTable } from '../size-measurement-table';
import { SkuDefaultTable } from '../sku-default-table';
import { TextInputField } from '../text-input-field';

/**
 * Every field the seller can be told is wrong must be a place the UI can send
 * the eye to. `form-focus`'s private `locateErrorElement` is reached through
 * its public `focusMissingField(path)`, which both resolves a node and focuses
 * it.
 *
 * "Resolved" is not enough on its own: a located node that cannot take focus
 * leaves the seller exactly as lost as no node at all, so the focus assertion
 * is part of the contract.
 */

vi.mock('../../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api')>()),
  ProductApiService: { uploadFiles: vi.fn() },
}));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
// The library picker and the crop dialog own their own modal surface; neither
// is under test here.
vi.mock('../../../components/media-library-button', () => ({ MediaLibraryButton: () => null }));
vi.mock('../../../components/media-crop-dialog', () => ({ MediaCropDialog: () => null }));

// The category dropdown's data layer is irrelevant: only the rendered anchor
// matters, and a real tree is not what is under test.
vi.mock('../../../hooks/use-category-tree', () => ({
  useCategoryTree: () => ({
    allCategories: [],
    recentCategories: [],
    isLoading: false,
    getRootCategories: () => [],
    getChildCategories: () => [],
    searchCategories: () => [],
    addToRecent: () => {},
    findCategoryById: () => undefined,
    getAllCategories: () => [],
  }),
}));
vi.mock('../../../hooks/use-category-search-query', () => ({
  useCategorySearchQuery: () => ({ data: [], isFetching: false }),
}));

const field = (spec: Record<string, unknown>) => spec as unknown as UiProps['field'];

function Harness({
  defaults = {},
  children,
}: {
  defaults?: Record<string, unknown>;
  children: (control: Control) => React.ReactNode;
}) {
  const methods = useForm({ defaultValues: defaults });
  return <FormProvider {...methods}>{children(methods.control)}</FormProvider>;
}

/** Resolves + focuses `path`, then reports what the browser actually focused. */
function focusedFor(path: string): Element | null {
  expect(focusMissingField(path)).not.toBeNull();
  return document.activeElement;
}

beforeEach(() => {
  // jsdom has no layout: stub the scroll call form-focus makes before focusing.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('specification fields expose a focus target for their own path', () => {
  it('renders a locatable node for a text specification attribute', () => {
    render(
      <Harness>
        {(control) => (
          <TextInputField
            field={field({ name: 'textSpecAttribute', uiType: 'input', label: 'Fabric' })}
            control={control}
          />
        )}
      </Harness>,
    );

    expect(
      document.querySelector(
        '[name="textSpecAttribute"], [data-field-name="textSpecAttribute"], [data-error-path="textSpecAttribute"]',
      ),
    ).not.toBeNull();
    expect(focusedFor('textSpecAttribute')).toBe(
      document.querySelector('[name="textSpecAttribute"]'),
    );
  });

  it('renders a locatable node for a number specification attribute', () => {
    render(
      <Harness>
        {(control) => (
          <NumberInputField
            field={field({ name: 'numberSpecAttribute', uiType: 'number', label: 'Waist' })}
            control={control}
          />
        )}
      </Harness>,
    );

    expect(
      document.querySelector(
        '[name="numberSpecAttribute"], [data-field-name="numberSpecAttribute"], [data-error-path="numberSpecAttribute"]',
      ),
    ).not.toBeNull();
    expect(focusedFor('numberSpecAttribute')).toBe(
      document.querySelector('[name="numberSpecAttribute"]'),
    );
  });
});

describe('the default SKU seller-SKU cell is a focus target', () => {
  it('focuses the seller-SKU input of the default SKU row', () => {
    render(<Harness>{() => <SkuDefaultTable />}</Harness>);

    expect(document.querySelector('[name="sku.default.sellerSku"]')).not.toBeNull();
    expect(focusedFor('sku.default.sellerSku')).toBe(
      document.querySelector('[name="sku.default.sellerSku"]'),
    );
  });
});

describe('the category selector is a focus target', () => {
  it('focuses something for the required subcategoryId path', () => {
    render(
      <Harness>
        {(control) => (
          <BasicInfoSection
            control={control}
            selectedCategoryId=""
            selectedSubcategoryId=""
            onCategoryChange={() => {}}
            onSubcategoryChange={() => {}}
            onFieldChange={() => {}}
          />
        )}
      </Harness>,
    );

    // `subcategoryId` carries a required rule, so an empty form produces a real
    // error on a path that must be focusable.
    expect(screen.getByText('Category')).toBeDefined();
    expect(focusedFor('subcategoryId')).not.toBe(document.body);
  });
});

describe('the cover image anchor is focusable', () => {
  it('lets the mainImage error anchor take programmatic focus', () => {
    render(
      <Harness defaults={{ mainImage: [] }}>
        {(control) => (
          <MainImageInputField
            field={field({
              name: 'mainImage',
              label: 'Product Images',
              dataSource: { maxItems: 4 },
            })}
            control={control}
          />
        )}
      </Harness>,
    );

    const anchor = document.querySelector('[data-error-path="mainImage"]');
    expect(anchor).not.toBeNull();
    // A container anchor is only useful if it can take focus, so the contract is
    // `tabIndex={-1}`: out of the tab order, but focusable programmatically.
    expect(focusedFor('mainImage')).toBe(anchor);
    expect(anchor?.getAttribute('tabindex')).toBe('-1');
  });
});

describe('nested measurement paths resolve to a focusable container', () => {
  const renderSizeChart = () =>
    render(
      <Harness>
        {() => (
          <SizeMeasurementTable
            chart={{ key: 'product', label: 'Product', columns: ['Length'] }}
            selectedSizes={['M']}
            unit="CM"
          />
        )}
      </Harness>,
    );

  it('absorbs a deeply indexed measurement path into the size-chart container', () => {
    renderSizeChart();

    expect(focusedFor('sizes.0.bodyMeasurements.0.value')).toBe(
      document.querySelector('[data-error-path="sizes"]'),
    );
  });

  it('absorbs an out-of-range measurement index into the size-chart container', () => {
    renderSizeChart();

    expect(focusedFor('sizes.5.productMeasurements.9.value')).toBe(
      document.querySelector('[data-error-path="sizes"]'),
    );
  });
});
