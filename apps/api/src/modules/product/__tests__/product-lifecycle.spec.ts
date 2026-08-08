import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Category, VendorProfile } from '@prisma/client';
import { CreateProductType } from '@celebs/shared-types';
import { ProductService } from '@/modules/product/product.service';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Review & Moderation Lifecycle (PostgreSQL)', () => {
  let productService: ProductService;
  let mockCategory: Category;
  let mockSubcategory: Category;
  let mockVendor: VendorProfile;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);
    const mockUser = await prisma.user.create({
      data: {
        name: 'Lifecycle Test User',
        email: `vendor-lifecycle-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Lifecycle Shop ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
      },
    });

    await prisma.user.update({
      where: { id: mockUser.id },
      data: { vendorId: mockVendor.id },
    });

    mockCategory = await prisma.category.create({
      data: {
        name: 'Electronics Lifecycle Test',
        slug: `electronics-lifecycle-${Date.now()}-${uid}`,
        level: 1,
        path: 'electronics-lifecycle',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Smartphones Lifecycle Test',
        slug: `smartphones-lifecycle-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'electronics-lifecycle/smartphones-lifecycle',
      },
    });
  });

  it('should create a product as draft with vendor ownership info and sync inventory in PostgreSQL', async () => {
    const input: CreateProductType = {
      name: 'iPhone 15 Pro',
      brand: 'Apple',
      description: 'The latest Apple smartphone with titanium build.',
      price: 999,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Natural Titanium',
          colorCode: '#8E8E93',
          images: ['https://example.com/iphone-15.jpg'],
          stocks: [{ size: '128GB', quantity: 10 }],
        },
      ],
    };

    const vendorId = mockVendor.id;
    const vendorName = 'Apple Store Inc.';

    const product = await productService.createProduct(input, 'user-id-123', vendorId, vendorName);

    expect(product).not.toBeNull();
    expect(product).toBeDefined();
    expect(product?.status).toBe('draft');
    expect(product?.vendorId).toBe(vendorId);
    expect(product?.vendorName).toBe(vendorName);
    expect(String(product?.slug)).toContain('iphone-15-pro');

    const pgInventory = await prisma.productInventory.findUnique({
      where: {
        productId_colorVariantName_size: {
          productId: String(product?.id),
          colorVariantName: 'Natural Titanium',
          size: '128GB',
        },
      },
    });

    expect(pgInventory).not.toBeNull();
    expect(pgInventory?.quantity).toBe(10);
  });

  it('should atomically roll back product creation if database transaction fails', async () => {
    const input: CreateProductType = {
      name: 'Faulty Product Rollback Test',
      price: 500,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Black',
          colorCode: '#000000',
          stocks: [{ size: 'Default', quantity: 5 }],
        },
      ],
    };

    const originalTransaction = prisma.$transaction;
    prisma.$transaction = vi.fn().mockRejectedValueOnce(new Error('PostgreSQL Database Failure')) as unknown as typeof prisma.$transaction;

    await expect(
      productService.createProduct(input, 'user-id-123', mockVendor.id, 'Fail Store')
    ).rejects.toThrow();

    const rolledBackProduct = await prisma.product.findFirst({ where: { name: 'Faulty Product Rollback Test' } });
    expect(rolledBackProduct).toBeNull();

    prisma.$transaction = originalTransaction;
  });

  it('should submit a product draft for review successfully', async () => {
    const input: CreateProductType = {
      name: 'MacBook Air',
      description: 'Thin and light laptop with M3 chip.',
      price: 1099,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Space Gray',
          colorCode: '#53565A',
          stocks: [{ size: 'Default', quantity: 5 }],
        },
      ],
    };

    const vendorId = mockVendor.id;
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Apple Store');
    expect(product).not.toBeNull();

    const submittedProduct = await productService.submitProductForReview(String(product?.id), vendorId);
    expect(submittedProduct).not.toBeNull();
    expect(submittedProduct?.status).toBe('pending_review');

    const queue = await productService.getProductReviewQueue(1, 10);
    expect(queue.total).toBeGreaterThanOrEqual(1);
    expect(queue.products.some((p) => p && String(p._id || p.id) === String(product?.id))).toBe(true);
  });

  it('should approve a product and publish it', async () => {
    const input: CreateProductType = {
      name: 'iPad Pro',
      description: 'M4 powered iPad with OLED screen.',
      price: 999,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Silver',
          colorCode: '#C0C0C0',
          stocks: [{ size: 'Default', quantity: 8 }],
        },
      ],
    };

    const vendorId = mockVendor.id;
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Apple Store');
    expect(product).not.toBeNull();

    await productService.submitProductForReview(String(product?.id), vendorId);

    const approved = await productService.reviewProduct(String(product?.id), 'approve', 'admin-id-456');
    expect(approved).not.toBeNull();
    expect(approved?.status).toBe('published');
    expect(approved?.reviewedBy).toBe('admin-id-456');
  });

  it('should reject a product with a note', async () => {
    const input: CreateProductType = {
      name: 'Clone Charger',
      description: 'Non-genuine cheap clone charger.',
      price: 99,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'White',
          colorCode: '#FFFFFF',
          stocks: [{ size: 'Default', quantity: 100 }],
        },
      ],
    };

    const vendorId = mockVendor.id;
    const product = await productService.createProduct(input, 'user-id-123', vendorId, 'Fake Store');
    expect(product).not.toBeNull();

    await productService.submitProductForReview(String(product?.id), vendorId);

    const rejected = await productService.reviewProduct(
      String(product?.id),
      'reject',
      'admin-id-456',
      'This product violates our safety policies on replica accessories.',
    );

    expect(rejected).not.toBeNull();
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.reviewNote).toBe('This product violates our safety policies on replica accessories.');
  });
});


