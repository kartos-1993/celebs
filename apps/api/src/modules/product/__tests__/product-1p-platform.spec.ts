import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensurePlatformVendor,
  is1PVendor,
  PLATFORM_VENDOR_ID,
  PLATFORM_VENDOR_NAME,
} from '@/common/constants/platform-vendor';
import prisma from '@/config/db.prisma';
import { formatProductResponse } from '@/modules/product/product.presenter';
import { ProductService } from '@/modules/product/product.service';
import { isCrossStoreProductEdit } from '@/modules/product/utils/product-audit';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('1P Platform Architecture & Zero-Null Model', () => {
  let productService: ProductService;
  let adminUserId: string;
  let vendor3P: VendorProfile;
  let category: Category;
  let subcategory: Category;

  beforeEach(async () => {
    productService = new ProductService();
    const uid = Math.random().toString(36).substring(2, 8);

    // 1. Create Superadmin
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: `admin-1p-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'SUPERADMIN',
      },
    });
    adminUserId = admin.id;

    // 2. Create 3P Vendor
    const vendorUser = await prisma.user.create({
      data: {
        name: '3P Vendor User',
        email: `vendor-3p-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });

    vendor3P = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        shopName: `3P Fashion Store ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
        status: 'APPROVED',
      },
    });

    // 3. Create Categories
    category = await prisma.category.create({
      data: {
        name: `Apparel ${uid}`,
        slug: `apparel-${Date.now()}-${uid}`,
        level: 1,
        path: 'apparel',
      },
    });

    subcategory = await prisma.category.create({
      data: {
        name: `T-Shirts ${uid}`,
        slug: `tshirts-${Date.now()}-${uid}`,
        level: 2,
        path: `apparel/tshirts-${uid}`,
        parent: { connect: { id: category.id } },
      },
    });
  });

  describe('Predicate & Provisioning Helpers', () => {
    it('is1PVendor should identify PLATFORM_VENDOR_ID and reject others without null coercion', () => {
      expect(is1PVendor(PLATFORM_VENDOR_ID)).toBe(true);
      expect(is1PVendor(vendor3P.id)).toBe(false);
      expect(is1PVendor(null)).toBe(false);
      expect(is1PVendor(undefined)).toBe(false);
      expect(is1PVendor('')).toBe(false);
      expect(is1PVendor('00000000-0000-0000-0000-000000000002')).toBe(false);
    });

    it('ensurePlatformVendor should provision canonical 1P VendorProfile idempotently', async () => {
      const vendor1 = await ensurePlatformVendor(prisma, adminUserId);
      expect(vendor1).not.toBeNull();
      expect(vendor1?.id).toBe(PLATFORM_VENDOR_ID);
      expect(vendor1?.shopName).toBe(PLATFORM_VENDOR_NAME);
      expect(vendor1?.status).toBe('APPROVED');

      // Subsequent call returns existing record without throwing unique constraint error
      const vendor2 = await ensurePlatformVendor(prisma, adminUserId);
      expect(vendor2?.id).toBe(PLATFORM_VENDOR_ID);
    });
  });

  describe('1P Product Creation & Presenter Data Sanitization', () => {
    it('should create 1P product with PLATFORM_VENDOR_ID and strip raw inventories from presentation', async () => {
      await ensurePlatformVendor(prisma, adminUserId);

      const product = await productService.createProduct(
        {
          name: 'Celebs Flagship Tee',
          description: '1P Premium Organic Cotton Tee',
          price: 2500,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          brand: PLATFORM_VENDOR_NAME,
          status: 'published',
          colorVariants: [
            {
              name: 'Navy',
              colorCode: '#000080',
              images: ['https://media.celebs.com.np/navy.jpg'],
              stocks: [{ size: 'M', quantity: 15 }],
            },
          ],
        },
        adminUserId,
        PLATFORM_VENDOR_ID,
        PLATFORM_VENDOR_NAME,
      );

      // Verify product entity in DB
      expect(product).not.toBeNull();
      expect(product!.vendorId).toBe(PLATFORM_VENDOR_ID);
      expect(product!.vendorName).toBe(PLATFORM_VENDOR_NAME);

      // Verify inventories are present on raw create return for initial stock derivation
      const formatted = formatProductResponse(product!);
      expect(formatted).not.toBeNull();

      // Raw inventories must be stripped to prevent data leakage
      expect(formatted!.inventories).toBeUndefined();

      // Formatted colorVariants should have derived stock
      expect(formatted!.colorVariants).toHaveLength(1);
      const cv = (
        formatted!.colorVariants as Array<{
          name: string;
          stocks: Array<{ size: string; quantity: number }>;
        }>
      )[0]!;
      expect(cv.name).toBe('Navy');
      expect(cv.stocks[0]!.quantity).toBe(15);
      expect(formatted!.inStock).toBe(true);
    });
  });

  describe('Ownership Security & Zero-Null Protection', () => {
    it('should prevent 3P vendor from submitting or modifying 1P products', async () => {
      await ensurePlatformVendor(prisma, adminUserId);

      const p1 = await productService.createProduct(
        {
          name: '1P Private Product',
          description: 'Official product',
          price: 1500,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          status: 'draft',
        },
        adminUserId,
        PLATFORM_VENDOR_ID,
        PLATFORM_VENDOR_NAME,
      );

      expect(p1).not.toBeNull();

      // 3P vendor attempts to submit 1P product for review -> FORBIDDEN
      await expect(
        productService.submitProductForReview(p1!.id as string, vendor3P.id, false),
      ).rejects.toThrow(/You do not own this product/i);

      // 3P vendor attempts to update 1P product -> FORBIDDEN
      await expect(
        productService.updateProduct(
          p1!.id as string,
          { name: 'Hijacked 1P Product' },
          adminUserId,
          'VENDOR',
          vendor3P.id,
        ),
      ).rejects.toThrow(/You do not own this product/i);

      // 3P vendor attempts to archive 1P product -> FORBIDDEN
      await expect(
        productService.archiveProduct(p1!.id as string, adminUserId, 'VENDOR', vendor3P.id),
      ).rejects.toThrow(/You do not own this product/i);
    });
  });

  describe('Cross-Store Audit Classification', () => {
    it('should NOT flag 1P product updates as cross-store edits, but SHOULD flag 3P product edits', () => {
      // Admin editing 1P product -> Not a cross-store edit
      expect(isCrossStoreProductEdit('SUPERADMIN', PLATFORM_VENDOR_ID)).toBe(false);
      expect(isCrossStoreProductEdit('ADMIN', PLATFORM_VENDOR_ID)).toBe(false);

      // Admin editing 3P vendor product -> Cross-store edit!
      expect(isCrossStoreProductEdit('SUPERADMIN', vendor3P.id)).toBe(true);
      expect(isCrossStoreProductEdit('ADMIN', vendor3P.id)).toBe(true);

      // Vendor or staff editing -> Never a cross-store edit
      expect(isCrossStoreProductEdit('VENDOR', vendor3P.id)).toBe(false);
      expect(isCrossStoreProductEdit('STAFF', vendor3P.id)).toBe(false);
    });
  });
});
