import { Router } from 'express';

import { Permission } from '@celebs/rbac';

import { campaignController } from './campaign.controller';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Public routes for storefront
router.get('/active', campaignController.getActiveCampaigns);
router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  campaignController.getAllCampaigns,
);
router.get('/id/:id', campaignController.getCampaignById);
router.get('/:slug', campaignController.getCampaignBySlug);

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
