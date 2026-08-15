import { NextFunction, Request, Response, Router } from 'express';

import { asyncHandler, logger } from '@celebs/shared-utils';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

import { authenticateJWT } from '@/middlewares/auth.middleware';

const categoryRoute = Router();
const categoryController = new CategoryController(new CategoryService());

// Debug middleware to log all requests
categoryRoute.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(
    {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers,
      cookies: req.cookies,
    },
    'Category route request received',
  );
  next();
});

import { Permission } from '@celebs/rbac';

import { QuickFilterController } from '../quick-filter/quick-filter.controller';
import { QuickFilterService } from '../quick-filter/quick-filter.service';

import { requirePermissions } from '@/middlewares/rbac.middleware';

const quickFilterController = new QuickFilterController(new QuickFilterService());

// Public Category routes
categoryRoute.get('/', asyncHandler(categoryController.getAllCategories));
categoryRoute.get('/search', asyncHandler(categoryController.searchCategories));
categoryRoute.get(
  '/tree-with-attributes',
  asyncHandler(categoryController.getCategoryTreeWithAttributes),
);

// Authenticated Recent Categories (must be before /:id to prevent Express routing collision)
categoryRoute.get(
  '/recent',
  authenticateJWT,
  asyncHandler(categoryController.getRecentCategories),
);
categoryRoute.post(
  '/recent',
  authenticateJWT,
  asyncHandler(categoryController.recordRecentCategory),
);

categoryRoute.get('/:slug/storefront', asyncHandler(quickFilterController.getStorefrontConfig));
categoryRoute.get('/:id/filters', asyncHandler(categoryController.getCategoryFilters));
categoryRoute.get('/:id', asyncHandler(categoryController.getCategoryById));

// Admin / Management Category routes (Require Auth & Permissions)
categoryRoute.use(authenticateJWT);

categoryRoute.post(
  '/',
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(categoryController.createCategory),
);
categoryRoute.put(
  '/:id',
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(categoryController.updateCategory),
);
categoryRoute.delete(
  '/:id',
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(categoryController.deleteCategory),
);

export default categoryRoute;
