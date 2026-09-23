import type { Request, Response } from 'express';

import {
  broadcastPayloadSchema,
  getInboxQuerySchema,
  notificationIdParamSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  vendorIdParamSchema,
} from '@celebs/shared-types';

import { NotificationService, notificationService } from './notification.service';

import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  registerPushToken = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const input = registerPushTokenSchema.parse(req.body);
    await this.service.registerPushToken(userId, input);
    return sendCreated(res, null, 'Push token registered successfully');
  };

  unregisterPushToken = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const { pushToken } = unregisterPushTokenSchema.parse(req.body);
    await this.service.unregisterPushToken(userId, pushToken);
    return sendSuccess(res, null, 'Push token unregistered successfully');
  };

  getInbox = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const storeId = req.store?.id || null;
    const query = getInboxQuerySchema.parse(req.query);
    const result = await this.service.getInbox(userId, query, storeId);
    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Notifications retrieved successfully',
    );
  };

  getUnreadCount = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const storeId = req.store?.id || null;
    const result = await this.service.getUnreadCount(userId, storeId);
    return sendSuccess(res, result, 'Unread notification count retrieved');
  };

  markAsRead = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const storeId = req.store?.id || null;
    const { id } = notificationIdParamSchema.parse(req.params);
    const updated = await this.service.markAsRead(userId, id, storeId);
    return sendSuccess(res, updated, 'Notification marked as read');
  };

  markAllAsRead = async (req: Request, res: Response) => {
    const userId = req.actor?.userId || req.user?.id || '';
    const storeId = req.store?.id || null;
    const result = await this.service.markAllAsRead(userId, storeId);
    return sendSuccess(res, result, 'All notifications marked as read');
  };

  getVendorNotificationsForAdmin = async (req: Request, res: Response) => {
    const { vendorId } = vendorIdParamSchema.parse(req.params);
    const query = getInboxQuerySchema.parse(req.query);
    const result = await this.service.getVendorNotificationsForAdmin(vendorId, query);
    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Vendor notifications retrieved successfully',
    );
  };

  broadcast = async (req: Request, res: Response) => {
    const adminUserId = req.actor?.userId || req.user?.id || '';
    const input = broadcastPayloadSchema.parse(req.body);
    const result = await this.service.broadcast(adminUserId, input);
    return sendSuccess(res, result, 'Broadcast notification queued successfully');
  };
}

export const notificationController = new NotificationController();
