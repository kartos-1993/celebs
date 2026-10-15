import { CreateProductType, PRODUCT_STATUS } from '@celebs/shared-types';

import { ProductService } from '../../modules/product/product.service';
import prisma from '../../config/db.prisma';
import {
  resolveBrandBySlug,
  resolveCategoryBySlug,
  resolvePlatformStore,
} from './seed-catalog-refs';

interface MockProductDefinition {
  name: string;
  description: string;
  categorySlug: string;
  price: number;
  discountedPrice: number;
  image: string;
  color: { name: string; code: string };
  sizes: string[];
  stockPerSize: number;
}

const MOCK_PRODUCTS: MockProductDefinition[] = [
  {
    name: 'Essential Oversized Heavyweight Hoodie',
    description: 'Platform demo product: heavyweight fleece hoodie seeded through ProductService.',
    categorySlug: 'men-hoodies',
    price: 3200,
    discountedPrice: 2890,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop',
    color: { name: 'Charcoal', code: '#36454F' },
    sizes: ['S', 'M', 'L', 'XL'],
    stockPerSize: 12,
  },
  {
    name: 'Vintage Wash Relaxed Graphic Tee',
    description: 'Platform demo product: relaxed graphic tee seeded through ProductService.',
    categorySlug: 'men-t-shirts',
    price: 1800,
    discountedPrice: 1550,
    image:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop',
    color: { name: 'Vintage White', code: '#F5F5DC' },
    sizes: ['S', 'M', 'L'],
    stockPerSize: 15,
  },
];

/**
 * Two platform demo products, seeded through ProductService like any
 * vendor-form product. The previous raw-Prisma version wrote published
 * products with no sizes, colour variants or stock — a permanent publish-floor
 * violation; the demo catalog is now inventory-backed.
 */
export async function seedProductsMockCatalog(): Promise<void> {
  console.log('\n📦 Seeding Mock Product Catalog via ProductService...');

  const store = await resolvePlatformStore();
  const brand = await resolveBrandBySlug('celebs-official');
  const productService = new ProductService();

  let created = 0;
  let skipped = 0;

  for (const definition of MOCK_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: definition.name },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const category = await resolveCategoryBySlug(definition.categorySlug);
    const payload: CreateProductType = {
      name: definition.name,
      brand: brand.name,
      brandId: brand.id,
      description: definition.description,
      price: definition.price,
      discountedPrice: definition.discountedPrice,
      categoryId: category.parentCategory ?? category.id,
      subcategoryId: category.id,
      sizes: definition.sizes.map((size) => ({
        name: size,
        productMeasurements: [],
        bodyMeasurements: [],
      })),
      colorVariants: [
        {
          name: definition.color.name,
          colorCode: definition.color.code,
          swatch: definition.image,
          images: [definition.image],
          stocks: definition.sizes.map((size) => ({
            size,
            quantity: definition.stockPerSize,
          })),
        },
      ],
      variantOptions: [
        { name: 'Color', values: [definition.color.name] },
        { name: 'Size', values: definition.sizes },
      ],
      mainImages: [definition.image],
      tags: ['demo'],
      status: PRODUCT_STATUS.PUBLISHED,
    };

    await productService.createProduct(
      payload,
      store.userId,
      store.id,
      store.shopName,
      'SUPERADMIN',
    );
    created++;
  }

  console.log(`✅ Mock catalog: ${created} created, ${skipped} already present.`);
}

if (require.main === module) {
  seedProductsMockCatalog()
    .catch((err) => {
      console.error('❌ Failed to seed mock catalog:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
