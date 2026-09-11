import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { reviewController } from './review.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT, optionalAuthenticateJWT } from '@/common/strategies/jwt.strategy';
import { requireAnyPermission } from '@/middlewares/rbac.middleware';

const reviewRoutes = Router();

// Customer authenticated routes
reviewRoutes.post('/', authenticateJWT, asyncHandler(reviewController.createReview));
reviewRoutes.post('/presign', authenticateJWT, asyncHandler(reviewController.presignReviewImage));
reviewRoutes.get('/to-review', authenticateJWT, asyncHandler(reviewController.getToReviewItems));
reviewRoutes.post(
  '/:reviewId/likes',
  authenticateJWT,
  asyncHandler(reviewController.toggleReviewLike),
);

// Admin & Vendor Moderation routes
reviewRoutes.get(
  '/admin',
  authenticateJWT,
  asyncHandler(actorContext),
  requireStoreState(['APPROVED', 'UNDER_REVIEW', 'PENDING']),
  requireAnyPermission(Permission.PRODUCT_VIEW, Permission.PRODUCT_REVIEW),
  asyncHandler(reviewController.getAdminReviews),
);

reviewRoutes.patch(
  '/:reviewId/status',
  authenticateJWT,
  asyncHandler(actorContext),
  requireStoreState(['APPROVED', 'UNDER_REVIEW', 'PENDING']),
  requireAnyPermission(Permission.PRODUCT_REVIEW, Permission.PRODUCT_EDIT),
  asyncHandler(reviewController.updateReviewStatus),
);

// Public product social proof routes
reviewRoutes.get(
  '/products/:productId',
  optionalAuthenticateJWT,
  asyncHandler(reviewController.getProductReviews),
);
reviewRoutes.get(
  '/products/:productId/summary',
  asyncHandler(reviewController.getProductReviewSummary),
);
reviewRoutes.get(
  '/products/:productId/gallery',
  asyncHandler(reviewController.getProductReviewGallery),
);

export { reviewRoutes };
