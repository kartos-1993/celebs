import prisma from '../../config/db.prisma';
import { requireResolvedProduct, resolveProductsByNames } from './seed-catalog-refs';

/**
 * Curated combo bundles, authored against the seeded catalogue by product
 * NAME (product slugs carry a random suffix — see `generateUniqueSlug` — so
 * they cannot be authored; names are the importer's unique key).
 *
 * Both discount branches are exercised (`PERCENTAGE` and `FIXED_AMOUNT`) so
 * the cart/checkout line-price authority can be exercised against real rows.
 */
export interface ComboSeedSpec {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  bannerImage: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  productNames: string[];
}

export const COMBO_SEED_SPECS: ComboSeedSpec[] = [
  {
    slug: 'streetwear-duo-pack',
    title: 'Streetwear Duo Pack',
    subtitle: 'Fleece-Lined Denim Jacket + Distressed Jeans',
    description:
      'The signature layered look: a fleece-lined denim jacket over washed straight jeans. One price, festival-ready.',
    bannerImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    discountType: 'PERCENTAGE',
    discountValue: 25,
    productNames: [
      "Manfinity EMRG Men's Flap Pocket Button Front Denim Jacket With Fleece Lining",
      "Manfinity Homme Men's Casual Everyday Distressed Straight Leg Jeans",
    ],
  },
  {
    slug: 'winter-layering-bundle',
    title: 'Winter Layering Bundle',
    subtitle: 'Heavyweight Hoodie + Thermal-Lined Jeans',
    description:
      'Kathmandu winter, solved: an oversized heavyweight hoodie with thermal-lined denim built for the cold commute.',
    bannerImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    productNames: [
      'Essential Oversized Heavyweight Hoodie',
      "Manfinity Homme Men's Casual Water Washed Thermal Thermal Lined Jeans, Autumn/Winter",
    ],
  },
  {
    slug: 'street-essentials-combo',
    title: 'Street Essentials Combo',
    subtitle: 'Graphic Tee + Everyday Jeans',
    description:
      'The no-effort daily rotation: a relaxed graphic tee with minimalist front-button denim.',
    bannerImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    discountType: 'FIXED_AMOUNT',
    discountValue: 400,
    productNames: [
      'Vintage Wash Relaxed Graphic Tee',
      "QuarKem Men's Minimalist Front Button Pocket Jeans, Casual Everyday Wear",
    ],
  },
  {
    slug: 'earth-tone-layers',
    title: 'Earth Tone Layers',
    subtitle: 'Old-Money Jacket + Coffee Denim',
    description:
      'Warm neutral tailoring: a lined brown jacket over avant-garde coffee denim for layered street form.',
    bannerImage: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    productNames: [
      "HUEFORM Men's Old Money Brown Double Chest Pocket & Slanted Pocket Design Business Mature Style, Lined Classic Versatile Jacket",
      "Manfinity Homme Men's Coffee Brown Denim Long Pants Avant-Garde Street Casual Style With Zipper Detail",
    ],
  },
];

export async function seedCombos(): Promise<void> {
  console.log('\n👕 Seeding combo bundles...');

  for (const spec of COMBO_SEED_SPECS) {
    const products = await resolveProductsByNames(spec.productNames);

    const bundleFields = {
      title: spec.title,
      subtitle: spec.subtitle,
      description: spec.description,
      bannerImage: spec.bannerImage,
      discountType: spec.discountType,
      discountValue: spec.discountValue,
      isActive: true,
    };

    const bundle = await prisma.comboBundle.upsert({
      where: { slug: spec.slug },
      create: { slug: spec.slug, ...bundleFields },
      update: bundleFields,
    });

    // Cart lines reference the BUNDLE, never its item rows, so replacing the
    // set wholesale keeps it exactly equal to the spec on every re-run.
    await prisma.comboBundleItem.deleteMany({ where: { bundleId: bundle.id } });
    await prisma.comboBundleItem.createMany({
      data: spec.productNames.map((name) => ({
        bundleId: bundle.id,
        productId: requireResolvedProduct(products, name).id,
        defaultQuantity: 1,
        isRequired: true,
      })),
    });

    console.log(
      `  ✅ ${spec.title}: ${spec.productNames.length} items, ${spec.discountType} ${spec.discountValue}.`,
    );
  }

  console.log('✅ Combo bundles seeded.');
}

if (require.main === module) {
  seedCombos()
    .catch((err) => {
      console.error('❌ Failed to seed combos:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
