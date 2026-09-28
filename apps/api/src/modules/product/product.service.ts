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
import { PRODUCT_STATUS, type ProductStatus, VENDOR_EDITABLE_STATUSES } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { brandRepository } from '../brand/brand.repository';
import { brandService } from '../brand/brand.service';
import { categoryRepository } from '../category/category.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { mediaRepository } from '../media/media.repository';

import { ProductRepository, productRepository } from './repositories/product.repository';
import { buildProductAuditDiff, isCrossStoreProductEdit } from './utils/product-audit';
import {
  COVER_PHOTO_BLOCKER,
  getColorImageBlockers,
  NO_STOCK_BLOCKER,
  type PublishFloorInput,
  sumVariantStock,
} from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import { collectProductAssetUrls, toJsonInput } from './product-assets';
import {
  isVisibilityFlip,
  purgeProduct,
  purgeProductHome,
  purgeProductLists,
} from './product-cache';
import { ProductLifecycleService } from './product-lifecycle.service';
import { buildProductCreateData, buildProductUpdateData } from './product-payloads';
import { ProductQueryService, type QueryServiceOptions } from './product-query.service';

import {
  is1PVendor,
  PLATFORM_VENDOR_ID,
  PLATFORM_VENDOR_NAME,
} from '@/common/constants/platform-vendor';

export type CreateProductInput = CreateProductType;
export type ProductMeasurementInput = ProductMeasurementType;
export type ProductSizeInput = ProductSizeType;
export type ProductStockInput = ProductStockType;
export type ProductColorVariantInput = ProductColorVariantType;

type ErrorDetails = Array<{ field?: string; message: string }>;

/** Attaches additive structured details without mutating the AppError contract. */
function withDetails(error: AppError, details: ErrorDetails): AppError {
  return Object.assign(error, { details });
}

function freshStyleSalt(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X');
}

