import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { BannerController } from './banner.controller';
import { bannerService } from './banner.service';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const bannerRouter = Router();
const controller = new BannerController(bannerService);

// GET /api/v1/banners (Public)
bannerRouter.get('/', asyncHandler(controller.getBanners));

// GET /api/v1/banners/all (Superadmin only)
bannerRouter.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(controller.getAllBanners),
);

// PUT /api/v1/banners (Superadmin only)
bannerRouter.put(
  '/',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(controller.updateBanners),
);

export default bannerRouter;
