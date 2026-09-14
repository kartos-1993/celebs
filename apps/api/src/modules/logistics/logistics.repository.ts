import { CodStatus, DispatchMode, OrderStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export interface UpdateDispatchedOrderData {
  orderId: string;
  dispatchMode: DispatchMode;
  courierProvider: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  codAmount: Prisma.Decimal | number | string | null;
  codStatus: CodStatus;
  estimatedDelivery?: Date;
  notes?: string;
}

export class LogisticsRepository {
  public async findOrderForDispatch(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { address: true, items: { select: { vendorId: true } } },
    });
  }

  public async updateDispatchedOrder(data: UpdateDispatchedOrderData) {
    return prisma.order.update({
      where: { id: data.orderId },
      data: {
        status: OrderStatus.HANDED_OVER,
        dispatchMode: data.dispatchMode,
        courierProvider: data.courierProvider,
        courierName: data.courierName,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        codAmount: data.codAmount,
        codStatus: data.codStatus,
        estimatedDelivery: data.estimatedDelivery,
        trackingEvents: {
          create: {
            status: OrderStatus.HANDED_OVER,
            title: `Handed over to ${data.courierName}`,
            description:
              data.notes || `Dispatched via ${data.courierName}. Waybill: ${data.trackingNumber}`,
            location: 'Kathmandu Fulfillment Center',
            source: 'ADMIN',
          },
        },
      },
      include: {
        trackingEvents: true,
      },
    });
  }

  public async markCodSettled(orderId: string, settlementReference: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        codStatus: CodStatus.COD_SETTLED,
        codSettledAt: new Date(),
        codReference: settlementReference,
        paymentStatus: 'COMPLETED',
        trackingEvents: {
          create: {
            status: OrderStatus.DELIVERED,
            title: 'COD Payment Settled',
            description: `Cash reconciled against courier deposit. Ref: ${settlementReference}`,
            source: 'PLATFORM',
          },
        },
      },
    });
  }

  public async findOrderByTrackingNumber(trackingNumber: string) {
    return prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        user: { select: { id: true, name: true, email: true } },
        address: true,
        items: true,
      },
    });
  }

  public async applyAutomatedTrackingEvent(data: {
    orderId: string;
    status: OrderStatus;
    title: string;
    description?: string;
    location?: string;
    source?: string;
  }) {
    return prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: data.orderId },
        });

        const statusChanged = order.status !== data.status;

        const event = await tx.orderTrackingEvent.create({
          data: {
            orderId: data.orderId,
            status: data.status,
            title: data.title,
            description: data.description,
            location: data.location,
            source: data.source || 'COURIER_WEBHOOK',
          },
        });

        if (statusChanged) {
          await tx.order.update({
            where: { id: data.orderId },
            data: {
              status: data.status,
              ...(data.status === OrderStatus.DELIVERED && order.paymentMethod === 'COD'
                ? { paymentStatus: 'COMPLETED' }
                : {}),
            },
          });

          if (data.status === OrderStatus.DELIVERED) {
            await tx.orderItem.updateMany({
              where: { orderId: data.orderId },
              data: { itemStatus: 'DELIVERED' },
            });
          }
        }

        return { order, event, statusChanged };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  public async addTrackingEvent(
    orderId: string,
    status: OrderStatus,
    title: string,
    description?: string,
    location?: string,
  ) {
    return prisma.orderTrackingEvent.create({
      data: {
        orderId,
        status,
        title,
        description,
        location,
        source: 'ADMIN',
      },
    });
  }
}

export const logisticsRepository = new LogisticsRepository();
