import express from 'express';
import { CategoryController } from '../modules/category/category.controller';
import { CategoryService } from '../modules/category/category.service';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const categoryService = new CategoryService();
const categoryController = new CategoryController(categoryService);

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