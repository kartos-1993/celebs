import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminProductDetail, CreateProductType, StorefrontDetail } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';
import { ProductQueryService } from '@/modules/product/product-query.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Shipping Logistics and Warranty Projections Integration', () => {
  let productService: ProductService;
  let productQueryService: ProductQueryService;
  let mockCategory: Category;
  let mockSubcategory: Category;
  let mockVendor: VendorProfile;
  let mockUserId: string;

  beforeEach(async () => {
    productService = new ProductService();
    productQueryService = new ProductQueryService();

    const uid = Math.random().toString(36).substring(2, 8);
    const mockUser = await prisma.user.create({
      data: {
        name: 'Projections Test Admin',
        email: `admin-proj-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'SUPERADMIN',
      },
    });
    mockUserId = mockUser.id;

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Logistics Projection Hub ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
        storeCode: `PRJ${uid.slice(0, 3).toUpperCase()}`,
      },
    });

    mockCategory = await prisma.category.create({
      data: {
        name: 'Projection Category Test',
        slug: `proj-category-${Date.now()}-${uid}`,
        level: 1,
        path: 'proj-category',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Projection Subcategory Test',
        slug: `proj-subcategory-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'proj-category/proj-subcategory',
      },
    });
  });

  it('retains shipping parcel dimensions and logistics specs on public detail query', async () => {
    const input: CreateProductType = {
      name: 'Winter Down Parka Jacket',
      brand: 'Celebs Mountain',
      description: 'Heavyweight winter parka jacket for freezing conditions.',
      price: 5500,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'published',
      packageWeightKg: 1.25,
      packageLengthCm: 40,
      packageWidthCm: 30,
      packageHeightCm: 10,
      packagingType: 'BOX_MEDIUM',
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '1 Year Fabric Guarantee',
      warrantyPolicy: 'Covers zip and down-feather leak defects.',
      isNonReturnable: false,
      mainImages: ['https://cdn.example.com/jacket.jpg'],
      skus: [
        {
          price: 5500,
          stock: 10,
        },
      ],
    };

    const created = await productService.createProduct(
      input,
      mockUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    const publicDetail = (await productQueryService.getProductById(productId, false)) as
      | (StorefrontDetail & Record<string, unknown>)
      | null;

    expect(publicDetail).toBeDefined();
    expect(publicDetail?.id).toBe(productId);
    // Public detail must project logistics and warranty specifications
    expect(publicDetail?.packageWeightKg).toBe(1.25);
    expect(publicDetail?.packagingType).toBe('BOX_MEDIUM');
    expect(publicDetail?.warrantyType).toBe('BRAND_WARRANTY');
    expect(publicDetail?.warrantyPeriod).toBe('1 Year Fabric Guarantee');
    expect(publicDetail?.warrantyPolicy).toBe('Covers zip and down-feather leak defects.');
    expect(publicDetail?.isNonReturnable).toBe(false);
  });

  it('includes all 11 logistics and moderation fields on admin detail query without wiping', async () => {
    const input: CreateProductType = {
      name: 'Ceramic Fragile Tea Set',
      price: 1800,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      packageWeightKg: 0.95,
      packageLengthCm: 25,
      packageWidthCm: 20,
      packageHeightCm: 15,
      packagingType: 'BOX_STANDARD',
      isFragile: true,
      hasBatteryOrLiquid: false,
      warrantyType: 'SELLER_WARRANTY',
      warrantyPeriod: '3 Days Unboxing Replacement',
      warrantyPolicy: 'Damaged pieces replaced upon unboxing video proof.',
      isNonReturnable: true,
      mainImages: ['https://cdn.example.com/teaset.jpg'],
      skus: [
        {
          price: 1800,
          stock: 5,
        },
      ],
    };

    const created = await productService.createProduct(
      input,
      mockUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    const adminDetail = (await productQueryService.getProductById(
      productId,
      true,
    )) as AdminProductDetail | null;

    expect(adminDetail).toBeDefined();
    expect(adminDetail?.id).toBe(productId);
    expect(adminDetail?.packageWeightKg).toBe(0.95);
    expect(adminDetail?.packageLengthCm).toBe(25);
    expect(adminDetail?.packageWidthCm).toBe(20);
    expect(adminDetail?.packageHeightCm).toBe(15);
    expect(adminDetail?.packagingType).toBe('BOX_STANDARD');
    expect(adminDetail?.isFragile).toBe(true);
    expect(adminDetail?.hasBatteryOrLiquid).toBe(false);
    expect(adminDetail?.warrantyType).toBe('SELLER_WARRANTY');
    expect(adminDetail?.warrantyPeriod).toBe('3 Days Unboxing Replacement');
    expect(adminDetail?.warrantyPolicy).toBe('Damaged pieces replaced upon unboxing video proof.');
    expect(adminDetail?.isNonReturnable).toBe(true);
  });

  it('preserves shipping specifications when optional dimensions are null', async () => {
    const input: CreateProductType = {
      name: 'Essential Cotton Socks Set',
      price: 450,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      packageWeightKg: 0.15,
      packagingType: 'FLYER_SMALL',
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'NO_WARRANTY',
      isNonReturnable: true,
      mainImages: ['https://cdn.example.com/socks.jpg'],
      skus: [
        {
          price: 450,
          stock: 20,
        },
      ],
    };

    const created = await productService.createProduct(
      input,
      mockUserId,
      mockVendor.id,
      mockVendor.shopName,
    );
    const productId = String(created?.id);

    const adminDetail = (await productQueryService.getProductById(
      productId,
      true,
    )) as AdminProductDetail | null;

    expect(adminDetail).toBeDefined();
    expect(adminDetail?.packageWeightKg).toBe(0.15);
    expect(adminDetail?.packageLengthCm).toBeUndefined();
    expect(adminDetail?.packageWidthCm).toBeUndefined();
    expect(adminDetail?.packageHeightCm).toBeUndefined();
    expect(adminDetail?.packagingType).toBe('FLYER_SMALL');
    expect(adminDetail?.isNonReturnable).toBe(true);
  });
});
