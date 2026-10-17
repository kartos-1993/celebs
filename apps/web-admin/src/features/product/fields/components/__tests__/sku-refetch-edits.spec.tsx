import React from 'react';
import { type FieldValues, FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import { getProductById, getVariantAxes, PRODUCT_QUERY_KEYS } from '../../../api';
import { PRODUCT_DETAIL_STALE_TIME_MS, useProductForm } from '../../../hooks/use-product-form';
import type { ProductFormValues } from '../../../types';
import type { VariantDataSource } from '../sku-table-types';
import { useSkuTable, VARIANT_AXES_STALE_TIME_MS } from '../use-sku-table';
import { VariantFieldInput } from '../variant-field-input';

vi.mock('../../../api', async () => {
  const actual = await vi.importActual<typeof import('../../../api')>('../../../api');
  return { ...actual, getVariantAxes: vi.fn(), getProductById: vi.fn() };
});

const axesMock = vi.mocked(getVariantAxes);
const detailMock = vi.mocked(getProductById);

const AXES_PATH = '/product-axes';
const RED_PRICE = 'sku.variants.Color.Red.price';
const AXES_PAYLOAD = [{ key: 'Color', label: 'Colour' }];

const DATA_SOURCE = {
  fetch: AXES_PATH,
  params: { productId: 'p1' },
  labels: { Color: { Red: 'Red', Blue: 'Blue' } },
} as unknown as VariantDataSource;

const AXES_KEY = PRODUCT_QUERY_KEYS.variantAxes(AXES_PATH, { productId: 'p1' });

let setPrice: ((value: number) => void) | null = null;
let getPrice: (() => unknown) | null = null;
let queryClient: QueryClient;

function SkuTableProbe() {
  useSkuTable(DATA_SOURCE);
  return <div data-testid="sku-table-mounted" />;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<FieldValues>({
    defaultValues: {
      Color: ['Red', 'Blue'],
      sku: { variants: { Color: { Red: { sku: 'RED-1' }, Blue: { sku: 'BLUE-1' } } } },
    },
  });
  setPrice = (value) => methods.setValue(RED_PRICE, value, { shouldDirty: true });
  getPrice = () => methods.getValues(RED_PRICE);
  return (
    <FormProvider {...methods}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </FormProvider>
  );
}

function mount() {
  return render(
    <Harness>
      <SkuTableProbe />
    </Harness>,
  );
}

beforeEach(() => {
  axesMock.mockReset();
  axesMock.mockResolvedValue(AXES_PAYLOAD);
  detailMock.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

describe('a routine refetch must not re-hydrate the SKU table under a seller', () => {
  it('holds the axes for the same window the render-schema query uses', () => {
    // Pinned as a constant so a later refactor cannot silently drop the window:
    // a stale axes entry mints a new identity, which is what re-keys the
    // matrix's watched SKU paths while a cell is being typed into.
    expect(VARIANT_AXES_STALE_TIME_MS).toBe(2 * 60 * 1000);
  });

  it('does not refetch the axes on a remount inside the stale window', async () => {
    const first = mount();
    await waitFor(() => expect(axesMock).toHaveBeenCalledTimes(1));
    expect(axesMock).toHaveBeenCalledWith(AXES_PATH, { productId: 'p1' });
    first.unmount();

    // A remount is the cheapest stand-in for the re-render / route transition a
    // background product refetch triggers. Without `staleTime` this refetches.
    mount();
    await waitFor(() => expect(queryClient.getQueryData(AXES_KEY)).toEqual(AXES_PAYLOAD));
    expect(axesMock).toHaveBeenCalledTimes(1);
  });

  it('survives a refetch that returns the same axes after a price was typed', async () => {
    mount();
    await waitFor(() => expect(axesMock).toHaveBeenCalledTimes(1));

    // The seller types a new price into the Red cell.
    act(() => setPrice?.(1999));
    expect(getPrice?.()).toBe(1999);

    // A background refetch comes back with byte-identical axes.
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: AXES_KEY });
    });
    expect(axesMock).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(AXES_KEY)).toEqual(AXES_PAYLOAD);

    // The in-progress edit is still there — the refetch never wrote to the form.
    expect(getPrice?.()).toBe(1999);
  });
});

/**
 * The refetch that actually reverted the cell is the product-DETAIL query:
 * `use-product-form.ts` hydrated on every new `productResponse` identity with
 * no `staleTime` to stop the routine ones, and `form.reset(hydrated)` discards
 * every `shouldDirty` edit. These run the REAL hook around a REAL form and a
 * real DOM keystroke, because the hazard is a composition: query identity ×
 * `formState.isDirty` × a real `useController` cell.
 */
/** One stored SKU row, typed so the fixture can be re-priced without a cast. */
const storedSku = (price: number) =>
  ({
    skuCode: 'ANNA-RED',
    selectedOptions: { Color: 'Red' },
    price,
    stock: 4,
    isDefault: true,
  }) as NonNullable<AdminProductDetail['skus']>[number];

