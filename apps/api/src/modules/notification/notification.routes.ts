import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  broadcastPayloadSchema,
  getInboxQuerySchema,
  notificationIdParamSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { notificationController } from './notification.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requireAnyPermission } from '@/middlewares/rbac.middleware';
import { validateBody, validateParams, validateQuery } from '@/middlewares/validate';

const notificationRoutes = Router();

// 1. Device push token registration & teardown
notificationRoutes.post(
  '/push-tokens',
  authenticateJWT,
  validateBody(registerPushTokenSchema),
  asyncHandler(notificationController.registerPushToken),
);

notificationRoutes.delete(
  '/push-tokens',
  authenticateJWT,
  validateBody(unregisterPushTokenSchema),
  asyncHandler(notificationController.unregisterPushToken),
);

// 2. Personal inbox management (Standard REST collection /notifications)
notificationRoutes.get(
  '/',
  authenticateJWT,
  validateQuery(getInboxQuerySchema),
  asyncHandler(notificationController.getInbox),
);

notificationRoutes.get(
  '/unread-count',
  authenticateJWT,
  asyncHandler(notificationController.getUnreadCount),
);

notificationRoutes.patch(
  '/read-all',
  authenticateJWT,
  asyncHandler(notificationController.markAllAsRead),
);

notificationRoutes.patch(
  '/:id/read',
  authenticateJWT,
  validateParams(notificationIdParamSchema),
  asyncHandler(notificationController.markAsRead),
);

// 3. Admin marketing broadcast
notificationRoutes.post(
  '/broadcast',
  authenticateJWT,
  asyncHandler(actorContext),
  requireAnyPermission(Permission.PLATFORM_MANAGE, Permission.USER_MANAGE),
  validateBody(broadcastPayloadSchema),
  asyncHandler(notificationController.broadcast),
);

export default notificationRoutes;
