import { Category, StorefrontShortcut } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  StorefrontShortcutRepository,
  storefrontShortcutRepository,
} from '../storefront-shortcut.repository';
import { StorefrontShortcutService } from '../storefront-shortcut.service';

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

const createMockStorefrontShortcut = (
  overrides: Partial<StorefrontShortcut> = {},
): StorefrontShortcut => ({
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

describe('StorefrontShortcutRepository & StorefrontShortcutService Clean Architecture Suite', () => {
  let categoryId: string;
  let storefrontShortcutId: string;

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

    const qf = await prisma.storefrontShortcut.create({
      data: {
        title: 'Brand Storefront Shortcut',
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
    storefrontShortcutId = qf.id;
  });

  describe('StorefrontShortcutRepository', () => {
    it('should find category by slug or id', async () => {
      const found = await storefrontShortcutRepository.findCategoryById(categoryId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(categoryId);
    });

    it('should find storefront shortcuts by categoryId', async () => {
      const list = await storefrontShortcutRepository.findByCategoryId(categoryId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0]?.id).toBe(storefrontShortcutId);
    });

    it('should update and delete a storefront shortcut', async () => {
      const updated = await storefrontShortcutRepository.update(storefrontShortcutId, {
        type: 'brand',
        displayAs: 'carousel',
      });
      expect(updated.id).toBe(storefrontShortcutId);

      const deleted = await storefrontShortcutRepository.delete(storefrontShortcutId);
      expect(deleted.id).toBe(storefrontShortcutId);
    });
  });

  describe('StorefrontShortcutService DI', () => {
    it('should resolve storefront config using injected mock repository', async () => {
      const mockCategory = createMockCategory({
        id: 'cat-123',
        name: 'Apparel',
        slug: 'apparel',
      });

      const mockRepo: Partial<StorefrontShortcutRepository> = {
        findCategoryBySlugOrId: async () => mockCategory,
        findByCategoryId: async () => [
          createMockStorefrontShortcut({
            id: 'qf-1',
            categoryId: 'cat-123',
          }),
        ],
        findActiveChildCategories: async () => [],
      };

      const service = new StorefrontShortcutService({ storefrontShortcutRepo: mockRepo });
      const result = await service.getStorefrontConfigBySlug('apparel');

      expect(result.category.name).toBe('Apparel');
      expect(result.shortcuts.length).toBe(1);
      expect(result.shortcuts[0]?.type).toBe('brand');
    });

    it('should throw AppError when category is not found', async () => {
      const service = new StorefrontShortcutService();
      await expect(service.getStorefrontConfigBySlug('non-existent-slug-xyz')).rejects.toThrow(
        'Category not found',
      );
    });
  });
});
