import { ensurePlatformVendor } from '../../common/constants/platform-vendor';
import prisma from '../../config/db.prisma';
import { connectDb, disconnectDb } from './config';
import { purgeAllTestData } from './purge-catalog';
import { seedBrands } from './seed-brands';
import { seedCampaigns } from './seed-campaigns';
import { seedCategoriesJewelry } from './seed-categories-jewelry';
import { seedCombos } from './seed-combos';
import { seedCommerceSettings } from './seed-commerce-settings';
import { seedLogisticsLocations } from './seed-logistics-locations';
import { seedCategoriesMen } from './seed-categories-men';
import { seedOptionSets } from './seed-option-sets';
import { seedProducts } from './seed-products';
import { seedStorefrontShortcuts } from './seed-storefront-shortcuts';

export async function runMasterSeed(): Promise<void> {
  const isReset = process.argv.includes('--reset');

  console.log('================================================================');
  console.log(`🚀 STARTING MASTER SEED PROCESS ${isReset ? '[RESET MODE]' : '[UPSERT MODE]'}`);
  console.log('================================================================');

  await connectDb();

  try {
    // Step 0: 1P Canonical Platform Store & Brand Registry
    console.log('\n🏪 Ensuring 1P Platform Vendor Profile...');
    const platformVendor = await ensurePlatformVendor(prisma);
    if (!platformVendor) {
      throw new Error(
        'The 1P platform store is not provisioned yet and no SUPERADMIN exists to own it. Complete the initial superadmin setup, then re-run the master seed.',
      );
    }
    await seedBrands();

    // Step 1: Commerce Policy (COD limit, delivery fee fallback)
    await seedCommerceSettings();

    // Step 1b: Delivery Areas (Nepal districts, superseded by a courier sync)
    await seedLogisticsLocations();

    // Step 2: Option Sets (Colors, Sizes, Shoe Sizes)
    await seedOptionSets();

    // Step 3 prerequisite: the --reset purge must run BEFORE the category
    // wipe. Product.categoryId is ON DELETE RESTRICT and cascaded
    // ProductInventory rows are pinned by CartItem/OrderItem RESTRICT FKs, so
    // the old "wipe products after categories" order failed on any database
    // that had ever been used. Same FK-safe purge as `npm run seed:reset`.
    if (isReset) {
      await purgeAllTestData();
    }

    // Step 3: Category Hierarchy & Schema Attributes
    await seedCategoriesMen(isReset);
    await seedCategoriesJewelry();

    // Step 4: Products Catalog (single dataset + single importer)
    await seedProducts();

    // Step 5: Storefront Shortcuts
    await seedStorefrontShortcuts(isReset);

    // Step 6: Festival Campaigns (references the catalogue by product name)
    await seedCampaigns();

    // Step 7: Curated Combo Bundles
    await seedCombos();

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
