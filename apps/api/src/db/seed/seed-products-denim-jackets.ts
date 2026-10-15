import { ProductService } from '../../modules/product/product.service';
import prisma from '../../config/db.prisma';
import {
  buildDenimJacketPayload,
  readSeedDataset,
  type DenimSeedItem,
} from './product-seed-payloads';
import {
  resolveBrandBySlug,
  resolveCategoryBySlug,
  resolvePlatformStore,
} from './seed-catalog-refs';

const DATASET_FILE = 'denim_jackets.json';

/**
 * Seeds the denim-jacket dataset through ProductService — the single source of
 * truth — so vendor/brand/audit fields, inventory rows, the publish floor and
 * brand guards all match the Web Admin form path.
 *
 * Re-runs are idempotent by product name. Rows created by the retired
 * raw-Prisma seed (vendorId/brandId/createdBy null, no inventory) are rebuilt
 * by `npm run seed:reset`, which purges the catalog and reseeds through the
 * same service path.
 */
export async function seedProductsDenimJackets(): Promise<void> {
  console.log('\n🧥 Seeding Denim Jackets via ProductService...');

  const items = readSeedDataset<DenimSeedItem>(DATASET_FILE);
  const store = await resolvePlatformStore();
  const brand = await resolveBrandBySlug('celebs-denim');
  const category = await resolveCategoryBySlug('men-denim-jackets');
  const refs = {
    brandId: brand.id,
    brandName: brand.name,
    categoryId: category.parentCategory ?? category.id,
    subcategoryId: category.id,
  };

  const productService = new ProductService();
  let created = 0;
  let skipped = 0;

  for (const [index, item] of items.entries()) {
    const existing = await prisma.product.findFirst({
      where: { name: item.title },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await productService.createProduct(
      buildDenimJacketPayload(item, index, refs),
      store.userId,
      store.id,
      store.shopName,
      'SUPERADMIN',
    );
    created++;
  }

  console.log(`✅ Denim Jackets: ${created} created, ${skipped} already present.`);
}

if (require.main === module) {
  seedProductsDenimJackets()
    .catch((err) => {
      console.error('❌ Failed to seed denim jackets:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