const storedProduct: AdminProductDetail = {
  id: 'p1',
  name: 'Handwoven Cotton Kurta',
  brand: 'Annapurna',
  description: 'A handwoven kurta.',
  price: 2400,
  status: 'published',
  categoryId: 'cat-women',
  subcategoryId: 'sub-kurta',
  mainImages: ['https://cdn.example.com/cover-1.jpg'],
  colorVariants: [{ name: 'Red', images: [], stocks: [] }],
  sizes: [],
  skus: [storedSku(2400)],
  dynamicData: {
    values: {},
    variantFields: [{ key: 'Color', kind: 'color' }],
    uploadedAssets: { colorMeta: {} },
  },
};

const otherProduct: AdminProductDetail = {
  ...storedProduct,
  id: 'p2',
  name: 'Block Print Kurta',
  skus: [storedSku(3100)],
};

const DETAIL_KEY = PRODUCT_QUERY_KEYS.detail('p1');
const OTHER_DETAIL_KEY = PRODUCT_QUERY_KEYS.detail('p2');

type FormBox = { form?: UseFormReturn<ProductFormValues> };

function EditFormProbe({ box, productId }: { box: FormBox; productId: string }) {
  const { form } = useProductForm(productId);
  box.form = form;
  return (
    <FormProvider {...form}>
      {/* The exact cell SkuMatrixTable renders for this `.price` path. */}
      <VariantFieldInput name={RED_PRICE} type="number" required />
    </FormProvider>
  );
}

function mountEditForm(productId: string) {
  const box: FormBox = {};
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EditFormProbe box={box} productId={productId} />
    </QueryClientProvider>,
  );
  return { box, view, input: screen.getByRole('spinbutton') as HTMLInputElement };
}

/** A real keystroke into the mounted cell — React → RHF → `setValue`. */
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
};

/**
 * A forced refetch plus one macrotask turn. TanStack Query batches its
 * subscriber notification on a scheduled callback, so awaiting the refetch
 * promise alone resolves BEFORE the observer re-renders — without the extra
 * turn a freshly published payload never reaches the form under test.
 */
const refetchDetail = async (key: readonly unknown[]) => {
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: key });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('useProductForm must not form.reset(hydrated) over unsaved edits', () => {
  it('holds the product detail for a window so a routine refetch never mints a new identity', () => {
    // Pinned as a constant so a later refactor cannot silently drop the window
    // back to "stale on every mount", which is what re-ran the reset at all.
    expect(PRODUCT_DETAIL_STALE_TIME_MS).toBe(60 * 1000);
  });

  it('keeps a price the seller typed when the SAME product refetches', async () => {
    detailMock.mockResolvedValue({ data: storedProduct } as never);
    const { box, input } = mountEditForm('p1');

    // Hydration ran: the cell shows the stored price, and the form is clean.
    await waitFor(() => expect(input.value).toBe('2400'));
    expect(box.form?.formState.isDirty).toBe(false);

    await typeInto(input, '1999');
    expect(input.value).toBe('1999');
    await waitFor(() => expect(box.form?.formState.isDirty).toBe(true));

    // A background refetch comes back with a brand new response identity.
    await refetchDetail(DETAIL_KEY);
    expect(detailMock).toHaveBeenCalledTimes(2);

    // The in-progress edit survived: the reset never replayed over it.
    expect(input.value).toBe('1999');
    expect(String(box.form?.getValues(RED_PRICE))).toBe('1999');
  });

  it('still re-hydrates on a refetch when the form has nothing unsaved', async () => {
    detailMock.mockResolvedValue({ data: storedProduct } as never);
    const { input } = mountEditForm('p1');
    await waitFor(() => expect(input.value).toBe('2400'));

    // No local edits, so a server-side change must land in the form.
    detailMock.mockResolvedValue({
      data: { ...storedProduct, skus: [storedSku(2500)] },
    } as never);
    await refetchDetail(DETAIL_KEY);

    expect(input.value).toBe('2500');
  });

  it('still re-hydrates when the product being edited actually changed', async () => {
    detailMock.mockImplementation(
      async (id: string) => ({ data: id === 'p2' ? otherProduct : storedProduct }) as never,
    );
    const { box, view, input } = mountEditForm('p1');
    await waitFor(() => expect(input.value).toBe('2400'));

    // Dirty: the seller is mid-edit. Navigating to another product must still
    // load THAT product rather than keep the previous one's half-edited values.
    await typeInto(input, '1999');
    await waitFor(() => expect(box.form?.formState.isDirty).toBe(true));

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <EditFormProbe box={box} productId="p2" />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(queryClient.getQueryData(OTHER_DETAIL_KEY)).toBeDefined());
    await waitFor(() => expect(input.value).toBe('3100'));
  });
});
