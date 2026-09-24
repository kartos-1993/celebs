import { describe, expect, it } from 'vitest';

import {
  type AdminListCategory,
  type AdminListItem,
  type AdminProductDetail,
  type PaginatedProductResponse,
  PRODUCT_STATUS,
  type ProductStatus,
  type SkuPriceEntry,
  type StorefrontCard,
  type StorefrontCardColorVariant,
  type StorefrontDetail,
  type StorefrontDetailColorVariant,
  type StorefrontDetailSize,
} from '../index';

describe('Product Canonical Types (TDD Contract Specification)', () => {
  it('enforces canonical product status constants and type union', () => {
    expect(PRODUCT_STATUS).toEqual({
      DRAFT: 'draft',
      PENDING_REVIEW: 'pending_review',
      PUBLISHED: 'published',
      REJECTED: 'rejected',
      DEACTIVATED: 'deactivated',
      ARCHIVED: 'archived',
    });

    const validStatus: ProductStatus = PRODUCT_STATUS.PUBLISHED;
    expect(validStatus).toBe('published');
  });

  it('validates StorefrontCard exact contract (13 keys)', () => {
    const variant: StorefrontCardColorVariant = {
      name: 'Indigo Blue',
      images: ['https://cdn.example.com/blue-1.webp', 'https://cdn.example.com/blue-2.webp'],
    };

    const card: StorefrontCard = {
      id: 'prod-001',
      name: 'Denim Overshirt',
      brand: 'Celebs Studio',
      cover: 'https://cdn.example.com/cover.webp',
      price: 2400,
      discountedPrice: 1999,
      minPrice: 1999,
      minDiscounted: 1999,
      ratingAverage: 4.8,
      ratingCount: 42,
      inStock: true,
      colorVariants: [variant],
    };

    expect(card.id).toBe('prod-001');
    expect(card.colorVariants[0].name).toBe('Indigo Blue');
    expect(card.inStock).toBe(true);

    const keys = Object.keys(card).sort();
    expect(keys).toEqual(
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

  it('validates StorefrontDetail exact contract (19 keys)', () => {
    const size: StorefrontDetailSize = {
      name: 'M',
      productMeasurements: [{ name: 'Chest', value: '42', unit: 'in' }],
      bodyMeasurements: [],
    };

    const variant: StorefrontDetailColorVariant = {
      name: 'Indigo Blue',
      colorCode: '#1A365D',
      swatch: 'https://cdn.example.com/swatch-blue.webp',
      images: ['https://cdn.example.com/blue-1.webp'],
      stocks: [{ size: 'M', quantity: 15 }],
    };

    const combo: SkuPriceEntry = {
      options: { Color: 'Indigo Blue', Size: 'M' },
      price: 2400,
      discountedPrice: 1999,
      stock: 15,
    };

    const detail: StorefrontDetail = {
      id: 'prod-001',
      name: 'Denim Overshirt',
      brand: 'Celebs Studio',
      description: 'Heavyweight organic cotton overshirt with dual patch pockets.',
      price: 2400,
      discountedPrice: 1999,
      cover: 'https://cdn.example.com/cover.webp',
      sizes: [size],
      colorVariants: [variant],
      comboPrices: [combo],
      priceRange: { min: 1999, max: 2400 },
      minDiscounted: 1999,
      ratingAverage: 4.8,
      ratingCount: 42,
      inStock: true,
      category: { id: 'cat-apparel', name: 'Apparel' },
      subcategory: { id: 'cat-shirts', name: 'Shirts' },
      status: 'published',
      vendorId: 'vendor-001',
    };

    expect(detail.id).toBe('prod-001');
    expect(detail.sizes).toHaveLength(1);
    expect(detail.comboPrices[0].stock).toBe(15);
    expect(detail.priceRange.min).toBe(1999);

    const keys = Object.keys(detail).sort();
    expect(keys).toEqual(
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

  it('validates AdminListItem exact contract (11 keys)', () => {
    const category: AdminListCategory = {
      id: 'cat-shirts',
      name: 'Shirts',
      imageUrl: 'https://cdn.example.com/cat-shirts.webp',
    };

    const adminItem: AdminListItem = {
      id: 'prod-001',
      name: 'Denim Overshirt',
      slug: 'denim-overshirt-001',
      price: 2400,
      discountedPrice: 1999,
      cover: 'https://cdn.example.com/cover.webp',
      status: 'published',
      stockTotal: 15,
      vendorName: 'Celebs Flagship',
      category,
      updatedAt: '2026-09-24T10:00:00.000Z',
    };

    expect(adminItem.stockTotal).toBe(15);
    expect(adminItem.category?.imageUrl).toBe('https://cdn.example.com/cat-shirts.webp');

    const keys = Object.keys(adminItem).sort();
    expect(keys).toEqual(
      [
        'category',
        'cover',
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

  it('validates AdminProductDetail and PaginatedProductResponse contract', () => {
    const fullDetail: AdminProductDetail = {
      id: 'prod-001',
      name: 'Denim Overshirt',
      price: 2400,
      status: PRODUCT_STATUS.DRAFT,
      dynamicData: {
        values: { Fabric: '100% Organic Cotton' },
      },
      skus: [{ skuCode: 'SKU-001', price: 2400, stock: 15 }],
    };

    const paginated: PaginatedProductResponse<AdminProductDetail> = {
      products: [fullDetail],
      total: 1,
      nextCursor: undefined,
      hasMore: false,
    };

    expect(paginated.products).toHaveLength(1);
    expect(paginated.products[0].name).toBe('Denim Overshirt');
  });
});
