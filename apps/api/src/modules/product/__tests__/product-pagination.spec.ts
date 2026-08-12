import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { productFilterSchema } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

describe('Product Cursor-Based Pagination & Storefront API (PostgreSQL)', () => {
  let productService: ProductService;
  let mockCategory: { id: string; name: string; slug: string };
  let createdProductIds: string[] = [];

  beforeEach(async () => {
    productService = new ProductService();

    mockCategory = await prisma.category.create({
      data: {
        name: 'Test Storefront Category',
        slug: `test-storefront-category-${Date.now()}`,
        level: 1,
        path: 'test-storefront-category',
      },
    });

    for (let i = 1; i <= 15; i++) {
      const prod = await prisma.product.create({
        data: {
          name: `Test Storefront Product ${i}`,
          slug: `test-storefront-product-${i}-${Date.now()}`,
          description: `Description for product ${i}`,
          price: 100 + i * 10,
          categoryId: mockCategory.id,
          subcategoryId: mockCategory.id,
          status: 'published',
          mainImages: ['https://example.com/image.jpg'],
          createdBy: 'system-test',
          updatedBy: 'system-test',
        },
      });
      createdProductIds.push(prod.id);
    }
  });

  afterEach(async () => {
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
      createdProductIds = [];
    }
    if (mockCategory?.id) {
      await prisma.category.delete({ where: { id: mockCategory.id } }).catch(() => {});
    }
  });

  it('should validate UUID cursor parameter in productFilterSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const query = { limit: '10', cursor: validUuid };
    const validated = productFilterSchema.parse(query);
    expect(validated.cursor).toBe(validUuid);
    expect(validated.limit).toBe(10);
  });

  it('should fetch first page with limit and return nextCursor and hasMore = true', async () => {
    const result = await productService.getAllProducts({
      limit: 10,
      category: mockCategory.slug,
    });

    expect(result.products).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
    expect(typeof result.nextCursor).toBe('string');
  });

  it('should fetch second page using nextCursor and return hasMore = false when catalog ends', async () => {
    const page1 = await productService.getAllProducts({
      limit: 10,
      category: mockCategory.slug,
    });

    const page2 = await productService.getAllProducts({
      limit: 10,
      cursor: page1.nextCursor,
      category: mockCategory.slug,
    });

    expect(page2.products).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeUndefined();
  });
});
