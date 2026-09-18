import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  adminReviewsQuerySchema,
  createReviewSchema,
  presignReviewImageSchema,
  productIdParamSchema,
  productReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewStatusSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { reviewController } from './review.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT, optionalAuthenticateJWT } from '@/common/strategies/jwt.strategy';
import { requireAnyPermission } from '@/middlewares/rbac.middleware';
import { validateBody, validateParams, validateQuery } from '@/middlewares/validate';

const reviewRoutes = Router();

// Customer authenticated routes
reviewRoutes.post(
  '/',
  authenticateJWT,
  validateBody(createReviewSchema),
  asyncHandler(reviewController.createReview),
);
reviewRoutes.post(
  '/presign',
  authenticateJWT,
  validateBody(presignReviewImageSchema),
  asyncHandler(reviewController.presignReviewImage),
);
reviewRoutes.get('/to-review', authenticateJWT, asyncHandler(reviewController.getToReviewItems));
reviewRoutes.post(
  '/:reviewId/likes',
  authenticateJWT,
  validateParams(reviewIdParamSchema),
  asyncHandler(reviewController.toggleReviewLike),
);

// Admin & Vendor Moderation routes
reviewRoutes.get(
  '/admin',
  authenticateJWT,
  asyncHandler(actorContext),
  requireStoreState(['APPROVED', 'UNDER_REVIEW', 'PENDING']),
  requireAnyPermission(Permission.PRODUCT_VIEW, Permission.PRODUCT_REVIEW),
  validateQuery(adminReviewsQuerySchema),
  asyncHandler(reviewController.getAdminReviews),
);

reviewRoutes.patch(
  '/:reviewId/status',
  authenticateJWT,
  asyncHandler(actorContext),
  requireStoreState(['APPROVED', 'UNDER_REVIEW', 'PENDING']),
  requireAnyPermission(Permission.PRODUCT_REVIEW, Permission.PRODUCT_EDIT),
  validateParams(reviewIdParamSchema),
  validateBody(updateReviewStatusSchema),
  asyncHandler(reviewController.updateReviewStatus),
);

// Public product social proof routes
reviewRoutes.get(
  '/products/:productId',
  optionalAuthenticateJWT,
  validateParams(productIdParamSchema),
  validateQuery(productReviewsQuerySchema),
  asyncHandler(reviewController.getProductReviews),
);
reviewRoutes.get(
  '/products/:productId/summary',
  validateParams(productIdParamSchema),
  asyncHandler(reviewController.getProductReviewSummary),
);
reviewRoutes.get(
  '/products/:productId/gallery',
  validateParams(productIdParamSchema),
  asyncHandler(reviewController.getProductReviewGallery),
);

export { reviewRoutes };
