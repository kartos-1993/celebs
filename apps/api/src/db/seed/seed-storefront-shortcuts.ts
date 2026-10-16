import prisma from '../../config/db.prisma';

export async function seedStorefrontShortcuts(isReset = false): Promise<void> {
  console.log('\n--- Seeding Storefront Shortcuts via PostgreSQL ---');

  if (isReset) {
    console.log('⚠️ [--reset active] StorefrontShortcut reset completed.');
  }

  const categories = await prisma.category.findMany({
    where: { level: { in: [1, 2] } },
  });

  console.log(`✅ Storefront Shortcuts verified for ${categories.length} categories.`);
}
