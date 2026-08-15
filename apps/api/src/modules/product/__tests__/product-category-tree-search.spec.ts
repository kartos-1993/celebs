import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Multi-Tier Category Hierarchy Search (PostgreSQL)', () => {
  let productService: ProductService;
  let rootCat: Category;
  let subCat: Category;
  let childCat: Category;
  let vendor: VendorProfile;
  let userId: string;
  let rootProdId: string;
  let subProdId: string;
  let childProdId: string;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);

    const user = await prisma.user.create({
      data: {
        name: 'Category Search User',
        email: `cat-search-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    userId = user.id;

    vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Tree Shop ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-TR-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-TR-${Date.now()}-${uid}`,
      },
    });

    // Tier 1: Root category
    rootCat = await prisma.category.create({
      data: {
        name: `Apparel Root ${uid}`,
        slug: `apparel-${uid}`,
        level: 1,
        path: `apparel-${uid}`,
      },
    });

    // Tier 2: Subcategory
    subCat = await prisma.category.create({
      data: {
        name: `Women Apparel ${uid}`,
        slug: `women-${uid}`,
        level: 2,
        path: `${rootCat.slug}/women-${uid}`,
        parentCategory: rootCat.id,
      },
    });

    // Tier 3: Child category
    childCat = await prisma.category.create({
      data: {
        name: `Summer Dresses ${uid}`,
        slug: `summer-dresses-${uid}`,
        level: 3,
        path: `${subCat.path}/summer-dresses-${uid}`,
        parentCategory: subCat.id,
      },
    });

    // Product at Root
    const p1 = await productService.createProduct(
      {
        name: `Generic Apparel ${uid}`,
        brand: 'Generic',
        description: 'Root product',
        price: 800,
        categoryId: rootCat.id,
        subcategoryId: rootCat.id,
        mainImages: ['https://example.com/p1.jpg'],
        status: 'published',
      },
      userId,
      vendor.id,
      vendor.shopName,
    );
    rootProdId = String(p1?.id);

    // Product at Subcategory
    const p2 = await productService.createProduct(
      {
        name: `Women Blazer ${uid}`,
        brand: 'Women Collection',
        description: 'Subcategory product',
        price: 2500,
        categoryId: rootCat.id,
        subcategoryId: subCat.id,
        mainImages: ['https://example.com/p2.jpg'],
        status: 'published',
      },
      userId,
      vendor.id,
      vendor.shopName,
    );
    subProdId = String(p2?.id);

    // Product at Child Category
    const p3 = await productService.createProduct(
      {
        name: `Floral Summer Dress ${uid}`,
        brand: 'Summer Breeze',
        description: 'Child category product',
        price: 3200,
        categoryId: subCat.id,
        subcategoryId: childCat.id,
        mainImages: ['https://example.com/p3.jpg'],
        status: 'published',
      },
      userId,
      vendor.id,
      vendor.shopName,
    );
    childProdId = String(p3?.id);
  });

  it('should return products across all tiers when searching by root category slug', async () => {
    const result = await productService.getAllProducts({ category: rootCat.slug });
    const resultIds = result.products.map((p) => p?.id);

    expect(resultIds).toContain(rootProdId);
    expect(resultIds).toContain(subProdId);
    expect(resultIds).toContain(childProdId);
  });

  it('should return only descendant products when searching by intermediate subcategory slug', async () => {
    const result = await productService.getAllProducts({ category: subCat.slug });
    const resultIds = result.products.map((p) => p?.id);

    expect(resultIds).not.toContain(rootProdId);
    expect(resultIds).toContain(subProdId);
    expect(resultIds).toContain(childProdId);
  });

  it('should isolate only leaf products when searching by leaf category slug', async () => {
    const result = await productService.getAllProducts({ category: childCat.slug });
    const resultIds = result.products.map((p) => p?.id);

    expect(resultIds).not.toContain(rootProdId);
    expect(resultIds).not.toContain(subProdId);
    expect(resultIds).toContain(childProdId);
  });
});
