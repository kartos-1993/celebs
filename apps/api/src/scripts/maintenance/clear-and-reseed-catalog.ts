import { config } from 'dotenv';
import path from 'path';

// Load .env.development
config({ path: path.resolve(__dirname, '../../../.env.development') });

import fs from 'fs';

import { scanDelByPattern } from '../../common/services/redis-cache.service';
import prisma from '../../config/db.prisma';
import { ProductService } from '../../modules/product/product.service';

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1A1A1A',
  blue: '#1E90FF',
  'light blue': '#87CEEB',
  'dark blue': '#00008B',
  navy: '#000080',
  grey: '#808080',
  gray: '#808080',
  white: '#FFFFFF',
  beige: '#D4BE8D',
  bronze: '#CD7F32',
  multicolor: '#4A90E2',
  brown: '#8B4513',
  green: '#2E8B57',
  khaki: '#F0E68C',
  vintage: '#5A7D9A',
  stone: '#A8B5C2',
  ash: '#8A9199',
};

function resolveColorHex(colorName: string): string {
  const norm = colorName.trim().toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (norm.includes(key)) return hex;
  }
  return '#2C3E50';
}

function extractBodyMeasurements(sc: Record<string, unknown>, item: Record<string, unknown>) {
  if (Array.isArray(sc.bodyMeasurements) && sc.bodyMeasurements.length > 0) {
    return sc.bodyMeasurements;
  }
  if (Array.isArray(item.bodyMeasurements) && item.bodyMeasurements.length > 0) {
    return item.bodyMeasurements;
  }
  return [];
}

async function purgeAllTestData() {
  console.log('🧹 [Step 1/4] Executing foreign-key safe clean-slate purge...');

  // 1. Notifications
  console.log('  🗑️  Deleting notifications...');
  await prisma.notification.deleteMany({});

  // 2. Finance
  console.log('  🗑️  Deleting finance records (statements, batches, ledger entries)...');
  await prisma.sellerStatement.deleteMany({});
  await prisma.settlementBatch.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});

  // 3. Cart & Stock reservations
  console.log('  🗑️  Deleting stock reservations and carts...');
  await prisma.stockReservationLedger.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});

  // 4. Orders & Fulfillment
  console.log('  🗑️  Deleting orders, consignments, payments, refunds, and tracking...');
  await prisma.orderTrackingEvent.deleteMany({});
  await prisma.consignment.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  // 5. Customer Content & Marketing
  console.log('  🗑️  Deleting customer reviews, wishlists, and campaign links...');
  await prisma.reviewLike.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.productReviewSummary.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.comboBundleItem.deleteMany({});
  await prisma.campaignProduct.deleteMany({});

  // 6. Products & Inventories
  console.log('  🗑️  Deleting product inventories and products...');
  await prisma.productInventory.deleteMany({});
  await prisma.product.deleteMany({});

  // 7. Outbox events
  console.log('  🗑️  Deleting outbox events...');
  await prisma.outboxEvent.deleteMany({});

  console.log('  ✅ Clean-slate purge complete.');
}

