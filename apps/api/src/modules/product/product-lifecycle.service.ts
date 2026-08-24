import { Prisma } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { mediaRepository } from '../media/media.repository';

import { calculateProductQCScore } from './utils/product-qc';
import { formatProductResponse } from './product.presenter';
import { collectProductAssetUrls, toJsonInput } from './product-assets';
import type { ProductStatusValue } from './product-status';
import { PRODUCT_STATUS, VENDOR_EDITABLE_STATUSES } from './product-status';

import { enqueueMail } from '@/common/services/mail.queue';
import prisma from '@/config/db.prisma';
import { productRejectionEmailTemplate } from '@/mailers/templates/product-review.template';

export class ProductLifecycleService {
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

    const args = this.parseReviewArgs(actionOrPayload, reviewerIdArg, noteArg);
    const qcResult = calculateProductQCScore(formatProductResponse(product));

    const updatedHistory = toJsonInput([
      ...(Array.isArray(product.reviewHistory) ? (product.reviewHistory as Prisma.JsonArray) : []),
      this.buildHistoryItem(args),
    ]);

    const updateData = this.buildReviewUpdateData(args, updatedHistory, qcResult.score);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true, path: true, level: true } },
        subcategory: { select: { id: true, name: true, slug: true, path: true, level: true } },
      },
    });

    if (args.action === 'reject' && product.vendorId) {
      await this.sendRejectionEmail(id, product, updated, args);
    }

    return formatProductResponse(updated);
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
  ): Prisma.ProductUpdateInput {
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
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { id: String(product.vendorId) },
        include: { user: true },
      });

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

    return formatProductResponse(updated);
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

    return formatProductResponse(updated);
  }
}
