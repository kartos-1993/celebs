import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { actorContext, optionalActorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT, optionalAuthenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const productRoutes = Router();
const productController = new ProductController(new ProductService());

// Public / Storefront Product Routes (Optional Auth + optional context enrichment)
productRoutes.get(
  '/',
  optionalAuthenticateJWT,
  optionalActorContext,
  searchRateLimiter,
  asyncHandler(productController.getProducts),
);
productRoutes.get(
  '/review-product-queue',
  authenticateJWT,
  requirePermissions(Permission.PRODUCT_REVIEW),
  asyncHandler(productController.getProductReviewQueue),
);
productRoutes.get(
  '/:id',
  optionalAuthenticateJWT,
  optionalActorContext,
  searchRateLimiter,
  asyncHandler(productController.getProductById),
);

// Protected Admin / Seller Routes: identity → context → lifecycle → permission
productRoutes.use(authenticateJWT);
productRoutes.use(asyncHandler(actorContext));

// Lifecycle gate: sellers must be APPROVED; platform actors bypass (1P instant path)
const approvedStore = requireStoreState(['APPROVED']);

productRoutes.post(
  '/',
  approvedStore,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.createProduct),
);
productRoutes.put(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.updateProduct),
);

productRoutes.post(
  '/:id/submit-for-review',
  approvedStore,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.submitProductForReview),
);
productRoutes.post(
  '/:id/review',
  requirePermissions(Permission.PRODUCT_PUBLISH),
  asyncHandler(productController.reviewProduct),
);
// Destructive operations were previously unguarded for suspended stores — fixed.
productRoutes.post(
  '/:id/archive',
  approvedStore,
  requirePermissions(Permission.PRODUCT_DELETE),
  asyncHandler(productController.archiveProduct),
);
productRoutes.post(
  '/:id/toggle-activation',
  approvedStore,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.toggleProductActivation),
);

export default productRoutes;
