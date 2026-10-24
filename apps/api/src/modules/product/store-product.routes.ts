import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireSellerSurface, requireStoreState } from '@/common/guards/store.guards';
import { privateNoStore } from '@/common/http/cache-policy.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const storeProductRoutes = Router();
const productController = new ProductController(new ProductService());

// Enforce authentication, actor context, seller jurisdiction, and private cache headers
storeProductRoutes.use(
  authenticateJWT,
  asyncHandler(actorContext),
  requireSellerSurface,
  privateNoStore(),
);

// Store Catalog Read Operations
storeProductRoutes.get(
  '/',
  requirePermissions(Permission.PRODUCT_VIEW),
  asyncHandler(productController.getStoreProducts),
);

storeProductRoutes.get(
  '/:id',
  requirePermissions(Permission.PRODUCT_VIEW),
  asyncHandler(productController.getStoreProductById),
);

// Approved store lifecycle gate for mutations
const approvedStore = requireStoreState(['APPROVED']);

storeProductRoutes.post(
  '/',
  approvedStore,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.createStoreProduct),
);

storeProductRoutes.put(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.updateStoreProduct),
);

storeProductRoutes.patch(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.toggleStoreProductActivation),
);

storeProductRoutes.delete(
  '/:id',
  approvedStore,
  requirePermissions(Permission.PRODUCT_DELETE),
  asyncHandler(productController.archiveStoreProduct),
);

storeProductRoutes.post(
  '/:id/submit-for-review',
  approvedStore,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.submitStoreProductForReview),
);

export default storeProductRoutes;
