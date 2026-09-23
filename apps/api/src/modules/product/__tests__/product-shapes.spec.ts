import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductQueryService } from '../product-query.service';

vi.mock('@/common/services/redis-cache.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/common/services/redis-cache.service')>();
  return { ...actual, getCachedJson: vi.fn().mockResolvedValue(null), setCachedJson: vi.fn() };
});

const row = {
  id: 'p1',
  name: 'Denim Shorts',
  brand: 'Celebs',
  brandId: null,
  price: 2200,
  discountedPrice: 2000,
  status: 'published',
  vendorId: 'v1',
  vendorName: 'Celebs Official',
  updatedAt: new Date('2026-09-22T00:00:00Z'),
  mainImages: ['cover.jpg'],
  sizes: [{ name: 'S', productMeasurements: [], bodyMeasurements: [] }],
  colorVariants: [],
  skus: [
    {
      skuCode: 'A',
      selectedOptions: { Color: 'Red', Size: 'S' },
      price: 2100,
      discountedPrice: 1900,
      stock: 4,
    },
    {
      skuCode: 'B',
      selectedOptions: { Color: 'Blue', Size: 'M' },
      price: 2300,
      stock: 6,
    },
  ],
  variantOptions: [
    { name: 'Color', values: ['Red', 'Blue'] },
    { name: 'Size', values: ['S', 'M'] },
  ],
  dynamicData: {
    values: { sku: { default: { price: '', stock: '' } } },
    variants: { colorMeta: {} },
  },
  categoryId: 'c1',
  subcategoryId: 'c1',
};

function serviceWith(rowValue: unknown, listValue: unknown[] = []) {
  const products = {
    findDetailedById: vi.fn().mockResolvedValue(rowValue),
    findManyList: vi.fn().mockResolvedValue(listValue),
    count: vi.fn().mockResolvedValue(listValue.length),
  };
  const service = new ProductQueryService(products as never, {} as never);
  return { service, products };
}

describe('Response shapes per consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves the PDP shape publicly: declared pricing, no draft mirror', async () => {
    const { service } = serviceWith(row);
    const result = (await service.getProductById('p1', false)) as Record<string, unknown>;

    expect(result).toMatchObject({
      id: 'p1',
      cover: 'cover.jpg',
      inStock: true,
      status: 'published',
      vendorId: 'v1',
    });
    expect(result.comboPrices).toHaveLength(2);
    expect(result.priceRange).toEqual({ min: 1900, max: 2300 });
    expect(result.minDiscounted).toBe(1900);
    expect(result.sizes).toHaveLength(1);
    // Draft internals never leave the server on public shapes.
    expect(result.dynamicData).toBeUndefined();
    expect(result.skus).toBeUndefined();
    // Exact contract: fat cannot creep back unnoticed.
    expect(Object.keys(result).sort()).toEqual(
      [
        'brand',
        'category',
        'colorVariants',
        'comboPrices',
        'cover',
        'description',
        'discountedPrice',
        'id',
        'inStock',
        'minDiscounted',
        'name',
        'price',
        'priceRange',
        'ratingAverage',
        'ratingCount',
        'sizes',
        'status',
        'subcategory',
        'vendorId',
      ].sort(),
    );
  });

  it('serves the full admin shape when elevated', async () => {
    const { service } = serviceWith(row);
    const result = (await service.getProductById('p1', true)) as Record<string, unknown>;

    expect(result.skus).toHaveLength(2);
    expect(result.dynamicData).toBeDefined();
    expect(result.status).toBe('published');
  });

  it('serves lean card rows on public lists', async () => {
    const { service } = serviceWith(null, [row]);
    const result = await service.getAllProducts({}, 1, 10, {});

    expect(result.products).toHaveLength(1);
    const card = result.products[0] as Record<string, unknown>;
    expect(card).toMatchObject({ id: 'p1', cover: 'cover.jpg', minPrice: 1900 });
    expect(Object.keys(card).sort()).toEqual(
      [
        'brand',
        'colorVariants',
        'cover',
        'discountedPrice',
        'id',
        'inStock',
        'minDiscounted',
        'minPrice',
        'name',
        'price',
        'ratingAverage',
        'ratingCount',
      ].sort(),
    );
  });

  it('serves admin rows with stock totals on elevated lists', async () => {
    const { service } = serviceWith(null, [row]);
    const result = await service.getAllProducts({}, 1, 10, {
      isElevated: true,
      actor: { role: 'ADMIN' } as never,
    });

    const item = result.products[0] as Record<string, unknown>;
    expect(item).toMatchObject({ id: 'p1', stockTotal: 10, cover: 'cover.jpg' });
    expect(item.skus).toBeUndefined();
    expect(item.colorVariants).toBeUndefined();
    expect(Object.keys(item).sort()).toEqual(
      [
        'cover',
        'category',
        'discountedPrice',
        'id',
        'name',
        'price',
        'slug',
        'status',
        'stockTotal',
        'updatedAt',
        'vendorName',
      ].sort(),
    );
  });

  it('declares the category with image and totals variant stocks without skus', async () => {
    const variantRow = {
      ...row,
      skus: [],
      category: { id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' },
      colorVariants: [{ name: 'Red', stocks: [{ size: 'S', quantity: 4 }] }],
    };
    const { service } = serviceWith(null, [variantRow]);
    const result = await service.getAllProducts({}, 1, 10, {
      isElevated: true,
      actor: { role: 'ADMIN' } as never,
    });

    const item = result.products[0] as Record<string, unknown>;
    expect(item).toMatchObject({
      stockTotal: 4,
      category: { id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' },
    });
  });
});
