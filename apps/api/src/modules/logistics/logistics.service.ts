import { CodStatus, DispatchMode, OrderStatus } from '@prisma/client';

import { DispatchOrderType } from '@celebs/shared-types';
import { ForbiddenException, NotFoundException } from '@celebs/shared-utils';

import { nepalCanMoveAdapter } from './adapters/nepal-can-move.adapter';
import { type LogisticsRepository, logisticsRepository } from './logistics.repository';

export interface LogisticsServiceDeps {
  logisticsRepo?: LogisticsRepository;
}

export class LogisticsService {
  private logisticsRepo: LogisticsRepository;

  constructor(deps: LogisticsServiceDeps = {}) {
    this.logisticsRepo = deps.logisticsRepo ?? logisticsRepository;
  }

  async dispatchOrder(payload: DispatchOrderType, actorStoreId: string | null = null) {
    const order = await this.logisticsRepo.findOrderForDispatch(payload.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Tenant isolation: sellers can only dispatch orders that contain their own items
    if (actorStoreId) {
      const ownsItem = order.items.some((it) => it.vendorId === actorStoreId);
      if (!ownsItem) {
        throw new ForbiddenException('You do not own any item in this order');
      }
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

    const codStatus =
      order.paymentMethod === 'COD' ? CodStatus.PENDING_COLLECTION : CodStatus.NOT_APPLICABLE;
    const dispatchMode =
      payload.provider === 'MANUAL' ? DispatchMode.MANUAL : DispatchMode.AUTOMATED_3PL;

    return this.logisticsRepo.updateDispatchedOrder({
      orderId: payload.orderId,
      dispatchMode,
      courierProvider: payload.provider,
      courierName,
      trackingNumber,
      trackingUrl,
      codAmount: order.paymentMethod === 'COD' ? order.totalAmount : null,
      codStatus,
      estimatedDelivery,
      notes: payload.notes,
    });
  }

  async markCodSettled(orderId: string, settlementReference: string) {
    return this.logisticsRepo.markCodSettled(orderId, settlementReference);
  }

  async addTrackingEvent(
    orderId: string,
    status: OrderStatus,
    title: string,
    description?: string,
    location?: string,
  ) {
    return this.logisticsRepo.addTrackingEvent(orderId, status, title, description, location);
  }
}

export const logisticsService = new LogisticsService();
