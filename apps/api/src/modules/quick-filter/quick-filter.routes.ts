import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { QuickFilterController } from './quick-filter.controller';
import { quickFilterService } from './quick-filter.service';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

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
