import prisma, { Prisma } from '../../config/db.prisma';

export type ShortcutSeedCategory = {
  id: string;
  slug: string;
  parentCategory: string | null;
};

const SUBCATEGORY_SHORTCUT_TITLE = 'Subcategories';

/**
 * Builds one persisted "Subcategories" shortcut per parent category. This is
 * the same config the storefront service otherwise builds as a throwaway
 * `temp-` entry at request time, so the storefront output is identical — but
 * the row exists in the database and admins can edit it instead of it being
 * regenerated from live children on every request.
 */
export function buildSubcategoryShortcutRows(
  categories: ShortcutSeedCategory[],
  coveredCategoryIds: ReadonlySet<string>,
): Prisma.StorefrontShortcutCreateManyInput[] {
  const childCount = new Map<string, number>();
  for (const category of categories) {
    if (category.parentCategory) {
      childCount.set(category.parentCategory, (childCount.get(category.parentCategory) ?? 0) + 1);
    }
  }

  return categories
    .filter(
      (category) => (childCount.get(category.id) ?? 0) > 0 && !coveredCategoryIds.has(category.id),
    )
    .map((category) => ({
      title: SUBCATEGORY_SHORTCUT_TITLE,
      slug: `subcategories-${category.slug}`,
      categoryId: category.id,
      filterConfig: {
        type: 'subcategory',
        attributeId: null,
        displayAs: 'avatar_scroll',
        items: [],
        autoPopulate: true,
        displayOrder: 0,
        isActive: true,
      },
    }));
}

export async function seedStorefrontShortcuts(isReset = false): Promise<void> {
  console.log('\n--- Seeding Storefront Shortcuts via PostgreSQL ---');

  if (isReset) {
    // The --reset category wipe re-creates every category with a fresh id,
    // and nothing else deletes this table (the FK-safe catalog purge does not
    // touch it) — so rows from the old category tree must go first.
    const { count } = await prisma.storefrontShortcut.deleteMany({});
    console.log(
      `⚠️ [--reset active] Removed ${count} StorefrontShortcut rows from the old category tree.`,
    );
  }

  const [categories, existing] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, parentCategory: true },
    }),
    prisma.storefrontShortcut.findMany({ select: { categoryId: true } }),
  ]);

  // A category that already has any shortcut row is left alone: re-creating a
  // second "Subcategories" row would render duplicate chip rows on the
  // storefront, and admin-authored shortcuts must not be shadowed.
  const coveredCategoryIds = new Set(
    existing.map((row) => row.categoryId).filter((id): id is string => id !== null),
  );

  const rows = buildSubcategoryShortcutRows(categories, coveredCategoryIds);
  if (rows.length > 0) {
    await prisma.storefrontShortcut.createMany({ data: rows });
  }

  console.log(
    `✅ Storefront Shortcuts: ${rows.length} created, ${coveredCategoryIds.size} categories already configured.`,
  );
}

if (require.main === module) {
  seedStorefrontShortcuts(process.argv.includes('--reset'))
    .catch((err) => {
      console.error('❌ Failed to seed storefront shortcuts:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