async function reseedCatalog() {
  console.log('\n📦 [Step 2/4] Resolving master reference data...');

  // Resolve Brand
  const brandCelebsDenim = await prisma.brand.findFirstOrThrow({
    where: { slug: 'celebs-denim' },
  });
  console.log(`  🏷️  Brand resolved: ${brandCelebsDenim.name} (${brandCelebsDenim.id})`);

  // Resolve Vendor
  const vendorPlatform = await prisma.vendorProfile.findFirstOrThrow({
    where: { shopName: 'Celebs Official' },
  });
  console.log(`  🏪 Vendor resolved: ${vendorPlatform.shopName} (${vendorPlatform.id})`);

  // Resolve Categories
  const catJackets = await prisma.category.findFirstOrThrow({
    where: { slug: 'men-denim-jackets' },
  });
  const catJeans = await prisma.category.findFirstOrThrow({
    where: { slug: 'men-jeans' },
  });
  console.log(`  📂 Categories resolved: Jackets (${catJackets.id}), Jeans (${catJeans.id})`);

  const productService = new ProductService();

  // 1. Reseed Denim Jackets
  console.log('\n🧥 [Step 3/4 Part A] Reseeding Denim Jackets via ProductService.createProduct...');
  const jacketsFile = path.resolve(__dirname, '../../db/seed/data/denim_jackets.json');
  const jacketsRaw = JSON.parse(fs.readFileSync(jacketsFile, 'utf-8'));

  for (let i = 0; i < jacketsRaw.length; i++) {
    const item = jacketsRaw[i];
    const sizeChart =
      Array.isArray(item.measurements?.sizeChart) && item.measurements.sizeChart.length > 0
        ? item.measurements.sizeChart
        : [
            { size: 'S', shoulder: 48, chest: 110, length: 66, sleeveLength: 63 },
            { size: 'M', shoulder: 50, chest: 115, length: 68, sleeveLength: 64 },
            { size: 'L', shoulder: 52, chest: 120, length: 70, sleeveLength: 65 },
            { size: 'XL', shoulder: 54, chest: 125, length: 72, sleeveLength: 66 },
          ];

    const sizes = sizeChart.map((sc: Record<string, unknown>) => ({
      name: String(sc.size),
      productMeasurements: [
        { name: 'Shoulder', value: String(sc.shoulder || 50), unit: 'cm' },
        { name: 'Chest', value: String(sc.chest || 115), unit: 'cm' },
        { name: 'Length', value: String(sc.length || 68), unit: 'cm' },
        { name: 'Sleeve Length', value: String(sc.sleeveLength || 64), unit: 'cm' },
      ],
      bodyMeasurements: extractBodyMeasurements(sc, item),
    }));

    const mainImages = (item.variants || []).flatMap((v: { images?: string[] }) => v.images || []);
    const coverImages =
      mainImages.length > 0
        ? mainImages.slice(0, 8)
        : ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800'];

    const colorVariants = (item.variants || []).map((v: { color?: string; images?: string[] }) => {
      const cName = v.color || 'Classic Blue';
      const hex = resolveColorHex(cName);
      const imgs = Array.isArray(v.images) && v.images.length > 0 ? v.images : coverImages;
      return {
        name: cName,
        colorCode: hex,
        swatch: imgs[0],
        images: imgs,
        stocks: sizeChart.map((sc: { size: string }) => ({
          size: sc.size,
          quantity: 25,
        })),
      };
    });

    const price = 2800 + i * 200;
    const discountedPrice = Math.round(price * 0.85);

    const skus = colorVariants.flatMap(
      (
        cv: { name: string; images: string[]; stocks: Array<{ size: string; quantity: number }> },
        vIdx: number,
      ) =>
        cv.stocks.map((st, sIdx) => ({
          skuCode: `CEL-JKT-${i + 1}-V${vIdx + 1}-${cv.name
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 4)
            .toUpperCase()}-${st.size}`,
          selectedOptions: { Color: cv.name, Size: st.size },
          price,
          discountedPrice,
          stock: st.quantity,
          image: cv.images[0] || coverImages[0],
          isDefault: vIdx === 0 && sIdx === 0,
        })),
    );

    const variantOptions = [
      { name: 'Color', values: colorVariants.map((c: { name: string }) => c.name) },
      { name: 'Size', values: Array.from(new Set(sizeChart.map((s: { size: string }) => s.size))) },
    ];

    const colorMeta: Record<string, unknown> = {};
    for (const c of colorVariants) {
      colorMeta[c.name] = { swatch: c.swatch, images: c.images, hot: false };
    }

    const payload = {
      name: item.title,
      brand: brandCelebsDenim.name,
      brandId: brandCelebsDenim.id,
      description: `Engineered heavy-retention denim jacket. ${item.attributes?.material || '100% Cotton Denim'}. ${item.attributes?.style || 'Streetwear'}.`,
      price,
      discountedPrice,
      categoryId: catJackets.parentCategory || catJackets.id,
      subcategoryId: catJackets.id,
      sizes,
      colorVariants,
      skus,
      variantOptions,
      mainImages: coverImages,
      dynamicData: {
        values: item.attributes || {},
        variants: { colorMeta },
        uploadedAssets: {
          mainImages: coverImages,
          colorMeta,
        },
      },
      tags: ['denim', 'jacket', 'outerwear', 'men', 'winter'],
      featured: i === 0,
      status: 'published' as const,
      packageWeightKg: 0.5,
      packageLengthCm: 35,
      packageWidthCm: 28,
      packageHeightCm: 6,
      packagingType: 'FLYER_SMALL' as const,
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY' as const,
      warrantyPeriod: '6 Months',
      warrantyPolicy: '6 months coverage for stitching and button hardware defects.',
      isNonReturnable: false,
    };

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
  const jeansFile = path.resolve(__dirname, '../../db/seed/data/denim_jeans.json');
  const jeansRaw = JSON.parse(fs.readFileSync(jeansFile, 'utf-8'));

  for (let i = 0; i < jeansRaw.length; i++) {
    const item = jeansRaw[i];
    const sizeChart =
      Array.isArray(item.measurements?.sizeChart) && item.measurements.sizeChart.length > 0
        ? item.measurements.sizeChart
        : [
            { size: 'XS', waist: 78, hip: 104, inseam: 75.4, thigh: 68.8 },
            { size: 'S', waist: 82, hip: 108, inseam: 76.2, thigh: 71.4 },
            { size: 'M', waist: 86, hip: 112, inseam: 77, thigh: 74 },
            { size: 'L', waist: 91, hip: 117, inseam: 77.8, thigh: 77.3 },
            { size: 'XL', waist: 96, hip: 122, inseam: 78.6, thigh: 80.6 },
          ];

    const sizes = sizeChart.map((sc: Record<string, unknown>) => ({
      name: String(sc.size),
      productMeasurements: [
        { name: 'Waist Size', value: String(sc.waist || 86), unit: 'cm' },
        { name: 'Hip Size', value: String(sc.hip || 112), unit: 'cm' },
        { name: 'Length', value: String(sc.inseam || 77), unit: 'cm' },
        { name: 'Thigh', value: String(sc.thigh || 74), unit: 'cm' },
      ],
      bodyMeasurements: extractBodyMeasurements(sc, item),
    }));

    const defaultJeansImages = [
      'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
    ];

    const rawVariants =
      Array.isArray(item.variants) && item.variants.length > 0
        ? item.variants
        : [{ color: item.attributes?.color || 'Denim Blue', images: defaultJeansImages }];

    const mainImages = rawVariants.flatMap((v: { images?: string[] }) => v.images || []);
    const coverImages = mainImages.length > 0 ? mainImages.slice(0, 8) : defaultJeansImages;

    const colorVariants = rawVariants.map((v: { color?: string; images?: string[] }) => {
      const cName = v.color || 'Denim Blue';
      const hex = resolveColorHex(cName);
      const imgs = Array.isArray(v.images) && v.images.length > 0 ? v.images : coverImages;
      return {
        name: cName,
        colorCode: hex,
        swatch: imgs[0],
        images: imgs,
        stocks: sizeChart.map((sc: { size: string }) => ({
          size: sc.size,
          quantity: 30,
        })),
      };
    });

    const price = 2400 + ((i * 110) % 1500);
    const discountedPrice = Math.round(price * 0.88);

    const skus = colorVariants.flatMap(
      (
        cv: { name: string; images: string[]; stocks: Array<{ size: string; quantity: number }> },
        vIdx: number,
      ) =>
        cv.stocks.map((st, sIdx) => ({
          skuCode: `CEL-JNS-${i + 1}-V${vIdx + 1}-${cv.name
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 4)
            .toUpperCase()}-${st.size}`,
          selectedOptions: { Color: cv.name, Size: st.size },
          price,
          discountedPrice,
          stock: st.quantity,
          image: cv.images[0] || coverImages[0],
          isDefault: vIdx === 0 && sIdx === 0,
        })),
    );

    const variantOptions = [
      { name: 'Color', values: colorVariants.map((c: { name: string }) => c.name) },
      { name: 'Size', values: Array.from(new Set(sizeChart.map((s: { size: string }) => s.size))) },
    ];

    const colorMeta: Record<string, unknown> = {};
    for (const c of colorVariants) {
      colorMeta[c.name] = { swatch: c.swatch, images: c.images, hot: false };
    }

    const payload = {
      name: item.title,
      brand: brandCelebsDenim.name,
      brandId: brandCelebsDenim.id,
      description: `Tailored premium denim jeans. ${item.attributes?.material || 'Cotton Viscose Denim'}. ${item.attributes?.fitType || 'Relaxed'} fit with reinforced bar-tacks.`,
      price,
      discountedPrice,
      categoryId: catJeans.parentCategory || catJeans.id,
      subcategoryId: catJeans.id,
      sizes,
      colorVariants,
      skus,
      variantOptions,
      mainImages: coverImages,
      dynamicData: {
        values: item.attributes || {},
        variants: { colorMeta },
        uploadedAssets: {
          mainImages: coverImages,
          colorMeta,
        },
      },
      tags: ['denim', 'jeans', 'bottoms', 'men', 'streetwear'],
      featured: i < 5,
      status: 'published' as const,
      packageWeightKg: 0.5,
      packageLengthCm: 32,
      packageWidthCm: 25,
      packageHeightCm: 4,
      packagingType: 'FLYER_SMALL' as const,
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY' as const,
      warrantyPeriod: '6 Months',
      warrantyPolicy: '6 months warranty against seam and zipper failure.',
      isNonReturnable: false,
    };

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
