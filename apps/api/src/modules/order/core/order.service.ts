import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { enqueueOrderCancelledEmail } from '../utils/order-email.util';

import { CoreOrderRepository, coreOrderRepository } from './order.repository';

export class CoreOrderService {
  constructor(private repo: CoreOrderRepository = coreOrderRepository) {}

  async getMyOrders(userId: string, page = 1, limit = 10) {
    return this.repo.findOrdersByUser(userId, page, limit);
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.repo.findOrderById(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.repo.findOrderById(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (['HANDED_OVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new AppError(
        `Cannot cancel order in status ${order.status}`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const result = await this.repo.applyOrderCancellation({
      id: order.id,
      items: order.items.map((item) => ({
        inventoryId: item.inventoryId,
        quantity: item.quantity,
      })),
    });

    enqueueOrderCancelledEmail(order).catch(() => {});

    return result;
  }

  async adminGetOrders(status?: string, page = 1, limit = 10) {
    return this.repo.findAdminOrders(status, page, limit);
  }

  async getOrderSummaryCounts(userId: string) {
    return this.repo.getOrderSummaryCounts(userId);
  }
}

export const coreOrderService = new CoreOrderService();
