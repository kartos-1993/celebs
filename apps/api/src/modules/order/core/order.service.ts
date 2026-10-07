import { OrderStatus } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { validateTransition } from '../order.state-machine';
import { enqueueOrderCancelledEmail } from '../utils/order-email.util';

import { CoreOrderRepository, coreOrderRepository } from './order.repository';

import {
  NotificationService,
  notificationService as defaultNotificationService,
} from '@/modules/notification/notification.service';
import {
  RefundService,
  refundService as defaultRefundService,
} from '@/modules/order/refund/refund.service';

export class CoreOrderService {
  constructor(
    private readonly repo: CoreOrderRepository = coreOrderRepository,
    private readonly notificationService: NotificationService = defaultNotificationService,
    private readonly refundService: RefundService = defaultRefundService,
  ) {}

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

    // The state machine is the single authority on what can still be cancelled.
    // It keeps HANDED_OVER cancellable (a parcel can be recalled before it is
    // out for delivery) and refuses DELIVERED, CANCELLED and RETURNED.
    validateTransition(order.status, OrderStatus.CANCELLED);

    const result = await this.repo.applyOrderCancellation({
      id: order.id,
      items: order.items.map((item) => ({
        inventoryId: item.inventoryId,
        quantity: item.quantity,
      })),
    });

    // After the transaction commits, never inside it: this makes a network call
    // to a payment gateway, and holding a pooled connection for the duration of
    // one is how the port-6543 pool runs dry under load.
    const refund = await this.refundService
      .initiateRefund({ orderId: order.id, initiatedBy: userId, reason: 'ORDER_CANCELLED' })
      .catch((error: unknown) => {
        logger.error(
          { orderId: order.id, error: (error as Error).message },
          'Refund request failed',
        );
        return null;
      });

    enqueueOrderCancelledEmail(order, undefined, 'order-cancelled', refund).catch(() => {});

    this.notificationService
      .notifyOrderStatus({
        userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'CANCELLED',
      })
      .catch(() => {});

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
