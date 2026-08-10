import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';
import prisma from '@/config/db.prisma';
import { Prisma } from '@prisma/client';

export interface CreateQuickFilterInput {
  categoryId: string;
  type: string;
  attributeId?: string | null;
  displayAs: string;
  items?: {
    name: string;
    image?: string | null;
    slug?: string | null;
    filterValue?: string | null;
    displayOrder?: number;
  }[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickFilterInput {
  type?: string;
  attributeId?: string | null;
  displayAs?: string;
  items?: {
    name: string;
    image?: string | null;
    slug?: string | null;
    filterValue?: string | null;
    displayOrder?: number;
  }[];
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

interface QuickFilterConfig {
  type?: string;
  attributeId?: string | null;
  displayAs?: string;
  items?: Array<{
    name: string;
    image?: string | null;
    slug?: string | null;
    filterValue?: string | null;
    displayOrder?: number;
  }>;
  autoPopulate?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export class QuickFilterService {
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
      displayOrder: (qf as any).displayOrder ?? 0,
      isActive: (qf as any).isActive !== false,
    };
  }

  async getStorefrontConfigBySlug(slugOrId: string) {
    const slugLower = slugOrId.toLowerCase();

    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: slugOrId },
          { slug: { equals: slugLower, mode: 'insensitive' } },
          { path: { equals: slugLower, mode: 'insensitive' } },
          { name: { equals: slugLower.replace(/-/g, ' '), mode: 'insensitive' } },
        ],
      },
    });

    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const categoryId = category.id;

    let rawQuickFilters = await prisma.quickFilter.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    });

    if (rawQuickFilters.length === 0) {
      const childCategories = await prisma.category.findMany({
        where: {
          parentCategory: categoryId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

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

    const quickFilters = [];

    for (const qf of rawQuickFilters) {
      const formatted = this.formatFilter(qf);
      if (!formatted) continue;
      let finalItems = [...(formatted.items || [])];

      if (formatted.type === 'subcategory' && formatted.autoPopulate) {
        const childCategories = await prisma.category.findMany({
          where: {
            parentCategory: categoryId,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        });

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
    const list = await prisma.quickFilter.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((item) => this.formatFilter(item));
  }

  async createQuickFilter(input: CreateQuickFilterInput) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const slug = `${input.type}-${input.categoryId}-${Date.now()}`;

    const created = await prisma.quickFilter.create({
      data: {
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
      },
    });

    return this.formatFilter(created);
  }

  async updateQuickFilter(id: string, input: UpdateQuickFilterInput) {
    const filter = await prisma.quickFilter.findUnique({ where: { id } });
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

    const updated = await prisma.quickFilter.update({
      where: { id },
      data: {
        filterConfig: {
          ...currentConfig,
          ...(input.type ? { type: input.type } : {}),
          ...(input.attributeId !== undefined ? { attributeId: input.attributeId } : {}),
          ...(input.displayAs ? { displayAs: input.displayAs } : {}),
          ...(input.items ? { items: input.items } : {}),
          ...(input.autoPopulate !== undefined ? { autoPopulate: input.autoPopulate } : {}),
          ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      },
    });

    return this.formatFilter(updated);
  }

  async deleteQuickFilter(id: string): Promise<{ success: boolean }> {
    const filter = await prisma.quickFilter.findUnique({ where: { id } });
    if (!filter) {
      throw new AppError(
        'Quick filter not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await prisma.quickFilter.delete({ where: { id } });
    return { success: true };
  }
}
