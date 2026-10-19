import prisma from '../../config/db.prisma';
import { requireResolvedProduct, resolveProductsByNames } from './seed-catalog-refs';

/**
 * Festival campaigns, authored against the seeded catalogue by product NAME.
 *
 * - The product list is explicit (not "first 14 published"): the storefront
 *   campaign screen should show a curated story, not insertion order.
 * - Windows are relative to the seed run, so the campaigns are open the moment
 *   they land and stay open on every re-run (evergreen demo data).
 * - Product names are validated against `data/products.json` by the seed spec,
 *   so a renamed or removed catalogue item fails the suite, not the storefront.
 */
export interface CampaignSeedSpec {
  slug: string;
  title: string;
  campaignType: 'FESTIVAL' | 'SEASONAL' | 'FLASH_SALE' | 'HOLIDAY' | 'NEW_YEAR';
  tagline: string;
  bannerImage: string;
  themeColor: string;
  /** Days before the seed run the campaign opened. */
  startDaysAgo: number;
  /** Days after the seed run the campaign closes. */
  endDaysFromNow: number;
  /** Percentage off applied to each linked product (`CampaignProduct.discountValue`). */
  discountValue: number;
  productNames: string[];
}

export interface CampaignSeedRow {
  slug: string;
  title: string;
  campaignType: CampaignSeedSpec['campaignType'];
  tagline: string;
  bannerImage: string;
  themeColor: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export const CAMPAIGN_SEED_SPECS: CampaignSeedSpec[] = [
  {
    slug: 'dashain-festive-dhamaka',
    title: 'Dashain Festive Dhamaka',
    campaignType: 'FESTIVAL',
    tagline: 'Celebrate Dashain in statement outerwear — 20% off festive picks.',
    bannerImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
    themeColor: '#D92525',
    startDaysAgo: 10,
    endDaysFromNow: 14,
    discountValue: 20,
    productNames: [
      "Manfinity EMRG Men's Flap Pocket Button Front Denim Jacket With Fleece Lining",
      "Manfinity Homme Men's Vintage Washed Oversized Trucker Denim Jacket",
      "Manfinity Spmode Men's Ripped Graphic Embroidery Denim Jacket",
      "Claim Dot Men's Black Vertical Pinstripe Stand Collar Zip-Up Jacket, Elastic Cuffs And Hem Lightweight Casual Windbreaker, Loose Fit Spring/Autumn Daily Streetwear Outerwear",
      "Men's Minimalist Solid Color Hooded Tech Windbreaker Jacket, Vintage Youthful Versatile Long Sleeve Jacket, American Casual Tech Outerwear, Men's Long Sleeve Outer Layer Top",
      "Core Aspect Men's Best-Selling Leather Jacket, INS Style Casual Pocket Leather Jacket, Suitable For Autumn/Winter Matching And Daily Wear",
      "Mainfolk Men's Retro Casual 90s Corduroy Lapel Jacket, Dark Green Autumn, Suede Air Layer Jacket, Utility Cargo Jacket",
      "DAZY Men's Brown Wool Blend Jacket And Coat With Large Front Pocket And Lapel Collar, Spring/Autumn",
    ],
  },
  {
    slug: 'tihar-lights-sale',
    title: 'Tihar Lights Sale',
    campaignType: 'FESTIVAL',
    tagline: 'Glow up this Tihar with 15% off layering essentials.',
    bannerImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80',
    themeColor: '#D97706',
    startDaysAgo: 4,
    endDaysFromNow: 21,
    discountValue: 15,
    productNames: [
      'Essential Oversized Heavyweight Hoodie',
      "GLESTORE Men's Retro Coin-Print Casual Stand-Collar Half-Zip Fleece Sweatshirt, Perfect For Layering, Wearing As A Base Layer, Or As An Outer Layer",
      "Manfinity Homme Men's Letter Print Round Neck Long Sleeve Casual Sweatshirt,Dark Grey,Autumn,Streetwear,City Break,Autumn/Winter Top Men Old Money,Outdoor Travel Gift",
      "Manfinity Homme Men's Casual Water Washed Thermal Thermal Lined Jeans, Autumn/Winter",
      'Vintage Wash Relaxed Graphic Tee',
      "Manfinity Homme Men's Straight Leg Jeans",
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildCampaignRow(spec: CampaignSeedSpec, now: Date): CampaignSeedRow {
  return {
    slug: spec.slug,
    title: spec.title,
    campaignType: spec.campaignType,
    tagline: spec.tagline,
    bannerImage: spec.bannerImage,
    themeColor: spec.themeColor,
    startDate: new Date(now.getTime() - spec.startDaysAgo * DAY_MS),
    endDate: new Date(now.getTime() + spec.endDaysFromNow * DAY_MS),
    isActive: true,
  };
}

export function buildCampaignRows(now: Date): CampaignSeedRow[] {
  return CAMPAIGN_SEED_SPECS.map((spec) => buildCampaignRow(spec, now));
}

export async function seedCampaigns(): Promise<void> {
  console.log('\n🎪 Seeding festival campaigns...');

  const now = new Date();

  for (const spec of CAMPAIGN_SEED_SPECS) {
    const row = buildCampaignRow(spec, now);
    const products = await resolveProductsByNames(spec.productNames);

    const campaign = await prisma.campaign.upsert({
      where: { slug: spec.slug },
      create: { ...row },
      update: {
        title: row.title,
        campaignType: row.campaignType,
        tagline: row.tagline,
        bannerImage: row.bannerImage,
        themeColor: row.themeColor,
        startDate: row.startDate,
        endDate: row.endDate,
        isActive: row.isActive,
      },
    });

    for (const name of spec.productNames) {
      const product = requireResolvedProduct(products, name);

      await prisma.campaignProduct.upsert({
        where: {
          campaignId_productId: { campaignId: campaign.id, productId: product.id },
        },
        create: {
          campaignId: campaign.id,
          productId: product.id,
          discountType: 'PERCENTAGE',
          discountValue: spec.discountValue,
        },
        update: { discountType: 'PERCENTAGE', discountValue: spec.discountValue },
      });
    }

    console.log(
      `  ✅ ${spec.title}: ${spec.productNames.length} products at ${spec.discountValue}% off.`,
    );
  }

  console.log('✅ Festival campaigns seeded.');
}

if (require.main === module) {
  seedCampaigns()
    .catch((err) => {
      console.error('❌ Failed to seed campaigns:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
