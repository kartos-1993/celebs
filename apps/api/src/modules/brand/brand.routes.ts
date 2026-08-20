import { Router } from 'express';

import { Permission } from '@celebs/rbac';

import { brandController } from './brand.controller';

import { authenticateJWT, requireApprovedVendor } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// ── Public Storefront Brand Routes ──
router.get('/', searchRateLimiter, brandController.getAllBrands);
router.get('/:id', searchRateLimiter, brandController.getBrandByIdOrSlug);

// ── Seller Brand Authorization Routes ──
router.post(
  '/authorizations',
  authenticateJWT,
  requireApprovedVendor,
  requirePermissions(Permission.PRODUCT_CREATE),
  brandController.submitAuthorization,
);

router.get(
  '/authorizations/my',
  authenticateJWT,
  requireApprovedVendor,
  brandController.getMyAuthorizations,
);

// ── Platform Admin Brand Management Routes ──
router.get(
  '/admin/authorizations',
  authenticateJWT,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.getPendingAuthorizations,
);

router.patch(
  '/admin/authorizations/:id',
  authenticateJWT,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.reviewAuthorization,
);

router.post(
  '/admin',
  authenticateJWT,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.createBrand,
);

router.put(
  '/admin/:id',
  authenticateJWT,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.updateBrand,
);

export default router;
