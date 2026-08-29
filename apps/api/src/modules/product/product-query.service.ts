import { Prisma } from '@prisma/client';

import { ProductFilterType } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  PRODUCT_FEED_SELECT,
  PRODUCT_LIST_SELECT,
  PRODUCT_PUBLIC_DETAIL_SELECT,
} from './repositories/product-projections';
import { decodeProductCursor, encodeProductCursor } from './utils/product-cursor';
import { calculateProductQCScore } from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import { PRODUCT_STATUS } from './product-status';

import type { Actor } from '@/common/context/actor-context';
import { isPlatformActor } from '@/common/context/actor-context';
import prisma from '@/config/db.prisma';

export interface QueryServiceOptions {
  actor?: Actor | null;
  storeId?: string | null;
  isStoreManagement?: boolean;
  isElevated?: boolean;
}

export class ProductQueryService {
  async getProducts(filters: ProductFilterType, opts: QueryServiceOptions = {}) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, opts);
  }

  async getProductById(id: string, isElevated = false) {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const product = isElevated
      ? await prisma.product.findUnique({
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
        })
      : await prisma.product.findUnique({
          where: { id },
          select: PRODUCT_PUBLIC_DETAIL_SELECT,
        });

    if (!product) return null;
    return formatProductResponse(product, { isElevated });
  }

  async getProductsByVendor(
    vendorId: string,
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ) {
    return this.getAllProducts({ ...filters, vendorId }, page, limit, { isElevated: true });
  }

  async getAllProducts(
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
    opts: QueryServiceOptions = {},
  ): Promise<{
    products: Array<Record<string, unknown> | null>;
    total?: number;
    nextCursor?: string;
    hasMore?: boolean;
  }> {
    const where: Prisma.ProductWhereInput = {};
    const andClauses: Prisma.ProductWhereInput[] = [];

    this.applyScalarFilters(filters, where, andClauses, opts);
    await this.applyCategoryFilters(filters, andClauses);

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    // Compound ordering: Primary sort field + deterministic ID tie-breaker
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { [sortField]: sortOrder },
      { id: sortOrder },
    ];

    const fetchLimit = limit + 1;
    const findOptions: Prisma.ProductFindManyArgs = {
      where,
      orderBy,
      take: fetchLimit,
      select: filters.cursor ? PRODUCT_FEED_SELECT : PRODUCT_LIST_SELECT,
    };

    const isCursorMode = Boolean(filters.cursor);

    if (filters.cursor) {
      const decoded = decodeProductCursor(filters.cursor);
      if (decoded) {
        if (decoded.v !== '') {
          const cursorVal =
            sortField === 'createdAt' && typeof decoded.v === 'string'
              ? new Date(decoded.v)
              : decoded.v;
          const op = sortOrder === 'desc' ? 'lt' : 'gt';

          andClauses.push({
            OR: [
              { [sortField]: { [op]: cursorVal } },
              { [sortField]: cursorVal, id: { [op]: decoded.id } },
            ],
          });
          where.AND = andClauses;
        } else {
          // Backward compatibility for raw UUID cursor
          findOptions.cursor = { id: decoded.id };
          findOptions.skip = 1;
        }
      }
    } else {
      findOptions.skip = (page - 1) * limit;
    }

    const [rawProducts, totalCount] = await Promise.all([
      prisma.product.findMany(findOptions),
      isCursorMode ? Promise.resolve(undefined) : prisma.product.count({ where }),
    ]);

    const hasMore = rawProducts.length > limit;
    const products = hasMore ? rawProducts.slice(0, limit) : rawProducts;
    const lastItem = products[products.length - 1];

    let nextCursor: string | undefined = undefined;
    if (hasMore && lastItem) {
      const sortVal =
        sortField === 'createdAt' && lastItem.createdAt
          ? new Date(lastItem.createdAt as string | Date).toISOString()
          : (lastItem[sortField as keyof typeof lastItem] as string | number);

      nextCursor = encodeProductCursor({
        v: sortVal !== undefined ? sortVal : '',
        id: String(lastItem.id),
      });
    }

    return {
      products: products.map((p) => formatProductResponse(p, { isElevated: opts.isElevated })),
      ...(totalCount !== undefined ? { total: totalCount } : {}),
      nextCursor,
      hasMore,
    };
  }

  private applyScalarFilters(
    filters: ProductFilterType,
    where: Prisma.ProductWhereInput,
    andClauses: Prisma.ProductWhereInput[],
    opts: QueryServiceOptions,
  ): void {
    const isPlatform = isPlatformActor(opts.actor);
    const isElevated =
      opts.isElevated ?? (isPlatform || (Boolean(opts.actor) && Boolean(opts.isStoreManagement)));

    if (opts.storeId && opts.isStoreManagement) {
      where.vendorId = opts.storeId;
    } else if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (isElevated) {
      if (filters.status) {
        where.status = filters.status;
      } else if (where.vendorId) {
        where.status = { not: PRODUCT_STATUS.ARCHIVED };
      } else {
        where.status = PRODUCT_STATUS.PUBLISHED;
      }
    } else {
      // Public / guest storefront: strictly lock down to published products only
      where.status = PRODUCT_STATUS.PUBLISHED;
    }

    // FIX Q1: Push search into AND clauses to avoid overwriting category OR
    if (filters.search) {
      andClauses.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { brand: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ],
      });
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
    andClauses: Prisma.ProductWhereInput[],
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

        // FIX Q1: Add to andClauses instead of overwriting where.OR
        andClauses.push({
          OR: [
            { categoryId: { in: allMatchingCategoryIds } },
            { subcategoryId: { in: allMatchingCategoryIds } },
          ],
        });
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
        andClauses.push({
          OR: [{ categoryId: { in: catIds } }, { subcategoryId: { in: catIds } }],
        });
      } else {
        andClauses.push({
          OR: [{ categoryId: filters.categoryId }, { subcategoryId: filters.categoryId }],
        });
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
      const formatted = formatProductResponse(p, { isElevated: true });
      const qcResult = calculateProductQCScore(formatted);
      return {
        ...formatted,
        qualityScore: qcResult.score,
      };
    });

    return { products, total };
  }
}
