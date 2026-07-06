import { Router, Request, Response, NextFunction } from 'express';
import { CategoryModule } from './category.module';
import { asyncHandler, logger } from '@celebs/shared-utils';
import { authenticateJWT } from '../../middlewares/auth.middleware';

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

import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '../../common/enums/permission.enum';

// Apply authentication middleware to all category routes
categoryRoute.use(authenticateJWT);

// Category routes
categoryRoute.get('/', asyncHandler(categoryController.getAllCategories));
categoryRoute.get('/search', asyncHandler(categoryController.searchCategories));
categoryRoute.get(
  '/tree-with-attributes',
  asyncHandler(categoryController.getCategoryTreeWithAttributes),
);
categoryRoute.get('/:id', asyncHandler(categoryController.getCategoryById));
categoryRoute.post('/', requirePermissions(Permission.MANAGE_CATEGORIES), asyncHandler(categoryController.createCategory));
categoryRoute.put('/:id', requirePermissions(Permission.MANAGE_CATEGORIES), asyncHandler(categoryController.updateCategory));
categoryRoute.delete('/:id', requirePermissions(Permission.MANAGE_CATEGORIES), asyncHandler(categoryController.deleteCategory));

export default categoryRoute;
