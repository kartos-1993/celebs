import fs from 'fs';
import path from 'path';

import prisma from '../../config/db.prisma';

export async function seedProductsDenimJeans(): Promise<void> {
  console.log('\n👖 Seeding Denim Jeans Products via PostgreSQL Prisma...');

  // 1. Find official "Men Jeans" subcategory (nested under Men Denim)
  let denimJeansCat = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'men-jeans' },
        { name: 'Men Jeans' },
      ],
    },
  });

  // Clean up legacy orphan "Men Denim Jeans" category if present
  const orphanCat = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'men-denim-jeans' },
        { name: 'Men Denim Jeans' },
      ],
    },
  });

  if (orphanCat) {
    if (denimJeansCat && orphanCat.id !== denimJeansCat.id) {
      console.log('  └─ Re-linking products from orphan "Men Denim Jeans" to "Men Jeans"...');
      await prisma.product.updateMany({
        where: { categoryId: orphanCat.id },
        data: { categoryId: denimJeansCat.id },
      });
      await prisma.category.delete({
        where: { id: orphanCat.id },
      });
      console.log('  └─ Removed orphan "Men Denim Jeans" category.');
    } else if (!denimJeansCat) {
      denimJeansCat = orphanCat;
    }
  }

  if (!denimJeansCat) {
    throw new Error('Category "Men Jeans" not found. Run seedCategoriesMen first.');
  }

  const categoryId = denimJeansCat.id;

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

    const price = 2200 + ((i * 120) % 1800);
    const discountedPrice = Math.round(price * 0.9);
    const productSlug = item.slug
      ? `${item.slug}-${i}`
      : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-jeans-${i}`;

    await prisma.product.upsert({
      where: { slug: productSlug },
      update: {
        name: item.title,
        brand: item.brand || 'Celebs',
        description: `Premium denim jeans.`,
        price,
        discountedPrice,
        categoryId,
        status: 'published',
      },
      create: {
        name: item.title,
        slug: productSlug,
        brand: item.brand || 'Celebs',
        description: `Premium denim jeans.`,
        price,
        discountedPrice,
        categoryId,
        status: 'published',
      },
    });

    count++;
  }

  console.log(`✅ Seeded Denim Jeans in Postgres: ${count} processed.`);
}
