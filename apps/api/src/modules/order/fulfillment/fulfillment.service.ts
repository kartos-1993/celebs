import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { isDispatchAllowed } from '../../logistics/delivery-coverage';
import {
  type DeliveryCoverageRepository,
  deliveryCoverageRepository,
} from '../../logistics/delivery-coverage.repository';
import { coreOrderRepository } from '../core/order.repository';
import { enqueueOrderDeliveredEmail, enqueueOrderShippedEmail } from '../utils/order-email.util';

import { FulfillmentRepository, fulfillmentRepository } from './fulfillment.repository';

import { Prisma } from '@/config/db.prisma';
import {
  NotificationService,
  notificationService as defaultNotificationService,
} from '@/modules/notification/notification.service';

export class FulfillmentService {
  constructor(
    private repo: FulfillmentRepository = fulfillmentRepository,
    private notificationService: NotificationService = defaultNotificationService,
    private coverageRepo: DeliveryCoverageRepository = deliveryCoverageRepository,
  ) {}

  async getVendorOrders(
    vendorId?: string,
    status?: string,
    page = 1,
    limit = 10,
    isPlatform = false,
  ) {
    if (!vendorId && !isPlatform) {
      throw new AppError(
        'Seller store context required',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }

    const whereCondition: Prisma.OrderItemWhereInput = {};
    if (vendorId) {
      whereCondition.vendorId = vendorId;
    }
    if (status) {
      whereCondition.itemStatus = status as Prisma.EnumOrderItemStatusFilter['equals'];
    }

    return this.repo.findVendorOrderItems(whereCondition, page, limit);
  }

  async getVendorOrderById(orderId: string, vendorId?: string, isPlatform = false) {
    if (!vendorId && !isPlatform) {
      throw new AppError(
        'Seller store context required',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }

    const order = await this.repo.findVendorOrderWithItems(
      orderId,
      isPlatform ? undefined : vendorId,
    );

    if (!order || (Array.isArray(order.items) && order.items.length === 0)) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  async updateOrderItemStatus(
    vendorId: string | undefined,
    orderItemId: string,
    itemStatus: 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED',
    trackingNumber?: string,
    courierPartner?: string,
    isPlatform = false,
  ) {
    const item = isPlatform
      ? await this.repo.findOrderItemById(orderItemId)
      : await this.repo.findVendorOrderItemById(orderItemId, vendorId || '');

    if (!item) {
      throw new AppError(
        isPlatform ? 'Order item not found' : 'Order item not found for vendor',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    // Handing over is the point the parcel leaves for the customer, so it is the
    // point to ask whether we deliver there. Packing, cancelling and delivering
    // are warehouse actions on an order that already exists and must keep working
    // even where a district has since been retired.
    if (itemStatus === 'HANDED_OVER') {
      const coverage = await this.coverageRepo.coverageForAddress({
        logisticsZoneId: item.order.address?.logisticsZoneId ?? null,
      });

      // A seller is carrying the parcel by hand, so an empty or stale mirror on
      // our side does not stop them. A district the courier has positively retired
      // does, because the parcel would be promised to someone we cannot deliver to.
      if (!isDispatchAllowed(coverage.status, true)) {
        throw new AppError(
          coverage.status === 'UNCOVERED'
            ? `Cannot hand over to ${coverage.cityName ?? 'this area'}: the courier does not deliver there.`
            : 'Cannot hand over: delivery coverage for this address is unconfirmed. The address needs a delivery district.',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
    }

    const { updatedItem, newOrderStatus, allDelivered, isPaid } =
      await this.repo.applyOrderItemStatus({
        orderItemId,
        orderId: item.orderId,
        inventoryId: item.inventoryId,
        quantity: item.quantity,
        previousItemStatus: item.itemStatus,
        orderStatus: item.order.status,
        orderPaymentMethod: item.order.paymentMethod,
        itemStatus,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(courierPartner ? { courierPartner } : {}),
        source: isPlatform ? 'PLATFORM' : 'VENDOR',
      });

    if (newOrderStatus !== item.order.status) {
      this.triggerFulfillmentEmail(
        item.orderId,
        newOrderStatus,
        trackingNumber,
        courierPartner,
      ).catch(() => {});
    }

    if (allDelivered && !isPaid) {
      logger.error(
        { orderId: item.orderId },
        'Order delivered without completed payment — paymentStatus left PENDING',
      );
    }

    return updatedItem;
  }

  private async triggerFulfillmentEmail(
    orderId: string,
    newStatus: string,
    trackingNumber?: string,
    courierPartner?: string,
  ) {
    try {
      const fullOrder = await coreOrderRepository.findOrderById(orderId);
      if (!fullOrder) return;

      if (newStatus === 'HANDED_OVER') {
        await enqueueOrderShippedEmail(fullOrder, {
          courierName: courierPartner || fullOrder.courierName || 'Standard Delivery',
          trackingNumber: trackingNumber || fullOrder.trackingNumber || undefined,
          trackingUrl: fullOrder.trackingUrl || undefined,
          estimatedDelivery: fullOrder.estimatedDelivery || undefined,
        });
      } else if (newStatus === 'DELIVERED') {
        await enqueueOrderDeliveredEmail(fullOrder);
      }

      this.notificationService
        .notifyOrderStatus({
          userId: fullOrder.userId,
          orderId: fullOrder.id,
          orderNumber: fullOrder.orderNumber,
          status: newStatus,
          trackingNumber: trackingNumber || fullOrder.trackingNumber || undefined,
        })
        .catch(() => {});
    } catch {
      // Non-blocking dispatch
    }
  }
}

export const fulfillmentService = new FulfillmentService();
