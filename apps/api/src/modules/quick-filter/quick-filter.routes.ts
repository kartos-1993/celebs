import { Router } from 'express';
import { QuickFilterService } from './quick-filter.service';
import { QuickFilterController } from './quick-filter.controller';
import { asyncHandler } from '@celebs/shared-utils';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

const quickFilterService = new QuickFilterService();
const quickFilterController = new QuickFilterController(quickFilterService);

const quickFilterRoutes = Router();

// Public route to get storefront configuration for a category slug/ID
quickFilterRoutes.get('/storefront/:slug', asyncHandler(quickFilterController.getStorefrontConfig));

// Protected admin routes for quick filter management
quickFilterRoutes.get(
  '/category/:categoryId',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(quickFilterController.getQuickFiltersForCategory),
);
quickFilterRoutes.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(quickFilterController.createQuickFilter),
);
quickFilterRoutes.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(quickFilterController.updateQuickFilter),
);
quickFilterRoutes.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(quickFilterController.deleteQuickFilter),
);

export default quickFilterRoutes;
