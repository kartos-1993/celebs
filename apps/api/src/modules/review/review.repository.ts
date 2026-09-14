import { Prisma, ReviewFitRating, ReviewStatus } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';

export interface CreateReviewData {
  userId: string;
  userName: string;
  userAvatar?: string;
  productId: string;
  orderId: string;
  orderItemId: string;
  inventoryId?: string;
  rating: number;
  fitRating?: ReviewFitRating;
  comment: string;
  images?: string[];
  colorVariantName?: string;
  size?: string;
  variantSnapshot?: Record<string, string>;
  status?: ReviewStatus;
}

export interface FindReviewsOptions {
  page?: number;
  limit?: number;
  rating?: number;
  hasImages?: boolean;
  currentUserId?: string;
}

export class ReviewRepository {
  async findOrderItemForReview(orderItemId: string, userId: string) {
    return prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          userId,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inventory: {
          select: {
            id: true,
            productId: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async findReviewById(reviewId: string) {
    return prisma.review.findUnique({
      where: { id: reviewId },
    });
  }

  async createReview(data: CreateReviewData) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          productId: data.productId,
          orderId: data.orderId,
          orderItemId: data.orderItemId,
          inventoryId: data.inventoryId,
          rating: data.rating,
          fitRating: data.fitRating ?? ReviewFitRating.TRUE_TO_SIZE,
          comment: data.comment,
          images: data.images ?? [],
          colorVariantName: data.colorVariantName,
          size: data.size,
          variantSnapshot: data.variantSnapshot
            ? (data.variantSnapshot as Prisma.InputJsonValue)
            : Prisma.DbNull,
          status: data.status ?? ReviewStatus.APPROVED,
          isVerifiedPurchase: true,
        },
      });

      // Recalculate and update materialized ProductReviewSummary
      await this.syncProductReviewSummary(tx, data.productId);

