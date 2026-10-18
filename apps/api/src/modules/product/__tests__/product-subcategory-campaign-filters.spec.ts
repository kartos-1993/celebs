import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { productFilterSchema } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { ProductService } from '@/modules/product/product.service';

describe('Product storefront filter params — subcategory & campaign (PostgreSQL)', () => {
  let productService: ProductService;
  let createdProductIds: string[] = [];
  let createdCategoryIds: string[] = [];
  let createdCampaignIds: string[] = [];

  let root: { id: string; slug: string };
  let child: { id: string; slug: string };
  let grandchild: { id: string; slug: string };
  let sibling: { id: string; slug: string };
  let outsiderRoot: { id: string; slug: string };
  let campaign: { id: string; slug: string };

  let rootProductId: string;
  let childProductId: string;
  let grandchildProductId: string;
  let siblingProductId: string;
  let outsiderProductId: string;

  beforeEach(async () => {
    productService = new ProductService();

    const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const mkCategory = async (
      name: string,
      slug: string,
      path: string,
      level: number,
      parentCategory?: string,
    ) => {
      const category = await prisma.category.create({
        data: { name, slug, path, level, parentCategory },
      });
      createdCategoryIds.push(category.id);
      return { id: category.id, slug: category.slug };
    };

    root = await mkCategory('Filter Root', `filt-root-${uid}`, `filt-root-${uid}`, 1);
    child = await mkCategory(
      'Filter Child',
      `filt-child-${uid}`,
      `filt-root-${uid}/filt-child-${uid}`,
      2,
      root.id,
    );
    grandchild = await mkCategory(
      'Filter Grandchild',
      `filt-grand-${uid}`,
      `filt-root-${uid}/filt-child-${uid}/filt-grand-${uid}`,
      3,
      child.id,
    );
    sibling = await mkCategory(
      'Filter Sibling',
      `filt-sib-${uid}`,
      `filt-root-${uid}/filt-sib-${uid}`,
      2,
      root.id,
    );
    outsiderRoot = await mkCategory('Filter Outsider', `filt-out-${uid}`, `filt-out-${uid}`, 1);

    const mkProduct = async (label: string, categoryId: string, subcategoryId: string) => {
      const product = await prisma.product.create({
        data: {
          name: `Filter ${label} ${uid}`,
          slug: `filt-${label.toLowerCase()}-${uid}`,
          description: 'Fixture product for storefront filter params',
          price: 150,
          categoryId,
          subcategoryId,
          status: 'published',
          mainImages: ['https://example.com/filter.jpg'],
          createdBy: 'system-test',
          updatedBy: 'system-test',
        },
      });
      createdProductIds.push(product.id);
      return product.id;
    };

    rootProductId = await mkProduct('RootOnly', root.id, root.id);
    childProductId = await mkProduct('Child', root.id, child.id);
    grandchildProductId = await mkProduct('Grand', child.id, grandchild.id);
    siblingProductId = await mkProduct('Sibling', root.id, sibling.id);
    outsiderProductId = await mkProduct('Outsider', outsiderRoot.id, outsiderRoot.id);

    const campaignRow = await prisma.campaign.create({
      data: {
        title: 'Filter Campaign',
        slug: `filt-campaign-${uid}`,
        startDate: new Date(Date.now() - 86_400_000),
        endDate: new Date(Date.now() + 86_400_000),
        isActive: true,
      },
    });
    createdCampaignIds.push(campaignRow.id);
    campaign = { id: campaignRow.id, slug: campaignRow.slug };

    await prisma.campaignProduct.createMany({
      data: [
        { campaignId: campaign.id, productId: childProductId },
        { campaignId: campaign.id, productId: siblingProductId },
      ],
    });
  });

  afterEach(async () => {
    if (createdCampaignIds.length > 0) {
      await prisma.campaign.deleteMany({ where: { id: { in: createdCampaignIds } } });
      createdCampaignIds = [];
    }
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
      createdProductIds = [];
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
      createdCategoryIds = [];
    }
  });

  it('filters by subcategory slug across its whole subtree (public storefront)', async () => {
    const result = await productService.getProducts({ subcategory: child.slug, limit: 100 });
    const ids = result.products.map((p) => p?.id);

    expect(ids).toContain(childProductId);
    expect(ids).toContain(grandchildProductId);
    expect(ids).not.toContain(rootProductId);
    expect(ids).not.toContain(siblingProductId);
    expect(ids).not.toContain(outsiderProductId);
  });

  it('ANDs category and subcategory params (chip inside its browse root)', async () => {
    const result = await productService.getProducts({
      category: root.slug,
      subcategory: child.slug,
      limit: 100,
    });
    const ids = result.products.map((p) => p?.id);

    expect(ids).toContain(childProductId);
    expect(ids).toContain(grandchildProductId);
    expect(ids).not.toContain(rootProductId);
    expect(ids).not.toContain(siblingProductId);
    expect(ids).not.toContain(outsiderProductId);
  });

  it('filters by campaign slug to enrolled products only', async () => {
    const result = await productService.getProducts({ campaign: campaign.slug, limit: 100 });
    const ids = result.products.map((p) => p?.id);

    expect(ids).toContain(childProductId);
    expect(ids).toContain(siblingProductId);
    expect(ids).not.toContain(rootProductId);
    expect(ids).not.toContain(grandchildProductId);
    expect(ids).not.toContain(outsiderProductId);
  });

  it('returns an empty list for an unknown campaign slug', async () => {
    const result = await productService.getProducts({
      campaign: `filt-missing-${Date.now().toString(36)}`,
      limit: 100,
    });

    expect(result.products).toHaveLength(0);
  });

  it('strips the legacy tag param and parses the new params', () => {
    const parsed = productFilterSchema.parse({
      tag: 'dashain',
      subcategory: 'men-jeans',
      campaign: 'dashain-2082',
    });

    expect(parsed).not.toHaveProperty('tag');
    expect(parsed.subcategory).toBe('men-jeans');
    expect(parsed.campaign).toBe('dashain-2082');
  });
});
