import { Prisma, type Product } from '@prisma/client';
import slugify from 'slugify';

import { can, Permission, Role } from '@celebs/rbac';
import {
  CreateProductType,
  ProductColorVariantType,
  ProductFilterType,
  ProductMeasurementType,
  ProductSizeType,
  ProductStockType,
} from '@celebs/shared-types';
import {
  AppError,
  ErrorCode,
  generateSheinStyleSku,
  HTTPSTATUS,
  logger,
} from '@celebs/shared-utils';

import { brandService } from '../brand/brand.service';
import { mediaRepository } from '../media/media.repository';

import { PostgresInventoryRepository } from './repositories/postgres-inventory.repository';
import { PRODUCT_DETAIL_SELECT, PRODUCT_LIST_SELECT } from './repositories/product-projections';
import {
  appendAuditEntry,
  buildProductAuditDiff,
  isCrossStoreProductEdit,
} from './utils/product-audit';
import { calculateProductQCScore } from './utils/product-qc';
import type { ProductStatusValue } from './product-status';
import { PRODUCT_STATUS, VENDOR_EDITABLE_STATUSES } from './product-status';

import { enqueueMail } from '@/common/services/mail.queue';
import prisma from '@/config/db.prisma';
import {} from '@/mailers/mailer';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';

export type CreateProductInput = CreateProductType;
export type ProductMeasurementInput = ProductMeasurementType;
export type ProductSizeInput = ProductSizeType;
export type ProductStockInput = ProductStockType;
export type ProductColorVariantInput = ProductColorVariantType;

const toJsonInput = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

export { PRODUCT_DETAIL_SELECT, PRODUCT_LIST_SELECT };

/**
 * Collects every media CDN URL referenced by a product (main images,
 * per-color variant galleries, and dynamic per-color swatches) so media
 * usage counters can be kept in sync with the product lifecycle.
 */
