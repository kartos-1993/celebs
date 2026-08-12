import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { createCampaignSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { authenticateJWT } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';

import { CampaignService } from './campaign.service';

const router = Router();
const campaignService = new CampaignService();

// Public routes for storefront
router.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const campaigns = await campaignService.getActiveCampaigns();
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaigns });
  }),
);

router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (_req, res) => {
    const campaigns = await campaignService.getAllCampaigns();
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaigns });
  }),
);

router.get(
  '/id/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id || '';
    const campaign = await campaignService.getCampaignById(id);
    if (!campaign) {
      res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Campaign not found' });
      return;
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaign });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug || '';
    const campaign = await campaignService.getCampaignBySlug(slug);
    if (!campaign) {
      res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Campaign not found' });
      return;
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaign });
  }),
);

// Protected Admin routes
router.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const validatedPayload = createCampaignSchema.parse(req.body);
    const newCampaign = await campaignService.createCampaign(validatedPayload);
    res.status(HTTPSTATUS.CREATED).json({ success: true, data: newCampaign });
  }),
);

router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const id = req.params.id || '';
    const updated = await campaignService.updateCampaign(id, req.body);
    res.status(HTTPSTATUS.OK).json({ success: true, data: updated });
  }),
);

export default router;
