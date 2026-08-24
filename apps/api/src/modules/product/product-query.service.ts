import { Prisma } from '@prisma/client';

import { ProductFilterType } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { PRODUCT_LIST_SELECT } from './repositories/product-projections';
import { calculateProductQCScore } from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import { PRODUCT_STATUS } from './product-status';

import prisma from '@/config/db.prisma';

export class ProductQueryService {
  async getProducts(filters: ProductFilterType) {
    return this.getAllProducts(filters);
  }

  async getProductById(id: string) {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        brandRef: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            tier: true,
            isGated: true,
            countryOfOrigin: true,
          },
        },
      },
    });

    if (!product) return null;
    return formatProductResponse(product);
  }

  async getProductsByVendor(
    vendorId: string,
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ) {
    const where: Record<string, unknown> = {
      vendorId,
      status: filters.status ? filters.status : { not: PRODUCT_STATUS.ARCHIVED },
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.brandId) {
      where.brandId = filters.brandId;
    }
    if (typeof filters.featured === 'boolean') {
      where.featured = filters.featured;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice;
      where.price = priceFilter;
    }
    if (filters.subcategoryId) {
      where.subcategoryId = filters.subcategoryId;
    } else if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
        select: PRODUCT_LIST_SELECT,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => formatProductResponse(p)),
      total,
    };
  }

  async getAllProducts(
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ): Promise<{
    products: Array<Record<string, unknown> | null>;
    total: number;
    nextCursor?: string;
    hasMore?: boolean;
  }> {
    const where: Prisma.ProductWhereInput = {};

    this.applyScalarFilters(filters, where);
    await this.applyCategoryFilters(filters, where);

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const fetchLimit = limit + 1;
    const findOptions: Prisma.ProductFindManyArgs = {
      where,
      orderBy: { [sortField]: sortOrder },
      take: fetchLimit,
      select: PRODUCT_LIST_SELECT,
    };

    if (filters.cursor) {
      findOptions.cursor = { id: filters.cursor };
      findOptions.skip = 1;
    } else {
      findOptions.skip = (page - 1) * limit;
    }

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany(findOptions),
      filters.cursor ? Promise.resolve(0) : prisma.product.count({ where }),
    ]);

    const hasMore = rawProducts.length > limit;
    const products = hasMore ? rawProducts.slice(0, limit) : rawProducts;
    const lastItem = products[products.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.id : undefined;

    return {
      products: products.map((p) => formatProductResponse(p)),
      total,
      nextCursor,
      hasMore,
    };
  }

  private applyScalarFilters(filters: ProductFilterType, where: Prisma.ProductWhereInput): void {
    if (filters.status) {
      where.status = filters.status;
    } else if (filters.vendorId) {
      where.status = { not: PRODUCT_STATUS.ARCHIVED };
    } else {
      where.status = PRODUCT_STATUS.PUBLISHED;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    } else if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (typeof filters.featured === 'boolean') {
      where.featured = filters.featured;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.subcategoryId) {
      where.subcategoryId = filters.subcategoryId;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
  }

  private async applyCategoryFilters(
    filters: ProductFilterType,
    where: Prisma.ProductWhereInput,
  ): Promise<void> {
    if (filters.category) {
      const categoryParam = filters.category.trim();

      const categoryDoc = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: { equals: categoryParam, mode: 'insensitive' } },
            { id: categoryParam },
            { path: { equals: categoryParam, mode: 'insensitive' } },
            { name: { equals: categoryParam.replace(/-/g, ' '), mode: 'insensitive' } },
          ],
        },
        select: { id: true, slug: true, name: true, path: true, level: true, parentCategory: true },
      });

      if (categoryDoc) {
        const descendantCategories = await prisma.category.findMany({
          where: {
            OR: [
              { parentCategory: categoryDoc.id },
              { path: { equals: categoryDoc.slug } },
              { path: { startsWith: `${categoryDoc.slug}/` } },
            ],
          },
          select: { id: true },
        });

        const allMatchingCategoryIds = [categoryDoc.id, ...descendantCategories.map((c) => c.id)];

        where.OR = [
          { categoryId: { in: allMatchingCategoryIds } },
          { subcategoryId: { in: allMatchingCategoryIds } },
        ];
      }
    } else if (filters.categoryId) {
      const targetCat = await prisma.category.findUnique({
        where: { id: filters.categoryId },
        select: { id: true, slug: true },
      });
      if (targetCat) {
        const descendantCategories = await prisma.category.findMany({
          where: {
            OR: [
              { parentCategory: targetCat.id },
              { path: { equals: targetCat.slug } },
              { path: { startsWith: `${targetCat.slug}/` } },
            ],
          },
          select: { id: true },
        });
        const catIds = [targetCat.id, ...descendantCategories.map((c) => c.id)];
        where.OR = [{ categoryId: { in: catIds } }, { subcategoryId: { in: catIds } }];
      } else {
        where.OR = [{ categoryId: filters.categoryId }, { subcategoryId: filters.categoryId }];
      }
    }
  }

  async getProductReviewQueue(
    page = 1,
    limit = 10,
  ): Promise<{ products: Array<Record<string, unknown> | null>; total: number }> {
    const where = { status: PRODUCT_STATUS.PENDING_REVIEW };
    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, path: true, level: true } },
          subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const products = rawProducts.map((p) => {
      const formatted = formatProductResponse(p);
      const qcResult = calculateProductQCScore(formatted);
      return {
        ...formatted,
        qualityScore: qcResult.score,
      };
    });

    return { products, total };
  }
}
