import { Prisma } from '@prisma/client';

import {
  AdminProductDetail,
  AdminProductListItem,
  PaginatedProductResponse,
  PRODUCT_STATUS,
  ProductFilterType,
  StorefrontCard,
  StorefrontDetail,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { CategoryRepository, categoryRepository } from '../category/category.repository';

import { ProductRepository, productRepository } from './repositories/product.repository';
import { PRODUCT_FEED_SELECT, PRODUCT_LIST_SELECT } from './repositories/product-projections';
import { decodeProductCursor, encodeProductCursor } from './utils/product-cursor';
import { calculateProductQCScore } from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import {
  PRODUCT_DETAIL_TTL_SECONDS,
  PRODUCT_LIST_TTL_SECONDS,
  productDetailKey,
  productListKey,
  readCachedJson,
  signListQuery,
  writeCachedJson,
} from './product-cache';
import {
  formatAdminDetail,
  formatAdminProductListItem,
  formatStorefrontCard,
  formatStorefrontDetail,
} from './product-presenters';

import type { Actor } from '@/common/context/actor-context';
import { isPlatformActor } from '@/common/context/actor-context';

export interface QueryServiceOptions {
  actor?: Actor | null;
  storeId?: string | null;
  isStoreManagement?: boolean;
  isElevated?: boolean;
}

export class ProductQueryService {
  private readonly products: ProductRepository;
  private readonly categories: CategoryRepository;

  constructor(products?: ProductRepository, categories?: CategoryRepository) {
    this.products = products ?? productRepository;
    this.categories = categories ?? categoryRepository;
  }

  async getProducts(filters: ProductFilterType, opts: QueryServiceOptions = {}) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, opts);
  }

  async getProductById(
    id: string,
    isElevated = false,
  ): Promise<StorefrontDetail | AdminProductDetail | null> {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const cacheKey = productDetailKey(id, isElevated);
    const cached = await readCachedJson<StorefrontDetail | AdminProductDetail | null>(cacheKey);
    if (cached) return cached;

    const product = await this.products.findDetailedById(id, isElevated);

    if (!product) return null;
    const formatted = formatProductResponse(product, { isElevated });
    if (!formatted) return null;
    const shaped = isElevated ? formatAdminDetail(formatted) : formatStorefrontDetail(formatted);
    await writeCachedJson(cacheKey, shaped, PRODUCT_DETAIL_TTL_SECONDS);
    return shaped;
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
  ): Promise<PaginatedProductResponse<StorefrontCard | AdminProductListItem>> {
    // List cache covers the public storefront scope only: elevated and
    // store-scoped reads vary per actor and must never share a key.
    const isPublicScope =
      !opts.isElevated && !opts.actor && !opts.storeId && !opts.isStoreManagement;
    const cacheKey = isPublicScope
      ? productListKey(signListQuery({ ...(filters as Record<string, unknown>), page, limit }))
      : null;
    if (cacheKey) {
      const cached =
        await readCachedJson<PaginatedProductResponse<StorefrontCard | AdminProductListItem>>(
          cacheKey,
        );
      if (cached) return cached;
    }

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
      this.products.findManyList(findOptions),
      isCursorMode ? Promise.resolve(undefined) : this.products.count(where),
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

    const isPlatform = isPlatformActor(opts.actor);
    const elevatedRead = this.resolveElevatedRead(opts, isPlatform);
    const result: PaginatedProductResponse<StorefrontCard | AdminProductListItem> = {
      products: products
        .map((p) => {
          const formatted = formatProductResponse(p, { isElevated: opts.isElevated });
          if (!formatted) return null;
          return elevatedRead
            ? formatAdminProductListItem(formatted)
            : formatStorefrontCard(formatted);
        })
        .filter((p): p is StorefrontCard | AdminProductListItem => p !== null),
      ...(totalCount !== undefined ? { total: totalCount } : {}),
      nextCursor,
      hasMore,
    };
    if (cacheKey) {
      await writeCachedJson(cacheKey, result, PRODUCT_LIST_TTL_SECONDS);
    }
    return result;
  }

  private resolveElevatedRead(opts: QueryServiceOptions, isPlatform: boolean): boolean {
    return (
      opts.isElevated ?? (isPlatform || (Boolean(opts.actor) && Boolean(opts.isStoreManagement)))
    );
  }

  private applyScalarFilters(
    filters: ProductFilterType,
    where: Prisma.ProductWhereInput,
    andClauses: Prisma.ProductWhereInput[],
    opts: QueryServiceOptions,
  ): void {
    const isPlatform = isPlatformActor(opts.actor);
    const isElevated = this.resolveElevatedRead(opts, isPlatform);

    if (!isPlatform && opts.storeId && opts.isStoreManagement) {
      where.vendorId = opts.storeId;
    } else if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (isElevated) {
      if (filters.status) {
        where.status = filters.status;
      } else if (isPlatform || where.vendorId) {
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

      const categoryDoc = await this.categories.findFilterMatch(categoryParam);

      if (categoryDoc) {
        const descendantIds = await this.categories.findDescendantIds(
          categoryDoc.id,
          categoryDoc.slug,
        );

        const allMatchingCategoryIds = [categoryDoc.id, ...descendantIds];

        // FIX Q1: Add to andClauses instead of overwriting where.OR
        andClauses.push({
          OR: [
            { categoryId: { in: allMatchingCategoryIds } },
            { subcategoryId: { in: allMatchingCategoryIds } },
          ],
        });
      }
    } else if (filters.categoryId) {
      const targetCat = await this.categories.findById(filters.categoryId);
      if (targetCat) {
        const descendantIds = await this.categories.findDescendantIds(targetCat.id, targetCat.slug);
        const catIds = [targetCat.id, ...descendantIds];
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
      this.products.findManyList({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, path: true, level: true } },
          subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        },
      }),
      this.products.count(where),
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
