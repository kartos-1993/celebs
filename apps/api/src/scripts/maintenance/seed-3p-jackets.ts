import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: path.resolve(__dirname, '../../../.env.development') });

import { scanDelByPattern } from '../../common/services/redis-cache.service';
import prisma from '../../config/db.prisma';
import { ProductService } from '../../modules/product/product.service';

function toTitleCase(str: string): string {
  return String(str || '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolveColorHex(colorName: string): string {
  const map: Record<string, string> = {
    black: '#1A1A1A',
    white: '#FFFFFF',
    brown: '#8B4513',
    'coffee brown': '#4B2E1A',
    'mocha brown': '#5A3D28',
    'rust brown': '#8B3103',
    grey: '#808080',
    gray: '#808080',
    'dark grey': '#4A4A4A',
    'light grey': '#D3D3D3',
    beige: '#D4BE8D',
    cream: '#FFFDD0',
    apricot: '#F5C99B',
    'navy blue': '#1B2A4A',
    navy: '#000080',
    blue: '#1E90FF',
    'dusty blue': '#5A7D9A',
    'baby blue': '#89CFF0',
    'royal blue': '#4169E1',
    green: '#2E8B57',
    'army green': '#4B5320',
    'dark green': '#1B4D3E',
    'mint green': '#98FF98',
    'olive green': '#556B2F',
    khaki: '#C3B091',
    camel: '#C19A6B',
    burgundy: '#800020',
    pink: '#F4A7C3',
    red: '#C0392B',
    orange: '#E67E22',
    multicolor: '#4A90E2',
    'black and white': '#2B2B2B',
  };
  const key = String(colorName || '')
    .trim()
    .toLowerCase();
  return map[key] || '#2B2B2B';
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

export async function seed3PJackets(): Promise<void> {
  console.log('================================================================');
  console.log('🧥 SEEDING 3P CATALOG: 10 JACKETS UNDER BROTHERS COLLECTION');
  console.log('================================================================');

  // 1. Resolve 3P Vendor
  const vendor3P = await prisma.vendorProfile.findFirstOrThrow({
    where: { shopName: 'Brothers Collection' },
    include: { user: true },
  });
  console.log(
    `  🏪 3P Vendor resolved: ${vendor3P.shopName} (${vendor3P.id}) User: ${vendor3P.user.email}`,
  );

  // 2. Resolve Brand (Generic / Unbranded or Celebs Official)
  const brand = await prisma.brand.findFirstOrThrow({
    where: { slug: 'generic-unbranded' },
  });
  console.log(`  🏷️  Brand resolved: ${brand.name} (${brand.id})`);

  // 3. Resolve Category (Men Jackets and Coats)
  const catJackets = await prisma.category.findFirstOrThrow({
    where: { slug: 'men-jackets-and-coats' },
  });
  console.log(
    `  📂 Category resolved: ${catJackets.name} (${catJackets.id}) Parent: ${catJackets.parentCategory}`,
  );

  const batchFile = path.resolve(__dirname, '../../db/seed/data/shein_jackets_batch.json');
  const items = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
  console.log(`  📄 Loaded batch file with ${items.length} jacket fixtures.`);

  const productService = new ProductService();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rawVariants =
      Array.isArray(item.colorVariants) && item.colorVariants.length > 0
        ? item.colorVariants
        : [{ name: 'Default', colorCode: '#1A1A1A', images: item.images || [] }];

    interface ColorVariant {
      name: string;
      colorCode: string;
      swatch: string;
      images: string[];
      stocks: { size: string; quantity: number }[];
    }

    // Deduplicate color variants by name
    const seenColors = new Set<string>();
    const colorVariants: ColorVariant[] = [];

    for (const v of rawVariants) {
      let cName = String(v.name || 'Classic').trim();
      if (cName.toLowerCase() === 'default') {
        cName = item.attributes?.Color || 'Classic';
      }
      if (seenColors.has(cName.toLowerCase())) continue;
      seenColors.add(cName.toLowerCase());

      const hex = resolveColorHex(cName);
      const imgs =
        Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : [
              'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop',
            ];

      colorVariants.push({
        name: cName,
        colorCode: hex,
        swatch: imgs[0],
        images: imgs,
        stocks: item.measurements.sizeChart.map((sc: { size: string }) => ({
          size: sc.size,
          quantity: 25,
        })),
      });
    }

    const sizes = item.measurements.sizeChart.map((sc: Record<string, unknown>) => {
      const productMeasurements = Object.entries(sc)
        .filter(([key]) => key !== 'size')
        .map(([key, val]) => ({
          name: toTitleCase(key.replace(/([A-Z])/g, ' $1')),
          value: String(val ?? ''),
          unit: 'cm',
        }));

      return {
        name: String(sc.size),
        productMeasurements,
        bodyMeasurements: extractBodyMeasurements(sc, item),
      };
    });

    const coverImages = colorVariants.flatMap((c) => c.images).slice(0, 8);

    const price = item.price || 4500;
    const discountedPrice = item.discountedPrice || Math.round(price * 0.85);

    const skus = colorVariants.flatMap((cv, vIdx) =>
      cv.stocks.map((st, sIdx) => {
        const cleanCol = cv.name
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 4)
          .toUpperCase();
        return {
          skuCode: `BRO-JKT-${i + 1}-V${vIdx + 1}-${cleanCol}-${st.size}`,
          selectedOptions: { Color: cv.name, Size: st.size },
          price,
          discountedPrice,
          stock: st.quantity,
          image: cv.images[0] || coverImages[0],
          isDefault: vIdx === 0 && sIdx === 0,
        };
      }),
    );

    const sizeValues: string[] = Array.from(
      new Set(item.measurements.sizeChart.map((s: { size: string }) => String(s.size))),
    );

    const variantOptions: { name: string; values: string[] }[] = [
      { name: 'Color', values: colorVariants.map((c) => c.name) },
      { name: 'Size', values: sizeValues },
    ];

    const colorMeta: Record<string, unknown> = {};
    for (const c of colorVariants) {
      colorMeta[c.name] = {
        swatch: c.swatch,
        images: c.images,
        hot: false,
      };
    }

    const payload = {
      name: item.title,
      brand: brand.name,
      brandId: brand.id,
      description: item.description,
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
        measurements: {
          unit: 'CM',
          sizeChart: item.measurements.sizeChart,
        },
        variants: { colorMeta },
        uploadedAssets: {
          mainImages: coverImages,
          colorMeta,
        },
        variantFields: [
          { key: 'Color', kind: 'color' },
          { key: 'Size', kind: 'size' },
        ],
      },
      tags: ['jackets', 'outerwear', 'men', 'streetwear', '3p'],
      featured: i < 3,
      status: 'published' as const,
      packageWeightKg: 0.55,
      packageLengthCm: 35,
      packageWidthCm: 28,
      packageHeightCm: 6,
      packagingType: 'FLYER_MEDIUM' as const,
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY' as const,
      warrantyPeriod: '6 Months',
      warrantyPolicy: '6 months warranty against seam failure and zipper damage.',
      isNonReturnable: false,
    };

    const created = await productService.createProduct(
      payload,
      vendor3P.userId,
      vendor3P.id,
      vendor3P.shopName,
      'SUPERADMIN',
    );

    if (created && created.id) {
      await prisma.productReviewSummary.upsert({
        where: { productId: String(created.id) },
        update: {
          averageRating: 4.7,
          totalReviews: 12,
          ratingsCount: 12,
          withImagesCount: 4,
          ratingDistribution: { '5': 9, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 10, runsSmall: 1, runsLarge: 1 },
        },
        create: {
          productId: String(created.id),
          averageRating: 4.7,
          totalReviews: 12,
          ratingsCount: 12,
          withImagesCount: 4,
          ratingDistribution: { '5': 9, '4': 3, '3': 0, '2': 0, '1': 0 },
          fitDistribution: { trueToSize: 10, runsSmall: 1, runsLarge: 1 },
        },
      });
      console.log(
        `  ✅ [3P Jacket ${i + 1}/${items.length}] Created: ${payload.name.slice(0, 45)} -> ${created.id}`,
      );
    }
  }

  // Flush Redis Cache
  console.log('\n⚡ Flushing Redis caches...');
  await scanDelByPattern('storefront:*', 100);
  await scanDelByPattern('product:*', 100);
  await scanDelByPattern('cart:*', 100);
  console.log('  ✅ Redis caches flushed.');

  const totalProducts = await prisma.product.count();
  const totalInventories = await prisma.productInventory.count();
  console.log(
    `\n🎉 3P JACKETS SEEDING COMPLETE! Total Products: ${totalProducts}, Total Inventories: ${totalInventories}`,
  );
}

async function main() {
  try {
    await seed3PJackets();
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch(async (e) => {
  console.error('❌ Error seeding 3P jackets:', e);
  await prisma.$disconnect();
  process.exit(1);
});
