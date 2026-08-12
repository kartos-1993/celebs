import { Prisma } from '@prisma/client';
import slugify from 'slugify';

import {
  CreateProductType,
  ProductColorVariantType,
  ProductFilterType,
  ProductMeasurementType,
  ProductSizeType,
  ProductStockType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { calculateProductQCScore } from './utils/product-qc';

import prisma from '@/config/db.prisma';
import { sendEmail } from '@/mailers/mailer';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';

export type CreateProductInput = CreateProductType;
export type ProductMeasurementInput = ProductMeasurementType;
export type ProductSizeInput = ProductSizeType;
export type ProductStockInput = ProductStockType;
export type ProductColorVariantInput = ProductColorVariantType;

export class ProductService {
  async getProducts(filters: ProductFilterType) {
    return this.getAllProducts(filters);
  }

  private formatProductResponse(
    product: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!product) return null;
    return {
      ...product,
      id: product.id,
      price: product.price != null ? Number(product.price) : 0,
      discountedPrice:
        product.discountedPrice != null ? Number(product.discountedPrice) : undefined,
      category: product.category
        ? {
            ...(product.category as Record<string, unknown>),
            id: (product.category as { id?: string }).id,
          }
        : product.categoryId,
      subcategory: product.subcategory
        ? {
            ...(product.subcategory as Record<string, unknown>),
            id: (product.subcategory as { id?: string }).id,
          }
        : product.subcategoryId,
    };
  }

  async createProduct(
    input: CreateProductInput,
    userId: string,
    vendorId?: string,
    vendorName?: string,
  ): Promise<Record<string, unknown> | null> {
    const { categoryId, subcategoryId } = await this.resolveCategoryIds(
      input.categoryId,
      input.subcategoryId,
    );

    const slug = await this.generateUniqueSlug(input.name);

    // Atomic Prisma Transaction: Create Product & Inventory in PostgreSQL together
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: input.name.trim(),
          brand: input.brand?.trim() || undefined,
          slug,
          description: input.description?.trim() || '',
          price: input.price,
          discountedPrice: input.discountedPrice,
          categoryId,
          subcategoryId,
          sizes: (input.sizes ?? []) as unknown as Prisma.InputJsonValue,
          colorVariants: (input.colorVariants ?? []) as unknown as Prisma.InputJsonValue,
          skus: (input.skus ?? []) as unknown as Prisma.InputJsonValue,
          variantOptions: (input.variantOptions ?? []) as unknown as Prisma.InputJsonValue,
          mainImages: input.mainImages ?? [],
          dynamicData: (input.dynamicData ?? {}) as unknown as Prisma.InputJsonValue,
          tags: input.tags ?? [],
          featured: input.featured ?? false,
          status: input.status ?? 'draft',
          vendorId: vendorId || undefined,
          vendorName: vendorName || undefined,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          category: { select: { id: true, name: true, slug: true, path: true, level: true } },
          subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        },
      });

      // Sync inventory records in the same transaction
      if (input.colorVariants && Array.isArray(input.colorVariants)) {
        for (const variant of input.colorVariants) {
          const colorVariantName = variant.name;
          if (!variant.stocks || !Array.isArray(variant.stocks)) continue;

          for (const stockItem of variant.stocks) {
            const size = stockItem.size;
            const quantity = stockItem.quantity ?? 0;
            const sku = `SKU-${product.id.substring(0, 8)}-${colorVariantName
              .substring(0, 3)
              .toUpperCase()}-${size.toUpperCase()}`;

            await tx.productInventory.upsert({
              where: {
                productId_colorVariantName_size: {
                  productId: product.id,
                  colorVariantName,
                  size,
                },
              },
              update: {
                quantity,
              },
              create: {
                productId: product.id,
                colorVariantName,
                size,
                sku,
                quantity,
              },
            });
          }
        }
      }

      return product;
    });

    return this.formatProductResponse(createdProduct);
  }

  async getProductById(id: string): Promise<any> {
    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid product ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
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
  ): Promise<{ products: any[]; total: number }> {
    const where: any = {
      vendorId,
      status: filters.status ? filters.status : { not: 'archived' },
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
      ];
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
        include: {
          category: { select: { id: true, name: true, slug: true, path: true, level: true } },
          subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        },
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
      where.status = { not: 'archived' };
    } else {
      where.status = 'published';
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
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
        select: { id: true, slug: true, name: true, level: true, parentCategory: true },
      });

      if (categoryDoc) {
        const descendantCategories = await prisma.category.findMany({
          where: {
            OR: [{ parentCategory: categoryDoc.id }, { path: categoryDoc.slug }],
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
      const childCategories = await prisma.category.findMany({
        where: { parentCategory: filters.categoryId },
        select: { id: true },
      });
      const catIds = [filters.categoryId, ...childCategories.map((c) => c.id)];
      where.OR = [{ categoryId: { in: catIds } }, { subcategoryId: { in: catIds } }];
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const fetchLimit = limit + 1;
    const findOptions: Prisma.ProductFindManyArgs = {
      where,
      orderBy: { [sortField]: sortOrder },
      take: fetchLimit,
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
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
      products: products.map((p) =>
        this.formatProductResponse(p as unknown as Record<string, unknown>),
      ),
      total,
      nextCursor,
      hasMore,
    };
  }

  async getProductReviewQueue(
    page = 1,
    limit = 10,
  ): Promise<{ products: Array<Record<string, unknown> | null>; total: number }> {
    const where = { status: 'pending_review' };
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

    if (product.status !== 'draft' && product.status !== 'rejected') {
      throw new AppError(
        'Product is not in a submittable state',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'pending_review' },
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

    if (product.status !== 'pending_review') {
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

    const formattedProduct = this.formatProductResponse(
      product as unknown as Record<string, unknown>,
    );
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
    const updatedHistory = [...existingHistory, newHistoryItem] as unknown as Prisma.InputJsonValue;

    const updateData: Prisma.ProductUpdateInput = {
      qualityScore: qcResult.score,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewHistory: updatedHistory,
    };

    if (action === 'approve') {
      updateData.status = 'published';
      updateData.reviewNote = null;
      updateData.rejectionReasonCategory = null;
      updateData.rejectionSubcategories = [];
      updateData.rejectionFields = [];
    } else {
      updateData.status = 'rejected';
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

          await sendEmail({
            to: vendorProfile.user.email,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
          });
        }
      } catch (err) {
        console.error('Failed to send rejection email to vendor:', err);
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
  ): Promise<any> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (role === 'VENDOR') {
      if (String(product.vendorId) !== String(vendorId)) {
        throw new AppError(
          'Forbidden: You do not own this product',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN_RESOURCE,
        );
      }
      if (product.status !== 'draft' && product.status !== 'rejected') {
        throw new AppError(
          'Cannot update product unless it is draft or rejected',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          ...(updateData.name ? { name: updateData.name.trim() } : {}),
          ...(updateData.brand !== undefined ? { brand: updateData.brand?.trim() || null } : {}),
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
          ...(updateData.sizes ? { sizes: updateData.sizes as any } : {}),
          ...(updateData.colorVariants ? { colorVariants: updateData.colorVariants as any } : {}),
          ...(updateData.skus ? { skus: updateData.skus as any } : {}),
          ...(updateData.variantOptions
            ? { variantOptions: updateData.variantOptions as any }
            : {}),
          ...(updateData.mainImages ? { mainImages: updateData.mainImages } : {}),
          ...(updateData.dynamicData ? { dynamicData: updateData.dynamicData as any } : {}),
          ...(updateData.tags ? { tags: updateData.tags } : {}),
          ...(updateData.featured !== undefined ? { featured: updateData.featured } : {}),
          ...(updateData.status ? { status: updateData.status } : {}),
          updatedBy: userId,
        },
        include: {
          category: { select: { id: true, name: true, slug: true, path: true, level: true } },
          subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
        },
      });

      if (updateData.colorVariants && Array.isArray(updateData.colorVariants)) {
        for (const variant of updateData.colorVariants) {
          const colorVariantName = variant.name;
          if (!variant.stocks || !Array.isArray(variant.stocks)) continue;

          for (const stockItem of variant.stocks) {
            const size = stockItem.size;
            const quantity = stockItem.quantity ?? 0;
            const sku = `SKU-${p.id.substring(0, 8)}-${colorVariantName
              .substring(0, 3)
              .toUpperCase()}-${size.toUpperCase()}`;

            await tx.productInventory.upsert({
              where: {
                productId_colorVariantName_size: {
                  productId: p.id,
                  colorVariantName,
                  size,
                },
              },
              update: {
                quantity,
              },
              create: {
                productId: p.id,
                colorVariantName,
                size,
                sku,
                quantity,
              },
            });
          }
        }
      }

      return p;
    });

    return this.formatProductResponse(updated);
  }

  async archiveProduct(id: string, userId: string, role: string, vendorId?: string): Promise<any> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (role === 'VENDOR' && String(product.vendorId) !== String(vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: 'archived',
        updatedBy: userId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    return this.formatProductResponse(updated);
  }

  async toggleProductActivation(id: string, vendorId: string): Promise<any> {
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

    if (product.status !== 'published' && product.status !== 'deactivated') {
      throw new AppError(
        'Only published or deactivated products can be toggled',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: product.status === 'published' ? 'deactivated' : 'published',
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

    return {
      categoryId: resolvedCategory.id,
      subcategoryId: resolvedSubcategory ? resolvedSubcategory.id : resolvedCategory.id,
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'product';
    let slug = `${base}-${Date.now().toString().slice(-6)}`;
    let attempt = 0;

    while (await prisma.product.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${base}-${Date.now()}-${attempt}`;
    }

    return slug;
  }
}
