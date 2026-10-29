import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
import { privateNoStore, publicCache } from '@/common/http/cache-policy.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const productRoutes = Router();
const productController = new ProductController(new ProductService());

// Public Storefront Catalog Routes
productRoutes.get(
  '/',
  searchRateLimiter,
  publicCache({ maxAge: 30, sMaxAge: 60, swr: 120 }),
  asyncHandler(productController.getPublicProducts),
);

// Review queue (placed before /:id parameter to avoid UUID route collision)
productRoutes.get(
  '/review-product-queue',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PRODUCT_REVIEW),
  privateNoStore(),
  asyncHandler(productController.getProductReviewQueue),
);

productRoutes.get(
  '/:id',
  searchRateLimiter,
  publicCache({ maxAge: 60, sMaxAge: 300, swr: 300 }),
  asyncHandler(productController.getPublicProductById),
);

// Protected Admin / Seller Mutating Routes: identity → context → lifecycle → permission
productRoutes.use(authenticateJWT);
productRoutes.use(asyncHandler(actorContext));
productRoutes.use(privateNoStore());

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

productRoutes.patch(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.toggleProductActivation),
);

productRoutes.delete(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_DELETE),
  asyncHandler(productController.archiveProduct),
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

export default productRoutes;
