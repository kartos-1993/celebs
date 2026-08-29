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
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { brandService } from '../brand/brand.service';
import { mediaRepository } from '../media/media.repository';

import { PostgresInventoryRepository } from './repositories/postgres-inventory.repository';
import {
  PRODUCT_DETAIL_INCLUDE,
  PRODUCT_DETAIL_SELECT,
  PRODUCT_LIST_SELECT,
} from './repositories/product-projections';
import { buildProductAuditDiff, isCrossStoreProductEdit } from './utils/product-audit';
import { formatProductResponse } from './product.presenter';
import { collectProductAssetUrls, toJsonInput } from './product-assets';
import { ProductLifecycleService } from './product-lifecycle.service';
import { buildProductCreateData, buildProductUpdateData } from './product-payloads';
import { ProductQueryService, type QueryServiceOptions } from './product-query.service';
import type { ProductStatusValue } from './product-status';
import { PRODUCT_STATUS, VENDOR_EDITABLE_STATUSES } from './product-status';

import prisma from '@/config/db.prisma';

export type CreateProductInput = CreateProductType;
export type ProductMeasurementInput = ProductMeasurementType;
export type ProductSizeInput = ProductSizeType;
export type ProductStockInput = ProductStockType;
export type ProductColorVariantInput = ProductColorVariantType;

export { PRODUCT_DETAIL_SELECT, PRODUCT_LIST_SELECT };

export class ProductService {
  private readonly inventoryRepository = new PostgresInventoryRepository();
  private readonly queryService = new ProductQueryService();
  private readonly lifecycleService = new ProductLifecycleService();

  // --- QUERY DELEGATES ---

  async getProducts(filters: ProductFilterType, opts: QueryServiceOptions = {}) {
    return this.queryService.getProducts(filters, opts);
  }

  async getProductById(id: string, isElevated = false) {
    return this.queryService.getProductById(id, isElevated);
  }

  async getProductsByVendor(
    vendorId: string,
    filters: ProductFilterType = {},
    page = 1,
    limit = 10,
  ) {
    return this.queryService.getProductsByVendor(vendorId, filters, page, limit);
  }

  async getAllProducts(filters: ProductFilterType = {}, page = 1, limit = 10) {
    return this.queryService.getAllProducts(filters, page, limit);
  }

  async getProductReviewQueue(page = 1, limit = 10) {
    return this.queryService.getProductReviewQueue(page, limit);
  }

  // --- LIFECYCLE DELEGATES ---

  async submitProductForReview(id: string, vendorId: string) {
    return this.lifecycleService.submitProductForReview(id, vendorId);
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
  ) {
    return this.lifecycleService.reviewProduct(id, actionOrPayload, reviewerIdArg, noteArg);
  }

  async archiveProduct(id: string, userId: string, role: string, vendorId?: string) {
    return this.lifecycleService.archiveProduct(id, userId, role, vendorId);
  }

  async toggleProductActivation(id: string, vendorId?: string, isPlatform = false) {
    return this.lifecycleService.toggleProductActivation(id, vendorId, isPlatform);
  }

  // --- CREATE & UPDATE CRUD ---

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
    const { resolvedBrandId, resolvedBrandName } = await this.resolveBrandForCreate(input);

    await this.assertBrandGuards({
      vendorId,
      brandId: resolvedBrandId,
      title: input.name,
      description: input.description,
    });

    const maxAttempts = 3;
    let createdProduct: Product | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const slug = await this.generateUniqueSlug(input.name);

