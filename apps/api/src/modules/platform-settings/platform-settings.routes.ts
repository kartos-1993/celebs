import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  bulkUpdatePlatformSettingsSchema,
  updatePlatformSettingSchema,
  upsertPlatformSettingSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { platformSettingsController } from './platform-settings.controller';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { validateBody } from '@/middlewares/validate';

const platformSettingsRouter = Router();

// GET /api/v1/settings/public (Public: mobile app / web storefront)
platformSettingsRouter.get('/public', asyncHandler(platformSettingsController.getPublicSettings));

// Guarded routes (Superadmin / Platform Governance)
platformSettingsRouter.get(
  '/audit',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getAuditLogs)
);

platformSettingsRouter.get(
  '/',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getAllSettings)
);

platformSettingsRouter.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(upsertPlatformSettingSchema),
  asyncHandler(platformSettingsController.upsertSetting)
);


platformSettingsRouter.get(
  '/:key',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getSettingByKey)
);

platformSettingsRouter.put(
  '/:key',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(updatePlatformSettingSchema),
  asyncHandler(platformSettingsController.updateSetting)
);

platformSettingsRouter.post(
  '/bulk',
  authenticateJWT,
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(bulkUpdatePlatformSettingsSchema),
  asyncHandler(platformSettingsController.bulkUpdateSettings)
);

export default platformSettingsRouter;
