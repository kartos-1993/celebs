import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { ProductModule } from '@/modules/product/product.module';
import { ProductService } from '@/modules/product/product.service';
import { CategoryModel, ICategory } from '@/db/models/category.model';
import { ProductModel, IProduct } from '@/db/models/product.model';
import { productFilterSchema } from '@celebs/shared-types';

describe('Product Cursor-Based Pagination & Storefront API', () => {
  let productService: ProductService;
  let mockCategory: ICategory;
  let createdProductIds: string[] = [];

  beforeEach(async () => {
    productService = ProductModule.getInstance().getProductService();

    mockCategory = await CategoryModel.create({
      name: 'Test Storefront Category',
      slug: 'test-storefront-category',
      level: 1,
      path: ['test-storefront-category'],
    });

    // Seed 15 published products to test limit=10 cursor pagination
    for (let i = 1; i <= 15; i++) {
      const prod = await ProductModel.create({
        name: `Test Storefront Product ${i}`,
        slug: `test-storefront-product-${i}-${Date.now()}`,
        description: `Description for product ${i}`,
        price: 100 + i * 10,
        category: mockCategory._id,
        subcategory: mockCategory._id,
        status: 'published',
        mainImages: ['https://example.com/image.jpg'],
        createdBy: 'system-test',
        updatedBy: 'system-test',
      });
      createdProductIds.push((prod as IProduct)._id.toString());
    }
  });

  afterEach(async () => {
    await ProductModel.deleteMany({ _id: { $in: createdProductIds } });
    await CategoryModel.deleteOne({ _id: mockCategory._id });
  });

  it('should validate cursor parameter in productFilterSchema', () => {
    const query = { limit: '10', cursor: '6a5b3999b324b8072436e1b1' };
    const validated = productFilterSchema.parse(query);
    expect(validated.cursor).toBe('6a5b3999b324b8072436e1b1');
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
