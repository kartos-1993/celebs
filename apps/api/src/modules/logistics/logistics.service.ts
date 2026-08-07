import prisma from '../../db/index';
import { nepalCanMoveAdapter } from './adapters/nepal-can-move.adapter';
import { OrderStatus, CodStatus, DispatchMode } from '@prisma/client';
import { DispatchOrderType } from '@celebs/shared-types';

export class LogisticsService {
  async dispatchOrder(payload: DispatchOrderType) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { address: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    let trackingNumber = payload.manualTrackingNumber || '';
    let trackingUrl = payload.manualTrackingUrl || '';
    let courierName = payload.manualCourierName || 'Standard Delivery';
    let estimatedDelivery: Date | undefined;

    if (payload.provider === 'NEPAL_CAN_MOVE') {
      const shipment = await nepalCanMoveAdapter.createShipment({
        orderId: order.id,
        recipientName: order.address.fullName,
        recipientPhone: order.address.phone,
        deliveryAddress: `${order.address.streetAddress}, ${order.address.cityArea}`,
        city: order.address.cityArea,
        district: order.address.district,
        codAmount: order.paymentMethod === 'COD' ? Number(order.totalAmount) : 0,
      });

      trackingNumber = shipment.trackingNumber;
      trackingUrl = shipment.trackingUrl;
      courierName = shipment.courierName;
      estimatedDelivery = shipment.estimatedDelivery;
    }

    const codStatus = order.paymentMethod === 'COD' ? CodStatus.PENDING_COLLECTION : CodStatus.NOT_APPLICABLE;
    const dispatchMode = payload.provider === 'MANUAL' ? DispatchMode.MANUAL : DispatchMode.AUTOMATED_3PL;

    // Update order with 3PL details and log OrderTrackingEvent
    const updatedOrder = await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        status: OrderStatus.HANDED_OVER,
        dispatchMode,
        courierProvider: payload.provider,
        courierName,
        trackingNumber,
        trackingUrl,
        codAmount: order.paymentMethod === 'COD' ? order.totalAmount : null,
        codStatus,
        estimatedDelivery,
        trackingEvents: {
          create: {
            status: OrderStatus.HANDED_OVER,
            title: `Handed over to ${courierName}`,
            description: payload.notes || `Dispatched via ${courierName}. Waybill: ${trackingNumber}`,
            location: 'Kathmandu Fulfillment Center',
            source: 'ADMIN',
          },
        },
      },
      include: {
        trackingEvents: true,
      },
    });

    return updatedOrder;
  }

  async markCodSettled(orderId: string, settlementReference: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        codStatus: CodStatus.COD_SETTLED,
        codSettledAt: new Date(),
        codReference: settlementReference,
      },
    });
  }

  async addTrackingEvent(orderId: string, status: OrderStatus, title: string, description?: string, location?: string) {
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

export const logisticsService = new LogisticsService();
