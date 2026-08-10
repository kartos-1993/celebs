import { CategoryModel } from '../models/category.model';
import { QuickFilterModel } from '../models/quick-filter.model';

export async function seedQuickFilters(isReset = false): Promise<void> {
  console.log('\n--- Seeding Category Quick Filters ---');

  if (isReset) {
    console.log('⚠️ [--reset active] Wiping QuickFilter collection...');
    await QuickFilterModel.deleteMany({});
  }

  // Dynamically find all parent categories in MongoDB (level 1 & 2) regardless of domain (Men, Women, Jewelry, Kids, etc.)
  const categories = await CategoryModel.find({ level: { $in: [1, 2] } }).lean();

  let createdCount = 0;
  let existingCount = 0;

  for (const category of categories) {
    const catId = category.id || category._id;
    const existingFilter = await QuickFilterModel.findOne({ categoryId: catId });
    if (!existingFilter) {
      await QuickFilterModel.create({
        categoryId: catId,
        type: 'subcategory',
        displayAs: 'avatar_scroll',
        autoPopulate: true,
        displayOrder: 0,
        isActive: true,
        items: [],
      });
      createdCount++;
    } else {
      existingCount++;
    }
  }

  console.log(
    `✅ Category Quick Filters Seeded: ${createdCount} created, ${existingCount} existing.`,
  );
}
