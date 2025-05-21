import express from 'express';
import { ProductController } from '../controllers/product.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const productController = new ProductController();

// Apply authentication middleware to all product routes
router.use(authenticateJWT);

// Get all products with filtering and pagination
router.get('/', asyncHandler(productController.getAllProducts));

// Get a single product by ID
router.get('/:id', asyncHandler(productController.getProductById));

// Create a new product
router.post('/', asyncHandler(productController.createProduct));

// Update a product
router.put('/:id', asyncHandler(productController.updateProduct));

// Delete a product
router.delete('/:id', asyncHandler(productController.deleteProduct));

// Update product stock
router.patch('/:id/stock', asyncHandler(productController.updateProductStock));

export default router;