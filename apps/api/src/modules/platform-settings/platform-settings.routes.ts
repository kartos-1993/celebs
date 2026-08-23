import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  bulkUpdatePlatformSettingsSchema,
  updatePlatformSettingSchema,
  upsertPlatformSettingSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { platformSettingsController } from './platform-settings.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
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
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getAuditLogs)
);

platformSettingsRouter.get(
  '/',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getAllSettings)
);

platformSettingsRouter.post(
  '/',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(upsertPlatformSettingSchema),
  asyncHandler(platformSettingsController.upsertSetting)
);

platformSettingsRouter.get(
  '/:key',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  asyncHandler(platformSettingsController.getSettingByKey)
);

platformSettingsRouter.put(
  '/:key',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(updatePlatformSettingSchema),
  asyncHandler(platformSettingsController.updateSetting)
);

platformSettingsRouter.post(
  '/bulk',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.PLATFORM_MANAGE),
  validateBody(bulkUpdatePlatformSettingsSchema),
  asyncHandler(platformSettingsController.bulkUpdateSettings)
);

export default platformSettingsRouter;

