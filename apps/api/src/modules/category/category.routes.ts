import { NextFunction, Request, Response, Router } from 'express';

import { asyncHandler, logger } from '@celebs/shared-utils';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

import { publicCache } from '@/common/http/cache-policy.middleware';
import { authenticateJWT, optionalAuthenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';

const categoryRoute = Router();
const categoryController = new CategoryController(new CategoryService());

// Debug middleware to log requests in development mode only
if (process.env.NODE_ENV === 'development') {
  categoryRoute.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(
      {
        method: req.method,
        path: req.path,
        body: req.body,
      },
      'Category route request received',
    );
    next();
  });
}

import { Permission } from '@celebs/rbac';

import { StorefrontShortcutController } from '../storefront-shortcut/storefront-shortcut.controller';
import { StorefrontShortcutService } from '../storefront-shortcut/storefront-shortcut.service';

import { requirePermissions } from '@/middlewares/rbac.middleware';

const storefrontShortcutController = new StorefrontShortcutController(
  new StorefrontShortcutService(),
);

// Public Category routes
categoryRoute.get(
  '/',
  optionalAuthenticateJWT,
  searchRateLimiter,
  asyncHandler(categoryController.getAllCategories),
);
categoryRoute.get(
  '/search',
  optionalAuthenticateJWT,
  searchRateLimiter,
  asyncHandler(categoryController.searchCategories),
);
categoryRoute.get(
  '/tree-with-attributes',
  optionalAuthenticateJWT,
  searchRateLimiter,
  publicCache({ maxAge: 300, sMaxAge: 3600, swr: 3600 }),
  asyncHandler(categoryController.getCategoryTreeWithAttributes),
);

// Authenticated Recent Categories (must be before /:id to prevent Express routing collision)
categoryRoute.get('/recent', authenticateJWT, asyncHandler(categoryController.getRecentCategories));
categoryRoute.post(
  '/recent',
  authenticateJWT,
  asyncHandler(categoryController.recordRecentCategory),
);

categoryRoute.get(
  '/:slug/storefront',
  optionalAuthenticateJWT,
  searchRateLimiter,
  asyncHandler(storefrontShortcutController.getStorefrontConfig),
);
categoryRoute.get(
  '/:id/filters',
  optionalAuthenticateJWT,
  searchRateLimiter,
  asyncHandler(categoryController.getCategoryFilters),
);
categoryRoute.get(
  '/:id',
  optionalAuthenticateJWT,
  searchRateLimiter,
  asyncHandler(categoryController.getCategoryById),
);

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
