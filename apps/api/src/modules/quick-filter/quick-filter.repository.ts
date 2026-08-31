import prisma, { Prisma } from '@/config/db.prisma';

export class QuickFilterRepository {
  public async findCategoryBySlugOrId(slugOrId: string) {
    const slugLower = slugOrId.toLowerCase();
    return prisma.category.findFirst({
      where: {
        OR: [
          { id: slugOrId },
          { slug: { equals: slugLower, mode: 'insensitive' } },
          { path: { equals: slugLower, mode: 'insensitive' } },
          { name: { equals: slugLower.replace(/-/g, ' '), mode: 'insensitive' } },
        ],
      },
    });
  }

  public async findCategoryById(id: string) {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  public async findActiveChildCategories(parentCategoryId: string) {
    return prisma.category.findMany({
      where: {
        parentCategory: parentCategoryId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  public async findByCategoryId(categoryId: string) {
    return prisma.quickFilter.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async findById(id: string) {
    return prisma.quickFilter.findUnique({
      where: { id },
    });
  }

  public async create(data: {
    title: string;
    slug: string;
    categoryId: string;
    filterConfig: Prisma.InputJsonValue;
  }) {
    return prisma.quickFilter.create({
      data,
    });
  }

  public async update(id: string, filterConfig: Prisma.InputJsonValue) {
    return prisma.quickFilter.update({
      where: { id },
      data: {
        filterConfig,
      },
    });
  }

  public async delete(id: string) {
    return prisma.quickFilter.delete({
      where: { id },
    });
  }
}

export const quickFilterRepository = new QuickFilterRepository();
