import { ReviewFitRating, ReviewStatus } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { createReviewPresignedPut } from '../media/storage.service';
import { purgeProduct } from '../product/product-cache';

import { evaluateReviewQuality } from './utils/review-quality.evaluator';
import { FindReviewsOptions, ReviewRepository, reviewRepository } from './review.repository';

export interface CreateReviewDTO {
  orderItemId: string;
  rating: number;
  fitRating?: ReviewFitRating;
  comment: string;
  images?: string[];
}

function maskUserName(name?: string | null): string {
  if (!name || name.trim().length === 0) return 'Customer';
  const trimmed = name.trim();
  if (trimmed.length <= 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
}

export class ReviewService {
  constructor(private repo: ReviewRepository = reviewRepository) {}

  async createReview(userId: string, data: CreateReviewDTO) {
    if (!data.orderItemId) {
      throw new AppError(
        'Order item ID is required',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw new AppError(
        'Rating must be between 1 and 5 stars',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const orderItem = await this.repo.findOrderItemForReview(data.orderItemId, userId);

    if (!orderItem) {
      throw new AppError(
        'Order item not found or does not belong to you',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (orderItem.order.status !== 'DELIVERED') {
      throw new AppError(
        'Reviews can only be submitted for delivered orders',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (orderItem.review) {
      throw new AppError(
        'This item has already been reviewed',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const productId = orderItem.inventory?.productId;
    if (!productId) {
      throw new AppError(
        'Product associated with this order item could not be found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const user = orderItem.order.user;
    const userName = maskUserName(user?.name);
    const userAvatar = undefined;

    const variantSnapshot: Record<string, string> = {};
    if (orderItem.colorVariantName) {
      variantSnapshot['Color'] = orderItem.colorVariantName;
    }
    if (orderItem.size) {
      variantSnapshot['Size'] = orderItem.size;
    }

    const quality = evaluateReviewQuality(data.comment);
    const status = quality.isSubstantive ? ReviewStatus.APPROVED : ReviewStatus.PENDING_MODERATION;
    if (!quality.isSubstantive && quality.flagReason) {
      variantSnapshot['_flagReason'] = quality.flagReason;
    }

    const created = await this.repo.createReview({
      userId,
      userName,
      userAvatar,
      productId,
      orderId: orderItem.order.id,
      orderItemId: orderItem.id,
      inventoryId: orderItem.inventoryId || undefined,
      rating: Math.round(data.rating),
      fitRating: data.fitRating ?? ReviewFitRating.TRUE_TO_SIZE,
      comment: data.comment.trim(),
      images: (data.images ?? []).slice(0, 5),
      colorVariantName: orderItem.colorVariantName || undefined,
      size: orderItem.size || undefined,
      variantSnapshot: Object.keys(variantSnapshot).length > 0 ? variantSnapshot : undefined,
      status,
    });
    // Ratings render on the PDP; refresh its cached truth.
    purgeProduct(productId);
    return created;
  }

  async getToReviewItems(userId: string, page = 1, limit = 10) {
    return this.repo.findToReviewItemsByUser(userId, page, limit);
  }

  async getProductReviews(productId: string, options: FindReviewsOptions = {}) {
    return this.repo.findProductReviews(productId, options);
  }

  async getProductReviewSummary(productId: string) {
    return this.repo.findProductReviewSummary(productId);
  }

  async getProductReviewGallery(productId: string, page = 1, limit = 20) {
    return this.repo.findProductReviewGallery(productId, page, limit);
  }

  async toggleReviewLike(reviewId: string, userId: string) {
    const review = await this.repo.findReviewById(reviewId);
    if (!review) {
      throw new AppError('Review not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }
    return this.repo.toggleReviewLike(reviewId, userId);
  }

  async presignReviewImage(
    userId: string,
    data: { originalname: string; mimeType: string; size: number },
  ) {
    if (!userId) {
      throw new AppError(
        'Unauthorized',
        HTTPSTATUS.UNAUTHORIZED,
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }
    return createReviewPresignedPut({
      userId,
      originalname: data.originalname,
      mimeType: data.mimeType,
      size: data.size,
    });
  }

  async getAdminReviews(params: {
    vendorId?: string | null;
    status?: ReviewStatus;
    rating?: number;
    hasImages?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repo.findAdminReviews(params);
  }

  async updateReviewStatus(reviewId: string, status: ReviewStatus) {
    return this.repo.updateReviewStatus(reviewId, status);
  }
}

export const reviewService = new ReviewService();