function p2002TargetText(err: Prisma.PrismaClientKnownRequestError): string {
  const target = (err.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.join(' ') : String(target ?? '');
}

export class ProductService {
  private readonly inventoryRepository = new InventoryRepository();
  private readonly products: ProductRepository;
  private readonly queryService = new ProductQueryService();
  private readonly lifecycleService = new ProductLifecycleService();

  constructor(products?: ProductRepository) {
    this.products = products ?? productRepository;
  }

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

  async submitProductForReview(id: string, vendorId?: string, isPlatform = false) {
    return this.lifecycleService.submitProductForReview(id, vendorId, isPlatform);
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
    userRole?: string,
    userPermissions?: string[],
  ): Promise<Record<string, unknown> | null> {
    // the fix (entry-point parity): the non-publisher downgrade lives here now,
    // but it must only apply to a caller that ACTUALLY supplied a role. Before
    // the move this check lived in the controller, so a role-less service caller
    // (seed scripts, internal tooling) always published as asked; defaulting a
    // missing role to the zero-permission STAFF role silently downgraded those.
    // The HTTP boundary always passes actor.role, so an untrusted request can
    // never reach the role-less path.
    const hasExplicitRole = typeof userRole === 'string' && userRole.length > 0;
    const isPublisher =
      !hasExplicitRole || can(userRole as Role, Permission.PRODUCT_PUBLISH, userPermissions);
    const effectiveInput =
      !isPublisher && input.status === PRODUCT_STATUS.PUBLISHED
        ? { ...input, status: PRODUCT_STATUS.PENDING_REVIEW }
        : input;

    // the fix (controller thinning): platform fallback lived in the controller —
    // sellers are scoped by the caller, platform actors default to 1P here.
    const resolvedVendorId = vendorId || PLATFORM_VENDOR_ID;
    const resolvedVendorName =
      vendorName || (is1PVendor(resolvedVendorId) ? PLATFORM_VENDOR_NAME : undefined);

    const { categoryId, subcategoryId, departmentHint } = await this.resolveCategoryIds(
      input.categoryId,
      input.subcategoryId,
    );
    // the fix (department hint): fall back to the product name so generated
    // SKUs still mint a meaningful styleRef prefix when no category path
    // resolved (e.g. the NODE_ENV=test short-circuit returns ids only).
    const effectiveHint = departmentHint ?? input.name;

    // Resolve Brand and apply brand protection & authorization guards
    const { resolvedBrandId, resolvedBrandName } = await this.resolveBrandForCreate(input);

    await this.assertBrandGuards({
      vendorId: resolvedVendorId,
      brandId: resolvedBrandId,
      userRole,
      title: input.name,
      description: input.description,
    });

    // Direct publish (publish-capable actors) must clear the same floor as
    // submit/review — otherwise zero-stock products bypass the strict rule.
    if (effectiveInput.status === PRODUCT_STATUS.PUBLISHED) {
      this.assertPublishFloor(effectiveInput);
    }

    const maxAttempts = 3;
    let createdProduct: Product | null = null;
    let lastError: unknown = null;
    // the fix (slug retry): an explicit salt is threaded into generated SKUs so
    // an SKU-conflict retry mints provably fresh styleRefs.
    let styleSalt: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const slug = await this.generateUniqueSlug(input.name);

        // Atomic Prisma Transaction: Create Product & Inventory in PostgreSQL together
        createdProduct = await this.products.transaction(
          async (tx) => {
            const product = await this.products.create(
              buildProductCreateData(effectiveInput, {
                slug,
                categoryId,
                subcategoryId,
                brandId: resolvedBrandId,
                brandName: resolvedBrandName,
                userId,
                vendorId: resolvedVendorId,
                vendorName: resolvedVendorName,
              }),
              tx,
            );

            await this.inventoryRepository.syncProductInventory(
              tx,
              product.id,
              effectiveInput.colorVariants,
              effectiveInput.skus,
              effectiveHint,
              { styleSalt },
            );

            const inventories = await this.inventoryRepository.findInventoriesByProductId(
              product.id,
              tx,
            );

            return { ...product, inventories };
          },
          { maxWait: 5000, timeout: 10000 },
        );

        break;
      } catch (err: unknown) {
        lastError = err;
        // the fix (slug retry): only slug-target P2002s retry with a fresh
        // slug. SKU-target P2002s regenerate the styleRef salt (bounded) so
        // retries never replay identical generated SKUs; anything else (or an
        // exhausted budget) surfaces instead of burning attempts.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const targetText = p2002TargetText(err);
          const isSlugConflict = /slug/i.test(targetText);
          const isSkuConflict = /sku/i.test(targetText);
          if (attempt < maxAttempts && (isSlugConflict || isSkuConflict)) {
            if (isSkuConflict && !isSlugConflict) {
              styleSalt = freshStyleSalt();
            }
            continue;
          }
          if (isSkuConflict && !isSlugConflict) {
            const message = 'A record with this sku already exists. Please use a unique value.';
            throw withDetails(
              new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
              [{ field: 'skus', message }],
            );
          }
        }
        throw err;
      }
    }

    if (!createdProduct) {
      throw lastError || new AppError('Failed to create product', HTTPSTATUS.INTERNAL_SERVER_ERROR);
    }

    await this.linkMediaUsageOnCreate(createdProduct);

    // New arrival on rails; detail key cannot exist yet. Lists only need
    // a sweep when the product is born visible.
    purgeProductHome();
    if (effectiveInput.status === PRODUCT_STATUS.PUBLISHED) {
      purgeProductLists();
    }

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
    const product = await this.products.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    await this.assertUpdateAuthorization(product, updateData, role, vendorId, userPermissions);

    // the fix (discount safety): the Zod refine only sees the incoming payload,
    // so it cannot catch a price lowered under the STORED discount (or a
    // discount raised above the STORED price). Compare merged stored+incoming
    // values here, in the service, where the row is in hand.
    this.assertDiscountSafety(product, updateData);

    // the fix (publish floor on update): a draft/pending product can otherwise
    // be flipped straight to PUBLISHED with zero stock and no variant photos.
    // Runs after assertUpdateAuthorization so it sees the post-downgrade status.
    if (this.transitionsToPublished(product, updateData)) {
      this.assertPublishFloor({
        colorVariants: updateData.colorVariants ?? product.colorVariants,
        dynamicData: updateData.dynamicData ?? product.dynamicData,
        mainImages: updateData.mainImages ?? product.mainImages,
        skus: updateData.skus ?? product.skus,
      });
    }

    // Audit trail
    const auditChanges = buildProductAuditDiff(product, updateData);
    const crossStoreEdit = isCrossStoreProductEdit(role, product.vendorId);

    const { resolvedCategoryId, resolvedSubcategoryId, departmentHint } =
      await this.resolveUpdateCategoryIds(product, updateData);

    // the fix (department hint): mirror the create path exactly — a real
    // department name/path when the category resolved, else the product name —
    // so update and create mint the same SKU styleRef prefix. Uses the INCOMING
    // name so a rename re-derives the prefix the same way create does.
    const effectiveHint = departmentHint ?? updateData.name ?? product.name;

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
        userRole: role,
        brandId: resolvedBrandId,
        title: updateData.name || product.name,
        description: updateData.description ?? product.description ?? '',
      });
    }

    const updated = await this.applyUpdateTransaction(id, product, updateData, {
      slug,
      departmentHint: effectiveHint,
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

    purgeProduct(id);
    if (isVisibilityFlip(product.status, updated.status)) {
      purgeProductLists();
    }

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
      if (!vendorId || product.vendorId !== vendorId) {
        throw new AppError(
          'Forbidden: You do not own this product',
          HTTPSTATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN_RESOURCE,
        );
      }
      if (!isPublisher && !VENDOR_EDITABLE_STATUSES.includes(product.status as ProductStatus)) {
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

    if (product.status === PRODUCT_STATUS.PUBLISHED) {
      if (updateData.categoryId && updateData.categoryId !== product.categoryId) {
        throw new AppError(
          'Category cannot be changed once a product is published',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
      if (
        updateData.subcategoryId &&
        product.subcategoryId &&
        updateData.subcategoryId !== product.subcategoryId
      ) {
        throw new AppError(
          'Category cannot be changed once a product is published',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
    }
  }

  private applyUpdateTransaction(
    id: string,
    product: Product,
    updateData: Partial<CreateProductInput>,
    opts: {
      slug: string;
      departmentHint: string;
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
    return this.products.transaction(
      async (tx) => {
        const effectiveColorVariants =
          updateData.colorVariants ??
          (Array.isArray(product.colorVariants)
            ? (product.colorVariants as Array<{
                name?: string;
                stocks?: Array<{ size?: string; quantity?: number }>;
              }>)
            : undefined);

        if (effectiveColorVariants) {
          // the fix (department hint): a real department NAME/path (or the
          // product name) is threaded in, not opts.resolvedCategoryId — a
          // category ROW ID. buildProductStyleRef slices its first 4
          // characters, so an id produced category-id-shaped styleRefs
          // ("CLB-A1B2…") that never matched the create path.
          await this.inventoryRepository.syncProductInventory(
            tx,
            id,
            effectiveColorVariants,
            updateData.skus ??
              (Array.isArray(product.skus)
                ? (product.skus as Array<{
                    skuCode?: string;
                    selectedOptions?: Record<string, unknown>;
                  }>)
                : undefined),
            opts.departmentHint,
            { isPublished: product.status === PRODUCT_STATUS.PUBLISHED },
          );
        }

        const p = await this.products.update(
          id,
          buildProductUpdateData(product, updateData, opts),
          tx,
        );

        return p;
      },
      { maxWait: 5000, timeout: 10000 },
    );
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
    const requestedCategoryId = updateData.categoryId || product.categoryId;
    const requestedSubcategoryId = updateData.subcategoryId || product.subcategoryId || undefined;

    // Always run the shared resolver: it is the single source of the department
    // NAME/path, which the inventory layer needs to mint SKU styleRefs. The
    // category-id resolution result is only CONSUMED when the request actually
    // changes the taxonomy, preserving the previous no-extra-lookup behaviour.
    const resolved = await this.resolveCategoryIds(requestedCategoryId, requestedSubcategoryId);
    const isTaxonomyChange = Boolean(updateData.categoryId || updateData.subcategoryId);

    return {
      resolvedCategoryId: isTaxonomyChange ? resolved.categoryId : product.categoryId,
      resolvedSubcategoryId: isTaxonomyChange ? resolved.subcategoryId : product.subcategoryId,
      departmentHint: resolved.departmentHint,
    };
  }

  /**
   * Merged stored+incoming discount safety. `updateProductSchema.refine` only
   * fires when BOTH price and discountedPrice are in the same payload, so the
   * stored row is the missing half of the comparison. A no-op update (neither
   * field present) is never rejected on pre-existing data.
   */
  private assertDiscountSafety(product: Product, updateData: Partial<CreateProductInput>): void {
    const incomingPrice = updateData.price;
    const incomingDiscountedPrice = updateData.discountedPrice;
    // A no-op update is never rejected on pre-existing (legacy) bad data.
    if (incomingPrice === undefined && incomingDiscountedPrice === undefined) return;

    const nextPrice = incomingPrice ?? product.price;
    const nextDiscountedPrice =
      incomingDiscountedPrice === undefined ? product.discountedPrice : incomingDiscountedPrice;

    if (nextDiscountedPrice === null || nextDiscountedPrice === undefined) return;

    if (nextDiscountedPrice >= nextPrice) {
      const message = 'Discounted price must be less than the regular price';
      throw withDetails(new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR), [
        { field: 'discountedPrice', message },
      ]);
    }
  }

  /** True only when this write moves a non-published product INTO published. */
  private transitionsToPublished(
    product: Product,
    updateData: Partial<CreateProductInput>,
  ): boolean {
    if (updateData.status !== PRODUCT_STATUS.PUBLISHED) return false;
    return product.status !== PRODUCT_STATUS.PUBLISHED;
  }

  /**
   * Hard publish floor, shared by create and the draft→published update
   * transition: a product with a colour axis needs a gallery photo per real
   * colour, a product WITHOUT one needs a cover photo instead, and somewhere
   * must hold a positive quantity — read from the variant matrix or, for a
   * colourless product, from its SKUs.
   */
  private assertPublishFloor(input: PublishFloorInput): void {
    const blockers = [...getColorImageBlockers(input.colorVariants, input)];
    const hasStock = sumVariantStock(input.colorVariants, input.skus) > 0;
    if (!hasStock) {
      blockers.push(NO_STOCK_BLOCKER);
    }

    if (blockers.length > 0) {
      const message = blockers.join(' ');
      throw withDetails(
        new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST),
        blockers.map((blocker) => ({
          field: blocker === COVER_PHOTO_BLOCKER ? 'mainImages' : 'colorVariants',
          message: blocker,
        })),
      );
    }
  }

  private async resolveBrandForCreate(input: CreateProductInput) {
    let resolvedBrandId = input.brandId || null;
    let resolvedBrandName = input.brand?.trim() || null;

    if (resolvedBrandId) {
      const b = await brandRepository.findById(resolvedBrandId);
      if (b) {
        resolvedBrandName = b.name;
      }
    } else if (resolvedBrandName) {
      const b = await brandRepository.findByName(resolvedBrandName);
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
      const b = await brandRepository.findById(updateData.brandId);
      if (b) resolvedBrandName = b.name;
    } else if (updateData.brand && updateData.brand !== product.brand) {
      const b = await brandRepository.findByName(updateData.brand.trim());
      if (b) {
        resolvedBrandId = b.id;
        resolvedBrandName = b.name;
      }
    }

    return { resolvedBrandId, resolvedBrandName };
  }

  // Link media usage so DAM badges / delete guards reflect reality.
  private async linkMediaUsageOnCreate(createdProduct: Product): Promise<void> {
    const urls = collectProductAssetUrls(createdProduct);
    await Promise.all([
      mediaRepository.adjustUsageByUrls(urls, 1),
      mediaRepository.claimProductOwner(urls, createdProduct.id, createdProduct.vendorId),
    ]).catch((err) =>
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
        addedUrls.length
          ? mediaRepository.claimProductOwner(addedUrls, productId, previous.vendorId)
          : null,
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
      resolvedSubcategory = await categoryRepository.findById(subcategoryId);
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
      resolvedCategory = await categoryRepository.findById(categoryId);
    }

    if (!resolvedCategory && resolvedSubcategory?.parentCategory) {
      resolvedCategory = await categoryRepository.findById(
        String(resolvedSubcategory.parentCategory),
      );
    }

    if (!resolvedCategory && resolvedSubcategory) {
      resolvedCategory = resolvedSubcategory;
    }

    if (!resolvedCategory) {
      throw new AppError('Category not found', HTTPSTATUS.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND);
    }

    const categoryPath = resolvedCategory.path;
    const departmentHint = Array.isArray(categoryPath)
      ? categoryPath.join('/')
      : categoryPath || resolvedCategory.name || resolvedCategory.slug || '';

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

    while (await this.products.existsBySlug(slug)) {
      attempt += 1;
      const extraRandom = Math.random().toString(36).substring(2, 7);
      slug = `${base}-${Date.now()}-${attempt}-${extraRandom}`;
    }

    return slug;
  }
}
