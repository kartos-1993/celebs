import { Router } from 'express';

import { Permission } from '@celebs/rbac';

import { campaignController } from './campaign.controller';

import { authenticateJWT, optionalAuthenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Public routes for storefront
router.get(
  '/active',
  optionalAuthenticateJWT,
  searchRateLimiter,
  campaignController.getActiveCampaigns,
);
router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  campaignController.getAllCampaigns,
);
router.get(
  '/id/:id',
  optionalAuthenticateJWT,
  searchRateLimiter,
  campaignController.getCampaignById,
);
router.get(
  '/:slug',
  optionalAuthenticateJWT,
  searchRateLimiter,
  campaignController.getCampaignBySlug,
);

// Protected Admin routes
router.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  campaignController.createCampaign,
);

router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  campaignController.updateCampaign,
);

export default router;
