import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { reviewController } from './review.controller';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const reviewRoutes = Router();

// Customer authenticated routes
reviewRoutes.post('/', authenticateJWT, asyncHandler(reviewController.createReview));
reviewRoutes.get('/to-review', authenticateJWT, asyncHandler(reviewController.getToReviewItems));
reviewRoutes.post(
  '/:reviewId/likes',
  authenticateJWT,
  asyncHandler(reviewController.toggleReviewLike),
);

// Public product social proof routes
reviewRoutes.get('/products/:productId', asyncHandler(reviewController.getProductReviews));
reviewRoutes.get(
  '/products/:productId/summary',
  asyncHandler(reviewController.getProductReviewSummary),
);
reviewRoutes.get(
  '/products/:productId/gallery',
  asyncHandler(reviewController.getProductReviewGallery),
);

export { reviewRoutes };