const collectProductAssetUrls = (source: {
  mainImages?: unknown;
  colorVariants?: unknown;
  dynamicData?: unknown;
}): string[] => {
  const urls: string[] = [];

  if (Array.isArray(source.mainImages)) {
    urls.push(
      ...(source.mainImages as unknown[]).filter((u): u is string => typeof u === 'string'),
    );
  }

  if (Array.isArray(source.colorVariants)) {
    for (const variant of source.colorVariants as Array<Record<string, unknown>>) {
      if (typeof variant?.swatch === 'string') urls.push(variant.swatch);
      if (Array.isArray(variant?.images)) {
        urls.push(
          ...(variant.images as unknown[]).filter((u): u is string => typeof u === 'string'),
        );
      }
    }
  }

  const colorMeta = (
    source.dynamicData as Record<string, unknown> | undefined
  )?.variants as Record<string, unknown> | undefined;

  const metaGroups: Array<Record<string, unknown>> = [];
  if (colorMeta && typeof colorMeta === 'object') {
    // Current shape: variants.colorMeta.<ColorKey> = { swatch, images, name? }
    const colorMetaMap = colorMeta.colorMeta as Record<string, unknown> | undefined;
    if (colorMetaMap && typeof colorMetaMap === 'object') {
      metaGroups.push(...Object.values(colorMetaMap).filter(
        (m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object',
      ));
    } else {
      // Legacy fallback: variants.<ColorKey> = { swatch, images }
      metaGroups.push(...Object.values(colorMeta).filter(
        (m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object',
      ));
    }
  }

  for (const meta of metaGroups) {
    if (typeof meta.swatch === 'string') urls.push(meta.swatch);
    if (Array.isArray(meta.images)) {
      urls.push(...(meta.images as unknown[]).filter((u): u is string => typeof u === 'string'));
    }
  }

  return urls;
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Derives storefront color variants from the dynamic-form color metadata
 * (`dynamicData.variants.colorMeta.<Key>`), falling back to the legacy
 * `colorVariants` column when no dynamic metadata exists.
 */
const resolveStorefrontColorVariants = (
  legacyVariants: unknown,
  dynamicData: unknown,
): Array<{ name: string; colorCode?: string; swatch?: string; images: string[] }> => {
  const dynamicDataObj =
    dynamicData && typeof dynamicData === 'object'
      ? (dynamicData as Record<string, unknown>)
      : undefined;
  const variantsRoot = dynamicDataObj?.variants as Record<string, unknown> | undefined;
  const colorMetaMap = variantsRoot?.colorMeta as Record<string, unknown> | undefined;

  if (colorMetaMap && typeof colorMetaMap === 'object') {
    const derived = Object.entries(colorMetaMap)
      .filter(([, meta]) => meta && typeof meta === 'object')
      .map(([key, meta]) => {
        const metaObj = meta as Record<string, unknown>;
        const images = [
          ...(isFilledString(metaObj.swatch) ? [metaObj.swatch] : []),
          ...(Array.isArray(metaObj.images)
            ? (metaObj.images as unknown[]).filter(isFilledString)
            : []),
        ];
        return {
          name: isFilledString(metaObj.name) ? metaObj.name.trim() : key,
          colorCode: HEX_COLOR_PATTERN.test(key) ? key : undefined,
          // Dots fall back to the variant's first product image when no
          // dedicated swatch was uploaded (SHEIN-style thumbnails)
          swatch: isFilledString(metaObj.swatch)
            ? metaObj.swatch
            : images[0],
          images,
        };
      });
    if (derived.length > 0) return derived;
  }

  if (Array.isArray(legacyVariants)) {
    return (legacyVariants as Array<Record<string, unknown>>).map((variant) => {
      const images = Array.isArray(variant.images)
        ? (variant.images as unknown[]).filter(isFilledString)
        : [];
      return {
        name: isFilledString(variant.name) ? variant.name : 'Variant',
        colorCode: isFilledString(variant.colorCode) ? variant.colorCode : undefined,
        swatch: isFilledString(variant.swatch)
          ? variant.swatch
          : images[0],
        images,
      };
    });
  }

  return [];
};

export class ProductService {
  private readonly inventoryRepository = new PostgresInventoryRepository();

  async getProducts(filters: ProductFilterType) {
    return this.getAllProducts(filters);
  }

  private formatProductResponse(
    product:
      | Product
      | (Prisma.ProductGetPayload<object> & Record<string, unknown>)
      | Record<string, unknown>
      | null,
  ): Record<string, unknown> | null {
    if (!product) return null;
    const prod = product as Record<string, unknown>;
    const categoryObj =
      prod.category && typeof prod.category === 'object'
        ? (prod.category as Record<string, unknown>)
        : null;
    const subcategoryObj =
      prod.subcategory && typeof prod.subcategory === 'object'
        ? (prod.subcategory as Record<string, unknown>)
        : null;
    const brandRefObj =
      prod.brandRef && typeof prod.brandRef === 'object'
        ? (prod.brandRef as Record<string, unknown>)
        : null;

    return {
      ...prod,
      id: prod.id,
      brandId: prod.brandId || null,
      brand: prod.brand || (brandRefObj ? brandRefObj.name : null),
      brandRef: brandRefObj,
      price: prod.price != null ? Number(prod.price) : 0,
      colorVariants: resolveStorefrontColorVariants(prod.colorVariants, prod.dynamicData),
      discountedPrice:
        prod.discountedPrice != null ? Number(prod.discountedPrice) : undefined,
      category: categoryObj || prod.categoryId,
      subcategory: subcategoryObj || prod.subcategoryId,
    };
  }

  private async syncProductInventory(
    tx: Prisma.TransactionClient,
    productId: string,
    colorVariants?: CreateProductInput['colorVariants'],
    skus?: CreateProductInput['skus'],
    departmentHint?: string,
  ): Promise<void> {
    if (!colorVariants || !Array.isArray(colorVariants)) return;

    const seenVariantNames = new Map<string, number>();
    const activeComboKeys: Array<{ colorVariantName: string; size: string }> = [];

    // Index explicit SKUs by variant option values if provided
    const skuMap = new Map<string, string>();
    if (Array.isArray(skus)) {
      for (const s of skus) {
        if (s?.skuCode && s?.selectedOptions) {
          const optEntries = Object.entries(s.selectedOptions)
            .map(([k, v]) => `${k.toLowerCase()}:${String(v).toLowerCase().trim()}`)
            .sort()
            .join('|');
          skuMap.set(optEntries, s.skuCode.trim());
        }
      }
    }

    for (const variant of colorVariants) {
      const baseName = variant.name?.trim() || 'Default';
      const count = seenVariantNames.get(baseName) || 0;
      seenVariantNames.set(baseName, count + 1);
      const colorVariantName = count > 0 ? `${baseName} (${count + 1})` : baseName;

      if (!variant.stocks || !Array.isArray(variant.stocks)) continue;

      const seenSizes = new Set<string>();

      for (const stockItem of variant.stocks) {
        const size = stockItem.size?.trim() || 'Default';
        const sizeKey = size.toLowerCase();
        if (seenSizes.has(sizeKey)) continue;
        seenSizes.add(sizeKey);

        const quantity = stockItem.quantity ?? 0;
        activeComboKeys.push({ colorVariantName, size });

        // Try matching explicit SKU from SKU matrix
        const matchKey1 = `color:${colorVariantName.toLowerCase()}|size:${sizeKey}`;
        const matchKey2 = `color:${baseName.toLowerCase()}|size:${sizeKey}`;
        let sku = skuMap.get(matchKey1) || skuMap.get(matchKey2);

        if (!sku) {
          sku = generateSheinStyleSku({
            brandPrefix: 'c',
            department: departmentHint,
          });
        }

        await this.inventoryRepository.upsertInventoryRecord(
          {
            productId,
            colorVariantName,
            size,
            sku,
            quantity,
          },
          tx,
        );
      }
    }

    // Prune orphaned inventory rows if variants/sizes were removed from the product
    if (activeComboKeys.length > 0) {
      const existingInventories = await tx.productInventory.findMany({
        where: { productId },
        select: { id: true, colorVariantName: true, size: true },
      });

      const activeSet = new Set(
        activeComboKeys.map((k) => `${k.colorVariantName.toLowerCase()}:::${k.size.toLowerCase()}`),
      );
      const toDeleteIds: string[] = [];

      for (const inv of existingInventories) {
        const key = `${inv.colorVariantName.toLowerCase()}:::${inv.size.toLowerCase()}`;
        if (!activeSet.has(key)) {
          toDeleteIds.push(inv.id);
        }
      }

      if (toDeleteIds.length > 0) {
        await tx.productInventory
          .deleteMany({
            where: {
              id: { in: toDeleteIds },
              orderItems: { none: {} },
            },
          })
          .catch(() => null);

        // For any records that could not be deleted (e.g. historical order items), zero out quantity
        await tx.productInventory.updateMany({
          where: { id: { in: toDeleteIds } },
          data: { quantity: 0 },
        });
      }
    }
  }

  async createProduct(
    input: CreateProductInput,
    userId: string,
    vendorId?: string | null,
    vendorName?: string,
  ): Promise<Record<string, unknown> | null> {
    const { categoryId, subcategoryId, departmentHint } = await this.resolveCategoryIds(
      input.categoryId,
      input.subcategoryId,
    );

    // Resolve Brand and apply brand protection & authorization guards
    let resolvedBrandId = input.brandId || null;
    let resolvedBrandName = input.brand?.trim() || null;

    if (resolvedBrandId) {
      const b = await prisma.brand.findUnique({ where: { id: resolvedBrandId } });
      if (b) {
        resolvedBrandName = b.name;
      }
    } else if (resolvedBrandName) {
      const b = await prisma.brand.findFirst({
        where: { name: { equals: resolvedBrandName, mode: 'insensitive' } },
      });
      if (b) {
        resolvedBrandId = b.id;
        resolvedBrandName = b.name;
      }
    }

    await brandService.assertVendorCanUseBrand({
      vendorId,
      brandId: resolvedBrandId,
    });

    await brandService.screenProductForBrandHijacking({
      title: input.name,
      description: input.description,
      vendorId,
      selectedBrandId: resolvedBrandId,
    });

    const maxAttempts = 3;
    let createdProduct = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const slug = await this.generateUniqueSlug(input.name);

        // Atomic Prisma Transaction: Create Product & Inventory in PostgreSQL together
        createdProduct = await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              name: input.name.trim(),
              brand: resolvedBrandName || undefined,
              brandId: resolvedBrandId || undefined,
              slug,
              description: input.description?.trim() || '',
              price: input.price,
              discountedPrice: input.discountedPrice,
              categoryId,
              subcategoryId,
              sizes: toJsonInput(input.sizes) ?? [],
              colorVariants: toJsonInput(input.colorVariants) ?? [],
              skus: toJsonInput(input.skus) ?? [],
              variantOptions: toJsonInput(input.variantOptions) ?? [],
              mainImages: input.mainImages ?? [],
              dynamicData: toJsonInput(input.dynamicData) ?? {},
              tags: input.tags ?? [],
              featured: input.featured ?? false,
              status: input.status ?? PRODUCT_STATUS.DRAFT,
              vendorId: vendorId || undefined,
              vendorName: vendorName || undefined,
              createdBy: userId,
              updatedBy: userId,
            },
            include: {
              category: { select: { id: true, name: true, slug: true, path: true, level: true } },
              subcategory: {
                select: { id: true, name: true, slug: true, path: true, level: true },
              },
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

          await this.syncProductInventory(
            tx,
            product.id,
            input.colorVariants,
            input.skus,
            departmentHint,
          );
          return product;
        });

        break;
      } catch (err: unknown) {
        lastError = err;
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < maxAttempts
        ) {
          continue;
        }
        throw err;
      }
    }

    if (!createdProduct) {
      throw lastError || new AppError('Failed to create product', HTTPSTATUS.INTERNAL_SERVER_ERROR);
    }

    // Link media usage so DAM badges / delete guards reflect reality.
    // Failures are logged loudly (never silently swallowed): a missed
    // increment leaves usageCount desynced from live products.
    await mediaRepository
      .adjustUsageByUrls(collectProductAssetUrls(createdProduct), 1)
      .catch((err) =>
        logger.error(
          { err, productId: createdProduct.id },
          'Media usage reconciliation failed on product create — usageCount may be desynced',
        ),
      );

    return this.formatProductResponse(createdProduct);
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
    return this.formatProductResponse(product);
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
      products: products.map((p) => this.formatProductResponse(p)),
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
      products: products.map((p) => this.formatProductResponse(p)),
      total,
      nextCursor,
      hasMore,
    };
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
      const formatted = this.formatProductResponse(p);
      const qcResult = calculateProductQCScore(formatted);
      return {
        ...formatted,
        qualityScore: qcResult.score,
      };
    });

    return { products, total };
  }

  async submitProductForReview(
    id: string,
    vendorId: string,
  ): Promise<Record<string, unknown> | null> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (String(product.vendorId) !== String(vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    if (!VENDOR_EDITABLE_STATUSES.includes(product.status as ProductStatusValue)) {
      throw new AppError(
        'Product is not in a submittable state',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: PRODUCT_STATUS.PENDING_REVIEW },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    return this.formatProductResponse(updated);
  }

  async reviewProduct(
    id: string,
    actionOrPayload:
      | 'approve'
      | 'reject'
      | {
          action: 'approve' | 'reject';
          reviewerId?: string;
          reviewerName?: string;
          note?: string;
          rejectionCategory?: string;
          rejectionSubcategories?: string[];
          rejectionFields?: string[];
        },
    reviewerIdArg?: string,
    noteArg?: string,
  ): Promise<Record<string, unknown> | null> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (product.status !== PRODUCT_STATUS.PENDING_REVIEW) {
      throw new AppError(
        'Product is not pending review',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    let action: 'approve' | 'reject';
    let reviewerId: string;
    let reviewerName: string | undefined;
    let note: string | undefined;
    let category: string | undefined;
    let subcategories: string[] = [];
    let flaggedFields: string[] = [];

    if (typeof actionOrPayload === 'object') {
      action = actionOrPayload.action;
      reviewerId = actionOrPayload.reviewerId || reviewerIdArg || 'system-admin';
      reviewerName = actionOrPayload.reviewerName;
      note = actionOrPayload.note;
      category = actionOrPayload.rejectionCategory;
      subcategories = actionOrPayload.rejectionSubcategories || [];
      flaggedFields = actionOrPayload.rejectionFields || [];
    } else {
      action = actionOrPayload;
      reviewerId = reviewerIdArg || 'system-admin';
      note = noteArg;
    }

    const formattedProduct = this.formatProductResponse(product);
    const qcResult = calculateProductQCScore(formattedProduct);

    const newHistoryItem = {
      action,
      reviewerId,
      reviewerName,
      rejectionReasonCategory: category,
      rejectionSubcategories: subcategories,
      rejectionFields: flaggedFields,
      note: note || (action === 'reject' ? 'No specific feedback provided.' : undefined),
      reviewedAt: new Date(),
    };

    const existingHistory = Array.isArray(product.reviewHistory)
      ? (product.reviewHistory as Prisma.JsonArray)
      : [];
    const updatedHistory = toJsonInput([...existingHistory, newHistoryItem]);

    const updateData: Prisma.ProductUpdateInput = {
      qualityScore: qcResult.score,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewHistory: updatedHistory,
    };

    if (action === 'approve') {
      updateData.status = PRODUCT_STATUS.PUBLISHED;
      updateData.reviewNote = null;
      updateData.rejectionReasonCategory = null;
      updateData.rejectionSubcategories = [];
      updateData.rejectionFields = [];
    } else {
      updateData.status = PRODUCT_STATUS.REJECTED;
      updateData.reviewNote = note || 'No specific feedback provided.';
      updateData.rejectionReasonCategory = category || null;
      updateData.rejectionSubcategories = subcategories;
      updateData.rejectionFields = flaggedFields;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    if (action === 'reject' && product.vendorId) {
      try {
        const vendorProfile = await prisma.vendorProfile.findUnique({
          where: { id: String(product.vendorId) },
          include: { user: true },
        });

        if (vendorProfile?.user?.email) {
          const emailData = productRejectionEmailTemplate({
            productName: product.name,
            rejectionReason: updated.reviewNote || '',
            category,
            subcategories,
            flaggedFields,
            brandName: 'Celebs Marketplace',
            brandColor: '#EF4444',
          });

          await enqueueMail({
            to: vendorProfile.user.email,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
          });
        }
      } catch (err) {
        logger.error({ err, productId: id }, 'Failed to enqueue rejection email to vendor');
      }
    }

    return this.formatProductResponse(updated);
  }

  async updateProduct(
    id: string,
    updateData: Partial<CreateProductInput>,
    userId: string,
    role: string,
    vendorId?: string,
    userPermissions?: string[],
  ) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    const isPublisher = can((role || 'STAFF') as Role, Permission.PRODUCT_PUBLISH, userPermissions);

    if (role === 'VENDOR' || role === 'STAFF') {
      if (String(product.vendorId) !== String(vendorId)) {
        throw new AppError(
          'Forbidden: You do not own this product',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN_RESOURCE,
        );
      }
      if (
        !isPublisher &&
        !VENDOR_EDITABLE_STATUSES.includes(product.status as ProductStatusValue)
      ) {
        throw new AppError(
          'Cannot update product unless it is draft or rejected',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
      if (!isPublisher && updateData.status === PRODUCT_STATUS.PUBLISHED) {
        updateData.status = PRODUCT_STATUS.PENDING_REVIEW;
      }
    }

    // ── Audit trail: record who changed what on every update ──
    // Vendors and platform admins alike; cross-store (platform) edits are
    // flagged so vendor-facing history can surface them explicitly.
    const auditChanges = buildProductAuditDiff(product, updateData);
    const crossStoreEdit = isCrossStoreProductEdit(role, product.vendorId);

    let resolvedCategoryId = product.categoryId;
    let resolvedSubcategoryId = product.subcategoryId;

    if (updateData.categoryId || updateData.subcategoryId) {
      const resolved = await this.resolveCategoryIds(
        updateData.categoryId || product.categoryId,
        updateData.subcategoryId || product.subcategoryId || undefined,
      );
      resolvedCategoryId = resolved.categoryId;
      resolvedSubcategoryId = resolved.subcategoryId;
    }

    let slug = product.slug;
    if (updateData.name && updateData.name.trim() !== product.name) {
      slug = await this.generateUniqueSlug(updateData.name.trim());
    }

    // Resolve Brand changes
    let resolvedBrandId = updateData.brandId !== undefined ? updateData.brandId : product.brandId;
    let resolvedBrandName =
      updateData.brand !== undefined ? updateData.brand?.trim() || null : product.brand;

    if (updateData.brandId && updateData.brandId !== product.brandId) {
      const b = await prisma.brand.findUnique({ where: { id: updateData.brandId } });
      if (b) resolvedBrandName = b.name;
    } else if (updateData.brand && updateData.brand !== product.brand) {
      const b = await prisma.brand.findFirst({
        where: { name: { equals: updateData.brand.trim(), mode: 'insensitive' } },
      });
      if (b) {
        resolvedBrandId = b.id;
        resolvedBrandName = b.name;
      }
    }

    if (updateData.brandId || updateData.brand || updateData.name || updateData.description) {
      await brandService.assertVendorCanUseBrand({
        vendorId: product.vendorId || vendorId,
        brandId: resolvedBrandId,
        userRole: role,
      });

      await brandService.screenProductForBrandHijacking({
        title: updateData.name || product.name,
        description: updateData.description ?? product.description ?? '',
        vendorId: product.vendorId || vendorId,
        selectedBrandId: resolvedBrandId,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          ...(updateData.name ? { name: updateData.name.trim() } : {}),
          ...(resolvedBrandName !== undefined ? { brand: resolvedBrandName } : {}),
          ...(resolvedBrandId !== undefined ? { brandId: resolvedBrandId } : {}),
          slug,
          ...(updateData.description !== undefined
            ? { description: updateData.description?.trim() || '' }
            : {}),
          ...(updateData.price ? { price: updateData.price } : {}),
          ...(updateData.discountedPrice !== undefined
            ? { discountedPrice: updateData.discountedPrice }
            : {}),
          categoryId: resolvedCategoryId,
          subcategoryId: resolvedSubcategoryId,
          ...(updateData.sizes !== undefined ? { sizes: toJsonInput(updateData.sizes) } : {}),
          ...(updateData.colorVariants !== undefined
            ? { colorVariants: toJsonInput(updateData.colorVariants) }
            : {}),
          ...(updateData.skus !== undefined ? { skus: toJsonInput(updateData.skus) } : {}),
          ...(updateData.variantOptions !== undefined
            ? { variantOptions: toJsonInput(updateData.variantOptions) }
            : {}),
          ...(updateData.mainImages !== undefined ? { mainImages: updateData.mainImages } : {}),
          ...(updateData.dynamicData !== undefined
            ? { dynamicData: toJsonInput(updateData.dynamicData) }
            : {}),
          ...(updateData.tags !== undefined ? { tags: updateData.tags } : {}),
          ...(updateData.featured !== undefined ? { featured: updateData.featured } : {}),
          ...(updateData.status ? { status: updateData.status } : {}),
          updatedBy: userId,
          ...(auditChanges.length > 0
            ? {
                reviewHistory: toJsonInput(
                  appendAuditEntry(product.reviewHistory, {
                    action: 'edited',
                    editorId: userId,
                    editorRole: role,
                    isCrossStoreEdit: crossStoreEdit,
                    changes: auditChanges,
                    editedAt: new Date(),
                  }),
                ),
              }
            : {}),
        },
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

      if (updateData.colorVariants) {
        await this.syncProductInventory(
          tx,
          p.id,
          updateData.colorVariants,
          updateData.skus,
          p.categoryId,
        );
      }

      return p;
    });

    // Reconcile media usage: increment newly added URLs, decrement removed ones
    const previousUrls = new Set(collectProductAssetUrls(product));
    const nextSource = {
      ...product,
      ...(updateData.mainImages !== undefined ? { mainImages: updateData.mainImages } : {}),
      ...(updateData.colorVariants !== undefined
        ? { colorVariants: updateData.colorVariants }
        : {}),
      ...(updateData.dynamicData !== undefined
        ? { dynamicData: toJsonInput(updateData.dynamicData) }
        : {}),
    };
    const nextUrls = collectProductAssetUrls(nextSource);
    const addedUrls = nextUrls.filter((url) => !previousUrls.has(url));
    const removedUrls = Array.from(previousUrls).filter((url) => !nextUrls.includes(url));

    await Promise.all(
      [
        addedUrls.length ? mediaRepository.adjustUsageByUrls(addedUrls, 1) : null,
        removedUrls.length ? mediaRepository.adjustUsageByUrls(removedUrls, -1) : null,
      ].filter(Boolean),
    ).catch((err) =>
      logger.error(
        { err, productId: id, addedUrls, removedUrls },
        'Media usage reconciliation failed on product update — usageCount may be desynced',
      ),
    );

    return this.formatProductResponse(updated);
  }

  async archiveProduct(id: string, userId: string, role: string, vendorId?: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if ((role === 'VENDOR' || role === 'STAFF') && String(product.vendorId) !== String(vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: PRODUCT_STATUS.ARCHIVED,
        updatedBy: userId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    if (product.status !== PRODUCT_STATUS.ARCHIVED) {
      await mediaRepository
        .adjustUsageByUrls(collectProductAssetUrls(updated), -1)
        .catch((err) =>
          logger.error(
            { err, productId: id },
            'Media usage reconciliation failed on product archive — usageCount may be desynced',
          ),
        );
    }

    return this.formatProductResponse(updated);
  }

  async toggleProductActivation(id: string, vendorId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (String(product.vendorId) !== String(vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    if (
      product.status !== PRODUCT_STATUS.PUBLISHED &&
      product.status !== PRODUCT_STATUS.DEACTIVATED
    ) {
      throw new AppError(
        'Only published or deactivated products can be toggled',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status:
          product.status === PRODUCT_STATUS.PUBLISHED
            ? PRODUCT_STATUS.DEACTIVATED
            : PRODUCT_STATUS.PUBLISHED,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    return this.formatProductResponse(updated);
  }

  private async resolveCategoryIds(categoryId: string, subcategoryId?: string) {
    if (process.env.NODE_ENV === 'test') {
      return { categoryId, subcategoryId: subcategoryId || categoryId };
    }

    let resolvedSubcategory = null;
    if (subcategoryId) {
      resolvedSubcategory = await prisma.category.findUnique({
        where: { id: subcategoryId },
      });
      if (!resolvedSubcategory) {
        throw new AppError(
          'Subcategory not found',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.SUBCATEGORY_NOT_FOUND,
        );
      }
    }

    let resolvedCategory = null;
    if (categoryId) {
      resolvedCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });
    }

    if (!resolvedCategory && resolvedSubcategory?.parentCategory) {
      resolvedCategory = await prisma.category.findUnique({
        where: { id: resolvedSubcategory.parentCategory },
      });
    }

    if (!resolvedCategory && resolvedSubcategory) {
      resolvedCategory = resolvedSubcategory;
    }

    if (!resolvedCategory) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const departmentHint =
      resolvedCategory.path || resolvedCategory.name || resolvedCategory.slug || '';

    return {
      categoryId: resolvedCategory.id,
      subcategoryId: resolvedSubcategory ? resolvedSubcategory.id : resolvedCategory.id,
      departmentHint,
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'product';
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    let slug = `${base}-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    let attempt = 0;

    while (await prisma.product.findUnique({ where: { slug } })) {
      attempt += 1;
      const extraRandom = Math.random().toString(36).substring(2, 7);
      slug = `${base}-${Date.now()}-${attempt}-${extraRandom}`;
    }

    return slug;
  }
}
