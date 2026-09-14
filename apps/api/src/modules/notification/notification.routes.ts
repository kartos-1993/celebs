import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { notificationController } from './notification.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requireAnyPermission } from '@/middlewares/rbac.middleware';

const notificationRoutes = Router();

// User device push token registration
notificationRoutes.post(
  '/push-tokens',
  authenticateJWT,
  asyncHandler(notificationController.registerToken),
);

notificationRoutes.delete(
  '/push-tokens',
  authenticateJWT,
  asyncHandler(notificationController.unregisterToken),
);

// Admin marketing / broadcast notifications
notificationRoutes.post(
  '/broadcast',
  authenticateJWT,
  asyncHandler(actorContext),
  requireAnyPermission(Permission.PLATFORM_MANAGE, Permission.USER_MANAGE),
  asyncHandler(notificationController.broadcast),
);

export default notificationRoutes;
