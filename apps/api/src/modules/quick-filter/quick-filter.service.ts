import {
  type QuickFilterDisplayAs,
  type QuickFilterItem,
  type QuickFilterType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { type QuickFilterRepository, quickFilterRepository } from './quick-filter.repository';

import { Prisma } from '@/config/db.prisma';

export interface CreateQuickFilterInput {
  categoryId: string;
  type: QuickFilterType | string;
  attributeId?: string | null;
  displayAs: QuickFilterDisplayAs | string;
  items?: QuickFilterItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickFilterInput {
  type?: QuickFilterType | string;
  attributeId?: string | null;
  displayAs?: QuickFilterDisplayAs | string;
  items?: QuickFilterItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

interface QuickFilterConfig {
  type?: QuickFilterType | string;
  attributeId?: string | null;
  displayAs?: QuickFilterDisplayAs | string;
  items?: QuickFilterItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface QuickFilterServiceDeps {
  quickFilterRepo?: QuickFilterRepository;
}

export class QuickFilterService {
  private quickFilterRepo: QuickFilterRepository;

  constructor(deps: QuickFilterServiceDeps = {}) {
    this.quickFilterRepo = deps.quickFilterRepo ?? quickFilterRepository;
  }

  private formatFilter(qf: { id: string; filterConfig?: Prisma.JsonValue } | null) {
    if (!qf) return null;
    const config = (
      qf.filterConfig && typeof qf.filterConfig === 'object' ? qf.filterConfig : {}
    ) as QuickFilterConfig;
    return {
      ...qf,
      id: qf.id,
      items: Array.isArray(config.items) ? config.items : [],
      type: config.type || 'subcategory',
      displayAs: config.displayAs || 'avatar_scroll',
      attributeId: config.attributeId || null,
      autoPopulate: config.autoPopulate !== false,
      displayOrder: (qf as Record<string, unknown>).displayOrder ?? 0,
      isActive: (qf as Record<string, unknown>).isActive !== false,
    };
  }

  async getStorefrontConfigBySlug(slugOrId: string) {
    const category = await this.quickFilterRepo.findCategoryBySlugOrId(slugOrId);

    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const categoryId = category.id;

    let rawQuickFilters = await this.quickFilterRepo.findByCategoryId(categoryId);

    if (rawQuickFilters.length === 0) {
      const childCategories = await this.quickFilterRepo.findActiveChildCategories(categoryId);

      if (childCategories.length > 0) {
        rawQuickFilters = [
          {
            id: `temp-${Date.now()}`,
            title: 'Subcategories',
            slug: `subcats-${categoryId}`,
            categoryId,
            filterConfig: {
              type: 'subcategory',
              attributeId: null,
              displayAs: 'avatar_scroll',
              items: childCategories.map((child, idx) => ({
                name: child.name.replace(new RegExp(`^${category.name}\\s+`, 'i'), ''),
                image: child.imageUrl || null,
                slug: child.slug,
                filterValue: child.slug,
                displayOrder: idx,
              })),
              autoPopulate: true,
              displayOrder: 0,
              isActive: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
    }

    // Hoisted: every auto-populated subcategory filter reuses this one fetch
    // instead of issuing an identical query per filter.
    const needsAutoPopulate = rawQuickFilters.some((qf) => {
      const config = (
        qf.filterConfig && typeof qf.filterConfig === 'object' ? qf.filterConfig : {}
      ) as { type?: string; autoPopulate?: boolean };
      return config.type === 'subcategory' && config.autoPopulate !== false;
    });
    const autoPopulateChildren = needsAutoPopulate
      ? await this.quickFilterRepo.findActiveChildCategories(categoryId)
      : [];

    const quickFilters = [];

    for (const qf of rawQuickFilters) {
      const formatted = this.formatFilter(qf);
      if (!formatted) continue;
      let finalItems = [...(formatted.items || [])];

      if (formatted.type === 'subcategory' && formatted.autoPopulate) {
        const childCategories = autoPopulateChildren;

        if (childCategories.length > 0) {
          const autoItems = childCategories.map((child, idx) => ({
            name: child.name.replace(new RegExp(`^${category.name}\\s+`, 'i'), ''),
            image: child.imageUrl || null,
            slug: child.slug,
            filterValue: child.slug,
            displayOrder: idx,
          }));

          if (finalItems.length === 0) {
            finalItems = autoItems;
          }
        }
      }

      quickFilters.push({
        id: formatted.id,
        type: formatted.type,
        attributeId: formatted.attributeId,
        displayAs: formatted.displayAs,
        displayOrder: formatted.displayOrder,
        items: finalItems,
      });
    }

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        level: category.level,
        imageUrl: category.imageUrl || null,
      },
      quickFilters,
      drawerFilters: [],
    };
  }

  async getQuickFiltersForCategory(categoryId: string) {
    const list = await this.quickFilterRepo.findByCategoryId(categoryId);
    return list.map((item) => this.formatFilter(item));
  }

  async createQuickFilter(input: CreateQuickFilterInput) {
    const category = await this.quickFilterRepo.findCategoryById(input.categoryId);
    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const slug = `${input.type}-${input.categoryId}-${Date.now()}`;

    const created = await this.quickFilterRepo.create({
      title: input.type,
      slug,
      categoryId: input.categoryId,
      filterConfig: {
        type: input.type,
        attributeId: input.attributeId || null,
        displayAs: input.displayAs,
        items: input.items || [],
        autoPopulate: input.autoPopulate !== false,
        displayOrder: input.displayOrder || 0,
        isActive: input.isActive !== false,
      },
    });

    return this.formatFilter(created);
  }

  async updateQuickFilter(id: string, input: UpdateQuickFilterInput) {
    const filter = await this.quickFilterRepo.findById(id);
    if (!filter) {
      throw new AppError(
        'Quick filter not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const currentConfig = (
      filter.filterConfig && typeof filter.filterConfig === 'object' ? filter.filterConfig : {}
    ) as QuickFilterConfig;

    const updated = await this.quickFilterRepo.update(id, {
      ...currentConfig,
      ...(input.type ? { type: input.type } : {}),
      ...(input.attributeId !== undefined ? { attributeId: input.attributeId } : {}),
      ...(input.displayAs ? { displayAs: input.displayAs } : {}),
      ...(input.items ? { items: input.items } : {}),
      ...(input.autoPopulate !== undefined ? { autoPopulate: input.autoPopulate } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    return this.formatFilter(updated);
  }

  async deleteQuickFilter(id: string): Promise<{ success: boolean }> {
    const filter = await this.quickFilterRepo.findById(id);
    if (!filter) {
      throw new AppError(
        'Quick filter not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.quickFilterRepo.delete(id);
    return { success: true };
  }
}

export const quickFilterService = new QuickFilterService();
