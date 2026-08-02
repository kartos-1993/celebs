import { Router, Request, Response, NextFunction } from 'express';
import { CategoryModule } from './category.module';
import { asyncHandler, logger } from '@celebs/shared-utils';
import { authenticateJWT } from '@/middlewares/auth.middleware';

const categoryRoute = Router();
const categoryController = CategoryModule.getInstance().getCategoryController();

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

import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

import { QuickFilterService } from '../quick-filter/quick-filter.service';
import { QuickFilterController } from '../quick-filter/quick-filter.controller';

const quickFilterController = new QuickFilterController(new QuickFilterService());

// Public Category routes
categoryRoute.get('/', asyncHandler(categoryController.getAllCategories));
categoryRoute.get('/search', asyncHandler(categoryController.searchCategories));
categoryRoute.get(
  '/tree-with-attributes',
  asyncHandler(categoryController.getCategoryTreeWithAttributes),
);
categoryRoute.get('/:slug/storefront', asyncHandler(quickFilterController.getStorefrontConfig));
categoryRoute.get('/:id/filters', asyncHandler(categoryController.getCategoryFilters));
categoryRoute.get('/:id', asyncHandler(categoryController.getCategoryById));

// Apply authentication middleware to admin category routes
categoryRoute.use(authenticateJWT);

categoryRoute.post('/', requirePermissions(Permission.CATALOG_MANAGE), asyncHandler(categoryController.createCategory));
categoryRoute.put('/:id', requirePermissions(Permission.CATALOG_MANAGE), asyncHandler(categoryController.updateCategory));
categoryRoute.delete('/:id', requirePermissions(Permission.CATALOG_MANAGE), asyncHandler(categoryController.deleteCategory));

export default categoryRoute;
