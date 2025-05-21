import express from 'express';
import { ProductController } from '../modules/product/product.controller';
import { ProductService } from '../modules/product/product.service';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const productService = new ProductService();
const productController = new ProductController(productService);

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