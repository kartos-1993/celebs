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

import { CampaignRepository, campaignRepository } from '../campaign/campaign.repository';
import { CategoryRepository, categoryRepository } from '../category/category.repository';

import { ProductRepository, productRepository } from './repositories/product.repository';
import { PRODUCT_FEED_SELECT, PRODUCT_LIST_SELECT } from './repositories/product-projections';
import { decodeProductCursor, encodeProductCursor } from './utils/product-cursor';
import { calculateProductQCScore } from './utils/product-qc';
import {
  PRODUCT_DETAIL_TTL_SECONDS,
  PRODUCT_LIST_TTL_SECONDS,
  productDetailKey,
  productListKey,
  readCachedJson,
  signListQuery,
  writeCachedJson,
} from './product-cache';
import { formatProductResponse } from './product-format';
import {
  formatAdminDetail,
  formatAdminProductListItem,
  formatStorefrontCard,
  formatStorefrontDetail,
} from './product-response-shapes';

import type { Actor } from '@/common/context/actor-context';
import { isPlatformActor } from '@/common/context/actor-context';
import { noStoreError } from '@/common/guards/store.guards';

export interface QueryServiceOptions {
  actor?: Actor | null;
  storeId?: string | null;
  isStoreManagement?: boolean;
  isElevated?: boolean;
}

export class ProductQueryService {
  private readonly products: ProductRepository;
  private readonly categories: CategoryRepository;
  private readonly campaigns: CampaignRepository;

  constructor(
    products?: ProductRepository,
    categories?: CategoryRepository,
    campaigns?: CampaignRepository,
  ) {
    this.products = products ?? productRepository;
    this.categories = categories ?? categoryRepository;
    this.campaigns = campaigns ?? campaignRepository;
  }

