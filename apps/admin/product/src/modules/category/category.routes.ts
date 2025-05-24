import {Router, Request, Response, NextFunction} from 'express';
import { CategoryModule } from './category.module';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { logger } from '../../common/utils/logger';

const categoryRoute = Router();
const categoryController = CategoryModule.getInstance().getCategoryController();

// Debug middleware to log all requests
categoryRoute.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug({
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
    cookies: req.cookies
  }, 'Category route request received');
  next();
});

// Apply authentication middleware to all category routes
categoryRoute.use(authenticateJWT);

// Get all categories
categoryRoute.get('/', asyncHandler(categoryController.getAllCategories));

// Get a single category by ID
categoryRoute.get('/:id', asyncHandler(categoryController.getCategoryById));

// Create a new category
categoryRoute.post('/', asyncHandler(categoryController.createCategory));

// Update a category
categoryRoute.put('/:id', asyncHandler(categoryController.updateCategory));

// Delete a category
categoryRoute.delete('/:id', asyncHandler(categoryController.deleteCategory));

export default categoryRoute;
