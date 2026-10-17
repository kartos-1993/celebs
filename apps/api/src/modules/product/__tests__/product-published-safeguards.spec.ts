import { Category, VendorProfile } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateProductType } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Published Product Warehouse & Categorization Safeguards', () => {
  let productService: ProductService;
  let mockCategoryA: Category;
  let mockCategoryB: Category;
  let mockSubcategoryA: Category;
  let mockVendor: VendorProfile;
  let publishedProductId: string;
  const initialSku = 'c-ele-TIT-128GB-001';

  beforeEach(async () => {
    productService = new ProductService();

    const uid = Math.random().toString(36).substring(2, 8);
    const mockUser = await prisma.user.create({
      data: {
        name: 'Safeguard Test Admin',
        email: `admin-safeguard-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'SUPERADMIN',
      },
    });

    mockVendor = await prisma.vendorProfile.create({
      data: {
        userId: mockUser.id,
        shopName: `Safeguard Shop ${Date.now()}-${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-${Date.now()}-${uid}`,
      },
    });

    mockCategoryA = await prisma.category.create({
      data: {
        name: 'Electronics Safeguard Test',
        slug: `electronics-safeguard-${Date.now()}-${uid}`,
        level: 1,
        path: 'electronics-safeguard',
      },
    });

    mockSubcategoryA = await prisma.category.create({
      data: {
        name: 'Smartphones Safeguard Test',
        slug: `smartphones-safeguard-${Date.now()}-${uid}`,
        level: 2,
        parentCategory: mockCategoryA.id,
        path: 'electronics-safeguard/smartphones-safeguard',
      },
    });

    mockCategoryB = await prisma.category.create({
      data: {
        name: 'Apparel Safeguard Test',
        slug: `apparel-safeguard-${Date.now()}-${uid}`,
        level: 1,
        path: 'apparel-safeguard',
      },
    });

    // Create and publish a baseline product
    const input: CreateProductType = {
      name: 'Titanium Phone Pro',
      brand: 'Apple',
      description: 'Baseline phone with active warehouse inventory.',
      price: 1200,
      categoryId: mockCategoryA.id,
      subcategoryId: mockSubcategoryA.id,
      status: 'published',
      colorVariants: [
        {
          name: 'Titanium',
          colorCode: '#8E8E93',
          images: ['https://example.com/phone.jpg'],
          stocks: [{ size: '128GB', quantity: 50 }],
        },
      ],
      skus: [
        {
          skuCode: initialSku,
          selectedOptions: { color: 'Titanium', size: '128GB' },
          price: 1200,
          stock: 50,
        },
      ],
    };

    const created = await productService.createProduct(
      input,
      mockUser.id,
      mockVendor.id,
      'Safeguard Store',
    );
    publishedProductId = String(created?.id);
  });

  it('rejects category modification on an already published product', async () => {
    await expect(
      productService.updateProduct(
        publishedProductId,
        { categoryId: mockCategoryB.id },
        'admin-user',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      ),
    ).rejects.toThrow('Category cannot be changed once a product is published');
  });

  it('rejects subcategory modification on an already published product', async () => {
    await expect(
      productService.updateProduct(
        publishedProductId,
        { subcategoryId: mockCategoryB.id },
        'admin-user',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      ),
    ).rejects.toThrow('Category cannot be changed once a product is published');
  });

  it('rejects modifying existing variant SKU code on an already published product', async () => {
    const alteredSku = 'c-ele-TIT-128GB-MODIFIED';
    await expect(
      productService.updateProduct(
        publishedProductId,
        {
          colorVariants: [
            {
              name: 'Titanium',
              colorCode: '#8E8E93',
              images: ['https://example.com/phone.jpg'],
              stocks: [{ size: '128GB', quantity: 50 }],
            },
          ],
          skus: [
            {
              skuCode: alteredSku,
              selectedOptions: { color: 'Titanium', size: '128GB' },
              price: 1200,
              stock: 50,
            },
          ],
        },
        'admin-user',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      ),
    ).rejects.toThrow(/Cannot modify SKU for published variant/);
  });

  it('rejects removing an existing variant from an already published product', async () => {
    await expect(
      productService.updateProduct(
        publishedProductId,
        {
          colorVariants: [
            {
              name: 'Titanium',
              colorCode: '#8E8E93',
              images: ['https://example.com/phone.jpg'],
              stocks: [], // removed the 128GB variant row
            },
          ],
        },
        'admin-user',
        'SUPERADMIN',
        undefined,
        ['PRODUCT_PUBLISH'],
      ),
    ).rejects.toThrow(/Cannot remove variants from an already published product/);
  });

  it('allows adding a new variant with a new SKU to an already published product', async () => {
    const newSku = 'c-ele-TIT-256GB-NEW';
    const updated = await productService.updateProduct(
      publishedProductId,
      {
        colorVariants: [
          {
            name: 'Titanium',
            colorCode: '#8E8E93',
            images: ['https://example.com/phone.jpg'],
            stocks: [
              { size: '128GB', quantity: 50 },
              { size: '256GB', quantity: 30 },
            ],
          },
        ],
        skus: [
          {
            skuCode: initialSku,
            selectedOptions: { color: 'Titanium', size: '128GB' },
            price: 1200,
            stock: 50,
          },
          {
            skuCode: newSku,
            selectedOptions: { color: 'Titanium', size: '256GB' },
            price: 1400,
            stock: 30,
          },
        ],
      },
      'admin-user',
      'SUPERADMIN',
      undefined,
      ['PRODUCT_PUBLISH'],
    );

    expect(updated).toBeDefined();

    const inventories = await prisma.productInventory.findMany({
      where: { productId: publishedProductId },
    });
    expect(inventories).toHaveLength(2);
    expect(inventories.find((i) => i.size === '128GB')?.sku).toBe(initialSku);
    expect(inventories.find((i) => i.size === '256GB')?.sku).toBe(newSku);
  });

  it('allows updating price, title, or quantity on an already published product while preserving existing SKU', async () => {
    const updated = await productService.updateProduct(
      publishedProductId,
      {
        name: 'Titanium Phone Pro (Updated Edition)',
        price: 1150,
        colorVariants: [
          {
            name: 'Titanium',
            colorCode: '#8E8E93',
            images: ['https://example.com/phone.jpg'],
            stocks: [{ size: '128GB', quantity: 75 }],
          },
        ],
        skus: [
          {
            skuCode: initialSku,
            selectedOptions: { color: 'Titanium', size: '128GB' },
            price: 1150,
            stock: 75,
          },
        ],
      },
      'admin-user',
      'SUPERADMIN',
      undefined,
      ['PRODUCT_PUBLISH'],
    );

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Titanium Phone Pro (Updated Edition)');
    expect(updated?.price).toBe(1150);

    const inv = await prisma.productInventory.findFirst({
      where: { productId: publishedProductId, size: '128GB' },
    });
    expect(inv?.sku).toBe(initialSku);
    expect(inv?.quantity).toBe(75);
  });
});
