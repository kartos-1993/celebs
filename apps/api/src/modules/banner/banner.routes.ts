import { Router } from 'express';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { asyncHandler } from '@celebs/shared-utils';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

const bannerRouter = Router();
const controller = new BannerController(new BannerService());

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
