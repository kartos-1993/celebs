import { Request, Response } from 'express';

import { NotificationService, notificationService } from './notification.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  registerToken = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { pushToken } = req.body as { pushToken: string };
    await this.service.registerToken(userId, pushToken);
    return sendCreated(res, null, 'Push token registered successfully');
  };

  unregisterToken = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const { pushToken } = req.body as { pushToken: string };
    await this.service.unregisterToken(userId, pushToken);
    return sendSuccess(res, null, 'Push token unregistered successfully');
  };

  broadcast = async (req: Request, res: Response) => {
    const { title, body, data } = req.body as {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
    const count = await this.service.sendToAll(title, body, data);
    return sendSuccess(res, { dispatchedCount: count }, 'Broadcast notification sent successfully');
  };
}

export const notificationController = new NotificationController();
