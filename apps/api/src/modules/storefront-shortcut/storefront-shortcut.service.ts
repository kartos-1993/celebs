import {
  type StorefrontShortcutDisplayAs,
  type StorefrontShortcutItem,
  type StorefrontShortcutType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  type StorefrontShortcutRepository,
  storefrontShortcutRepository,
} from './storefront-shortcut.repository';

import { Prisma } from '@/config/db.prisma';

export interface CreateStorefrontShortcutInput {
  categoryId: string;
  type: StorefrontShortcutType | string;
  attributeId?: string | null;
  displayAs: StorefrontShortcutDisplayAs | string;
  items?: StorefrontShortcutItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateStorefrontShortcutInput {
  type?: StorefrontShortcutType | string;
  attributeId?: string | null;
  displayAs?: StorefrontShortcutDisplayAs | string;
  items?: StorefrontShortcutItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

interface StorefrontShortcutConfig {
  type?: StorefrontShortcutType | string;
  attributeId?: string | null;
  displayAs?: StorefrontShortcutDisplayAs | string;
  items?: StorefrontShortcutItem[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface StorefrontShortcutServiceDeps {
  storefrontShortcutRepo?: Partial<StorefrontShortcutRepository>;
}

export class StorefrontShortcutService {
  private storefrontShortcutRepo: StorefrontShortcutRepository;

  constructor(deps: StorefrontShortcutServiceDeps = {}) {
    this.storefrontShortcutRepo = (deps.storefrontShortcutRepo ??
      storefrontShortcutRepository) as StorefrontShortcutRepository;
  }

  private formatFilter(qf: { id: string; filterConfig?: Prisma.JsonValue } | null) {
    if (!qf) return null;
    const config = (
      qf.filterConfig && typeof qf.filterConfig === 'object' ? qf.filterConfig : {}
    ) as StorefrontShortcutConfig;
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
    const category = await this.storefrontShortcutRepo.findCategoryBySlugOrId(slugOrId);

    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const categoryId = category.id;

    let rawStorefrontShortcuts = await this.storefrontShortcutRepo.findByCategoryId(categoryId);

    if (rawStorefrontShortcuts.length === 0) {
      const childCategories =
        await this.storefrontShortcutRepo.findActiveChildCategories(categoryId);

      if (childCategories.length > 0) {
        rawStorefrontShortcuts = [
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
    const needsAutoPopulate = rawStorefrontShortcuts.some((qf) => {
      const config = (
        qf.filterConfig && typeof qf.filterConfig === 'object' ? qf.filterConfig : {}
      ) as { type?: string; autoPopulate?: boolean };
      return config.type === 'subcategory' && config.autoPopulate !== false;
    });
    const autoPopulateChildren = needsAutoPopulate
      ? await this.storefrontShortcutRepo.findActiveChildCategories(categoryId)
      : [];

    const shortcuts = [];

    for (const qf of rawStorefrontShortcuts) {
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

      shortcuts.push({
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
      shortcuts,
      drawerFilters: [],
    };
  }

  async getStorefrontShortcutsForCategory(categoryId: string) {
    const list = await this.storefrontShortcutRepo.findByCategoryId(categoryId);
    return list.map((item) => this.formatFilter(item));
  }

  async createStorefrontShortcut(input: CreateStorefrontShortcutInput) {
    const category = await this.storefrontShortcutRepo.findCategoryById(input.categoryId);
    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const slug = `${input.type}-${input.categoryId}-${Date.now()}`;

    const created = await this.storefrontShortcutRepo.create({
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

  async updateStorefrontShortcut(id: string, input: UpdateStorefrontShortcutInput) {
    const filter = await this.storefrontShortcutRepo.findById(id);
    if (!filter) {
      throw new AppError(
        'Storefront shortcut not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const currentConfig = (
      filter.filterConfig && typeof filter.filterConfig === 'object' ? filter.filterConfig : {}
    ) as StorefrontShortcutConfig;

    const updated = await this.storefrontShortcutRepo.update(id, {
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

  async deleteStorefrontShortcut(id: string): Promise<{ success: boolean }> {
    const filter = await this.storefrontShortcutRepo.findById(id);
    if (!filter) {
      throw new AppError(
        'Storefront shortcut not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.storefrontShortcutRepo.delete(id);
    return { success: true };
  }
}

export const storefrontShortcutService = new StorefrontShortcutService();
