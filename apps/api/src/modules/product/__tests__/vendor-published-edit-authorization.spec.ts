import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Vendor Published Product Edit Authorization Integration', () => {
  let productService: ProductService;
  let mockCategory: Category;
  let mockSubcategory: Category;
  let mockVendor: VendorProfile;
  let mockVendorUserId: string;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);
    const mockUser = await prisma.user.create({
      data: {
        name: 'Vendor Owner Test',
        email: `vendor-owner-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    mockVendorUserId = mockUser.id;

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Vendor Store ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
        storeCode: `VND${uid.slice(0, 3).toUpperCase()}`,
      },
    });

    mockCategory = await prisma.category.create({
      data: {
        name: 'Vendor Category Test',
        slug: `vendor-category-${Date.now()}-${uid}`,
        level: 1,
        path: 'vendor-category',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Vendor Subcategory Test',
        slug: `vendor-subcategory-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'vendor-category/vendor-subcategory',
      },
    });
  });

  it('allows vendor to update price and inventory on their own published product without lockout', async () => {
    const input: CreateProductType = {
      name: 'Original Graphic Tee',
      price: 1200,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'published',
      mainImages: ['https://cdn.example.com/tee.jpg'],
      skus: [{ skuCode: 'SKU-TEE-1', selectedOptions: {}, price: 1200, stock: 10 }],
    };

    const created = await productService.createProduct(
      input,
      mockVendorUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    // Vendor updates price from 1200 to 1400 on published product
    const updated = await productService.updateProduct(
      productId,
      {
        price: 1400,
        skus: [{ skuCode: 'SKU-TEE-1', selectedOptions: {}, price: 1400, stock: 15 }],
      },
      mockVendorUserId,
      'VENDOR',
      mockVendor.id,
      ['PRODUCT_EDIT'],
    );

    expect(updated).toBeDefined();
    expect(Number(updated?.price)).toBe(1400);
  });

  it('routes title or description updates on published product to review queue when seller lacks publish permission', async () => {
    const input: CreateProductType = {
      name: 'Original Graphic Tee V2',
      price: 1200,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'published',
      mainImages: ['https://cdn.example.com/tee.jpg'],
      skus: [{ skuCode: 'SKU-TEE-2', selectedOptions: {}, price: 1200, stock: 10 }],
    };

    const created = await productService.createProduct(
      input,
      mockVendorUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    // Non-publisher vendor updates catalog description
    const updated = await productService.updateProduct(
      productId,
      {
        description: 'Updated comprehensive description requiring editorial moderation.',
      },
      mockVendorUserId,
      'VENDOR',
      mockVendor.id,
      ['PRODUCT_EDIT'],
    );

    expect(updated).toBeDefined();
    // Major catalog updates must require admin moderation
    expect(updated?.status).toBe('pending_review');
  });

  it('strictly forbids vendor from editing another vendor product', async () => {
    const input: CreateProductType = {
      name: 'Vendor A Product',
      price: 999,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      mainImages: ['https://cdn.example.com/item.jpg'],
      skus: [{ skuCode: 'SKU-TEE-3', selectedOptions: {}, price: 999, stock: 5 }],
    };

    const created = await productService.createProduct(
      input,
      mockVendorUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    // Another vendor attempts to edit
    const attackerVendorId = 'v-attacker-uuid';

    await expect(
      productService.updateProduct(
        productId,
        { price: 100 },
        'attacker-user-id',
        'VENDOR',
        attackerVendorId,
        ['PRODUCT_EDIT'],
      ),
    ).rejects.toThrow(/Forbidden/i);
  });
});
