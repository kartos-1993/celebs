import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Shipping Logistics and Warranty Specification Integration', () => {
  let productService: ProductService;
  let mockCategory: Category;
  let mockSubcategory: Category;
  let mockVendor: VendorProfile;
  let mockUserId: string;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);
    const mockUser = await prisma.user.create({
      data: {
        name: 'Logistics Test Admin',
        email: `admin-logistics-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'SUPERADMIN',
      },
    });
    mockUserId = mockUser.id;

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Logistics Hub ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
        storeCode: `LOG${uid.slice(0, 3).toUpperCase()}`,
      },
    });

    mockCategory = await prisma.category.create({
      data: {
        name: 'Logistics Category Test',
        slug: `logistics-category-${Date.now()}-${uid}`,
        level: 1,
        path: 'logistics-category',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Logistics Subcategory Test',
        slug: `logistics-subcategory-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'logistics-category/logistics-subcategory',
      },
    });
  });

  it('persists parcel dimensions, weight, fragility, and warranty specifications during product creation', async () => {
    const input: CreateProductType = {
      name: 'Oversized Washed Heavyweight Hoodie',
      brand: 'Celebs Flagship',
      description: 'Standard 450 GSM winter garment with express courier packaging.',
      price: 2499,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      packageWeightKg: 0.85,
      packageLengthCm: 32,
      packageWidthCm: 24,
      packageHeightCm: 6,
      packagingType: 'FLYER_MEDIUM',
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'SELLER_WARRANTY',
      warrantyPeriod: '7 Days Replacement',
      warrantyPolicy: 'Covers stitching and fabric defect upon unboxing delivery.',
      isNonReturnable: false,
    };

    const created = await productService.createProduct(
      input,
      mockUserId,
      mockVendor.id,
      mockVendor.shopName,
    );

    expect(created).toBeDefined();
    expect(created?.packageWeightKg).toBe(0.85);
    expect(created?.packageLengthCm).toBe(32);
    expect(created?.packageWidthCm).toBe(24);
    expect(created?.packageHeightCm).toBe(6);
    expect(created?.packagingType).toBe('FLYER_MEDIUM');
    expect(created?.isFragile).toBe(false);
    expect(created?.warrantyType).toBe('SELLER_WARRANTY');
    expect(created?.warrantyPeriod).toBe('7 Days Replacement');
    expect(created?.isNonReturnable).toBe(false);
  });

  it('updates shipping properties and warranty policies cleanly on an existing product', async () => {
    const input: CreateProductType = {
      name: 'Ceramic Tabletop Mug',
      price: 650,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      packageWeightKg: 0.4,
      packagingType: 'BOX_STANDARD',
      isFragile: true,
      hasBatteryOrLiquid: false,
      isNonReturnable: true,
    };

    const created = await productService.createProduct(
      input,
      mockUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    const updated = await productService.updateProduct(
      productId,
      {
        packageWeightKg: 0.55,
        packageLengthCm: 15,
        packageWidthCm: 15,
        packageHeightCm: 18,
        warrantyType: 'BRAND_WARRANTY',
        warrantyPeriod: '30 Days Leakproof Guarantee',
      },
      mockUserId,
      'SUPERADMIN',
      undefined,
      ['PRODUCT_EDIT'],
    );

    expect(updated).toBeDefined();
    expect(updated?.packageWeightKg).toBe(0.55);
    expect(updated?.packageLengthCm).toBe(15);
    expect(updated?.packageWidthCm).toBe(15);
    expect(updated?.packageHeightCm).toBe(18);
    expect(updated?.warrantyType).toBe('BRAND_WARRANTY');
    expect(updated?.warrantyPeriod).toBe('30 Days Leakproof Guarantee');
    expect(updated?.isFragile).toBe(true);
    expect(updated?.isNonReturnable).toBe(true);
  });
});
