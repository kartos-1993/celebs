import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const API_SRC = readFileSync(resolve(__dirname, '../api.ts'), 'utf8');
const ACTIONS_SRC = readFileSync(resolve(__dirname, '../hooks/use-wishlist.ts'), 'utf8');

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('expo-constants', () => ({ default: { expoConfig: { hostUri: 'localhost:8081' } } }));

import { addToWishlist, getWishlist, removeFromWishlist } from '../api';

import { apiClient } from '@/api/client';

describe('wishlist api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getWishlist drops unidentifiable / unhydrated rows instead of backfilling them', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: [
          {
            id: 'w1',
            productId: 'p1',
            addedAt: 't',
            product: { id: 'p1', name: 'Tee', price: 100, mainImages: ['a'] },
          },
          // No productId -> not a wishlist row.
          { id: 'w2', productId: '', addedAt: 't', product: { id: 'p2' } },
          // No hydrated product -> nothing honest to render.
          { id: 'w3', productId: 'p3', addedAt: 't' },
        ],
      },
    } as never);
    const out = await getWishlist();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'w1', productId: 'p1' });
    expect(out[0].product.name).toBe('Tee');
    expect(out[0].product.mainImages).toEqual(['a']);
  });

  it('getWishlist no longer invents "Product" / 0 / [] for a missing product', () => {
    expect(API_SRC).not.toContain("name: entry.product?.name || 'Product'");
    expect(API_SRC).not.toContain('Number(entry.product?.price ?? 0)');
    expect(API_SRC).not.toContain('Array.isArray(data) ? data : []');
  });

  it('getWishlist fails fast on a non-array payload instead of an empty list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', data: { items: [] } },
    } as never);
    await expect(getWishlist()).rejects.toThrow(/Malformed \/wishlist payload/);
  });

  it('addToWishlist returns null on empty envelope data (pinned as-is)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', data: null },
    } as never);
    await expect(addToWishlist('p1')).resolves.toBeNull();
  });

  it('removeFromWishlist routes through the shared response handler', async () => {
    expect(API_SRC).toContain('await handleApiResponse(apiClient.delete<IApiResponse<null>>');
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: false } } as never);
    await expect(removeFromWishlist('p1')).rejects.toThrow();
  });

  it('the optimistic add never inserts a blank name/0-price card', () => {
    expect(ACTIONS_SRC).toMatch(/if \(!snapshot\) return;/);
    expect(ACTIONS_SRC).not.toMatch(/name: ''/);
    expect(ACTIONS_SRC).toMatch(/name: snapshot\.name \?\? ''/);
  });

  it('the product card hands over a real snapshot so the optimistic row is real', () => {
    const cardHook = readFileSync(
      resolve(__dirname, '../../products/hooks/use-product-card.ts'),
      'utf8',
    );
    expect(cardHook).toContain('addToWishlist.mutate({');
    expect(cardHook).toContain('productId: product.id');
    // `cover` is the only image field a storefront product carries. Handing
    // over `mainImages: product.mainImages` snapshotted `undefined` for every
    // real product, so the optimistic row always rendered picture-less.
    expect(cardHook).toContain('cover: product.cover');
    expect(cardHook).not.toContain('mainImages: product.mainImages');
  });
});
