import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { brandController } from './brand.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor, requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// ── Public Storefront Brand Routes ──
router.get('/', searchRateLimiter, brandController.getAllBrands);
router.get('/:id', searchRateLimiter, brandController.getBrandByIdOrSlug);

// ── Seller Brand Authorization Routes ──
const approvedSeller = [requireStoreState(['APPROVED'])];

router.post(
  '/authorizations',
  authenticateJWT,
  asyncHandler(actorContext),
  ...approvedSeller,
  requirePermissions(Permission.PRODUCT_CREATE),
  brandController.submitAuthorization,
);

router.get(
  '/authorizations/my',
  authenticateJWT,
  asyncHandler(actorContext),
  ...approvedSeller,
  brandController.getMyAuthorizations,
);

// ── Platform Admin Brand Management Routes ──
router.get(
  '/admin/authorizations',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.getPendingAuthorizations,
);

router.patch(
  '/admin/authorizations/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.reviewAuthorization,
);

router.post(
  '/admin',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.createBrand,
);

router.put(
  '/admin/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.BRAND_MANAGE),
  brandController.updateBrand,
);

export default router;
