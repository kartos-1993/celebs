import prisma from '../../config/db.prisma';

export async function seedProductsMockCatalog(_isReset = false): Promise<void> {
  console.log('\n📦 Seeding Mock Product Catalog via PostgreSQL Prisma...');

  const category = await prisma.category.findFirst();
  if (!category) {
    console.log('  └─ No category found in Postgres. Skipping mock catalog seeding.');
    return;
  }

  const sampleProducts = [
    {
      name: 'Essential Oversized Heavyweight Hoodie',
      slug: 'essential-oversized-heavyweight-hoodie',
      brand: 'Celebs',
      price: 3200,
      discountedPrice: 2890,
      mainImages: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop',
      ],
      categoryId: category.id,
      status: 'published',
    },
    {
      name: 'Vintage Wash Relaxed Graphic Tee',
      slug: 'vintage-wash-relaxed-graphic-tee',
      brand: 'Celebs',
      price: 1800,
      discountedPrice: 1550,
      mainImages: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop',
      ],
      categoryId: category.id,
      status: 'published',
    },
  ];

  for (const p of sampleProducts) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log(`✅ Seeded ${sampleProducts.length} mock products in PostgreSQL.`);
}
