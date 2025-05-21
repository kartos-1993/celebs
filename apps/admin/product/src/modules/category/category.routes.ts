import express from 'express';
import { CategoryModule } from './category.module';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticateJWT } from '../../middlewares/auth.middleware';

const router = express.Router();
const categoryController = CategoryModule.getInstance().getCategoryController();

// Apply authentication middleware to all category routes
router.use(authenticateJWT);

// Get all categories
router.get('/', asyncHandler(categoryController.getAllCategories));

// Get a single category by ID
router.get('/:id', asyncHandler(categoryController.getCategoryById));

// Create a new category
router.post('/', asyncHandler(categoryController.createCategory));

// Update a category
router.put('/:id', asyncHandler(categoryController.updateCategory));

// Delete a category
router.delete('/:id', asyncHandler(categoryController.deleteCategory));

export default router;
