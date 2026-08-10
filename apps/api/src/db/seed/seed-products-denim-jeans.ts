import fs from 'fs';
import path from 'path';
import prisma from '../../config/db.prisma';

export async function seedProductsDenimJeans(): Promise<void> {
  console.log('\n👖 Seeding Denim Jeans Products via PostgreSQL Prisma...');

  let denimJeansCat = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { contains: 'denim jeans', mode: 'insensitive' } },
        { slug: 'men-denim-jeans' },
        { slug: 'denim-jeans' },
      ],
    },
  });

  if (!denimJeansCat) {
    console.log('  └─ Category not found. Creating Category in Postgres...');
    const parentCat = await prisma.category.findFirst({
      where: { level: 1, name: { contains: 'men', mode: 'insensitive' } },
    });

    denimJeansCat = await prisma.category.create({
      data: {
        name: 'Men Denim Jeans',
        slug: 'men-denim-jeans',
        level: parentCat ? 2 : 1,
        parentCategory: parentCat ? parentCat.id : null,
        path: parentCat ? `${parentCat.path}/men-denim-jeans` : 'men-denim-jeans',
        isActive: true,
      },
    });
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
