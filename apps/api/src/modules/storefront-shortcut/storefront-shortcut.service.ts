import type { Category } from '@prisma/client';

import {
  type StorefrontShortcutDisplayAs,
  type StorefrontShortcutItem,
  type StorefrontShortcutType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { type StorefrontShortcutCache, storefrontShortcutCache } from './storefront-shortcut.cache';
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

/** One rendered shortcut row on the storefront: the shape the app consumes. */
export interface StorefrontConfigShortcut {
  id: string;
  title: string;
  type: string;
  attributeId: string | null;
  displayAs: string;
  displayOrder: number;
  items: StorefrontShortcutItem[];
}

export interface StorefrontConfigResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    level: number;
    imageUrl: string | null;
  };
  shortcuts: StorefrontConfigShortcut[];
  drawerFilters: unknown[];
}

export interface StorefrontShortcutServiceDeps {
  storefrontShortcutRepo?: Partial<StorefrontShortcutRepository>;
  storefrontShortcutCache?: StorefrontShortcutCache;
}

export class StorefrontShortcutService {
  private storefrontShortcutRepo: StorefrontShortcutRepository;
  private storefrontShortcutCache: StorefrontShortcutCache;

  constructor(deps: StorefrontShortcutServiceDeps = {}) {
    this.storefrontShortcutRepo = (deps.storefrontShortcutRepo ??
      storefrontShortcutRepository) as StorefrontShortcutRepository;
    this.storefrontShortcutCache = deps.storefrontShortcutCache ?? storefrontShortcutCache;
  }

  private formatFilter(qf: { id: string; title?: string; filterConfig?: Prisma.JsonValue } | null) {
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
      // `displayOrder` and `isActive` live inside `filterConfig` - there are no
      // top-level columns for them, and reading the row directly returned the
      // defaults forever. The config is the only writer's home (create/update/seed).
      displayOrder: config.displayOrder ?? 0,
      isActive: config.isActive !== false,
    };
  }

  /**
   * The cache key is the category slug; an update or delete only holds the
   * shortcut's category id, so it is resolved once (admin-frequency path, not
   * request-frequency).
   */
  private async invalidateShortcutCacheFor(categoryId: string | null): Promise<void> {
    if (!categoryId) return;

    const category = await this.storefrontShortcutRepo.findCategoryById(categoryId);
    if (category) await this.storefrontShortcutCache.invalidate(category.slug);
  }

  async getStorefrontConfigBySlug(slugOrId: string): Promise<StorefrontConfigResponse> {
    const category = await this.storefrontShortcutRepo.findCategoryBySlugOrId(slugOrId);

    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const cached = await this.storefrontShortcutCache.get(category.slug);
    if (cached) return cached;

    const config = await this.buildStorefrontConfig(category);
    await this.storefrontShortcutCache.set(category.slug, config);
    return config;
  }

  private async buildStorefrontConfig(category: Category): Promise<StorefrontConfigResponse> {
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

    const shortcuts: StorefrontConfigShortcut[] = [];

    for (const qf of rawStorefrontShortcuts) {
      const formatted = this.formatFilter(qf);
      if (!formatted) continue;
      // A deactivated shortcut must not render - and because its row exists, it
      // must not trigger the no-rows fallback either. Deactivation is a
      // decision, not a gap.
      if (!formatted.isActive) continue;
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
        title: formatted.title || 'Subcategories',
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

    // The category row is already in hand: its slug names the cache key.
    await this.storefrontShortcutCache.invalidate(category.slug);

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

    await this.invalidateShortcutCacheFor(filter.categoryId);

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

    await this.invalidateShortcutCacheFor(filter.categoryId);

    return { success: true };
  }
}

export const storefrontShortcutService = new StorefrontShortcutService();
