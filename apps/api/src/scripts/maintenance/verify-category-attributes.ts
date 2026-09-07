import prisma from '../../config/db.prisma';

interface AttrItem {
  name: string;
  type: string;
  optionSetName?: string | null;
  values?: string[];
}

async function verifyCatalog(): Promise<void> {
  console.log('\n==================================================');
  console.log('🔍 VERIFYING CATALOG ATTRIBUTES & OPTION SETS');
  console.log('==================================================\n');

  const optionSets = await prisma.optionSet.findMany({
    select: { name: true, options: true },
    orderBy: { name: 'asc' },
  });

  console.log(`📦 OPTION SETS FOUND: ${optionSets.length}`);
  for (const os of optionSets) {
    const optCount = Array.isArray(os.options) ? os.options.length : 0;
    console.log(`  • "${os.name}": ${optCount} values`);
  }

  const sampleCats = [
    'Men T-Shirts',
    'Men Polo Shirts',
    'Men Denim Jackets',
    'Men Jeans',
    'Men Shorts',
    'Men Hoodies',
    'Men Blazers',
    'Men Sneakers & Athletic Shoes',
    'Men Loafers & Dress Shoes',
    'Men Kurta & Suruwal Sets',
    "Men's Rings",
    "Men's Sunglasses",
    "Men's Bags & Backpacks",
  ];

  console.log('\n📁 SAMPLE CATEGORIES & DETAILED ATTRIBUTES:');
  for (const name of sampleCats) {
    const cat = await prisma.category.findFirst({
      where: { name },
      select: { name: true, level: true, attributes: true, path: true },
    });

    if (cat) {
      const attrs = Array.isArray(cat.attributes) ? (cat.attributes as unknown as AttrItem[]) : [];
      console.log(
        `\n  📂 [${cat.path}] "${cat.name}" (Level ${cat.level}) - ${attrs.length} attributes:`,
      );
      for (const a of attrs.slice(0, 8)) {
        const optInfo = a.optionSetName ? ` [Linked OptionSet: ${a.optionSetName}]` : '';
        const valCount =
          Array.isArray(a.values) && a.values.length > 0 ? ` (${a.values.length} values)` : '';
        console.log(`     └─ ${a.name} (${a.type})${optInfo}${valCount}`);
      }
      if (attrs.length > 8) {
        console.log(`     └─ ... +${attrs.length - 8} additional attributes`);
      }
    } else {
      console.log(`  ❌ NOT FOUND: "${name}"`);
    }
  }

  const totalCategories = await prisma.category.count();
  console.log(`\n✅ Total categories in catalog: ${totalCategories}`);
  console.log('==================================================\n');
}

if (require.main === module) {
  verifyCatalog()
    .catch((err) => {
      console.error('Verification failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { verifyCatalog };
