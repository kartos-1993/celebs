import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
  fetchProductRenderSchema: vi.fn(),
  getDropdownCategoryById: vi.fn(),
  PRODUCT_QUERY_KEYS: { schemaAll: ['product-schema'], schemaRender: () => ['product-schema'] },
}));

import { fetchProductRenderSchema, getDropdownCategoryById } from '../../api';
import { useProductSchema } from '../../hooks/use-product-schema';

const mockedRender = vi.mocked(fetchProductRenderSchema);
const mockedById = vi.mocked(getDropdownCategoryById);

/** The success-path baseline, in schema order. */
const BASELINE_NAMES = ['mainImages', 'price', 'specialPrice'];

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const renderSchema = (catId: string) => renderHook(() => useProductSchema(catId), { wrapper });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProductSchema failure contract', () => {
  it('surfaces an explicit error state instead of fake baseline fields', async () => {
    mockedRender.mockRejectedValue(new Error('product-render 500'));
    mockedById.mockResolvedValue({ success: true, message: 'ok', data: {} } as never);

    const { result } = renderSchema('cat-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeUndefined();
    // Submit is gated on a non-empty schema, so an undefined `data` is what
    // blocks it — never a fabricated baseline schema.
    expect(result.current.data ?? []).toEqual([]);
  });

  it('propagates a category-attribute failure instead of swallowing it', async () => {
    mockedRender.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        fields: [{ name: 'material', uiType: 'input', label: 'M', group: 'details' }],
        renderTag: 't',
        catId: 'cat-1',
      },
    } as never);
    mockedById.mockRejectedValue(new Error('category 500'));

    const { result } = renderSchema('cat-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Failed to load category attributes');
  });

  it('still serves the baseline schema on a successful empty-category response', async () => {
    mockedRender.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { fields: [], renderTag: 't', catId: 'cat-1' },
    } as never);
    mockedById.mockResolvedValue({ success: true, message: 'ok', data: {} } as never);

    const { result } = renderSchema('cat-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((field) => field.name)).toEqual(BASELINE_NAMES);
  });

  it('never queries without a category', () => {
    const { result } = renderSchema('');

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(mockedRender).not.toHaveBeenCalled();
  });
});
