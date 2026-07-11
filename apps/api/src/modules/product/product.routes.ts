import { Router } from 'express';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';
import { ProductModule } from './product.module';
import rateLimit from 'express-rate-limit';

const productRoutes = Router();
const productController = ProductModule.getInstance().getProductController();

// Rate limiter for public/search endpoints (authenticated bypasses it)
const productSearchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !!req.user, // skip rate limit if logged in
});

productRoutes.use(authenticateJWT);

// Routes
productRoutes.get('/', productSearchRateLimit, requirePermissions(Permission.PRODUCT_VIEW), asyncHandler(productController.getProducts));
productRoutes.get('/review-product-queue', requirePermissions(Permission.PRODUCT_REVIEW), asyncHandler(productController.getProductReviewQueue));
productRoutes.get('/:id', productSearchRateLimit, requirePermissions(Permission.PRODUCT_VIEW), asyncHandler(productController.getProductById));

productRoutes.post('/', requirePermissions(Permission.PRODUCT_CREATE), asyncHandler(productController.createProduct));
productRoutes.put('/:id', requirePermissions(Permission.PRODUCT_EDIT), asyncHandler(productController.updateProduct));

productRoutes.post('/:id/submit-for-review', requirePermissions(Permission.PRODUCT_CREATE), asyncHandler(productController.submitProductForReview));
productRoutes.post('/:id/review', requirePermissions(Permission.PRODUCT_PUBLISH), asyncHandler(productController.reviewProduct));
productRoutes.post('/:id/archive', requirePermissions(Permission.PRODUCT_DELETE), asyncHandler(productController.archiveProduct));
productRoutes.post('/:id/toggle-activation', requirePermissions(Permission.PRODUCT_EDIT), asyncHandler(productController.toggleProductActivation));

export default productRoutes;
