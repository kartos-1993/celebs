import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios/axios-client', () => ({
  axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/media-upload', () => ({ directUploadBatch: vi.fn() }));

import { logger } from '@celebs/shared-utils';

import {
  archiveProduct,
  createProduct,
  fetchProductRenderSchema,
  getDropdownCategoryById,
  getDropdownCategoryTree,
  getDropdownRecentCategories,
  getProductById,
  getProductReviewQueue,
  getProducts,
  recordDropdownRecentCategory,
  reviewProduct,
  searchDropdownCategories,
  submitProductForReview,
  toggleProductActivation,
  updateProduct,
  uploadFiles,
} from '../../api';

import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadBatch } from '@/lib/media-upload';

const mockedGet = vi.mocked(axiosClient.get);
const mockedPost = vi.mocked(axiosClient.post);
const mockedPut = vi.mocked(axiosClient.put);
const mockedPatch = vi.mocked(axiosClient.patch);
const mockedDelete = vi.mocked(axiosClient.delete);
const mockedUploadBatch = vi.mocked(directUploadBatch);

const envelopeOf = <T>(data: T) => ({ success: true, message: 'ok', data });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('api response unwrapping', () => {
  it('returns response.data (never the raw AxiosResponse) for CRUD + review flows', async () => {
    mockedPost.mockResolvedValue({ data: envelopeOf({ id: 'p-1' }) });
    mockedGet.mockResolvedValue({ data: envelopeOf({ id: 'p-1' }) });
    mockedPut.mockResolvedValue({ data: envelopeOf({ id: 'p-1' }) });
    mockedDelete.mockResolvedValue({ data: envelopeOf({ id: 'p-1' }) });
    mockedPatch.mockResolvedValue({ data: envelopeOf({ id: 'p-1' }) });

    await expect(createProduct({ name: 'Tee' } as never)).resolves.toEqual(
      envelopeOf({ id: 'p-1' }),
    );
    expect(mockedPost).toHaveBeenCalledWith('/products', { name: 'Tee' });

    await expect(getProductById('p-1')).resolves.toEqual(envelopeOf({ id: 'p-1' }));
    expect(mockedGet).toHaveBeenCalledWith('/products/p-1');

    await expect(updateProduct('p-1', { name: 'Tee' } as never)).resolves.toEqual(
      envelopeOf({ id: 'p-1' }),
    );
    expect(mockedPut).toHaveBeenCalledWith('/products/p-1', { name: 'Tee' });

    await expect(archiveProduct('p-1')).resolves.toEqual(envelopeOf({ id: 'p-1' }));
    expect(mockedDelete).toHaveBeenCalledWith('/products/p-1');

    await expect(toggleProductActivation('p-1')).resolves.toEqual(envelopeOf({ id: 'p-1' }));
    expect(mockedPatch).toHaveBeenCalledWith('/products/p-1');

    await expect(submitProductForReview('p-1')).resolves.toEqual(envelopeOf({ id: 'p-1' }));
    expect(mockedPost).toHaveBeenCalledWith('/products/p-1/submit-for-review');

    await expect(reviewProduct('p-1', { action: 'approve' })).resolves.toEqual(
      envelopeOf({ id: 'p-1' }),
    );
    expect(mockedPost).toHaveBeenCalledWith('/products/p-1/review', { action: 'approve' });
  });

  it('passes list filters and review-queue pagination as query params', async () => {
    mockedGet.mockResolvedValue({ data: envelopeOf({ products: [], total: 0 }) });
    await getProducts({ search: 'tee', limit: 20 } as never);
    expect(mockedGet).toHaveBeenCalledWith('/products', {
      params: { search: 'tee', limit: 20 },
    });
    await getProductReviewQueue();
    expect(mockedGet).toHaveBeenCalledWith('/products/review-product-queue', {
      params: { page: 1, limit: 10 },
    });
  });

  it('fetches the render schema with the fixed locale param', async () => {
    mockedGet.mockResolvedValue({ data: envelopeOf({ fields: [], renderTag: 't', catId: 'c' }) });
    await expect(fetchProductRenderSchema('c', 'p-1')).resolves.toEqual(
      envelopeOf({ fields: [], renderTag: 't', catId: 'c' }),
    );
    expect(mockedGet).toHaveBeenCalledWith('/product-render', {
      params: { catId: 'c', locale: 'en_US', productId: 'p-1' },
    });
  });

  it('reads category endpoints through the shared category base path', async () => {
    mockedGet.mockResolvedValue({ data: envelopeOf([]) });
    mockedPost.mockResolvedValue({ data: envelopeOf([]) });
    await getDropdownCategoryTree();
    expect(mockedGet).toHaveBeenCalledWith('/category/tree-with-attributes');
    await getDropdownCategoryById('c-1');
    expect(mockedGet).toHaveBeenCalledWith('/category/c-1');
    await getDropdownRecentCategories();
    expect(mockedGet).toHaveBeenCalledWith('/category/recent');
    await recordDropdownRecentCategory('c-1');
    expect(mockedPost).toHaveBeenCalledWith('/category/recent', { categoryId: 'c-1' });
  });
});

