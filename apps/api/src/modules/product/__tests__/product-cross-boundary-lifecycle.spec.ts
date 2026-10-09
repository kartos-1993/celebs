import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType, StorefrontDetail } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';
import { ProductLifecycleService } from '@/modules/product/product-lifecycle.service';
import { ProductQueryService } from '@/modules/product/product-query.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Cross-Boundary Product Lifecycle Integration', () => {
  let productService: ProductService;
  let productLifecycleService: ProductLifecycleService;
  let productQueryService: ProductQueryService;
  let mockCategory: Category;
  let mockSubcategory: Category;
  let mockVendor: VendorProfile;
  let competingVendor: VendorProfile;
  let mockVendorUserId: string;
  let competingVendorUserId: string;
  let adminUserId: string;

  beforeEach(async () => {
    productService = new ProductService();
    productLifecycleService = new ProductLifecycleService();
    productQueryService = new ProductQueryService();

    const uid = Math.random().toString(36).substring(2, 8);

    // Primary Vendor User
    const vendorUser = await prisma.user.create({
      data: {
        name: 'Apex Sports Vendor',
        email: `apex-vendor-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    mockVendorUserId = vendorUser.id;

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        shopName: `Apex Athletics ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
      },
    });

    await prisma.user.update({
      where: { id: vendorUser.id },
      data: { vendorId: mockVendor.id },
    });

    // Competing Vendor User
    const competingUser = await prisma.user.create({
      data: {
        name: 'Rival Merchant',
        email: `rival-vendor-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    competingVendorUserId = competingUser.id;

    competingVendor = await prisma.vendorProfile.create({
      data: {
        userId: competingUser.id,
        shopName: `Rival Sports ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-RIVAL-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-RIVAL-${Date.now()}-${uid}`,
      },
    });

    await prisma.user.update({
      where: { id: competingUser.id },
      data: { vendorId: competingVendor.id },
    });

    // Admin User
    const adminUser = await prisma.user.create({
      data: {
        name: 'Platform Admin',
        email: `admin-qc-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'ADMIN',
      },
    });
    adminUserId = adminUser.id;

    // Taxonomy Categories
    mockCategory = await prisma.category.create({
      data: {
        name: 'Sports & Outdoors Lifecycle',
        slug: `sports-lifecycle-${Date.now()}-${uid}`,
        level: 1,
        path: 'sports-lifecycle',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Running Footwear Lifecycle',
        slug: `running-shoes-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'sports-lifecycle/running-shoes',
      },
    });
  });

  it('executes full cross-boundary lifecycle from vendor draft to published consumer PDP', async () => {
    // 1. Vendor Creates Draft with 11 Logistics and Warranty Fields
    const draftInput: CreateProductType = {
      name: 'Apex Carbon Plate Marathon Shoe',
      brand: 'Apex Athletics',
      description:
        'Elite road racing marathon shoe with carbon fiber composite plate and responsive foam.',
      price: 18500,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      status: 'draft',
      packageWeightKg: 0.85,
      packageLengthCm: 32,
      packageWidthCm: 22,
      packageHeightCm: 12,
      packagingType: 'BOX_STANDARD',
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '6 Months Performance Guarantee',
      warrantyPolicy: 'Covers midsole delamination and carbon plate structural integrity.',
      isNonReturnable: false,
      mainImages: ['https://cdn.example.com/shoes-main.jpg'],
      colorVariants: [
        {
          name: 'Racing Red',
          colorCode: '#FF0033',
          images: ['https://cdn.example.com/shoes-red.jpg'],
          stocks: [
            { size: 'US 9', quantity: 15 },
            { size: 'US 10', quantity: 20 },
          ],
        },
      ],
      skus: [
        {
          skuCode: 'APEX-RED-9',
          selectedOptions: { Color: 'Racing Red', Size: 'US 9' },
          price: 18500,
          stock: 15,
        },
        {
          skuCode: 'APEX-RED-10',
          selectedOptions: { Color: 'Racing Red', Size: 'US 10' },
          price: 18500,
          stock: 20,
        },
      ],
    };

    const created = await productService.createProduct(
      draftInput,
      mockVendorUserId,
      mockVendor.id,
      mockVendor.shopName,
    );

    expect(created).toBeDefined();
    const productId = String(created?.id);
    expect(created?.status).toBe('draft');
    expect(created?.vendorId).toBe(mockVendor.id);

    // 2. Vendor Submits Draft for Admin Review
    const submitted = await productLifecycleService.submitProductForReview(
      productId,
      mockVendor.id,
    );
    expect(submitted?.status).toBe('pending_review');

    // 3. Admin Reviews and Approves Product
    const approved = await productLifecycleService.reviewProduct(productId, {
      action: 'approve',
      reviewerId: adminUserId,
      reviewerName: 'Lead Catalog Moderator',
      note: 'Complete specifications, high quality imagery, and verified brand warranty.',
    });

    expect(approved?.status).toBe('published');
    expect(Number(approved?.qualityScore)).toBeGreaterThan(0);

    // 4. Public Consumer PDP Query Verification
    const publicPdp = (await productQueryService.getProductById(
      productId,
      false,
    )) as StorefrontDetail | null;
    expect(publicPdp).toBeDefined();
    expect(publicPdp?.id).toBe(productId);
    expect(publicPdp?.status).toBe('published');

    // Verify all 11 logistics & warranty specs are faithfully projected
    expect(publicPdp?.packageWeightKg).toBe(0.85);
    expect(publicPdp?.packageLengthCm).toBe(32);
    expect(publicPdp?.packageWidthCm).toBe(22);
    expect(publicPdp?.packageHeightCm).toBe(12);
    expect(publicPdp?.packagingType).toBe('BOX_STANDARD');
    expect(publicPdp?.isFragile).toBe(false);
    expect(publicPdp?.hasBatteryOrLiquid).toBe(false);
    expect(publicPdp?.warrantyType).toBe('BRAND_WARRANTY');
    expect(publicPdp?.warrantyPeriod).toBe('6 Months Performance Guarantee');
    expect(publicPdp?.warrantyPolicy).toBe(
      'Covers midsole delamination and carbon plate structural integrity.',
    );
    expect(publicPdp?.isNonReturnable).toBe(false);

    // Verify stock derivation
    expect(publicPdp?.inStock).toBe(true);
    const variants = (publicPdp?.colorVariants ?? []) as Array<{
      stocks?: Array<{ quantity: number }>;
    }>;
    const totalVariantStock = variants.reduce(
      (sum: number, variant) =>
        sum + (variant.stocks || []).reduce((vSum: number, s) => vSum + (s.quantity || 0), 0),
      0,
    );
    expect(totalVariantStock).toBe(35); // 15 + 20

    // 5. Vendor Updates Price & Inventory on Published Catalog without Lockout
    const updatedCatalog = await productService.updateProduct(
      productId,
      {
        price: 17500,
        skus: [
          {
            skuCode: 'APEX-RED-9',
            selectedOptions: { Color: 'Racing Red', Size: 'US 9' },
            price: 17500,
            stock: 12,
          },
          {
            skuCode: 'APEX-RED-10',
            selectedOptions: { Color: 'Racing Red', Size: 'US 10' },
            price: 17500,
            stock: 18,
          },
        ],
      },
      mockVendorUserId,
      'VENDOR',
      mockVendor.id,
      ['PRODUCT_EDIT'],
    );

    expect(updatedCatalog).toBeDefined();
    expect(Number(updatedCatalog?.price)).toBe(17500);
    expect(updatedCatalog?.status).toBe('published'); // Remains published without lockout

    // 6. Vendor Updates Catalog Title without Publish Permission -> Automatically Routes to Review
    const titleUpdate = await productService.updateProduct(
      productId,
      {
        name: 'Apex Carbon Plate Marathon Shoe V2 (Updated Upper)',
      },
      mockVendorUserId,
      'VENDOR',
      mockVendor.id,
      ['PRODUCT_EDIT'],
    );

    expect(titleUpdate?.status).toBe('pending_review');

    // 7. Security Isolation: Competing Vendor Cannot Modify Product
    await expect(
      productService.updateProduct(
        productId,
        { price: 9999 },
        competingVendorUserId,
        'VENDOR',
        competingVendor.id,
        ['PRODUCT_EDIT'],
      ),
    ).rejects.toThrow();
  });
});
