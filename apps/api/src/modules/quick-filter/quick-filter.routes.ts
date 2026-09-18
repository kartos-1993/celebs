import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  createQuickFilterSchema,
  quickFilterCategoryParamSchema,
  quickFilterIdParamSchema,
  quickFilterSlugParamSchema,
  updateQuickFilterSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { QuickFilterController } from './quick-filter.controller';
import { quickFilterService } from './quick-filter.service';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { validateBody, validateParams } from '@/middlewares/validate';

const quickFilterController = new QuickFilterController(quickFilterService);

const quickFilterRoutes = Router();

// Public route to get storefront configuration for a category slug/ID
quickFilterRoutes.get(
  '/storefront/:slug',
  validateParams(quickFilterSlugParamSchema),
  asyncHandler(quickFilterController.getStorefrontConfig),
);

// Protected admin routes for quick filter management
quickFilterRoutes.get(
  '/category/:categoryId',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  validateParams(quickFilterCategoryParamSchema),
  asyncHandler(quickFilterController.getQuickFiltersForCategory),
);
quickFilterRoutes.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  validateBody(createQuickFilterSchema),
  asyncHandler(quickFilterController.createQuickFilter),
);
quickFilterRoutes.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  validateParams(quickFilterIdParamSchema),
  validateBody(updateQuickFilterSchema),
  asyncHandler(quickFilterController.updateQuickFilter),
);
quickFilterRoutes.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  validateParams(quickFilterIdParamSchema),
  asyncHandler(quickFilterController.deleteQuickFilter),
);

export default quickFilterRoutes;
