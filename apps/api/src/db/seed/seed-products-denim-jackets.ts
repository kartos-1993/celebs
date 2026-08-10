import fs from 'fs';
import path from 'path';
import prisma from '../../config/db.prisma';

export async function seedProductsDenimJackets(): Promise<void> {
  console.log('\n🧥 Seeding Denim Jackets Products via PostgreSQL Prisma...');

  // 1. Find or create "Men Denim Jackets" subcategory in PostgreSQL
  let denimJacketCat = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { contains: 'denim jacket', mode: 'insensitive' } },
        { slug: 'men-denim-jackets' },
        { slug: 'denim-jackets' },
      ],
    },
  });

  if (!denimJacketCat) {
    console.log('  └─ Category not found. Creating Category in Postgres...');
    const parentCat = await prisma.category.findFirst({
      where: { level: 1, name: { contains: 'men', mode: 'insensitive' } },
    });

    denimJacketCat = await prisma.category.create({
      data: {
        name: 'Men Denim Jackets',
        slug: 'men-denim-jackets',
        level: parentCat ? 2 : 1,
        parentCategory: parentCat ? parentCat.id : null,
        path: parentCat ? `${parentCat.path}/men-denim-jackets` : 'men-denim-jackets',
        isActive: true,
        sizeChartColumns: ['Shoulder', 'Chest', 'Length', 'Sleeve Length'],
      },
    });
  }

  const categoryId = denimJacketCat.id;

  // 2. Read json dataset
  const jsonPath = path.join(__dirname, 'data', 'denim_jackets.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  └─ Dataset not found at: ${jsonPath}. Skipping.`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const items = JSON.parse(rawData);

  let count = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const sizesPayload = (item.measurements?.sizeChart || []).map((sc: any) => ({
      name: sc.size,
      productMeasurements: [
        { name: 'Shoulder', value: String(sc.shoulder || 45), unit: 'cm' },
        { name: 'Chest', value: String(sc.chest || 100), unit: 'cm' },
      ],
    }));

    const colorVariants = (item.variants || []).map((v: any) => ({
      name: v.color || 'Default',
      colorCode: v.color === 'Black' ? '#000000' : v.color === 'Blue' ? '#0000FF' : '#888888',
      images: v.images || [],
      stocks: (item.measurements?.sizeChart || []).map((sc: any) => ({
        size: sc.size,
        quantity: 20,
      })),
    }));

    const mainImages =
      item.variants?.[0]?.images?.length > 0
        ? item.variants[0].images
        : ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800'];

    const price = 2400 + ((i * 150) % 2000);
    const discountedPrice = Math.round(price * 0.85);
    const productSlug = item.slug
      ? `${item.slug}-${i}`
      : `${item.title.toLowerCase().replace(/[^\w]+/g, '-')}-${i}`;

    await prisma.product.upsert({
      where: { slug: productSlug },
      update: {
        name: item.title,
        brand: item.title.split(' ')[0] || 'Celebs',
        description: `Premium denim jacket.`,
        price,
        discountedPrice,
        categoryId,
        sizes: sizesPayload,
        colorVariants,
        mainImages,
        status: 'published',
      },
      create: {
        name: item.title,
        slug: productSlug,
        brand: item.title.split(' ')[0] || 'Celebs',
        description: `Premium denim jacket.`,
        price,
        discountedPrice,
        categoryId,
        sizes: sizesPayload,
        colorVariants,
        mainImages,
        status: 'published',
      },
    });

    count++;
  }

  console.log(`✅ Seeded Denim Jackets in Postgres: ${count} processed.`);
}
