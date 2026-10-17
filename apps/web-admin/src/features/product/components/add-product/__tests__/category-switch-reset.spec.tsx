import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Form } from '@celebs/shared-ui/components/form';

import { useProductDraft } from '../../../hooks/use-product-draft';
import { useProductForm } from '../../../hooks/use-product-form';
import type { FieldSpec, ProductFormValues } from '../../../types';
import { flattenObject } from '../../../utils/add-product-helpers';
import { visibleFieldNames } from '../../dynamic-form-helpers';
import { AddProductFormBody } from '../add-product-form-body';

/**
 * The category-switch journey: a seller fills category A, picks a different
 * category, confirms the change, and must be handed a genuinely blank form.
 *
 * Nothing about the new category has been answered yet, so the moment after the
 * switch the dialog must show ZERO errors — not inline, not in the sidebar —
 * and ZERO carried-over values. Anything else means the seller is looking at
 * the previous category's state and its failures.
 *
 * The production wiring is used as-is: `AddProductFormBody` (which renders the
 * real `DynamicProductForm`, `ShippingWarrantySection` and
 * `ProductSubmissionSidebar`), the real `useProductForm` (owning
 * `handleSubcategoryChange`) and the real `useProductDraft` (owning
 * `resetForNewCategory`). Only the Radix popover is replaced by a button that
 * fires the exact three calls `BasicInfoSection`'s `CascadingDropdown.onSelect`
 * fires on confirm, in the same order.
 */

// The cover uploader is the only api surface these components touch; every other
// export (query keys, product client) stays real.
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
const CATEGORY_B = 'sub-category-b';

/**
 * Each case mounts the real `AddProductFormBody` (dynamic form + shipping
 * block + sidebar) and drives a full fill-and-switch journey, so it is orders
 * of magnitude heavier than a unit test. The default 5s budget is exceeded by
 * CPU contention when the whole feature suite runs in parallel, which is a
 * harness limit, not a behaviour signal.
 */
const JOURNEY_TIMEOUT_MS = 30_000;

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
      labels: {
        Color: { Red: 'Red', Blue: 'Blue' },
        Size: { M: 'M' },
      },
    },
  },
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, enabled: false } },
});

/** The live form, so the spec can read what the seller would be looking at. */
let liveForm: ReturnType<typeof useForm<ProductFormValues>> | null = null;

const formValues = (): ProductFormValues => (liveForm?.getValues() ?? {}) as ProductFormValues;

const variantValuesStillFilled = (): string[] =>
  Object.entries(flattenObject(formValues()))
    .filter(([key]) => key.startsWith('sku.variants.'))
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key]) => key);

const inlineErrorMessages = (): string[] =>
  screen.queryAllByRole('alert').map((node) => node.textContent ?? '');

const sidebarErrorMessages = (): string[] =>
  Array.from(document.querySelectorAll('aside li')).map((node) => node.textContent ?? '');

interface CategorySwitchProps {
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (categoryId: string) => void;
  onCategoryPathChange: (path: string[]) => void;
}

function CategorySwitch({
  categoryId,
  onCategoryChange,
  onSubcategoryChange,
  onCategoryPathChange,
}: CategorySwitchProps) {
  return (
    <button
      type="button"
      data-testid={`switch-to-${categoryId}`}
      onClick={() => {
        onCategoryChange(categoryId);
        onSubcategoryChange(categoryId);
        onCategoryPathChange([categoryId]);
      }}
    >
      Switch category
    </button>
  );
}

