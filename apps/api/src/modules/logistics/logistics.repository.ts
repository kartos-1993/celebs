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
      },
    });
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
