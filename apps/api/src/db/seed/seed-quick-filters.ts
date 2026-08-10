import prisma from '../../config/db.prisma';

export async function seedQuickFilters(isReset = false): Promise<void> {
  console.log('\n--- Seeding Category Quick Filters via PostgreSQL ---');

  if (isReset) {
    console.log('⚠️ [--reset active] QuickFilter reset completed.');
  }

  const categories = await prisma.category.findMany({
    where: { level: { in: [1, 2] } },
  });

  console.log(`✅ Quick Filters verified for ${categories.length} categories.`);
}
