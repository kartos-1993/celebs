import prisma from '@/config/db.prisma';
import { Prisma } from '@prisma/client';

export interface FormattedCategory {
  id: string;
  name: string;
  slug: string;
  path?: string | null;
  level: number;
  parentCategory?: string | null;
  attributes: unknown[];
  sizeChartColumns: string[];
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

export class CategoryRepository {
  private formatCategory(category: Record<string, unknown> | null): FormattedCategory | null {
    if (!category) return null;
    return {
      ...(category as Record<string, unknown>),
      id: String(category.id),
      name: String(category.name || ''),
      slug: String(category.slug || ''),
      path: category.path ? String(category.path) : null,
      level: Number(category.level || 0),
      parentCategory: category.parentCategory ? String(category.parentCategory) : undefined,
      attributes: Array.isArray(category.attributes) ? (category.attributes as unknown[]) : [],
      sizeChartColumns: Array.isArray(category.sizeChartColumns) ? (category.sizeChartColumns as string[]) : [],
      imageUrl: category.imageUrl ? String(category.imageUrl) : null,
      isActive: category.isActive !== false,
      createdAt: category.createdAt instanceof Date ? category.createdAt : new Date(),
      updatedAt: category.updatedAt instanceof Date ? category.updatedAt : new Date(),
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
    return this.formatCategory(category as unknown as Record<string, unknown>);
  }

  async findOne(query: Record<string, unknown>): Promise<FormattedCategory | null> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.slug) where.slug = String(query.slug);
    if (query.name) where.name = { equals: String(query.name), mode: 'insensitive' };
    if (query.id) where.id = String(query.id);

    const category = await prisma.category.findFirst({ where });
    return this.formatCategory(category as unknown as Record<string, unknown>);
  }

  async find(query: Record<string, unknown> = {}, limit?: number): Promise<FormattedCategory[]> {
    const where: Prisma.CategoryWhereInput = {};
    if (query.parentCategory !== undefined) where.parentCategory = query.parentCategory as string | null;
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
      .map((c) => this.formatCategory(c as unknown as Record<string, unknown>))
      .filter((c): c is FormattedCategory => c !== null);
  }

  async create(data: Record<string, unknown>): Promise<FormattedCategory | null> {
    const category = await prisma.category.create({
      data: {
        name: String(data.name || ''),
        slug: String(data.slug || ''),
        path: Array.isArray(data.path) ? data.path.join('/') : String(data.path || ''),
        level: Number(data.level || 0),
        parentCategory: data.parent ? String(data.parent) : data.parentCategory ? String(data.parentCategory) : null,
        attributes: (data.attributes ?? []) as unknown as Prisma.InputJsonValue,
        sizeChartColumns: Array.isArray(data.sizeChartColumns) ? (data.sizeChartColumns as string[]) : [],
        imageUrl: data.imageUrl ? String(data.imageUrl) : null,
        isActive: data.isActive !== false,
      },
    });

    return this.formatCategory(category as unknown as Record<string, unknown>);
  }

  async updateById(id: string, updateData: Record<string, unknown>): Promise<FormattedCategory | null> {
    const data: Prisma.CategoryUncheckedUpdateInput = {};
    if (updateData.name !== undefined) data.name = String(updateData.name);
    if (updateData.slug !== undefined) data.slug = String(updateData.slug);
    if (updateData.path !== undefined) {
      data.path = Array.isArray(updateData.path) ? updateData.path.join('/') : String(updateData.path);
    }
    if (updateData.level !== undefined) data.level = Number(updateData.level);
    if (updateData.parent !== undefined || updateData.parentCategory !== undefined) {
      data.parentCategory = updateData.parent ? String(updateData.parent) : updateData.parentCategory ? String(updateData.parentCategory) : null;
    }
    if (updateData.attributes !== undefined) {
      data.attributes = (updateData.attributes ?? []) as unknown as Prisma.InputJsonValue;
    }
    if (updateData.sizeChartColumns !== undefined) {
      data.sizeChartColumns = Array.isArray(updateData.sizeChartColumns) ? (updateData.sizeChartColumns as string[]) : [];
    }
    if (updateData.imageUrl !== undefined) {
      data.imageUrl = updateData.imageUrl ? String(updateData.imageUrl) : null;
    }
    if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return this.formatCategory(category as unknown as Record<string, unknown>);
  }

  async deleteById(id: string): Promise<FormattedCategory | null> {
    const category = await prisma.category.delete({
      where: { id },
    });

    return this.formatCategory(category as unknown as Record<string, unknown>);
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