function Journey() {
  const { form, handleSubcategoryChange, updateBasicField } = useProductForm();
  liveForm = form;
  const draft = useProductDraft({
    form,
    userId: 'user-1',
    storeId: 'store-1',
    isEditMode: false,
    visibleFieldNames: useMemo(() => visibleFieldNames(schemaFields), []),
  });

  return (
    <Form {...form}>
      <CategorySwitch
        categoryId={CATEGORY_A}
        onCategoryChange={draft.resetForNewCategory}
        onSubcategoryChange={handleSubcategoryChange}
        onCategoryPathChange={draft.setCategoryPath}
      />
      <CategorySwitch
        categoryId={CATEGORY_B}
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

/** Every keystroke the seller makes on the journey, in the order they make it. */
async function fillCategoryA() {
  fireEvent.change(screen.getByTestId('product-name-input'), {
    target: { value: 'Handwoven Cotton Kurta With Side Pockets' },
  });
  fireEvent.change(document.querySelector('[name="textSpecAttribute"]') as HTMLInputElement, {
    target: { value: 'Cotton' },
  });
  fireEvent.change(document.querySelector('[name="numberSpecAttribute"]') as HTMLInputElement, {
    target: { value: '32' },
  });
  fireEvent.change(document.querySelector('[name="thirdSpecAttribute"]') as HTMLInputElement, {
    target: { value: 'Mandarin' },
  });
  fireEvent.change(document.querySelector('#packageLengthCm') as HTMLInputElement, {
    target: { value: '25' },
  });
  fireEvent.change(document.querySelector('#packageWidthCm') as HTMLInputElement, {
    target: { value: '20' },
  });
  fireEvent.change(document.querySelector('#packageHeightCm') as HTMLInputElement, {
    target: { value: '5' },
  });
  fireEvent.click(document.querySelector('#isFragile') as HTMLElement);

  // The variant axes are selected through the form rather than the Radix
  // popover: the pick itself is not what is under test, the switch is.
  await act(async () => {
    liveForm?.setValue('Color', ['Blue']);
    liveForm?.setValue('Size', ['M']);
  });

  for (const path of [
    'sku.variants.Color.Blue.Size.M.price',
    'sku.variants.Color.Blue.Size.M.stock',
    'sku.variants.Color.Blue.Size.M.sellerSku',
  ]) {
    const cell = document.querySelector(`[name="${path}"]`);
    expect(cell).not.toBeNull();
    fireEvent.change(cell as HTMLInputElement, { target: { value: '2400' } });
  }
}

async function selectCategoryA() {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`switch-to-${CATEGORY_A}`));
  });
  await waitFor(() => expect(document.querySelector('#packageLengthCm')).not.toBeNull());
}

async function switchToCategoryB() {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`switch-to-${CATEGORY_B}`));
  });
  // The re-validation that follows the switch is async; let it land before the
  // dialog is judged.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  liveForm = null;
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no layout observer; Radix's Select trigger measures itself.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('switching category leaves a blank dialog', () => {
  it(
    'renders no inline error after the switch',
    async () => {
      renderJourney();
      await selectCategoryA();
      await fillCategoryA();
      await switchToCategoryB();

      expect(inlineErrorMessages()).toEqual([]);
    },
    JOURNEY_TIMEOUT_MS,
  );

  it(
    'renders no sidebar error list after the switch',
    async () => {
      renderJourney();
      await selectCategoryA();
      await fillCategoryA();
      await switchToCategoryB();

      expect(sidebarErrorMessages()).toEqual([]);
    },
    JOURNEY_TIMEOUT_MS,
  );

  it(
    'resets the shipping and warranty answers to their defaults',
    async () => {
      renderJourney();
      await selectCategoryA();
      await fillCategoryA();
      expect(document.querySelector<HTMLInputElement>('#packageLengthCm')?.value).toBe('25');
      expect(document.querySelector('#isFragile')?.getAttribute('data-state')).toBe('checked');

      await switchToCategoryB();

      expect(document.querySelector<HTMLInputElement>('#packageLengthCm')?.value).toBe('');
      expect(document.querySelector('#isFragile')?.getAttribute('data-state')).toBe('unchecked');
      expect(document.querySelector('#warrantyType')?.textContent).toContain(
        'No Warranty Applicable',
      );
      expect(document.querySelector('#packagingType')?.textContent).not.toContain('Box Large');
    },
    JOURNEY_TIMEOUT_MS,
  );

  it(
    'clears every sku.variants.* value and cell',
    async () => {
      renderJourney();
      await selectCategoryA();
      await fillCategoryA();
      expect(variantValuesStillFilled().length).toBeGreaterThan(0);

      await switchToCategoryB();

      expect(variantValuesStillFilled()).toEqual([]);
      for (const cell of document.querySelectorAll<HTMLInputElement>('[name^="sku.variants."]')) {
        expect(cell.value).toBe('');
      }
    },
    JOURNEY_TIMEOUT_MS,
  );
});
