import { describe, it, expect, beforeAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { ProductService } from '@/modules/product/product.service';
import { CategoryModel } from '@/db/models/category.model';
import { ProductModel } from '@/db/models/product.model';
import prisma from '@/db';

describe('Product Review & Moderation Lifecycle', () => {
  let productService: any;
  let mockCategory: any;
  let mockSubcategory: any;

  beforeAll(async () => {
    productService = new ProductService();

    mockCategory = await CategoryModel.findOne({ slug: 'electronics-lifecycle' });
    if (!mockCategory) {
      mockCategory = await CategoryModel.create({
        name: 'Electronics Lifecycle Test',
        slug: 'electronics-lifecycle',
        level: 1,
        path: ['electronics-lifecycle'],
      });
    }

    mockSubcategory = await CategoryModel.findOne({ slug: 'smartphones-lifecycle' });
    if (!mockSubcategory) {
      mockSubcategory = await CategoryModel.create({
        name: 'Smartphones Lifecycle Test',
        slug: 'smartphones-lifecycle',
        level: 2,
        parentCategory: mockCategory._id,
        path: ['electronics-lifecycle', 'smartphones-lifecycle'],
      });
    }
  });

  it('should create a product as draft with vendor ownership info and sync inventory to PostgreSQL', async () => {
    const input = {
      name: 'iPhone 15 Pro',
      brand: 'Apple',
      description: 'The latest Apple smartphone with titanium build.',
      price: 999,
      categoryId: String(mockCategory._id),
      subcategoryId: String(mockSubcategory._id),
      colorVariants: [
        {
          name: 'Natural Titanium',
          colorCode: '#8E8E93',
          images: ['https://example.com/iphone-15.jpg'],
          stocks: [{ size: '128GB', quantity: 10 }],
        },
      ],
    };

    const vendorId = new mongoose.Types.ObjectId().toString();
    const vendorName = 'Apple Store Inc.';

    const product = await productService.createProduct(input, 'user-id-123', vendorId, vendorName);

    expect(product).toBeDefined();
    expect(product.status).toBe('draft');
    expect(product.vendorId.toString()).toBe(vendorId);
    expect(product.vendorName).toBe(vendorName);
    expect(product.slug).toContain('iphone-15-pro');

    // Verify PostgreSQL inventory single source of truth
    const pgInventory = await prisma.productInventory.findUnique({
      where: {
        productId_colorVariantName_size: {
          productId: product._id.toString(),
          colorVariantName: 'Natural Titanium',
          size: '128GB',
        },
      },
    });

    expect(pgInventory).toBeDefined();
    expect(pgInventory?.quantity).toBe(10);
  });

  it('should roll back MongoDB product creation if PostgreSQL inventory sync fails', async () => {
    const input = {
      name: 'Faulty Product Rollback Test',
      price: 500,
      categoryId: String(mockCategory._id),
      subcategoryId: String(mockSubcategory._id),
      colorVariants: [
        {
          name: 'Black',
          colorCode: '#000000',
          stocks: [{ size: 'Default', quantity: 5 }],
        },
      ],
    };

    // Force prisma upsert to throw an error safely without corrupting proxy method
    const originalUpsert = prisma.productInventory.upsert;
    prisma.productInventory.upsert = vi.fn().mockRejectedValueOnce(new Error('PostgreSQL Database Failure'));

    await expect(
      productService.createProduct(input, 'user-id-123', 'vendor-id-fail', 'Fail Store')
    ).rejects.toThrow();

    // Verify MongoDB document was rolled back (deleted)
    const rolledBackProduct = await ProductModel.findOne({ name: 'Faulty Product Rollback Test' });
    expect(rolledBackProduct).toBeNull();

    prisma.productInventory.upsert = originalUpsert;
  });

  it('should submit a product draft for review successfully', async () => {
    const input = {
      name: 'MacBook Air',
      description: 'Thin and light laptop with M3 chip.',
      price: 1099,
      categoryId: String(mockCategory._id),
      subcategoryId: String(mockSubcategory._id),
      colorVariants: [
        {
          name: 'Space Gray',
          colorCode: '#53565A',
          stocks: [{ size: 'Default', quantity: 5 }],
        },
      ],
    };

    const vendorId = new mongoose.Types.ObjectId().toString();
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Apple Store');

    const submittedProduct = await productService.submitProductForReview(product._id.toString(), vendorId);
    expect(submittedProduct.status).toBe('pending_review');

    // Retrieve from review queue
    const queue = await productService.getProductReviewQueue(1, 10);
    expect(queue.total).toBeGreaterThanOrEqual(1);
    expect(queue.products.some((p: any) => p._id.toString() === product._id.toString())).toBe(true);
  });

  it('should approve a product and publish it', async () => {
    const input = {
      name: 'iPad Pro',
      description: 'M4 powered iPad with OLED screen.',
      price: 999,
      categoryId: String(mockCategory._id),
      subcategoryId: String(mockSubcategory._id),
      colorVariants: [
        {
          name: 'Silver',
          colorCode: '#C0C0C0',
          stocks: [{ size: 'Default', quantity: 8 }],
        },
      ],
    };

    const vendorId = new mongoose.Types.ObjectId().toString();
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Apple Store');
    await productService.submitProductForReview(product._id.toString(), vendorId);

    const approved = await productService.reviewProduct(product._id.toString(), 'approve', 'admin-id-456');
    expect(approved.status).toBe('published');
    expect(approved.reviewedBy).toBe('admin-id-456');
  });

  it('should reject a product with a note', async () => {
    const input = {
      name: 'Clone Charger',
      description: 'Non-genuine cheap clone charger.',
      price: 99,
      categoryId: String(mockCategory._id),
      subcategoryId: String(mockSubcategory._id),
      colorVariants: [
        {
          name: 'White',
          colorCode: '#FFFFFF',
          stocks: [{ size: 'Default', quantity: 100 }],
        },
      ],
    };

    const vendorId = new mongoose.Types.ObjectId().toString();
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Fake Store');
    await productService.submitProductForReview(product._id.toString(), vendorId);

    const rejected = await productService.reviewProduct(
      product._id.toString(),
      'reject',
      'admin-id-456',
      'This product violates our safety policies on replica accessories.',
    );

    expect(rejected.status).toBe('rejected');
    expect(rejected.reviewNote).toBe('This product violates our safety policies on replica accessories.');
  });
});
