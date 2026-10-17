import React, { useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Form } from '@celebs/shared-ui/components/form';

import { useProductDraft } from '../../../hooks/use-product-draft';
import { useProductForm } from '../../../hooks/use-product-form';
import type { FieldSpec } from '../../../types';
import { visibleFieldNames } from '../../dynamic-form-helpers';
import { AddProductFormBody } from '../add-product-form-body';

/**
 * A form must only complain about what the seller has actually done.
 *
 * Three moments are pinned here, in the order a seller meets them:
 *   1. the dialog opens with no draft and no category — nothing is known yet
 *   2. the seller picks ONE category — still nothing has been answered
 *   3. the seller types into ONE field — only that field's section may react
 *
 * Moment 2 is the reported "all errors popped out after the first click"
 * defect: picking a category runs a re-validation over the whole visible
 * schema, so every required field is suddenly red before a single keystroke.
 * Moment 3 is the matching over-correction: the reveal is global rather than
 * scoped to the field being worked on.
 *
 * The production wiring is used as-is: the real `AddProductFormBody` (which
 * renders the real `DynamicProductForm`, `ShippingWarrantySection` and
 * `ProductSubmissionSidebar`), the real `useProductForm` (owning
 * `handleSubcategoryChange`) and the real `useProductDraft` (owning
 * `resetForNewCategory`). Only the Radix popover is replaced by a button that
 * fires the exact three calls `BasicInfoSection`'s `CascadingDropdown.onSelect`
 * fires on confirm, in the same order.
 */

vi.mock('../../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api')>()),
  ProductApiService: { uploadFiles: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
vi.mock('../../../components/media-library-button', () => ({ MediaLibraryButton: () => null }));
vi.mock('../../../components/media-crop-dialog', () => ({ MediaCropDialog: () => null }));
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

const CATEGORY_A = 'sub-category-a';

/**
 * `FieldSpec['dataSource']` is declared as `Record<string, unknown>`, but a
 * variant axis's option list is read as an ARRAY of `{ value, label }` (see
 * `add-product-helpers.getLabelMap`). The declared type is under-specified, so
 * the fixture is widened here rather than typed as `any`.
 */
const axisOptions = (options: Array<{ value: string; label: string }>) =>
  options as unknown as FieldSpec['dataSource'];

const schemaFields: FieldSpec[] = [
  { name: 'mainImage', uiType: 'MainImage', label: 'Cover Photo', group: 'base', required: true },
  {
    name: 'textSpecAttribute',
    uiType: 'input',
    label: 'Fabric',
    group: 'details',
    required: true,
  },
  {
    name: 'numberSpecAttribute',
    uiType: 'number',
    label: 'Waist',
    group: 'details',
    required: true,
  },
  {
    name: 'thirdSpecAttribute',
    uiType: 'input',
    label: 'Collar',
    group: 'details',
    required: true,
  },
  {
    name: 'Color',
    uiType: 'multiselect',
    label: 'Color',
    group: 'variant',
    required: true,
    dataSource: axisOptions([
      { value: 'Red', label: 'Red' },
      { value: 'Blue', label: 'Blue' },
    ]),
  },
  {
    name: 'Size',
    uiType: 'multiselect',
    label: 'Size',
    group: 'variant',
    required: true,
    dataSource: axisOptions([{ value: 'M', label: 'M' }]),
  },
  {
    name: 'skuMatrix',
    uiType: 'SkuTableV2',
    label: 'Price & Stock',
    group: 'sale',
    required: true,
    dataSource: {
      variants: [
        { key: 'Color', label: 'Color', kind: 'color', ui: 'multiselect' },
        { key: 'Size', label: 'Size', kind: 'size', ui: 'multiselect' },
      ],
      labels: { Color: { Red: 'Red', Blue: 'Blue' }, Size: { M: 'M' } },
    },
  },
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, enabled: false } },
});

const inlineErrorMessages = (): string[] =>
  screen.queryAllByRole('alert').map((node) => node.textContent ?? '');

