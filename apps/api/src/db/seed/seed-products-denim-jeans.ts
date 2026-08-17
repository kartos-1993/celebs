import fs from 'fs';
import path from 'path';

import prisma from '../../config/db.prisma';

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
};

function resolveColorHex(colorName: string): string {
  const normalized = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[normalized] || '#4A5568';
}

export async function seedProductsDenimJeans(): Promise<void> {
  console.log('\n👖 Seeding Denim Jeans Products via PostgreSQL Prisma...');

  // 1. Find official "Men Jeans" subcategory (nested under Men Denim)
  let denimJeansCat = await prisma.category.findFirst({
    where: {
      OR: [{ slug: 'men-jeans' }, { name: 'Men Jeans' }],
    },
  });

  // If not found, ensure Men Denim parent exists and create Men Jeans subcategory
  if (!denimJeansCat) {
    const menDenim = await prisma.category.findFirst({
      where: { slug: 'men-denim' },
    });

    if (menDenim) {
      denimJeansCat = await prisma.category.create({
        data: {
          name: 'Men Jeans',
          slug: 'men-jeans',
          level: 3,
          parentCategory: menDenim.id,
          path: `${menDenim.path}/men-jeans`,
          imageUrl:
            'https://img.ltwebstatic.com/v4/j/pi/2025/11/28/27/1764311186bbbae4d541cf7b788b91397d2cd0b128_thumbnail_192x.avif',
          sizeChartColumns: ['Waist Size', 'Hip Size', 'Length', 'Thigh'],
          bodyChartColumns: ['Height', 'Waist Size', 'Hip Size'],
          isActive: true,
        },
      });
    } else {
      throw new Error('Category "Men Jeans" not found. Run seedCategoriesMen first.');
    }
  }

  // Clean up legacy orphan "Men Denim Jeans" category if present
  const orphanCat = await prisma.category.findFirst({
    where: {
      OR: [{ slug: 'men-denim-jeans' }, { name: 'Men Denim Jeans' }],
    },
  });

  if (orphanCat && orphanCat.id !== denimJeansCat.id) {
    console.log('  └─ Re-linking products from orphan "Men Denim Jeans" to "Men Jeans"...');
    await prisma.product.updateMany({
      where: { categoryId: orphanCat.id },
      data: { categoryId: denimJeansCat.id },
    });
    await prisma.category.delete({
      where: { id: orphanCat.id },
    });
    console.log('  └─ Removed orphan "Men Denim Jeans" category.');
  }

  const categoryId = denimJeansCat.id;
  const parentCategoryId = denimJeansCat.parentCategory;

  const jsonPath = path.join(__dirname, 'data', 'denim_jeans.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  └─ Dataset not found at: ${jsonPath}. Skipping.`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const items = JSON.parse(rawData);

  let count = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const sizesPayload = (item.measurements?.sizeChart || []).map(
      (sc: Record<string, unknown>) => ({
        name: String(sc.size || 'M'),
        productMeasurements: [
          { name: 'Waist Size', value: String(sc.waist || 80), unit: 'cm' },
          { name: 'Hip Size', value: String(sc.hip || 100), unit: 'cm' },
          { name: 'Length', value: String(sc.inseam || 76), unit: 'cm' },
          { name: 'Thigh', value: String(sc.thigh || 70), unit: 'cm' },
        ],
      }),
    );

    const colorVariants = (item.variants || []).map(
      (v: { color?: string; images?: string[] }) => ({
        name: v.color || 'Default',
        colorCode: resolveColorHex(v.color || 'Default'),
        images: Array.isArray(v.images) ? v.images : [],
        stocks: (item.measurements?.sizeChart || []).map((sc: Record<string, unknown>) => ({
          size: String(sc.size || 'M'),
          quantity: 25,
        })),
      }),
    );

    const allVariantImages = (item.variants || []).flatMap(
      (v: { images?: string[] }) => (Array.isArray(v.images) ? v.images : []),
    );
    const mainImages =
      allVariantImages.length > 0
        ? allVariantImages.slice(0, 10)
        : [
            'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop',
          ];

    const price = 2200 + ((i * 120) % 1800);
    const discountedPrice = Math.round(price * 0.9);
    const productSlug = item.slug
      ? `${item.slug}-${i}`
      : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-jeans-${i}`;

    const productData = {
      name: item.title,
      brand: item.brand || 'Manfinity',
      description: `Premium quality ${item.title}. Engineered with durable denim fabric and modern tailoring.`,
      price,
      discountedPrice,
      categoryId: parentCategoryId || categoryId,
      subcategoryId: categoryId,
      sizes: sizesPayload,
      colorVariants,
      mainImages,
      tags: ['denim', 'jeans', 'men', 'streetwear'],
      dynamicData: {
        values: item.attributes || {},
        measurements: item.measurements || {},
      },
      status: 'published',
    };

    await prisma.product.upsert({
      where: { slug: productSlug },
      update: productData,
      create: {
        ...productData,
        slug: productSlug,
      },
    });

    count++;
  }

  console.log(`✅ Seeded Denim Jeans in Postgres: ${count} processed.`);
}

