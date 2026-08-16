import { Prisma, type Category } from '@prisma/client';

import prisma from '@/config/db.prisma';

export interface FormattedCategory {
  id: string;
  name: string;
  slug: string;
  path?: string | null;
  level: number;
  parentCategory?: string | null;
  attributes: unknown[];
  sizeChartColumns: string[];
  bodyChartColumns: string[];
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

const toJsonInput = (value: unknown): Prisma.InputJsonValue => {
  if (value === undefined || value === null) return [];
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

export class CategoryRepository {
  private formatCategory(
    category:
      | Category
      | (Prisma.CategoryGetPayload<object> & Record<string, unknown>)
      | Record<string, unknown>
      | null,
  ): FormattedCategory | null {
    if (!category) return null;
    const cat = category as Record<string, unknown>;
    return {
      ...cat,
      id: String(cat.id),
      name: String(cat.name || ''),
      slug: String(cat.slug || ''),
      path: cat.path ? String(cat.path) : null,
      level: Number(cat.level || 0),
      parentCategory: cat.parentCategory ? String(cat.parentCategory) : null,
      parent: cat.parentCategory ? String(cat.parentCategory) : null,
      attributes: Array.isArray(cat.attributes) ? (cat.attributes as unknown[]) : [],
      sizeChartColumns: Array.isArray(cat.sizeChartColumns)
        ? (cat.sizeChartColumns as string[])
        : [],
      bodyChartColumns: Array.isArray(cat.bodyChartColumns)
        ? (cat.bodyChartColumns as string[])
        : [],
      imageUrl: cat.imageUrl ? String(cat.imageUrl) : null,
      isActive: cat.isActive !== false,
      createdAt: cat.createdAt instanceof Date ? cat.createdAt : new Date(),
      updatedAt: cat.updatedAt instanceof Date ? cat.updatedAt : new Date(),
    };
  }

  async countDocuments(query: Record<string, unknown> = {}): Promise<number> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.parentCategory !== undefined) {
      where.parentCategory = query.parentCategory as string | null;
    }
    if (query.isActive !== undefined) {
      where.isActive = Boolean(query.isActive);
    }
    return prisma.category.count({ where });
  }

  async findById(id: string): Promise<FormattedCategory | null> {
    if (!id || typeof id !== 'string') return null;
    const category = await prisma.category.findUnique({
      where: { id },
    });
    return this.formatCategory(category);
  }

  async findOne(query: Record<string, unknown>): Promise<FormattedCategory | null> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.slug) where.slug = String(query.slug);
    if (query.name) where.name = { equals: String(query.name), mode: 'insensitive' };
    if (query.id) where.id = String(query.id);

    const category = await prisma.category.findFirst({ where });
    return this.formatCategory(category);
  }

  async find(query: Record<string, unknown> = {}, limit?: number): Promise<FormattedCategory[]> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.parentCategory !== undefined)
      where.parentCategory = query.parentCategory as string | null;
    if (query.isActive !== undefined) where.isActive = Boolean(query.isActive);
    if (query.name && typeof query.name === 'string') {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      take: limit,
    });

    return categories
      .map((c) => this.formatCategory(c))
      .filter((c): c is FormattedCategory => c !== null);
  }

  async create(data: Record<string, unknown>): Promise<FormattedCategory | null> {
    const category = await prisma.category.create({
      data: {
        name: String(data.name || ''),
        slug: String(data.slug || ''),
        path: Array.isArray(data.path) ? data.path.join('/') : String(data.path || ''),
        level: Number(data.level || 0),
        parentCategory: data.parent
          ? String(data.parent)
          : data.parentCategory
            ? String(data.parentCategory)
            : null,
        attributes: toJsonInput(data.attributes),
        sizeChartColumns: Array.isArray(data.sizeChartColumns)
          ? (data.sizeChartColumns as string[])
          : [],
        bodyChartColumns: Array.isArray(data.bodyChartColumns)
          ? (data.bodyChartColumns as string[])
          : [],
        imageUrl: data.imageUrl ? String(data.imageUrl) : null,
        isActive: data.isActive !== false,
      },
    });

    return this.formatCategory(category);
  }

  async updateById(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<FormattedCategory | null> {
    const data: Prisma.CategoryUncheckedUpdateInput = {};
    if (updateData.name !== undefined) data.name = String(updateData.name);
    if (updateData.slug !== undefined) data.slug = String(updateData.slug);
    if (updateData.path !== undefined) {
      data.path = Array.isArray(updateData.path)
        ? updateData.path.join('/')
        : String(updateData.path);
    }
    if (updateData.level !== undefined) data.level = Number(updateData.level);
    if (updateData.parent !== undefined || updateData.parentCategory !== undefined) {
      data.parentCategory = updateData.parent
        ? String(updateData.parent)
        : updateData.parentCategory
          ? String(updateData.parentCategory)
          : null;
    }
    if (updateData.attributes !== undefined) {
      data.attributes = toJsonInput(updateData.attributes);
    }
    if (updateData.sizeChartColumns !== undefined) {
      data.sizeChartColumns = Array.isArray(updateData.sizeChartColumns)
        ? (updateData.sizeChartColumns as string[])
        : [];
    }
    if (updateData.bodyChartColumns !== undefined) {
      data.bodyChartColumns = Array.isArray(updateData.bodyChartColumns)
        ? (updateData.bodyChartColumns as string[])
        : [];
    }
    if (updateData.imageUrl !== undefined) {
      data.imageUrl = updateData.imageUrl ? String(updateData.imageUrl) : null;
    }
    if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return this.formatCategory(category);
  }

  async deleteById(id: string): Promise<FormattedCategory | null> {
    const category = await prisma.category.delete({
      where: { id },
    });

    return this.formatCategory(category);
  }

  async countProductsByCategory(categoryId: string): Promise<number> {
    return prisma.product.count({
      where: {
        OR: [{ categoryId }, { subcategoryId: categoryId }],
      },
    });
  }
}

export const categoryRepository = new CategoryRepository();