describe('searchDropdownCategories mapping', () => {
  it('maps envelope items and derives level from array paths', async () => {
    mockedGet.mockResolvedValue({
      data: {
        data: [
          {
            id: 's-1',
            name: 'Shirts',
            parentCategory: 'c-1',
            hasChildren: false,
            path: ['Root', 'Shirts'],
          },
        ],
      },
    });
    await expect(searchDropdownCategories('shi')).resolves.toEqual([
      {
        id: 's-1',
        name: 'Shirts',
        parentCategory: 'c-1',
        hasChildren: false,
        level: 1,
        path: ['Root', 'Shirts'],
        slug: undefined,
      },
    ]);
    expect(mockedGet).toHaveBeenCalledWith('/category/search', {
      params: { q: 'shi', limit: 20 },
    });
  });

  it('splits string paths and falls back to bare arrays', async () => {
    mockedGet.mockResolvedValue({
      data: [{ id: 's-2', name: 'Pants', path: 'Root/Pants', hasChildren: true }],
    });
    // @todo-fix: the `data?.data ?? data ?? []` fallback
    // cascade is banned by AGENTS.md — fix the backend envelope at the
    // source instead of shimming shapes in the client.
    // Mitigation shipped meanwhile: the fallback branch warns in dev so the
    // drift is visible (production behavior is unchanged).
    const out = await searchDropdownCategories('pan');
    expect(out[0]?.path).toEqual(['Root', 'Pants']);
    expect(out[0]?.level).toBe(1);
    expect(out[0]?.parentCategory).toBeNull();
  });

  it('warns in dev when the envelope fallback branch fires', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    mockedGet.mockResolvedValue({ data: [{ id: 's-3', name: 'Shoes' }] });

    await expect(searchDropdownCategories('sho')).resolves.toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      { payload: [{ id: 's-3', name: 'Shoes' }] },
      expect.stringContaining('envelope fallback fired'),
    );
    warn.mockRestore();
  });

  it('stays silent in dev when the canonical envelope is used', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    mockedGet.mockResolvedValue({ data: { data: [{ id: 's-4', name: 'Hats' }] } });

    await expect(searchDropdownCategories('hat')).resolves.toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('never warns in production', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.stubEnv('DEV', false);
    mockedGet.mockResolvedValue({ data: [{ id: 's-5', name: 'Belts' }] });

    try {
      await expect(searchDropdownCategories('bel')).resolves.toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      warn.mockRestore();
    }
  });
});

describe('uploadFiles', () => {
  it('passes existing urls through without uploading', async () => {
    await expect(
      uploadFiles(['https://cdn.example.com/a.jpg', '', null, undefined]),
    ).resolves.toEqual(['https://cdn.example.com/a.jpg']);
    expect(mockedUploadBatch).not.toHaveBeenCalled();
  });

  it('uploads pending files and appends urls after existing ones', async () => {
    const file = new File(['x'], 'b.png', { type: 'image/png' });
    mockedUploadBatch.mockResolvedValue(['https://cdn.example.com/b.png']);
    await expect(uploadFiles(['https://cdn.example.com/a.jpg', file])).resolves.toEqual([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.png',
    ]);
    expect(mockedUploadBatch).toHaveBeenCalledWith([file], 'celebs/products');
  });
});
