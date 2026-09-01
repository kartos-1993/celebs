import { Category, QuickFilter } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { QuickFilterRepository, quickFilterRepository } from '../quick-filter.repository';
import { QuickFilterService } from '../quick-filter.service';

import prisma, { Prisma } from '@/config/db.prisma';

const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-123',
  name: 'Apparel',
  slug: 'apparel',
  path: 'apparel',
  level: 1,
  parentCategory: null,
  imageUrl: null,
  attributes: [] as Prisma.JsonValue,
  sizeChartColumns: [],
  bodyChartColumns: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockQuickFilter = (overrides: Partial<QuickFilter> = {}): QuickFilter => ({
  id: 'qf-1',
  title: 'Brand Filter',
  slug: 'brand-filter',
  categoryId: 'cat-123',
  filterConfig: {
    type: 'brand',
    displayAs: 'grid',
    items: [{ name: 'Nike', slug: 'nike' }],
    autoPopulate: false,
    displayOrder: 0,
    isActive: true,
  } as Prisma.JsonValue,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('QuickFilterRepository & QuickFilterService Clean Architecture Suite', () => {
  let categoryId: string;
  let quickFilterId: string;

  beforeEach(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        level: 1,
        path: `test-cat-${Date.now()}`,
        isActive: true,
      },
    });
    categoryId = category.id;

    const qf = await prisma.quickFilter.create({
      data: {
        title: 'Brand Quick Filter',
        slug: `filter-${Date.now()}`,
        categoryId,
        filterConfig: {
          type: 'brand',
          displayAs: 'grid',
          items: [],
          autoPopulate: false,
          displayOrder: 1,
          isActive: true,
        },
      },
    });
    quickFilterId = qf.id;
  });

  describe('QuickFilterRepository', () => {
    it('should find category by slug or id', async () => {
      const found = await quickFilterRepository.findCategoryById(categoryId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(categoryId);
    });

    it('should find quick filters by categoryId', async () => {
      const list = await quickFilterRepository.findByCategoryId(categoryId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0]?.id).toBe(quickFilterId);
    });

    it('should update and delete quick filter', async () => {
      const updated = await quickFilterRepository.update(quickFilterId, {
        type: 'brand',
        displayAs: 'carousel',
      });
      expect(updated.id).toBe(quickFilterId);

      const deleted = await quickFilterRepository.delete(quickFilterId);
      expect(deleted.id).toBe(quickFilterId);
    });
  });

  describe('QuickFilterService DI', () => {
    it('should resolve storefront config using injected mock repository', async () => {
      const mockCategory = createMockCategory({
        id: 'cat-123',
        name: 'Apparel',
        slug: 'apparel',
      });

      const mockRepo: Partial<QuickFilterRepository> = {
        findCategoryBySlugOrId: async () => mockCategory,
        findByCategoryId: async () => [
          createMockQuickFilter({
            id: 'qf-1',
            categoryId: 'cat-123',
          }),
        ],
        findActiveChildCategories: async () => [],
      };

      const service = new QuickFilterService({ quickFilterRepo: mockRepo });
      const result = await service.getStorefrontConfigBySlug('apparel');

      expect(result.category.name).toBe('Apparel');
      expect(result.quickFilters.length).toBe(1);
      expect(result.quickFilters[0]?.type).toBe('brand');
    });

    it('should throw AppError when category is not found', async () => {
      const service = new QuickFilterService();
      await expect(service.getStorefrontConfigBySlug('non-existent-slug-xyz')).rejects.toThrow(
        'Category not found',
      );
    });
  });
});
