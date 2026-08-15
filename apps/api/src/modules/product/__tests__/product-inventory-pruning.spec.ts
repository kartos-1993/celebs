import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Product Inventory Pruning & Deep Hierarchy Search', () => {
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
        name: 'Pruning Test User',
        email: `vendor-pruning-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    mockUserId = mockUser.id;

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Pruning Shop ${Date.now()}-${uid}`,
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
        name: 'Fashion Root',
        slug: `fashion-root-${Date.now()}-${uid}`,
        level: 1,
        path: 'fashion-root',
      },
    });

    mockSubcategory = await prisma.category.create({
      data: {
        name: 'Dresses Child',
        slug: `dresses-child-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategory.id,
        path: 'fashion-root/dresses-child',
      },
    });
  });

  it('should prune orphaned inventory records when variants are removed on product update', async () => {
    // 1. Create with Red and Blue variants (2 sizes each = 4 total inventories)
    const initialInput: CreateProductType = {
      name: 'Summer Floral Dress',
      brand: 'Zara',
      description: 'Elegant summer dress with lightweight floral fabric.',
      price: 2500,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Red',
          colorCode: '#FF0000',
          images: ['https://example.com/red.jpg'],
          stocks: [
            { size: 'S', quantity: 10 },
            { size: 'M', quantity: 15 },
          ],
        },
        {
          name: 'Blue',
          colorCode: '#0000FF',
          images: ['https://example.com/blue.jpg'],
          stocks: [
            { size: 'S', quantity: 8 },
            { size: 'M', quantity: 12 },
          ],
        },
      ],
    };

    const created = await productService.createProduct(
      initialInput,
      mockUserId,
      mockVendor.id,
      'Zara Store',
    );
    expect(created).toBeDefined();
    const productId = String(created?.id);

    const initialInventories = await prisma.productInventory.findMany({
      where: { productId },
    });
    expect(initialInventories).toHaveLength(4);

    // 2. Update removing Blue variant completely (only Red remains)
    const updatePayload: Partial<CreateProductType> = {
      name: 'Summer Floral Dress (Updated)',
      colorVariants: [
        {
          name: 'Red',
          colorCode: '#FF0000',
          images: ['https://example.com/red.jpg'],
          stocks: [
            { size: 'S', quantity: 20 },
            { size: 'M', quantity: 25 },
          ],
        },
      ],
    };

    const updated = await productService.updateProduct(
      productId,
      updatePayload,
      mockUserId,
      'VENDOR',
      mockVendor.id,
      [],
    );
    expect(updated).toBeDefined();

    // 3. Verify only 2 Red inventories remain; Blue inventories were cleanly pruned
    const updatedInventories = await prisma.productInventory.findMany({
      where: { productId },
    });
    expect(updatedInventories).toHaveLength(2);
    expect(updatedInventories.every((inv) => inv.colorVariantName === 'Red')).toBe(true);
  });

  it('should find products in subcategories when querying by root category slug or id', async () => {
    const input: CreateProductType = {
      name: 'Maxi Evening Dress',
      brand: 'Mango',
      description: 'Stunning evening dress.',
      price: 4500,
      categoryId: mockCategory.id,
      subcategoryId: mockSubcategory.id,
      colorVariants: [
        {
          name: 'Black',
          colorCode: '#000000',
          images: ['https://example.com/black.jpg'],
          stocks: [{ size: 'FreeSize', quantity: 5 }],
        },
      ],
      status: 'published',
    };

    await productService.createProduct(input, mockUserId, mockVendor.id, 'Mango Store');

    // Query by category slug
    const resultsBySlug = await productService.getAllProducts({
      category: mockCategory.slug,
      status: 'published',
    });
    expect(resultsBySlug.total).toBeGreaterThanOrEqual(1);
    expect(resultsBySlug.products.some((p) => String(p?.name).includes('Maxi Evening Dress'))).toBe(
      true,
    );

    // Query by category ID
    const resultsById = await productService.getAllProducts({
      categoryId: mockCategory.id,
      status: 'published',
    });
    expect(resultsById.total).toBeGreaterThanOrEqual(1);
    expect(resultsById.products.some((p) => String(p?.name).includes('Maxi Evening Dress'))).toBe(
      true,
    );
  });
});