      return review;
    });
  }

  async syncProductReviewSummary(tx: Prisma.TransactionClient, productId: string) {
    const reviews = await tx.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      select: { rating: true, images: true, fitRating: true },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return tx.productReviewSummary.upsert({
        where: { productId },
        create: {
          productId,
          averageRating: 0.0,
          totalReviews: 0,
          ratingsCount: 0,
          withImagesCount: 0,
          ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          fitDistribution: { trueToSize: 0, runsSmall: 0, runsLarge: 0 },
        },
        update: {
          averageRating: 0.0,
          totalReviews: 0,
          ratingsCount: 0,
          withImagesCount: 0,
          ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          fitDistribution: { trueToSize: 0, runsSmall: 0, runsLarge: 0 },
        },
      });
    }

    let sum = 0;
    let withImagesCount = 0;
    const ratingDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const fitDist: { trueToSize: number; runsSmall: number; runsLarge: number } = {
      trueToSize: 0,
      runsSmall: 0,
      runsLarge: 0,
    };

    for (const r of reviews) {
      sum += r.rating;
      if (r.images && r.images.length > 0) withImagesCount++;
      const key = String(r.rating);
      ratingDist[key] = (ratingDist[key] || 0) + 1;

      if (r.fitRating === ReviewFitRating.TRUE_TO_SIZE) fitDist.trueToSize++;
      else if (r.fitRating === ReviewFitRating.RUNS_SMALL) fitDist.runsSmall++;
      else if (r.fitRating === ReviewFitRating.RUNS_LARGE) fitDist.runsLarge++;
    }

    const averageRating = Number((sum / totalReviews).toFixed(2));

    return tx.productReviewSummary.upsert({
      where: { productId },
      create: {
        productId,
        averageRating,
        totalReviews,
        ratingsCount: totalReviews,
        withImagesCount,
        ratingDistribution: ratingDist,
        fitDistribution: fitDist,
      },
      update: {
        averageRating,
        totalReviews,
        ratingsCount: totalReviews,
        withImagesCount,
        ratingDistribution: ratingDist,
        fitDistribution: fitDist,
      },
    });
  }

  async findProductReviews(productId: string, options: FindReviewsOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
    };

    if (options.rating && options.rating >= 1 && options.rating <= 5) {
      where.rating = options.rating;
    }

    if (options.hasImages) {
      where.images = { isEmpty: false };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: options.currentUserId
          ? {
              likes: {
                where: { userId: options.currentUserId },
                select: { id: true },
              },
            }
          : undefined,
      }),
      prisma.review.count({ where }),
    ]);

    const formattedReviews = reviews.map((r) => {
      const recordWithLikes = r as typeof r & { likes?: { id: string }[] };
      const isLikedByMe = Array.isArray(recordWithLikes.likes) && recordWithLikes.likes.length > 0;
      return {
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        userName: r.userName,
        userAvatar: r.userAvatar,
        rating: r.rating,
        fitRating: r.fitRating,
        comment: r.comment,
        images: r.images,
        colorVariantName: r.colorVariantName,
        size: r.size,
        variantSnapshot: r.variantSnapshot,
        helpfulCount: r.helpfulCount,
        isVerifiedPurchase: r.isVerifiedPurchase,
        isLikedByMe,
        createdAt: r.createdAt,
      };
    });

    return { reviews: formattedReviews, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAdminReviews(params: {
    vendorId?: string | null;
    status?: ReviewStatus;
    rating?: number;
    hasImages?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 15));
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (params.vendorId) {
      where.product = { vendorId: params.vendorId };
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.rating) {
      where.rating = params.rating;
    }

    if (params.hasImages) {
      where.images = { isEmpty: false };
    }

    if (params.search) {
      where.OR = [
        { comment: { contains: params.search, mode: 'insensitive' } },
        { userName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              mainImages: true,
              vendorId: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateReviewStatus(reviewId: string, status: ReviewStatus) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: reviewId },
      });

      if (!existing) {
        throw new AppError('Review not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
      }

      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { status },
      });

      if (existing.status === ReviewStatus.APPROVED || status === ReviewStatus.APPROVED) {
        await this.syncProductReviewSummary(tx, existing.productId);
      }

      return updated;
    });
  }

  async findProductReviewSummary(productId: string) {
    const existing = await prisma.productReviewSummary.findUnique({
      where: { productId },
    });

    if (existing) {
      return existing;
    }

    // Sync on-demand if not created yet
    return prisma.$transaction((tx) => this.syncProductReviewSummary(tx, productId));
  }

  async findProductReviewGallery(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const reviewsWithImages = await prisma.review.findMany({
      where: {
        productId,
        status: ReviewStatus.APPROVED,
        images: { isEmpty: false },
      },
      select: {
        id: true,
        userName: true,
        userAvatar: true,
        rating: true,
        colorVariantName: true,
        size: true,
        comment: true,
        images: true,
        helpfulCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const galleryItems = reviewsWithImages.flatMap((review) =>
      review.images.map((imageUrl, imgIndex) => ({
        id: `${review.id}_${imgIndex}`,
        reviewId: review.id,
        imageUrl,
        userName: review.userName,
        userAvatar: review.userAvatar,
        rating: review.rating,
        colorVariantName: review.colorVariantName,
        size: review.size,
        comment: review.comment,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt,
      })),
    );

    return galleryItems;
  }

  async findToReviewItemsByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        userId,
        status: 'DELIVERED',
      },
      review: null,
    };

    const [items, total] = await Promise.all([
      prisma.orderItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          inventory: {
            select: {
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  mainImages: true,
                },
              },
            },
          },
        },
      }),
      prisma.orderItem.count({ where }),
    ]);

    const formatted = items.map((item) => ({
      orderItemId: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      deliveredAt: item.order.updatedAt,
      productId: item.inventory?.productId ?? '',
      productName: item.productName,
      productSlug: item.inventory?.product?.slug ?? '',
      productImage: item.inventory?.product?.mainImages?.[0] ?? '',
      colorVariantName: item.colorVariantName,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    return { items: formatted, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countToReviewItemsByUser(userId: string): Promise<number> {
    return prisma.orderItem.count({
      where: {
        order: {
          userId,
          status: 'DELIVERED',
        },
        review: null,
      },
    });
  }

  async toggleReviewLike(
    reviewId: string,
    userId: string,
  ): Promise<{ liked: boolean; helpfulCount: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.reviewLike.findUnique({
        where: { reviewId_userId: { reviewId, userId } },
      });

      if (existing) {
        await tx.reviewLike.delete({
          where: { reviewId_userId: { reviewId, userId } },
        });
        const updated = await tx.review.update({
          where: { id: reviewId },
          data: { helpfulCount: { decrement: 1 } },
          select: { helpfulCount: true },
        });
        return { liked: false, helpfulCount: Math.max(0, updated.helpfulCount) };
      }

      await tx.reviewLike.create({
        data: { reviewId, userId },
      });
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      });
      return { liked: true, helpfulCount: updated.helpfulCount };
    });
  }
}

export const reviewRepository = new ReviewRepository();
