import { NextFunction,Request, Response, Router } from 'express';
import passport from 'passport';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { authenticateJWT, requireApprovedVendor } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const productRoutes = Router();
const productController = new ProductController(new ProductService());

// Optional JWT authentication: populates req.user if token is present, but doesn't block unauthenticated storefront users
const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const hasAuthHeader =
    !!authHeader &&
    authHeader.startsWith('Bearer ') &&
    authHeader !== 'Bearer null' &&
    authHeader !== 'Bearer undefined';
  const hasCookieToken = !!req.cookies?.accessToken;
  if (!hasAuthHeader && !hasCookieToken) {
    return next();
  }
  try {
    passport.authenticate('jwt', { session: false }, (_err: unknown, user: Express.User | false) => {
      if (user) {
        req.user = user;
      }
      next();
    })(req, res, next);
  } catch {
    next();
  }
};

// Public / Storefront Product Routes (Optional Auth)
productRoutes.get(
  '/',
  searchRateLimiter,
  optionalAuthenticateJWT,
  asyncHandler(productController.getProducts),
);
productRoutes.get(
  '/review-product-queue',
  authenticateJWT,
  requirePermissions(Permission.PRODUCT_REVIEW),
  asyncHandler(productController.getProductReviewQueue),
);
productRoutes.get(
  '/:id',
  searchRateLimiter,
  optionalAuthenticateJWT,
  asyncHandler(productController.getProductById),
);

// Protected Admin / Vendor Routes (Require Auth & Permissions)
productRoutes.use(authenticateJWT);

productRoutes.post(
  '/',
  requireApprovedVendor,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.createProduct),
);
productRoutes.put(
  '/:id',
  requireApprovedVendor,
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.updateProduct),
);

productRoutes.post(
  '/:id/submit-for-review',
  requireApprovedVendor,
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(productController.submitProductForReview),
);
productRoutes.post(
  '/:id/review',
  requirePermissions(Permission.PRODUCT_PUBLISH),
  asyncHandler(productController.reviewProduct),
);
productRoutes.post(
  '/:id/archive',
  requirePermissions(Permission.PRODUCT_DELETE),
  asyncHandler(productController.archiveProduct),
);
productRoutes.post(
  '/:id/toggle-activation',
  requirePermissions(Permission.PRODUCT_EDIT),
  asyncHandler(productController.toggleProductActivation),
);

export default productRoutes;
