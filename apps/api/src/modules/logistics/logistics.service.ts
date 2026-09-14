import { CodStatus, DispatchMode, OrderStatus } from '@prisma/client';

import { DispatchOrderType } from '@celebs/shared-types';
import { ForbiddenException, NotFoundException } from '@celebs/shared-utils';

import { nepalCanMoveAdapter } from './adapters/nepal-can-move.adapter';
import { type LogisticsRepository, logisticsRepository } from './logistics.repository';

export interface LogisticsServiceDeps {
  logisticsRepo?: Partial<LogisticsRepository>;
}

export class LogisticsService {
  private logisticsRepo: LogisticsRepository;

  constructor(deps: LogisticsServiceDeps = {}) {
    this.logisticsRepo = (deps.logisticsRepo ?? logisticsRepository) as LogisticsRepository;
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

    const result = await this.logisticsRepo.updateDispatchedOrder({
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

    this.triggerDispatchEmail(
      payload.orderId,
      courierName,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
    ).catch(() => {});

    return result;
  }

  private async triggerDispatchEmail(
    orderId: string,
    courierName?: string,
    trackingNumber?: string,
    trackingUrl?: string,
    estimatedDelivery?: Date,
  ) {
    try {
      const { coreOrderRepository } = await import('../order/core/order.repository');
      const { enqueueOrderShippedEmail } = await import('../order/utils/order-email.util');
      const fullOrder = await coreOrderRepository.findOrderById(orderId);
      if (!fullOrder) return;

      await enqueueOrderShippedEmail(fullOrder, {
        courierName: courierName || fullOrder.courierName || 'Standard Delivery',
        trackingNumber: trackingNumber || fullOrder.trackingNumber || undefined,
        trackingUrl: trackingUrl || fullOrder.trackingUrl || undefined,
        estimatedDelivery,
      });
    } catch {
      // Non-blocking email dispatch
    }
  }

  async markCodSettled(orderId: string, settlementReference: string) {
    return this.logisticsRepo.markCodSettled(orderId, settlementReference);
  }

  async processCourierWebhook(payload: {
    trackingNumber: string;
    status: OrderStatus;
    title?: string;
    description?: string;
    location?: string;
  }) {
    const order = await this.logisticsRepo.findOrderByTrackingNumber(payload.trackingNumber);

    if (!order) {
      throw new NotFoundException(
        `Shipment not found for tracking number: ${payload.trackingNumber}`,
      );
    }

    const defaultTitles: Record<string, string> = {
      HANDED_OVER: 'Package In Transit',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Package Delivered',
      RETURNED: 'Delivery Failed - Returned',
    };

    const title =
      payload.title || defaultTitles[payload.status] || `Status updated to ${payload.status}`;
    const description =
      payload.description ||
      `Carrier updated shipment status to ${payload.status} at ${payload.location || 'Local Hub'}.`;

    const { event, statusChanged } = await this.logisticsRepo.applyAutomatedTrackingEvent({
      orderId: order.id,
      status: payload.status,
      title,
      description,
      location: payload.location,
      source: 'COURIER_WEBHOOK',
    });

    if (statusChanged) {
      if (payload.status === OrderStatus.DELIVERED) {
        try {
          const { enqueueOrderDeliveredEmail } = await import('../order/utils/order-email.util');
          await enqueueOrderDeliveredEmail(order);
        } catch {
          // Non-blocking email dispatch
        }
      }

      try {
        const { notificationService } = await import('../notification/notification.service');
        await notificationService.notifyOrderStatus({
          userId: order.userId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: payload.status,
          trackingNumber: payload.trackingNumber,
        });
      } catch {
        // Non-blocking push notification dispatch
      }
    }

    return {
      orderId: order.id,
      trackingNumber: payload.trackingNumber,
      status: payload.status,
      event,
    };
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
