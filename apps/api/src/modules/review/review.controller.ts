import { Request, Response } from 'express';

import {
  adminReviewsQuerySchema,
  createReviewSchema,
  presignReviewImageSchema,
  productIdParamSchema,
  productReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewStatusSchema,
} from '@celebs/shared-types';

import { ReviewService, reviewService } from './review.service';

import { resolveTargetStoreId } from '@/common/guards/store.guards';
import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

export class ReviewController {
  constructor(private service: ReviewService = reviewService) {}

  createReview = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const body = createReviewSchema.parse(req.body);
    const review = await this.service.createReview(userId, body);
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
    const { productId } = productIdParamSchema.parse(req.params);
    const query = productReviewsQuerySchema.parse(req.query);
    const currentUserId = req.user?.id;

    const result = await this.service.getProductReviews(productId, {
      page: query.page,
      limit: query.limit,
      rating: query.rating,
      hasImages: query.hasImages,
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
    const { productId } = productIdParamSchema.parse(req.params);
    const summary = await this.service.getProductReviewSummary(productId);
    return sendSuccess(res, summary, 'Product review summary retrieved');
  };

  getProductReviewGallery = async (req: Request, res: Response) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const gallery = await this.service.getProductReviewGallery(productId, page, limit);
    return sendSuccess(res, gallery, 'Review photo gallery retrieved');
  };

  toggleReviewLike = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { reviewId } = reviewIdParamSchema.parse(req.params);
    const result = await this.service.toggleReviewLike(reviewId, userId);
    return sendSuccess(res, result, result.liked ? 'Review liked' : 'Review unliked');
  };

  presignReviewImage = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const body = presignReviewImageSchema.parse(req.body);
    const result = await this.service.presignReviewImage(userId, {
      originalname: body.originalname,
      mimeType: body.mimeType,
      size: body.size,
    });
    return sendCreated(res, result, 'Presigned review photo upload URL generated');
  };

  getAdminReviews = async (req: Request, res: Response) => {
    const vendorId = resolveTargetStoreId(req, 'query');
    const query = adminReviewsQuerySchema.parse(req.query);

    const result = await this.service.getAdminReviews({
      vendorId: vendorId || query.vendorId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      rating: query.rating,
      hasImages: query.hasImages,
      search: query.search,
    });

    return sendPaginated(
      res,
      result.reviews,
      { page: result.page, limit: result.limit, total: result.total },
      'Admin reviews retrieved successfully',
    );
  };

  updateReviewStatus = async (req: Request, res: Response) => {
    const { reviewId } = reviewIdParamSchema.parse(req.params);
    const { status } = updateReviewStatusSchema.parse(req.body);
    const updated = await this.service.updateReviewStatus(reviewId, status);
    return sendSuccess(res, updated, 'Review status updated successfully');
  };
}

export const reviewController = new ReviewController();
