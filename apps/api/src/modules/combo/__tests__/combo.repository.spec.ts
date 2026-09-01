import { Product } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { ComboRepository, comboRepository } from '../combo.repository';
import { ComboService } from '../combo.service';

import prisma, { Prisma } from '@/config/db.prisma';

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-combo-1',
  name: 'Combo Item Product',
  brand: 'Celebs',
  brandId: null,
  slug: 'combo-item-product',
  description: '',
  price: new Prisma.Decimal(999.0),
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
  categoryId: 'cat-combo',
  subcategoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ComboRepository & ComboService Clean Architecture Suite', () => {
  let testComboId: string;
  const testSlug = `bundle-deal-${Date.now()}`;

  beforeEach(async () => {
    const bundle = await prisma.comboBundle.create({
      data: {
        title: 'Bundle Deal Test',
        slug: testSlug,
        discountType: 'PERCENTAGE',
        discountValue: new Prisma.Decimal(20.0),
        isActive: true,
      },
    });
    testComboId = bundle.id;
  });

  describe('ComboRepository', () => {
    it('should find active combos', async () => {
      const active = await comboRepository.findActiveCombos();
      expect(active.length).toBeGreaterThan(0);
      expect(active.some((b) => b.id === testComboId)).toBe(true);
    });

    it('should find combo by id', async () => {
      const found = await comboRepository.findById(testComboId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(testComboId);
      expect(found?.slug).toBe(testSlug);
    });

    it('should find combo by slug', async () => {
      const found = await comboRepository.findBySlug(testSlug);
      expect(found).not.toBeNull();
      expect(found?.slug).toBe(testSlug);
    });

    it('should find all combos', async () => {
      const all = await comboRepository.findAllCombos();
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('ComboService DI', () => {
    it('should retrieve active combos through injected mock repository', async () => {
      const mockRepo: Partial<ComboRepository> = {
        findActiveCombos: async () => [
          {
            id: 'mock-bundle-1',
            title: 'Mock Combo',
            slug: 'mock-combo',
            subtitle: null,
            description: null,
            bannerImage: null,
            discountType: 'PERCENTAGE' as const,
            discountValue: new Prisma.Decimal(15.0),
            isFirstParty: true,
            isActive: true,
            tag: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: [],
          },
        ],
        findProductsByIds: async () => [],
      };

      const service = new ComboService({ comboRepository: mockRepo });
      const result = await service.getActiveCombos();
      expect(result).toHaveLength(1);
    });

    it('should retrieve combo by slug and attach product details', async () => {
      const mockRepo: Partial<ComboRepository> = {
        findBySlug: async () => ({
          id: 'mock-bundle-2',
          title: 'Summer Outfit Combo',
          slug: 'summer-outfit',
          subtitle: 'Top & Shorts',
          description: null,
          bannerImage: null,
          discountType: 'FIXED_AMOUNT' as const,
          discountValue: new Prisma.Decimal(200.0),
          isFirstParty: true,
          isActive: true,
          tag: 'summer',
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: 'item-1',
              bundleId: 'mock-bundle-2',
              productId: 'prod-combo-1',
              defaultQuantity: 1,
              isRequired: true,
            },
          ],
        }),
        findProductsByIds: async () => [
          createMockProduct({ id: 'prod-combo-1', name: 'Summer Tee' }),
        ],
      };

      const service = new ComboService({ comboRepository: mockRepo });
      const result = (await service.getComboBySlug('summer-outfit')) as Record<
        string,
        unknown
      > | null;
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Summer Outfit Combo');
      expect(Array.isArray(result?.itemDetails)).toBe(true);
    });
  });
});
