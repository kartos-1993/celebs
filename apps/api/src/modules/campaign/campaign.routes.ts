import { Router } from 'express';
import { CampaignService } from './campaign.service';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';
import { createCampaignSchema } from '@celebs/shared-types';

const router = Router();
const campaignService = new CampaignService();

// Public routes for storefront
router.get(
  '/active',
  asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getActiveCampaigns();
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaigns });
  })
);

router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const campaigns = await campaignService.getAllCampaigns();
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaigns });
  })
);

router.get(
  '/id/:id',
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Campaign not found' });
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaign });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.getCampaignBySlug(req.params.slug);
    if (!campaign) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({ success: false, message: 'Campaign not found' });
    }
    res.status(HTTPSTATUS.OK).json({ success: true, data: campaign });
  })
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
  })
);

router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(async (req, res) => {
    const updated = await campaignService.updateCampaign(req.params.id, req.body);
    res.status(HTTPSTATUS.OK).json({ success: true, data: updated });
  })
);

export default router;
