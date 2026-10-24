import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { publicCache } from '@/common/http/cache-policy.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';

const productRoutes = Router();
const productController = new ProductController(new ProductService());

// Public Storefront Catalog Routes
productRoutes.get(
  '/',
  searchRateLimiter,
  publicCache({ maxAge: 30, sMaxAge: 60, swr: 120 }),
  asyncHandler(productController.getPublicProducts),
);

productRoutes.get(
  '/:id',
  searchRateLimiter,
  publicCache({ maxAge: 60, sMaxAge: 300, swr: 300 }),
  asyncHandler(productController.getPublicProductById),
);

export default productRoutes;
