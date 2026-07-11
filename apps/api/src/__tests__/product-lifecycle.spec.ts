import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { ProductModule } from '@/modules/product/product.module';
import { CategoryModel } from '@/db/models/category.model';
import { ProductModel } from '@/db/models/product.model';

describe('Product Review & Moderation Lifecycle', () => {
  let productService: any;
  let mockCategory: any;
  let mockSubcategory: any;

  beforeAll(async () => {
    productService = ProductModule.getInstance().getProductService();

    // Create a mock parent category and subcategory
    mockCategory = await CategoryModel.create({
      name: 'Electronics',
      slug: 'electronics',
      level: 1,
      path: ['electronics'],
    });

    mockSubcategory = await CategoryModel.create({
      name: 'Smartphones',
      slug: 'smartphones',
      level: 2,
      parentCategory: mockCategory._id,
      path: ['electronics', 'smartphones'],
    });
  });

  it('should create a product as draft with vendor ownership info', async () => {
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
