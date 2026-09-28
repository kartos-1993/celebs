import React from 'react';
import { useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { autofillProductForm } from '../../components/add-product/dev-autofill';
import { useProductSchema } from '../use-product-schema';

/**
 * ONE GALLERY, ONE SPELLING.
 *
 * A category whose schema declares no attributes is served the success-path
 * `FALLBACK_FIELD_SCHEMA`, and that schema's cover field `name` IS the RHF path
 * the gallery registers under. It used to be the pre-unification singular
 * `mainImage`, while `resolveCoverFieldName` and `buildProductPayload` read
 * `mainImages` — so on exactly this path the form held a gallery nothing
 * published, and the write contract silently dropped it. The bridging read
 * alias in `add-product-payload.ts` papered over the mismatch instead of
 * removing it.
 *
 * Pinned here at the two seams the rename has to hold: the schema the fallback
 * path publishes, and the key dev autofill writes.
 */

vi.mock('../../api', () => ({
  fetchProductRenderSchema: vi.fn(),
  getDropdownCategoryById: vi.fn(),
  PRODUCT_QUERY_KEYS: { schemaAll: ['product-schema'], schemaRender: () => ['product-schema'] },
}));

import { fetchProductRenderSchema, getDropdownCategoryById } from '../../api';

const mockedRender = vi.mocked(fetchProductRenderSchema);
const mockedById = vi.mocked(getDropdownCategoryById);

const COVER = 'mainImages';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {children}
  </QueryClientProvider>
);

/** The success-path fallback schema: a category with NO configured attributes. */
const renderFallbackSchema = async () => {
  mockedRender.mockResolvedValue({
    success: true,
    message: 'ok',
    data: { fields: [], renderTag: 't', catId: 'cat-1' },
  } as never);
  mockedById.mockResolvedValue({ success: true, message: 'ok', data: {} } as never);
  const { result } = renderHook(() => useProductSchema('cat-1'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data ?? [];
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the fallback schema publishes the canonical gallery key', () => {
  it('declares the cover field under the PLURAL name', async () => {
    const fields = await renderFallbackSchema();
    const cover = fields.find((field) => field.uiType === 'MainImage');
    expect(cover?.name).toBe(COVER);
  });

  it('never publishes the pre-unification singular under any group', async () => {
    const fields = await renderFallbackSchema();
    expect(fields.map((field) => field.name)).not.toContain('mainImage');
  });

  it('the cover field is the one the payload reads back', async () => {
    // `resolveCoverFieldName` is literally `fields.find(MainImage)?.name`, so a
    // schema that publishes the plural automatically makes the payload agree —
    // no read alias required on this path.
    const fields = await renderFallbackSchema();
    const coverFieldName = fields.find((field) => field.uiType === 'MainImage')?.name;
    expect(coverFieldName).toBe(COVER);
  });
});

describe('dev autofill writes the same canonical key', () => {
  it('fills the gallery where the fallback schema registered it', async () => {
    const fields = await renderFallbackSchema();
    const coverFieldName = fields.find((field) => field.uiType === 'MainImage')?.name as string;

    const { result } = renderHook(
      () => useForm<Record<string, unknown>>({ defaultValues: {}, shouldUnregister: false }),
      { wrapper },
    );
    act(() => {
      autofillProductForm(result.current, fields);
    });

    const values = result.current.getValues();
    expect(values[coverFieldName]).toHaveLength(2);
    // And nothing was written to a key the form does not use.
    expect(values.mainImage).toBeUndefined();
  });
});
