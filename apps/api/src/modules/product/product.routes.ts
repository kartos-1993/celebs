import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';
import { ProductModule } from './product.module';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';

const productRoutes = Router();
const productController = ProductModule.getInstance().getProductController();

// Optional JWT authentication: populates req.user if token is present, but doesn't block unauthenticated storefront users
const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const hasAuthHeader = !!req.headers.authorization;
  const hasCookieToken = !!req.cookies?.accessToken;
  if (!hasAuthHeader && !hasCookieToken) {
    return next();
  }
  passport.authenticate('jwt', { session: false }, (_err: any, user: any) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Public / Storefront Product Routes (Optional Auth)
productRoutes.get('/', searchRateLimiter, optionalAuthenticateJWT, asyncHandler(productController.getProducts));

// Protected Admin / Vendor Routes (Require Auth & Permissions)
productRoutes.use(authenticateJWT);
productRoutes.get('/review-product-queue', requirePermissions(Permission.PRODUCT_REVIEW), asyncHandler(productController.getProductReviewQueue));
productRoutes.get('/:id', searchRateLimiter, requirePermissions(Permission.PRODUCT_VIEW), asyncHandler(productController.getProductById));

productRoutes.post('/', requirePermissions(Permission.PRODUCT_CREATE), asyncHandler(productController.createProduct));
productRoutes.put('/:id', requirePermissions(Permission.PRODUCT_EDIT), asyncHandler(productController.updateProduct));

productRoutes.post('/:id/submit-for-review', requirePermissions(Permission.PRODUCT_CREATE), asyncHandler(productController.submitProductForReview));
productRoutes.post('/:id/review', requirePermissions(Permission.PRODUCT_PUBLISH), asyncHandler(productController.reviewProduct));
productRoutes.post('/:id/archive', requirePermissions(Permission.PRODUCT_DELETE), asyncHandler(productController.archiveProduct));
productRoutes.post('/:id/toggle-activation', requirePermissions(Permission.PRODUCT_EDIT), asyncHandler(productController.toggleProductActivation));

export default productRoutes;
