import { Prisma } from '@prisma/client';

import { PRODUCT_STATUS, type ProductStatus, VENDOR_EDITABLE_STATUSES } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { InventoryRepository, inventoryRepository } from '../inventory/inventory.repository';
import { mediaRepository } from '../media/media.repository';
import { STOREFRONT_HOME_CACHE_KEY } from '../storefront/storefront.constants';
import { VendorRepository, vendorRepository } from '../vendor/vendor.repository';

import { ProductRepository, productRepository } from './repositories/product.repository';
import {
  calculateProductQCScore,
  getColorImageBlockers,
  sumVariantStock,
} from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import { collectProductAssetUrls, toJsonInput } from './product-assets';
import { isVisibilityFlip, purgeProduct, purgeProductLists } from './product-cache';

import { enqueueMail } from '@/common/services/mail.queue';
import { invalidateCacheKey } from '@/common/services/redis-cache.service';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';

export class ProductLifecycleService {
  private readonly products: ProductRepository;
  private readonly vendors: VendorRepository;
  private readonly inventoryRepository: InventoryRepository;

  constructor(
    products?: ProductRepository,
    vendors?: VendorRepository,
    inventories?: InventoryRepository,
  ) {
    this.products = products ?? productRepository;
    this.vendors = vendors ?? vendorRepository;
    this.inventoryRepository = inventories ?? inventoryRepository;
  }

