import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor } from '@/common/guards/store.guards';
import { privateNoStore } from '@/common/http/cache-policy.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const adminProductRoutes = Router();
const productController = new ProductController(new ProductService());

// Enforce platform administration jurisdiction, authentication, and private cache headers
adminProductRoutes.use(
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  privateNoStore(),
);

// Global Catalog Management & Review Operations
adminProductRoutes.get(
  '/',
  requirePermissions(Permission.PRODUCT_VIEW),
  asyncHandler(productController.getAdminProducts),
);

adminProductRoutes.get(
  '/review-queue',
  requirePermissions(Permission.PRODUCT_REVIEW),
  asyncHandler(productController.getAdminReviewQueue),
);

adminProductRoutes.get(
  '/:id',
  requirePermissions(Permission.PRODUCT_VIEW),
  asyncHandler(productController.getAdminProductById),
);

adminProductRoutes.post(
  '/:id/review',
  requirePermissions(Permission.PRODUCT_REVIEW),
  asyncHandler(productController.reviewAdminProduct),
);

adminProductRoutes.post(
  '/',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.createAdminProduct),
);

adminProductRoutes.put(
  '/:id',
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.updateAdminProduct),
);

adminProductRoutes.patch(
  '/:id',
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.toggleAdminProductActivation),
);

adminProductRoutes.delete(
  '/:id',
  requirePermissions(Permission.PRODUCT_DELETE),
  asyncHandler(productController.archiveAdminProduct),
);

export default adminProductRoutes;
