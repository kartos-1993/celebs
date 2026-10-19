import { describe, expect, it } from 'vitest';

import { purgeAllTestData } from '../purge-catalog';
import { CAMPAIGN_SEED_SPECS, buildCampaignRows, seedCampaigns } from '../seed-campaigns';
import { COMBO_SEED_SPECS, seedCombos } from '../seed-combos';
import { readProductDataset } from '../seed-products';

import prisma from '@/config/db.prisma';

/**
 * The campaign and combo seeds are the storefront's content: festival
 * screens and the combo modal render whatever these rows say. They are
 * authored against the imported catalogue by product NAME, so the guards
 * below run the full loop - dataset -> authored reference -> resolved row -
 * on the local database.
 *
 * Product slugs carry a random suffix (`generateUniqueSlug`), which is why
 * the authored key is the dataset's name and not a slug.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function seedSpecAt<T>(specs: readonly T[], index: number): T {
  const spec = specs[index];
  if (!spec) throw new Error(`Seed spec at index ${index} is missing.`);
  return spec;
}

const referencedProductNames = [
  ...new Set([
    ...CAMPAIGN_SEED_SPECS.flatMap((spec) => spec.productNames),
    ...COMBO_SEED_SPECS.flatMap((spec) => spec.productNames),
  ]),
];

async function seedFixtureProducts(): Promise<void> {
  const category = await prisma.category.create({
    data: { name: `Seed Content Cat ${stamp()}`, slug: `seed-content-cat-${stamp()}` },
  });

  let index = 0;
  for (const name of referencedProductNames) {
    await prisma.product.create({
      data: {
        name,
        slug: `seed-content-${stamp()}-${index}`,
        brand: 'Celebs',
        price: 3000,
        status: 'published',
        categoryId: category.id,
      },
    });
    index += 1;
  }
}

async function readSeedCounts() {
  return {
    campaigns: await prisma.campaign.count(),
    campaignProducts: await prisma.campaignProduct.count(),
    combos: await prisma.comboBundle.count(),
    comboItems: await prisma.comboBundleItem.count(),
  };
}

describe('campaign and combo seed data', () => {
  it('references only products that exist in the imported dataset', () => {
    const datasetNames = new Set(readProductDataset().map((item) => item.name));

    const missing = referencedProductNames.filter((name) => !datasetNames.has(name));

    expect(missing).toEqual([]);
  });

  it('keeps slugs unique and every authored combo sane', () => {
    const campaignSlugs = CAMPAIGN_SEED_SPECS.map((spec) => spec.slug);
    expect(new Set(campaignSlugs).size).toBe(campaignSlugs.length);

    const comboSlugs = COMBO_SEED_SPECS.map((spec) => spec.slug);
    expect(new Set(comboSlugs).size).toBe(comboSlugs.length);

    for (const combo of COMBO_SEED_SPECS) {
      expect(combo.productNames.length).toBeGreaterThanOrEqual(2);
      expect(new Set(combo.productNames).size).toBe(combo.productNames.length);
      expect(combo.discountValue).toBeGreaterThan(0);
      if (combo.discountType === 'PERCENTAGE') {
        expect(combo.discountValue).toBeLessThan(100);
      }
    }
  });

  it('keeps every campaign window open across the seed moment', () => {
    const now = new Date('2026-10-19T12:00:00Z');

    for (const row of buildCampaignRows(now)) {
      expect(row.endDate.getTime()).toBeGreaterThan(row.startDate.getTime());
      expect(row.startDate.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(row.endDate.getTime()).toBeGreaterThan(now.getTime());
      expect(row.isActive).toBe(true);
    }
  });

  it('seeds campaigns and combos idempotently against resolved products', async () => {
    await seedFixtureProducts();

    await seedCampaigns();
    await seedCombos();

    const first = await readSeedCounts();
    expect(first).toEqual({
      campaigns: 2,
      campaignProducts:
        seedSpecAt(CAMPAIGN_SEED_SPECS, 0).productNames.length +
        seedSpecAt(CAMPAIGN_SEED_SPECS, 1).productNames.length,
      combos: COMBO_SEED_SPECS.length,
      comboItems: COMBO_SEED_SPECS.reduce((total, spec) => total + spec.productNames.length, 0),
    });

    const dashainLinks = await prisma.campaignProduct.count({
      where: { campaign: { slug: 'dashain-festive-dhamaka' }, discountValue: 20 },
    });
    expect(dashainLinks).toBe(seedSpecAt(CAMPAIGN_SEED_SPECS, 0).productNames.length);

    const essentials = await prisma.comboBundle.findUniqueOrThrow({
      where: { slug: 'street-essentials-combo' },
    });
    expect(Number(essentials.discountValue)).toBe(400);
    expect(essentials.discountType).toBe('FIXED_AMOUNT');

    await seedCampaigns();
    await seedCombos();

    const second = await readSeedCounts();
    expect(second).toEqual(first);
  }, 60000);

  it('fails loudly, naming the product, when a referenced product is unpublished', async () => {
    await seedFixtureProducts();

    const victim = seedSpecAt(seedSpecAt(CAMPAIGN_SEED_SPECS, 0).productNames, 0);
    await prisma.product.updateMany({ where: { name: victim }, data: { status: 'archived' } });

    await expect(seedCampaigns()).rejects.toThrow(victim);
  }, 60000);

  it('leaves no campaign, combo, or product rows behind after the reset purge', async () => {
    await seedFixtureProducts();
    await seedCampaigns();
    await seedCombos();

    await purgeAllTestData();

    expect(await prisma.campaign.count()).toBe(0);
    expect(await prisma.campaignProduct.count()).toBe(0);
    expect(await prisma.comboBundle.count()).toBe(0);
    expect(await prisma.comboBundleItem.count()).toBe(0);
    expect(await prisma.product.count()).toBe(0);

    // The master seed order after the purge restores everything.
    await seedFixtureProducts();
    await seedCampaigns();
    await seedCombos();

    expect((await readSeedCounts()).campaigns).toBe(2);
    expect((await readSeedCounts()).combos).toBe(COMBO_SEED_SPECS.length);
  }, 120000);
});
