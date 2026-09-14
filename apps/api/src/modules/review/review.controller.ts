import { ReviewStatus } from '@prisma/client';
import { Request, Response } from 'express';

import { ReviewService, reviewService } from './review.service';

import { resolveTargetStoreId } from '@/common/guards/store.guards';
import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

export class ReviewController {
  constructor(private service: ReviewService = reviewService) {}

  createReview = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const review = await this.service.createReview(userId, req.body);
    return sendCreated(res, review, 'Review submitted successfully');
  };

  getToReviewItems = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await this.service.getToReviewItems(userId, page, limit);
    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Delivered items awaiting review retrieved',
    );
  };

  getProductReviews = async (req: Request, res: Response) => {
    const productId = req.params.productId || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
    const hasImages = req.query.hasImages === 'true';
    const currentUserId = req.user?.id;

    const result = await this.service.getProductReviews(productId, {
      page,
      limit,
      rating,
      hasImages,
      currentUserId,
    });

    return sendPaginated(
      res,
      result.reviews,
      { page: result.page, limit: result.limit, total: result.total },
      'Product reviews retrieved successfully',
    );
  };

  getProductReviewSummary = async (req: Request, res: Response) => {
    const productId = req.params.productId || '';
    const summary = await this.service.getProductReviewSummary(productId);
    return sendSuccess(res, summary, 'Product review summary retrieved');
  };

  getProductReviewGallery = async (req: Request, res: Response) => {
    const productId = req.params.productId || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const gallery = await this.service.getProductReviewGallery(productId, page, limit);
    return sendSuccess(res, gallery, 'Review photo gallery retrieved');
  };

  toggleReviewLike = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const reviewId = req.params.reviewId || '';
    const result = await this.service.toggleReviewLike(reviewId, userId);
    return sendSuccess(res, result, result.liked ? 'Review liked' : 'Review unliked');
  };

  presignReviewImage = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { originalname, mimeType, size } = req.body;
    const result = await this.service.presignReviewImage(userId, {
      originalname,
      mimeType,
      size: Number(size),
    });
    return sendCreated(res, result, 'Presigned review photo upload URL generated');
  };

  getAdminReviews = async (req: Request, res: Response) => {
    const vendorId = resolveTargetStoreId(req, 'query');
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const status = req.query.status as ReviewStatus | undefined;
    const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
    const hasImages = req.query.hasImages === 'true';
    const search = (req.query.search as string) || undefined;

    const result = await this.service.getAdminReviews({
      vendorId,
      page,
      limit,
      status,
      rating,
      hasImages,
      search,
    });

    return sendPaginated(
      res,
      result.reviews,
      { page: result.page, limit: result.limit, total: result.total },
      'Admin reviews retrieved successfully',
    );
  };

  updateReviewStatus = async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId || '';
    const { status } = req.body as { status: ReviewStatus };
    const updated = await this.service.updateReviewStatus(reviewId, status);
    return sendSuccess(res, updated, 'Review status updated successfully');
  };
}

export const reviewController = new ReviewController();
