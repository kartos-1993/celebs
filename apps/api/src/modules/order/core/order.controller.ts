import { Request, Response } from 'express';

import { CoreOrderService,coreOrderService } from './order.service';

import { sendSuccess } from '@/common/utils/response.util';

export class CoreOrderController {
  constructor(private service: CoreOrderService = coreOrderService) {}

  getMyOrders = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.service.getMyOrders(userId, page, limit);
    return sendSuccess(res, result, 'Orders retrieved successfully');
  };

  getOrderById = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const orderId = req.params.orderId || '';
    const order = await this.service.getOrderById(userId, orderId);
    return sendSuccess(res, order, 'Order retrieved successfully');
  };

  cancelOrder = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const orderId = req.params.orderId || '';
    const cancelled = await this.service.cancelOrder(userId, orderId);
    return sendSuccess(res, cancelled, 'Order cancelled successfully');
  };

  adminGetOrders = async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.service.adminGetOrders(status, page, limit);
    return sendSuccess(res, result, 'Admin orders retrieved successfully');
  };
}

export const coreOrderController = new CoreOrderController();
