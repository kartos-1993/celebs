import { config } from 'dotenv';
import path from 'path';

// Load .env.development
config({ path: path.resolve(__dirname, '../../../.env.development') });

import { scanDelByPattern } from '../../common/services/redis-cache.service';
import prisma from '../../config/db.prisma';
import {
  buildDenimJacketPayload,
  buildDenimJeansPayload,
  type DenimSeedItem,
  readSeedDataset,
} from '../../db/seed/product-seed-payloads';
import { purgeAllTestData } from '../../db/seed/purge-catalog';
import {
  resolveBrandBySlug,
  resolveCategoryBySlug,
  resolvePlatformStore,
} from '../../db/seed/seed-catalog-refs';
import { ProductService } from '../../modules/product/product.service';

// purgeAllTestData lives in ../../db/seed/purge-catalog.ts so the master seed's
// --reset path and this script stay on one FK-safe purge sequence.

async function reseedCatalog() {
  console.log('\n📦 [Step 2/4] Resolving master reference data...');

  const brandCelebsDenim = await resolveBrandBySlug('celebs-denim');
  console.log(`  🏷️  Brand resolved: ${brandCelebsDenim.name} (${brandCelebsDenim.id})`);

  const vendorPlatform = await resolvePlatformStore();
  console.log(`  🏪 Vendor resolved: ${vendorPlatform.shopName} (${vendorPlatform.id})`);

  const catJackets = await resolveCategoryBySlug('men-denim-jackets');
  const catJeans = await resolveCategoryBySlug('men-jeans');
  console.log(`  📂 Categories resolved: Jackets (${catJackets.id}), Jeans (${catJeans.id})`);

  const productService = new ProductService();

  // 1. Reseed Denim Jackets
  console.log('\n🧥 [Step 3/4 Part A] Reseeding Denim Jackets via ProductService.createProduct...');
  const jacketsRaw = readSeedDataset<DenimSeedItem>('denim_jackets.json');

  for (const [i, item] of jacketsRaw.entries()) {
    const payload = buildDenimJacketPayload(item, i, {
      brandId: brandCelebsDenim.id,
      brandName: brandCelebsDenim.name,
      categoryId: catJackets.parentCategory ?? catJackets.id,
      subcategoryId: catJackets.id,
    });

    const created = await productService.createProduct(
      payload,
      vendorPlatform.userId,
      vendorPlatform.id,
      vendorPlatform.shopName,
      'SUPERADMIN',
    );

    if (created && created.id) {
      await prisma.productReviewSummary.upsert({
        where: { productId: String(created.id) },
        update: {
          averageRating: 4.8,
          totalReviews: 18,
          ratingsCount: 18,
          withImagesCount: 5,
          ratingDistribution: { '5': 15, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 16, runsSmall: 1, runsLarge: 1 },
        },
        create: {
          productId: String(created.id),
          averageRating: 4.8,
          totalReviews: 18,
          ratingsCount: 18,
          withImagesCount: 5,
          ratingDistribution: { '5': 15, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 16, runsSmall: 1, runsLarge: 1 },
        },
      });
      console.log(
        `  ✅ [Jacket ${i + 1}/${jacketsRaw.length}] Created: ${payload.name.slice(0, 45)} -> ${created.id}`,
      );
    }
  }

  // 2. Reseed Denim Jeans
  console.log('\n👖 [Step 3/4 Part B] Reseeding Denim Jeans via ProductService.createProduct...');
  const jeansRaw = readSeedDataset<DenimSeedItem>('denim_jeans.json');

  for (const [i, item] of jeansRaw.entries()) {
    const payload = buildDenimJeansPayload(item, i, {
      brandId: brandCelebsDenim.id,
      brandName: brandCelebsDenim.name,
      categoryId: catJeans.parentCategory ?? catJeans.id,
      subcategoryId: catJeans.id,
    });

    const created = await productService.createProduct(
      payload,
      vendorPlatform.userId,
      vendorPlatform.id,
      vendorPlatform.shopName,
      'SUPERADMIN',
    );

    if (created && created.id) {
      await prisma.productReviewSummary.upsert({
        where: { productId: String(created.id) },
        update: {
          averageRating: 4.9,
          totalReviews: 24,
          ratingsCount: 24,
          withImagesCount: 8,
          ratingDistribution: { '5': 21, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 22, runsSmall: 1, runsLarge: 1 },
        },
        create: {
          productId: String(created.id),
          averageRating: 4.9,
          totalReviews: 24,
          ratingsCount: 24,
          withImagesCount: 8,
          ratingDistribution: { '5': 21, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 22, runsSmall: 1, runsLarge: 1 },
        },
      });
      console.log(
        `  ✅ [Jeans ${i + 1}/${jeansRaw.length}] Created: ${payload.name.slice(0, 45)} -> ${created.id}`,
      );
    }
  }

  // 3. Reseed STAGG Jeans for Lifecycle QA (Draft, Pending Review, Published)
  console.log('\n👖 [Step 3/4 Part C] Reseeding STAGG Jeans for Lifecycle QA...');
  const { seedProductsStaggJeans } = await import('../../db/seed/seed-products-stagg-jeans');
  await seedProductsStaggJeans();

  // 4. Redis Cache Flush
  console.log('\n⚡ [Step 4/4] Flushing Redis caches...');
  await scanDelByPattern('storefront:*', 100);
  await scanDelByPattern('product:*', 100);
  await scanDelByPattern('cart:*', 100);
  await scanDelByPattern('notifications:*', 100);
  await scanDelByPattern('orders:*', 100);
  await scanDelByPattern('vendor:*', 100);
  await scanDelByPattern('finance:*', 100);
  console.log('  ✅ Redis caches cleared.');
}

async function main() {
  console.log('================================================================');
  console.log('🚀 CLEAN-SLATE PURGE & CANONICAL CATALOG RESEED (REAL FLOW)');
  console.log('================================================================');

  try {
    await purgeAllTestData();
    await reseedCatalog();

    console.log('\n================================================================');
    console.log('🎉 RESEED COMPLETED SUCCESSFULLY! VERIFYING STATE...');
    console.log('================================================================');

    const finalCounts = {
      products: await prisma.product.count(),
      inventories: await prisma.productInventory.count(),
      reviewSummaries: await prisma.productReviewSummary.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      ledgerEntries: await prisma.ledgerEntry.count(),
      notifications: await prisma.notification.count(),
      brands: await prisma.brand.count(),
      categories: await prisma.category.count(),
    };

    console.log('📊 Final Verified Database Counts:', finalCounts);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch(async (e) => {
  console.error('❌ Critical error during purge and reseed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
