import { OrderItemStatus, OrderStatus, PaymentMethod } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export class FulfillmentRepository {
  async findVendorOrderItems(where: Prisma.OrderItemWhereInput, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.orderItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              address: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.orderItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findVendorOrderItemById(id: string, vendorId: string) {
    return prisma.orderItem.findFirst({
      where: { id, vendorId },
      include: { order: { include: { items: true } } },
    });
  }

  async findOrderItemById(id: string) {
    return prisma.orderItem.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
  }

  async findVendorOrderWithItems(orderId: string, vendorId?: string) {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        ...(vendorId ? { items: { some: { vendorId } } } : {}),
      },
      include: {
        items: vendorId ? { where: { vendorId } } : true,
        address: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Item-status write with parent rollup. Rollup evaluation (all packed / handed-over /
   * delivered) lives here because the read of sibling items and order flip must be atomic.
   */
  async applyOrderItemStatus(data: {
    orderItemId: string;
    orderId: string;
    inventoryId: string;
    quantity: number;
    previousItemStatus: OrderItemStatus;
    orderStatus: OrderStatus;
    orderPaymentMethod: PaymentMethod;
    itemStatus: OrderItemStatus;
    trackingNumber?: string;
    courierPartner?: string;
    source: string;
  }) {
    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updatedItem = await tx.orderItem.update({
          where: { id: data.orderItemId },
          data: {
            itemStatus: data.itemStatus,
            ...(data.trackingNumber ? { trackingNumber: data.trackingNumber } : {}),
            ...(data.courierPartner ? { courierPartner: data.courierPartner } : {}),
          },
        });

        // If item is DELIVERED, finalize inventory deduction
        if (data.itemStatus === 'DELIVERED' && data.previousItemStatus !== 'DELIVERED') {
          await tx.productInventory.update({
            where: { id: data.inventoryId },
            data: {
              quantity: { decrement: data.quantity },
              reservedQuantity: { decrement: data.quantity },
            },
          });
        }

        // If item is CANCELLED and was not already CANCELLED or DELIVERED, release reserved stock
        if (
          data.itemStatus === 'CANCELLED' &&
          data.previousItemStatus !== 'CANCELLED' &&
          data.previousItemStatus !== 'DELIVERED'
        ) {
          await tx.productInventory.update({
            where: { id: data.inventoryId },
            data: {
              reservedQuantity: { decrement: data.quantity },
            },
          });
        }

        // Check active items in parent order (excluding cancelled items)
        const allItems = await tx.orderItem.findMany({
          where: { orderId: data.orderId },
        });

        const activeItems = allItems.filter((i) => i.itemStatus !== 'CANCELLED');

        let newOrderStatus = data.orderStatus;
        let allDelivered = false;

        if (activeItems.length === 0) {
          newOrderStatus = 'CANCELLED';
        } else {
          allDelivered = activeItems.every((i) => i.itemStatus === 'DELIVERED');
          const anyInTransit = activeItems.some((i) =>
            ['HANDED_OVER', 'DELIVERED'].includes(i.itemStatus),
          );
          const anyPacked = activeItems.some((i) =>
            ['PACKED', 'HANDED_OVER', 'DELIVERED'].includes(i.itemStatus),
          );

          if (allDelivered) {
            newOrderStatus = 'DELIVERED';
          } else if (anyInTransit) {
            newOrderStatus = 'HANDED_OVER';
          } else if (anyPacked) {
            newOrderStatus = 'PACKED';
          }
        }

        const isPaid =
          data.orderPaymentMethod === 'COD' ||
          Boolean(
            await tx.payment.findFirst({
              where: { orderId: data.orderId, status: 'COMPLETED' },
            }),
          );

        if (newOrderStatus !== data.orderStatus) {
          await tx.order.update({
            where: { id: data.orderId },
            data: {
              status: newOrderStatus,
              ...(allDelivered && isPaid ? { paymentStatus: 'COMPLETED' } : {}),
              ...(data.trackingNumber ? { trackingNumber: data.trackingNumber } : {}),
              ...(data.courierPartner ? { courierName: data.courierPartner } : {}),
            },
          });

          const eventTitle =
            newOrderStatus === 'PACKED'
              ? 'Order Packed'
              : newOrderStatus === 'HANDED_OVER'
                ? 'Handed Over to Courier'
                : 'Delivered';
          const eventDescription =
            newOrderStatus === 'HANDED_OVER'
              ? `Your package ${data.trackingNumber ? `(${data.trackingNumber}) ` : ''}is on its way${
                  data.courierPartner ? ` via ${data.courierPartner}` : ''
                }.`
              : newOrderStatus === 'PACKED'
                ? 'All items have been verified, packed, and prepared for shipping.'
                : newOrderStatus === 'DELIVERED'
                  ? 'Your order has been safely delivered. Thank you for shopping with us!'
                  : undefined;

          await tx.orderTrackingEvent.create({
            data: {
              orderId: data.orderId,
              status: newOrderStatus,
              title: eventTitle,
              ...(eventDescription ? { description: eventDescription } : {}),
              ...(data.courierPartner ? { location: data.courierPartner } : {}),
              source: data.source,
            },
          });
        }

        return { updatedItem, newOrderStatus, allDelivered, isPaid };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
