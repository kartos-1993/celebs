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

// Global middleware for notification routes: JWT Authentication + Actor Context
notificationRoutes.use(authenticateJWT, asyncHandler(actorContext));

// 1. Device push token registration & teardown
notificationRoutes.post(
  '/push-tokens',
  validateBody(registerPushTokenSchema),
  asyncHandler(notificationController.registerPushToken),
);

notificationRoutes.delete(
  '/push-tokens',
  validateBody(unregisterPushTokenSchema),
  asyncHandler(notificationController.unregisterPushToken),
);

// 2. Personal & Store inbox management (Standard REST collection /notifications)
notificationRoutes.get(
  '/',
  validateQuery(getInboxQuerySchema),
  asyncHandler(notificationController.getInbox),
);

notificationRoutes.get('/unread-count', asyncHandler(notificationController.getUnreadCount));

notificationRoutes.patch('/read-all', asyncHandler(notificationController.markAllAsRead));

notificationRoutes.patch(
  '/:id/read',
  validateParams(notificationIdParamSchema),
  asyncHandler(notificationController.markAsRead),
);

// 3. Administrative Support Audit (Staff inspecting a vendor's delivery notifications)
notificationRoutes.get(
  '/vendors/:vendorId',
  requireAnyPermission(Permission.VENDOR_MANAGE, Permission.ORDER_VIEW),
  validateQuery(getInboxQuerySchema),
  asyncHandler(notificationController.getVendorNotificationsForAdmin),
);

// 4. Admin marketing broadcast
notificationRoutes.post(
  '/broadcast',
  requireAnyPermission(Permission.PLATFORM_MANAGE, Permission.USER_MANAGE),
  validateBody(broadcastPayloadSchema),
  asyncHandler(notificationController.broadcast),
);

export default notificationRoutes;