  async getProducts(filters: ProductFilterType, opts: QueryServiceOptions = {}) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, opts);
  }

  async getPublicProducts(filters: ProductFilterType) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, {
      isElevated: false,
    });
  }

  async getPublicProductById(id: string): Promise<StorefrontDetail | null> {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const cacheKey = productDetailKey(id, false);
    const cached = await readCachedJson<StorefrontDetail | null>(cacheKey);
    if (cached) return cached;

    const product = await this.products.findPublicDetailById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    const formatted = formatProductResponse(product, { isElevated: false });
    if (!formatted) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    const shaped = formatStorefrontDetail(formatted);
    await writeCachedJson(cacheKey, shaped, PRODUCT_DETAIL_TTL_SECONDS);
    return shaped;
  }

  async getStoreProducts(filters: ProductFilterType, storeId: string, actor: Actor) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, {
      storeId,
      actor,
      isStoreManagement: true,
      isElevated: true,
    });
  }

  async getStoreProductById(id: string, storeId: string): Promise<AdminProductDetail> {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const product = await this.products.findStoreDetailById(id, storeId);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    const formatted = formatProductResponse(product, { isElevated: true });
    if (!formatted) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    return formatAdminDetail(formatted);
  }

  async getAdminProducts(filters: ProductFilterType, actor: Actor) {
    return this.getAllProducts(filters, filters.page ?? 1, filters.limit ?? 10, {
      actor,
      isElevated: true,
    });
  }

  async getAdminProductById(id: string): Promise<AdminProductDetail> {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const product = await this.products.findAdminDetailById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    const formatted = formatProductResponse(product, { isElevated: true });
    if (!formatted) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    return formatAdminDetail(formatted);
  }

  async getProductById(
    id: string,
    isElevated = false,
  ): Promise<StorefrontDetail | AdminProductDetail | null> {
    return isElevated ? this.getAdminProductById(id) : this.getPublicProductById(id);
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
    await this.applyCampaignFilter(filters, andClauses);

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
      select: opts.isElevated ? PRODUCT_LIST_SELECT : PRODUCT_FEED_SELECT,
    };

    const isCursorMode = Boolean(filters.cursor);

    if (filters.cursor) {
      const decoded = decodeProductCursor(filters.cursor);
      if (!decoded) {
        throw new AppError(
          'Invalid pagination cursor',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
      if (decoded.v !== '') {
        const cursorVal =
          sortField === 'createdAt' && typeof decoded.v === 'string'
            ? new Date(decoded.v)
            : sortField === 'price'
              ? new Prisma.Decimal(decoded.v)
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
    } else {
      findOptions.skip = (page - 1) * limit;
    }

    // Anonymous storefront reads paginate on cursors and never display a
    // total (mobile ignores it); counting them is a redundant scan. Elevated
    // and actor-scoped surfaces keep the total.
    const shouldCount = !isCursorMode && !isPublicScope;
    const [rawProducts, totalCount] = await Promise.all([
      this.products.findManyList(findOptions),
      shouldCount ? this.products.count(where) : Promise.resolve(undefined),
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

    if (isPlatform) {
      // Platform actors may scope any vendor's catalogue.
      if (filters.vendorId) {
        where.vendorId = filters.vendorId;
      }
    } else if (opts.actor && opts.isStoreManagement) {
      // Seller management surfaces are ALWAYS pinned to the caller's own
      // store: a client-supplied vendorId must never widen the tenant scope.
      if (!opts.storeId) {
        throw noStoreError(opts.actor.role);
      }
      where.vendorId = opts.storeId;
    } else if (filters.vendorId) {
      // Anonymous / non-management browse may filter a public vendor page.
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
        ],
      });
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    } else if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (typeof filters.featured === 'boolean') {
      where.featured = filters.featured;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.subcategoryId) {
      where.subcategoryId = filters.subcategoryId;
    }

    // Discount-Aware Effective Price Range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const min = filters.minPrice ?? 0;
      const max = filters.maxPrice ?? Number.MAX_SAFE_INTEGER;
      andClauses.push({
        OR: [
          // Active discount in range
          {
            discountedPrice: { gte: min, lte: max, not: null },
          },
          // No discount or zero discount, regular price in range
          {
            AND: [
              { OR: [{ discountedPrice: null }, { discountedPrice: 0 }] },
              { price: { gte: min, lte: max } },
            ],
          },
        ],
      });
    }

    // Relational Size Filtering
    if (filters.sizes) {
      const sizeList = Array.isArray(filters.sizes) ? filters.sizes : [filters.sizes];
      if (sizeList.length > 0) {
        andClauses.push({
          inventories: {
            some: {
              size: { in: sizeList, mode: 'insensitive' },
              ...(isElevated ? {} : { quantity: { gt: 0 } }),
            },
          },
        });
      }
    }

    // Relational Color Filtering
    if (filters.colors) {
      const colorList = Array.isArray(filters.colors) ? filters.colors : [filters.colors];
      if (colorList.length > 0) {
        andClauses.push({
          inventories: {
            some: {
              colorVariantName: { in: colorList, mode: 'insensitive' },
              ...(isElevated ? {} : { quantity: { gt: 0 } }),
            },
          },
        });
      }
    }

    // Dynamic Attributes & Fits Filtering
    if (filters.fits) {
      const fitList = Array.isArray(filters.fits) ? filters.fits : [filters.fits];
      if (fitList.length > 0) {
        andClauses.push({
          OR: fitList.flatMap((fit) => [
            { dynamicData: { path: ['fit'], equals: fit } },
            { dynamicData: { path: ['values', 'fit'], equals: fit } },
            { dynamicData: { path: ['fit'], array_contains: [fit] } },
          ]),
        });
      }
    }

    if (filters.attributes && typeof filters.attributes === 'object') {
      for (const [key, val] of Object.entries(filters.attributes)) {
        if (typeof val === 'string' && val.trim()) {
          andClauses.push({
            OR: [
              { dynamicData: { path: [key], equals: val } },
              { dynamicData: { path: ['values', key], equals: val } },
            ],
          });
        }
      }
    }

    // Stock State Filter (Management Table)
    if (filters.stockState && filters.stockState !== 'all') {
      if (filters.stockState === 'out') {
        andClauses.push({
          OR: [{ inventories: { none: {} } }, { inventories: { every: { quantity: { lte: 0 } } } }],
        });
      } else if (filters.stockState === 'in') {
        andClauses.push({
          inventories: { some: { quantity: { gte: 10 } } },
        });
      } else if (filters.stockState === 'low') {
        andClauses.push({
          inventories: { some: { quantity: { gt: 0, lt: 10 } } },
        });
      }
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

    // Storefront chips send a subcategory slug; resolve its whole subtree and
    // AND it with the browse-root clause above (chip inside its own branch).
    if (filters.subcategory) {
      const subcategoryDoc = await this.categories.findFilterMatch(filters.subcategory.trim());

      if (subcategoryDoc) {
        const descendantIds = await this.categories.findDescendantIds(
          subcategoryDoc.id,
          subcategoryDoc.slug,
        );
        const allMatchingSubcategoryIds = [subcategoryDoc.id, ...descendantIds];

        andClauses.push({
          OR: [
            { categoryId: { in: allMatchingSubcategoryIds } },
            { subcategoryId: { in: allMatchingSubcategoryIds } },
          ],
        });
      }
    }
  }

  private async applyCampaignFilter(
    filters: ProductFilterType,
    andClauses: Prisma.ProductWhereInput[],
  ): Promise<void> {
    if (!filters.campaign) return;

    const campaign = await this.campaigns.findBySlug(filters.campaign.trim());
    const enrolledProductIds = campaign?.products.map((entry) => entry.productId) ?? [];

    // Unknown campaign slug → empty id set: a stale campaign link must never
    // silently degrade into an unfiltered storefront list.
    andClauses.push({ id: { in: enrolledProductIds } });
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