  async submitProductForReview(
    id: string,
    vendorId?: string,
    isPlatform = false,
  ): Promise<Record<string, unknown> | null> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (!isPlatform && (!vendorId || product.vendorId !== vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    if (!VENDOR_EDITABLE_STATUSES.includes(product.status as ProductStatus)) {
      throw new AppError(
        'Product is not in a submittable state',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    await this.assertPublishable(product.id, product.colorVariants);

    const updated = await this.products.update(id, { status: PRODUCT_STATUS.PENDING_REVIEW });

    // Pending review is invisible: detail truth moved, lists ride TTL.
    purgeProduct(id);

    return formatProductResponse(updated);
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
    const product = await this.products.findById(id);
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

    const args = this.parseReviewArgs(actionOrPayload, reviewerIdArg, noteArg);
    if (args.action === 'approve') {
      await this.assertPublishable(product.id, product.colorVariants);
    }
    const qcResult = calculateProductQCScore(formatProductResponse(product));

    const updatedHistory = toJsonInput([
      ...(Array.isArray(product.reviewHistory) ? (product.reviewHistory as Prisma.JsonArray) : []),
      this.buildHistoryItem(args),
    ]);

    const updateData = this.buildReviewUpdateData(args, updatedHistory, qcResult.score);

    const updated = await this.products.update(id, updateData);

    if (args.action === 'reject' && product.vendorId) {
      await this.sendRejectionEmail(id, product, updated, args);
    }

    purgeProduct(id);
    if (args.action === 'approve') {
      purgeProductLists();
    }

    return formatProductResponse(updated, { isElevated: true });
  }

  /**
   * Strict publish floor: per-size 0 is fine, but all-zero stock or a color
   * without photos stays out of review and out of the storefront. Live
   * ProductInventory rows are authoritative when present, JSON otherwise.
   */
  private async assertPublishable(productId: string, colorVariants: unknown): Promise<void> {
    const blockers = [...getColorImageBlockers(colorVariants)];

    const liveRows = await this.inventoryRepository.findQuantitiesByProductId(productId);
    const total =
      liveRows.length > 0
        ? liveRows.reduce((sum, row) => sum + row.quantity, 0)
        : sumVariantStock(colorVariants);
    if (total <= 0) {
      blockers.push('Add at least 1 unit in one size to publish.');
    }

    if (blockers.length > 0) {
      throw new AppError(blockers.join(' '), HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }
  }

  private parseReviewArgs(
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
    if (typeof actionOrPayload === 'object') {
      return {
        action: actionOrPayload.action,
        reviewerId: actionOrPayload.reviewerId || reviewerIdArg || 'system-admin',
        reviewerName: actionOrPayload.reviewerName,
        note: actionOrPayload.note,
        category: actionOrPayload.rejectionCategory,
        subcategories: actionOrPayload.rejectionSubcategories || [],
        flaggedFields: actionOrPayload.rejectionFields || [],
      };
    }
    return {
      action: actionOrPayload,
      reviewerId: reviewerIdArg || 'system-admin',
      reviewerName: undefined,
      note: noteArg,
      category: undefined,
      subcategories: [] as string[],
      flaggedFields: [] as string[],
    };
  }

  private buildHistoryItem(args: ReturnType<ProductLifecycleService['parseReviewArgs']>) {
    return {
      action: args.action,
      reviewerId: args.reviewerId,
      reviewerName: args.reviewerName,
      rejectionReasonCategory: args.category,
      rejectionSubcategories: args.subcategories,
      rejectionFields: args.flaggedFields,
      note: args.note || (args.action === 'reject' ? 'No specific feedback provided.' : undefined),
      reviewedAt: new Date(),
    };
  }

  private buildReviewUpdateData(
    args: ReturnType<ProductLifecycleService['parseReviewArgs']>,
    updatedHistory: Prisma.InputJsonValue | undefined,
    qualityScore: number,
  ): Prisma.ProductUncheckedUpdateInput {
    const updateData: Prisma.ProductUpdateInput = {
      qualityScore,
      reviewedBy: args.reviewerId,
      reviewedAt: new Date(),
      reviewHistory: updatedHistory,
    };

    if (args.action === 'approve') {
      updateData.status = PRODUCT_STATUS.PUBLISHED;
      updateData.reviewNote = null;
      updateData.rejectionReasonCategory = null;
      updateData.rejectionSubcategories = [];
      updateData.rejectionFields = [];
    } else {
      updateData.status = PRODUCT_STATUS.REJECTED;
      updateData.reviewNote = args.note || 'No specific feedback provided.';
      updateData.rejectionReasonCategory = args.category || null;
      updateData.rejectionSubcategories = args.subcategories;
      updateData.rejectionFields = args.flaggedFields;
    }

    return updateData;
  }

  private async sendRejectionEmail(
    productId: string,
    product: Pick<Prisma.ProductGetPayload<Record<string, never>>, 'vendorId' | 'name'>,
    updated: Pick<Prisma.ProductGetPayload<Record<string, never>>, 'reviewNote'>,
    args: ReturnType<ProductLifecycleService['parseReviewArgs']>,
  ): Promise<void> {
    try {
      const vendorProfile = await this.vendors.findByIdWithUser(String(product.vendorId));

      if (vendorProfile?.user?.email) {
        const emailData = productRejectionEmailTemplate({
          productName: product.name,
          rejectionReason: updated.reviewNote || '',
          category: args.category,
          subcategories: args.subcategories,
          flaggedFields: args.flaggedFields,
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
      logger.error({ err, productId }, 'Failed to enqueue rejection email to vendor');
    }
  }

  async archiveProduct(id: string, userId: string, role: string, vendorId?: string) {
    const product = await this.products.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if ((role === 'VENDOR' || role === 'STAFF') && (!vendorId || product.vendorId !== vendorId)) {
      throw new AppError(
        'Forbidden: You do not own this product',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN_RESOURCE,
      );
    }

    const updated = await this.products.update(id, {
      status: PRODUCT_STATUS.ARCHIVED,
      updatedBy: userId,
    });

    purgeProduct(id);
    if (isVisibilityFlip(product.status, PRODUCT_STATUS.ARCHIVED)) {
      purgeProductLists();
    }

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

    await invalidateCacheKey(STOREFRONT_HOME_CACHE_KEY).catch((err) =>
      logger.warn({ err }, 'Failed to invalidate storefront home cache after product archive'),
    );

    return formatProductResponse(updated);
  }

  async toggleProductActivation(id: string, vendorId?: string, isPlatform = false) {
    const product = await this.products.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.PRODUCT_NOT_FOUND);
    }

    if (!isPlatform && (!vendorId || product.vendorId !== vendorId)) {
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

    const updated = await this.products.update(id, {
      status:
        product.status === PRODUCT_STATUS.PUBLISHED
          ? PRODUCT_STATUS.DEACTIVATED
          : PRODUCT_STATUS.PUBLISHED,
    });

    // Toggle always flips visibility by construction.
    purgeProduct(id);
    purgeProductLists();

    return formatProductResponse(updated);
  }
}
