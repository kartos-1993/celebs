import { connectDb, disconnectDb } from './config';
import { seedOptionSets } from './seed-option-sets';
import { seedCategoriesMen } from './seed-categories-men';
import { seedCategoriesJewelry } from './seed-categories-jewelry';
import { seedProductsDenimJackets } from './seed-products-denim-jackets';
import { seedProductsDenimJeans } from './seed-products-denim-jeans';
import { seedProductsMockCatalog } from './seed-products-mock-catalog';

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
    await seedProductsDenimJackets();
    await seedProductsDenimJeans();
    await seedProductsMockCatalog(isReset);

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
