import { Product } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { CampaignRepository, campaignRepository } from '../campaign.repository';
import { CampaignService } from '../campaign.service';

import prisma, { Prisma } from '@/config/db.prisma';

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-100',
  name: 'Denim Jacket',
  brand: 'Celebs',
  brandId: null,
  slug: 'denim-jacket',
  description: '',
  price: new Prisma.Decimal(1999.0),
  discountedPrice: null,
  status: 'published',
  featured: false,
  mainImages: [],
  tags: [],
  sizes: null,
  colorVariants: null,
  skus: null,
  variantOptions: null,
  dynamicData: null,
  qualityScore: null,
  reviewNote: null,
  rejectionReasonCategory: null,
  rejectionSubcategories: [],
  rejectionFields: [],
  reviewHistory: null,
  reviewedBy: null,
  reviewedAt: null,
  createdBy: null,
  updatedBy: null,
  vendorId: null,
  vendorName: null,
  categoryId: 'cat-1',
  subcategoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CampaignRepository & CampaignService Clean Architecture Suite', () => {
  let testCampaignId: string;
  const testSlug = `summer-sale-${Date.now()}`;

  beforeEach(async () => {
    const campaign = await prisma.campaign.create({
      data: {
        title: 'Summer Sale Test',
        slug: testSlug,
        startDate: new Date(Date.now() - 3600_000),
        endDate: new Date(Date.now() + 86400_000),
        isActive: true,
      },
    });
    testCampaignId = campaign.id;
  });

  describe('CampaignRepository', () => {
    it('should find active campaigns', async () => {
      const active = await campaignRepository.findActiveCampaigns(new Date());
      expect(active.length).toBeGreaterThan(0);
      expect(active.some((c) => c.id === testCampaignId)).toBe(true);
    });

    it('should find campaign by id', async () => {
      const found = await campaignRepository.findById(testCampaignId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(testCampaignId);
      expect(found?.slug).toBe(testSlug);
    });

    it('should find campaign by slug', async () => {
      const found = await campaignRepository.findBySlug(testSlug);
      expect(found).not.toBeNull();
      expect(found?.slug).toBe(testSlug);
    });

    it('should find all campaigns', async () => {
      const all = await campaignRepository.findAllCampaigns();
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('CampaignService DI', () => {
    it('should retrieve active campaigns through injected mock repository', async () => {
      const mockRepo: Partial<CampaignRepository> = {
        findActiveCampaigns: async () => [
          {
            id: 'mock-camp-1',
            title: 'Mock Campaign',
            slug: 'mock-campaign',
            campaignType: 'FESTIVAL' as const,
            tagline: 'Big discounts',
            bannerImage: null,
            themeColor: '#D92525',
            startDate: new Date(),
            endDate: new Date(Date.now() + 3600_000),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            products: [],
          },
        ],
        findProductsByIds: async () => [],
      };

      const service = new CampaignService({ campaignRepository: mockRepo });
      const result = await service.getActiveCampaigns();
      expect(result).toHaveLength(1);
    });

    it('should retrieve campaign by slug and resolve product details', async () => {
      const mockRepo: Partial<CampaignRepository> = {
        findBySlug: async () => ({
          id: 'mock-camp-2',
          title: 'Winter Clearance',
          slug: 'winter-clearance',
          campaignType: 'SEASONAL' as const,
          tagline: 'End of season',
          bannerImage: null,
          themeColor: '#D92525',
          startDate: new Date(),
          endDate: new Date(Date.now() + 3600_000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          products: [
            {
              id: 'cp-1',
              campaignId: 'mock-camp-2',
              productId: 'prod-100',
              createdAt: new Date(),
            },
          ],
        }),
        findProductsByIds: async () => [
          createMockProduct({ id: 'prod-100', name: 'Denim Jacket' }),
        ],
      };

      const service = new CampaignService({ campaignRepository: mockRepo });
      const result = await service.getCampaignBySlug('winter-clearance');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Winter Clearance');
      expect(result?.productDetails).toHaveLength(1);
    });
  });
});
