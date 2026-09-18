import type { Request, Response } from 'express';

import type {
  BroadcastPayloadInput,
  GetInboxQueryInput,
  NotificationIdParamInput,
  RegisterPushTokenInput,
  UnregisterPushTokenInput,
} from '@celebs/shared-types';

import { NotificationService, notificationService } from './notification.service';

import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  registerPushToken = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const input = req.body as RegisterPushTokenInput;
    await this.service.registerPushToken(userId, input);
    return sendCreated(res, null, 'Push token registered successfully');
  };

  unregisterPushToken = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { pushToken } = req.body as UnregisterPushTokenInput;
    await this.service.unregisterPushToken(userId, pushToken);
    return sendSuccess(res, null, 'Push token unregistered successfully');
  };

  getInbox = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const query = req.query as unknown as GetInboxQueryInput;
    const result = await this.service.getInbox(userId, query);
    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Notifications retrieved successfully',
    );
  };

  getUnreadCount = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const result = await this.service.getUnreadCount(userId);
    return sendSuccess(res, result, 'Unread notification count retrieved');
  };

  markAsRead = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { id } = req.params as NotificationIdParamInput;
    const updated = await this.service.markAsRead(userId, id);
    return sendSuccess(res, updated, 'Notification marked as read');
  };

  markAllAsRead = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const result = await this.service.markAllAsRead(userId);
    return sendSuccess(res, result, 'All notifications marked as read');
  };

  broadcast = async (req: Request, res: Response) => {
    const adminUserId = req.user?.id || '';
    const input = req.body as BroadcastPayloadInput;
    const result = await this.service.broadcast(adminUserId, input);
    return sendSuccess(res, result, 'Broadcast notification queued successfully');
  };
}

export const notificationController = new NotificationController();
