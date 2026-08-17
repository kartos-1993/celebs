import { Prisma, type Category } from '@prisma/client';

import type {
  CategoryAttributeType,
  CategoryEntity,
  RecentCategory,
} from '@celebs/shared-types';

import prisma from '@/config/db.prisma';

export class CategoryRepository {
  private parseAttributes(raw: unknown): CategoryAttributeType[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
      .map((item) => ({
        id: item.id ? String(item.id) : undefined,
        name: String(item.name || ''),
        label: item.label ? String(item.label) : undefined,
        type:
          typeof item.type === 'string'
            ? (item.type as CategoryAttributeType['type'])
            : 'text',
        values: Array.isArray(item.values) ? item.values.map(String) : [],
        isRequired: Boolean(item.isRequired),
        group:
          typeof item.group === 'string'
            ? (item.group as CategoryAttributeType['group'])
            : 'basic',
        placeholder: item.placeholder ? String(item.placeholder) : undefined,
        info:
          typeof item.info === 'object' && item.info !== null
            ? (item.info as CategoryAttributeType['info'])
            : undefined,
        isVariant: Boolean(item.isVariant),
        useStandardOptions: Boolean(item.useStandardOptions),
        optionSetId: item.optionSetId ? String(item.optionSetId) : undefined,
      }))
      .filter((attr) => attr.name.length > 0);
  }

  private toEntity(row: Category | null): CategoryEntity | null {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      level: row.level,
      parentCategory: row.parentCategory,
      path: row.path ?? '',
      attributes: this.parseAttributes(row.attributes),
      sizeChartColumns: row.sizeChartColumns,
      bodyChartColumns: row.bodyChartColumns,
      imageUrl: row.imageUrl,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async count(where: Prisma.CategoryWhereInput = {}): Promise<number> {
    return prisma.category.count({ where });
  }

  async countDocuments(where: Prisma.CategoryWhereInput = {}): Promise<number> {
    return this.count(where);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    if (!id || typeof id !== 'string') return null;
    const category = await prisma.category.findUnique({ where: { id } });
    return this.toEntity(category);
  }

  async findFirst(where: Prisma.CategoryWhereInput): Promise<CategoryEntity | null> {
    const category = await prisma.category.findFirst({ where });
    return this.toEntity(category);
  }

  async findOne(where: Prisma.CategoryWhereInput): Promise<CategoryEntity | null> {
    return this.findFirst(where);
  }

  async findMany(
    where: Prisma.CategoryWhereInput = {},
    limit?: number,
  ): Promise<CategoryEntity[]> {
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      take: limit,
    });
    return categories
      .map((c) => this.toEntity(c))
      .filter((c): c is CategoryEntity => c !== null);
  }

  async find(
    where: Prisma.CategoryWhereInput = {},
    limit?: number,
  ): Promise<CategoryEntity[]> {
    return this.findMany(where, limit);
  }

  async create(data: Prisma.CategoryUncheckedCreateInput): Promise<CategoryEntity | null> {
    const category = await prisma.category.create({ data });
    return this.toEntity(category);
  }

  async updateById(
    id: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<CategoryEntity | null> {
    const category = await prisma.category.update({ where: { id }, data });
    return this.toEntity(category);
  }

  async deleteById(id: string): Promise<CategoryEntity | null> {
    const category = await prisma.category.delete({ where: { id } });
    return this.toEntity(category);
  }

  async countProductsByCategory(categoryId: string): Promise<number> {
    return prisma.product.count({
      where: {
        OR: [{ categoryId }, { subcategoryId: categoryId }],
      },
    });
  }

  private formatRecentCategories(raw: unknown): RecentCategory[] {
    if (!raw || !Array.isArray(raw)) return [];

    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
      .map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        path: Array.isArray(item.path)
          ? (item.path as string[])
          : typeof item.path === 'string'
            ? [item.path]
            : [],
        usedAt:
          typeof item.usedAt === 'string' || item.usedAt instanceof Date
            ? item.usedAt
            : new Date().toISOString(),
      }))
      .filter((cat) => cat.id.length > 0);
  }

  private toInputJson(categories: RecentCategory[]): Prisma.InputJsonValue {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      path: c.path,
      usedAt:
        typeof c.usedAt === 'string'
          ? c.usedAt
          : c.usedAt instanceof Date
            ? c.usedAt.toISOString()
            : new Date().toISOString(),
    })) as Prisma.InputJsonValue;
  }

  async getRecentCategoriesForVendor(vendorId: string): Promise<RecentCategory[]> {
    const vendorProf = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { recentCategories: true },
    });
    return this.formatRecentCategories(vendorProf?.recentCategories);
  }

  async getRecentCategoriesForUser(userId: string): Promise<RecentCategory[]> {
    const userPref = await prisma.userPreference.findUnique({
      where: { userId },
      select: { recentCategories: true },
    });
    return this.formatRecentCategories(userPref?.recentCategories);
  }

  async saveRecentCategoriesForVendor(
    vendorId: string,
    categories: RecentCategory[],
  ): Promise<void> {
    await prisma.vendorProfile
      .update({
        where: { id: vendorId },
        data: {
          recentCategories: this.toInputJson(categories),
        },
      })
      .catch(() => null);
  }

  async saveRecentCategoriesForUser(
    userId: string,
    categories: RecentCategory[],
  ): Promise<void> {
    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        recentCategories: this.toInputJson(categories),
      },
      update: {
        recentCategories: this.toInputJson(categories),
      },
    });
  }
}

export const categoryRepository = new CategoryRepository();