        // Atomic Prisma Transaction: Create Product & Inventory in PostgreSQL together
        createdProduct = await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: buildProductCreateData(input, {
              slug,
              categoryId,
              subcategoryId,
              brandId: resolvedBrandId,
              brandName: resolvedBrandName,
              userId,
              vendorId,
              vendorName,
            }),
            include: PRODUCT_DETAIL_INCLUDE,
          });

          await this.inventoryRepository.syncProductInventory(
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

    await this.linkMediaUsageOnCreate(createdProduct);

    return formatProductResponse(createdProduct);
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

    await this.assertUpdateAuthorization(product, updateData, role, vendorId, userPermissions);

    // Audit trail
    const auditChanges = buildProductAuditDiff(product, updateData);
    const crossStoreEdit = isCrossStoreProductEdit(role, product.vendorId);

    const { resolvedCategoryId, resolvedSubcategoryId } = await this.resolveUpdateCategoryIds(
      product,
      updateData,
    );

    let slug = product.slug;
    if (updateData.name && updateData.name.trim() !== product.name) {
      slug = await this.generateUniqueSlug(updateData.name.trim());
    }

    const { resolvedBrandId, resolvedBrandName } = await this.resolveBrandForUpdate(
      updateData,
      product,
    );

    if (updateData.brandId || updateData.brand || updateData.name || updateData.description) {
      await this.assertBrandGuards({
        vendorId: product.vendorId || vendorId,
        brandId: resolvedBrandId,
        userRole: role,
        title: updateData.name || product.name,
        description: updateData.description ?? product.description ?? '',
      });
    }

    const updated = await this.applyUpdateTransaction(id, product, updateData, {
      slug,
      resolvedCategoryId,
      resolvedSubcategoryId,
      resolvedBrandId,
      resolvedBrandName,
      userId,
      role,
      crossStoreEdit,
      auditChanges,
    });

    await this.reconcileMediaUsageDiff(product, updateData, id);

    return formatProductResponse(updated);
  }

  // --- PRIVATE CRUD HELPERS ---

  /**
   * Mirrors the pre-extraction guard chain exactly, including the mutation of
   * `updateData.status` (non-publishers requesting PUBLISHED are downgraded to
   * PENDING_REVIEW).
   */
  private async assertUpdateAuthorization(
    product: Product,
    updateData: Partial<CreateProductInput>,
    role: string,
    vendorId?: string,
    userPermissions?: string[],
  ): Promise<void> {
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
  }

  private applyUpdateTransaction(
    id: string,
    product: Product,
    updateData: Partial<CreateProductInput>,
    opts: {
      slug: string;
      resolvedCategoryId: string;
      resolvedSubcategoryId: string | null;
      resolvedBrandId: string | null;
      resolvedBrandName: string | null;
      userId: string;
      role: string;
      crossStoreEdit: boolean;
      auditChanges: ReturnType<typeof buildProductAuditDiff>;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: buildProductUpdateData(product, updateData, opts),
        include: PRODUCT_DETAIL_INCLUDE,
      });

      if (updateData.colorVariants) {
        await this.inventoryRepository.syncProductInventory(
          tx,
          p.id,
          updateData.colorVariants,
          updateData.skus,
          p.categoryId,
        );
      }

      return p;
    });
  }

  private async assertBrandGuards(params: {
    vendorId?: string | null;
    brandId: string | null;
    userRole?: string;
    title: string;
    description?: string;
  }): Promise<void> {
    await brandService.assertVendorCanUseBrand({
      vendorId: params.vendorId,
      brandId: params.brandId,
      ...(params.userRole ? { userRole: params.userRole } : {}),
    });

    await brandService.screenProductForBrandHijacking({
      title: params.title,
      description: params.description,
      vendorId: params.vendorId,
      selectedBrandId: params.brandId,
    });
  }

  private async resolveUpdateCategoryIds(
    product: Product,
    updateData: Partial<CreateProductInput>,
  ) {
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

    return { resolvedCategoryId, resolvedSubcategoryId };
  }

  private async resolveBrandForCreate(input: CreateProductInput) {
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

    return { resolvedBrandId, resolvedBrandName };
  }

  private async resolveBrandForUpdate(updateData: Partial<CreateProductInput>, product: Product) {
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

    return { resolvedBrandId, resolvedBrandName };
  }

  // Link media usage so DAM badges / delete guards reflect reality.
  private async linkMediaUsageOnCreate(createdProduct: Product): Promise<void> {
    await mediaRepository
      .adjustUsageByUrls(collectProductAssetUrls(createdProduct), 1)
      .catch((err) =>
        logger.error(
          { err, productId: createdProduct.id },
          'Media usage reconciliation failed on product create — usageCount may be desynced',
        ),
      );
  }

  // Reconcile media usage: increment newly added URLs, decrement removed ones
  private async reconcileMediaUsageDiff(
    previous: Product,
    updateData: Partial<CreateProductInput>,
    productId: string,
  ): Promise<void> {
    const previousUrls = new Set(collectProductAssetUrls(previous));
    const nextSource = {
      ...previous,
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
        { err, productId, addedUrls, removedUrls },
        'Media usage reconciliation failed on product update — usageCount may be desynced',
      ),
    );
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
