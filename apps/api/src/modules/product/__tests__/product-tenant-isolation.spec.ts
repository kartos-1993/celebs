import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';
import { AppError } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Tenant Isolation & Cross-Vendor Boundaries (PostgreSQL)', () => {
  let productService: ProductService;
  let testCategory: Category;
  let vendorA: VendorProfile;
  let vendorB: VendorProfile;
  let userAId: string;
  let userBId: string;
  let staffAId: string;
  let productAId: string;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);

    // Vendor A
    const userA = await prisma.user.create({
      data: {
        name: 'Vendor A User',
        email: `vendor-a-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    userAId = userA.id;

    vendorA = await prisma.vendorProfile.create({
      data: {
        userId: userA.id,
        shopName: `Store A ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-A-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-A-${Date.now()}-${uid}`,
      },
    });

    // Staff for Vendor A
    const staffA = await prisma.user.create({
      data: {
        name: 'Staff A User',
        email: `staff-a-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'STAFF',
        vendorId: vendorA.id,
      },
    });
    staffAId = staffA.id;

    // Vendor B
    const userB = await prisma.user.create({
      data: {
        name: 'Vendor B User',
        email: `vendor-b-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    userBId = userB.id;

    vendorB = await prisma.vendorProfile.create({
      data: {
        userId: userB.id,
        shopName: `Store B ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-B-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-B-${Date.now()}-${uid}`,
      },
    });

    // Category
    testCategory = await prisma.category.create({
      data: {
        name: `Apparel Isolation ${uid}`,
        slug: `apparel-iso-${Date.now()}-${uid}`,
        level: 1,
        path: `apparel-iso-${uid}`,
      },
    });

    // Create a product owned by Vendor A
    const payload: CreateProductType = {
      name: `Vendor A Product ${uid}`,
      brand: 'Brand A',
      description: 'Exclusive product owned by Vendor A',
      price: 1500,
      discountedPrice: 1350,
      categoryId: testCategory.id,
      subcategoryId: testCategory.id,
      mainImages: ['https://example.com/item.jpg'],
      colorVariants: [
        {
          name: 'Navy',
          colorCode: '#000080',
          images: ['https://example.com/navy.jpg'],
          stocks: [{ size: 'M', quantity: 20 }],
        },
      ],
      status: 'draft',
    };

    const created = await productService.createProduct(
      payload,
      userAId,
      vendorA.id,
      vendorA.shopName,
    );
    productAId = String(created?.id);
  });

  it('should prevent Vendor B from submitting Vendor A product for review', async () => {
    await expect(
      productService.submitProductForReview(productAId, vendorB.id),
    ).rejects.toThrowError(AppError);
  });

  it('should prevent Vendor B from updating Vendor A product', async () => {
    await expect(
      productService.updateProduct(
        productAId,
        { name: 'Malicious Hijack Attempt' },
        userBId,
        'VENDOR',
        vendorB.id,
      ),
    ).rejects.toThrowError(AppError);
  });

  it('should prevent Vendor B from archiving Vendor A product', async () => {
    await expect(
      productService.archiveProduct(productAId, userBId, 'VENDOR', vendorB.id),
    ).rejects.toThrowError(AppError);
  });

  it('should allow Staff member of Vendor A to manage Vendor A product', async () => {
    const updated = await productService.updateProduct(
      productAId,
      { description: 'Updated by authorized Store A staff' },
      staffAId,
      'STAFF',
      vendorA.id,
    );
    expect(updated).not.toBeNull();
    expect(updated?.description).toBe('Updated by authorized Store A staff');
  });

  it('should allow Superadmin without vendor scoping to archive any vendor product', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Superadmin User',
        email: `superadmin-${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'SUPERADMIN',
      },
    });

    const archived = await productService.archiveProduct(
      productAId,
      adminUser.id,
      'SUPERADMIN',
      undefined,
    );
    expect(archived?.status).toBe('archived');
  });

  it('should isolate products strictly by vendor in getProductsByVendor', async () => {
    const vendorAList = await productService.getProductsByVendor(vendorA.id);
    expect(vendorAList.products.some((p) => p?.id === productAId)).toBe(true);

    const vendorBList = await productService.getProductsByVendor(vendorB.id);
    expect(vendorBList.products.some((p) => p?.id === productAId)).toBe(false);
  });
});
