import { connectDb, disconnectDb } from './config';
import { seedCategoriesJewelry } from './seed-categories-jewelry';
import { seedCategoriesMen } from './seed-categories-men';
import { seedOptionSets } from './seed-option-sets';
import { seedProductsDenimJackets } from './seed-products-denim-jackets';
import { seedProductsDenimJeans } from './seed-products-denim-jeans';
import { seedProductsMockCatalog } from './seed-products-mock-catalog';
import { seedQuickFilters } from './seed-quick-filters';

export async function runMasterSeed(): Promise<void> {
  const isReset = process.argv.includes('--reset');

  console.log('================================================================');
  console.log(`🚀 STARTING MASTER SEED PROCESS ${isReset ? '[RESET MODE]' : '[UPSERT MODE]'}`);
  console.log('================================================================');

  await connectDb();

  try {
    // Step 1: Option Sets (Colors, Sizes, Shoe Sizes)
    await seedOptionSets();

    // Step 2: Category Hierarchy & Schema Attributes
    await seedCategoriesMen(isReset);
    await seedCategoriesJewelry();

    // Step 3: Products Catalog
    if (isReset) {
      console.log('\n⚠️ [--reset active] Wiping Product collection...');
      const prisma = (await import('../../config/db.prisma')).default;
      await prisma.product.deleteMany({});
    }

    await seedProductsMockCatalog(false);
    await seedProductsDenimJackets();
    await seedProductsDenimJeans();

    // Step 4: Category Quick Filters
    await seedQuickFilters(isReset);

    console.log('\n================================================================');
    console.log('✨ MASTER SEED COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ Master Seeding Failed with Error:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  runMasterSeed();
}
