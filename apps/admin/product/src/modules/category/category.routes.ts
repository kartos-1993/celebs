import { Router, Request, Response, NextFunction } from 'express';
import { CategoryModule } from './category.module';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { logger } from '../../common/utils/logger';

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

// Apply authentication middleware to all category routes
categoryRoute.use(authenticateJWT);

// Category routes
categoryRoute.get('/', asyncHandler(categoryController.getAllCategories));
categoryRoute.get('/:id', asyncHandler(categoryController.getCategoryById));
categoryRoute.post('/', asyncHandler(categoryController.createCategory));
// categoryRoute.put('/:id', asyncHandler(categoryController.updateCategory));
// categoryRoute.delete('/:id', asyncHandler(categoryController.deleteCategory));

export default categoryRoute;
