import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { FulfillmentRepository,fulfillmentRepository } from './fulfillment.repository';

import { Prisma } from '@/config/db.prisma';

export class FulfillmentService {
  constructor(private repo: FulfillmentRepository = fulfillmentRepository) {}

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

    const { updatedItem, allDelivered, isPaid } = await this.repo.applyOrderItemStatus({
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

    if (allDelivered && !isPaid) {
      logger.error(
        { orderId: item.orderId },
        'Order delivered without completed payment — paymentStatus left PENDING',
      );
    }

    return updatedItem;
  }
}

export const fulfillmentService = new FulfillmentService();