const sidebarErrorMessages = (): string[] =>
  Array.from(document.querySelectorAll('aside li')).map((node) => node.textContent ?? '');

const sidebarSectionErrors = (key: string): string[] => {
  const row = screen.queryByTestId(`sidebar-section-${key}`);
  if (!row) return [];
  return Array.from(row.parentElement?.querySelectorAll('li') ?? []).map(
    (node) => node.textContent ?? '',
  );
};

interface CategorySelectProps {
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (categoryId: string) => void;
  onCategoryPathChange: (path: string[]) => void;
}

function CategorySelect({
  categoryId,
  onCategoryChange,
  onSubcategoryChange,
  onCategoryPathChange,
}: CategorySelectProps) {
  return (
    <button
      type="button"
      data-testid={`select-${categoryId}`}
      onClick={() => {
        onCategoryChange(categoryId);
        onSubcategoryChange(categoryId);
        onCategoryPathChange([categoryId]);
      }}
    >
      Select category
    </button>
  );
}

function Journey() {
  const { form, handleSubcategoryChange, updateBasicField } = useProductForm();
  const draft = useProductDraft({
    form,
    userId: 'user-1',
    storeId: 'store-1',
    isEditMode: false,
    visibleFieldNames: useMemo(() => visibleFieldNames(schemaFields), []),
  });

  return (
    <Form {...form}>
      <CategorySelect
        categoryId={CATEGORY_A}
        onCategoryChange={draft.resetForNewCategory}
        onSubcategoryChange={handleSubcategoryChange}
        onCategoryPathChange={draft.setCategoryPath}
      />
      <AddProductFormBody
        productId={undefined}
        isEditMode={false}
        role="ADMIN"
        userPermissions={['PRODUCT_PUBLISH']}
        form={form}
        schemaFields={schemaFields}
        isSchemaLoading={false}
        schemaError={null}
        schemaHasName={false}
        schemaHasBrand={false}
        draft={draft}
        watchedCategoryId={String(form.watch('categoryId') || '')}
        watchedSubcategoryId={String(form.watch('subcategoryId') || '')}
        onCategoryChange={draft.resetForNewCategory}
        onSubcategoryChange={handleSubcategoryChange}
        onBasicFieldChange={updateBasicField}
        onDynamicValuesChange={() => {}}
      />
    </Form>
  );
}

function renderJourney() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Journey />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectCategoryA() {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`select-${CATEGORY_A}`));
  });
  await waitFor(() => expect(document.querySelector('[name="textSpecAttribute"]')).not.toBeNull());
  // The re-validation that follows the selection is async; let it land before
  // the dialog is judged.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no layout observer; Radix's Select trigger measures itself.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('a fresh add-product dialog is quiet', () => {
  it('renders no inline error on first mount with no draft', () => {
    renderJourney();

    expect(inlineErrorMessages()).toEqual([]);
  });

  it('renders no sidebar error on first mount with no draft', () => {
    renderJourney();

    expect(sidebarErrorMessages()).toEqual([]);
  });

  it('renders no inline error after the very first category is selected', async () => {
    renderJourney();
    await selectCategoryA();

    expect(inlineErrorMessages()).toEqual([]);
  });

  it('renders no sidebar error after the very first category is selected', async () => {
    renderJourney();
    await selectCategoryA();

    expect(sidebarErrorMessages()).toEqual([]);
  });

  it('reveals errors only in the section of the field being typed into', async () => {
    renderJourney();
    await selectCategoryA();

    const fabric = document.querySelector('[name="textSpecAttribute"]') as HTMLInputElement;
    expect(fabric).not.toBeNull();
    await act(async () => {
      fireEvent.focus(fabric);
      fireEvent.change(fabric, { target: { value: 'Cot' } });
    });

    // The seller is working on the specification, so that is the only section
    // allowed to speak up. Pricing was never touched.
    expect(sidebarSectionErrors('specification').length).toBeGreaterThan(0);
    expect(sidebarSectionErrors('pricing')).toEqual([]);
    expect(sidebarSectionErrors('images')).toEqual([]);
  });
});
