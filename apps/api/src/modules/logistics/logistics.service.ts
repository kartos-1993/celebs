import { CodStatus, ConsignmentStatus, DispatchMode, OrderStatus } from '@prisma/client';

import { DispatchOrderType } from '@celebs/shared-types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@celebs/shared-utils';

import { nepalCanMoveAdapter } from './adapters/nepal-can-move.adapter';
import {
  type ConsignmentRepository,
  consignmentRepository,
  type CreateConsignmentRecord,
} from './consignment.repository';
import { isDispatchAllowed } from './delivery-coverage';
import {
  type DeliveryCoverageRepository,
  deliveryCoverageRepository,
} from './delivery-coverage.repository';
import { type LogisticsRepository, logisticsRepository } from './logistics.repository';
import { sellerParcelsFromLines } from './seller-parcels';
import { splitOrderIntoConsignments } from './split-dispatch';

import { Prisma } from '@/config/db.prisma';

export interface LogisticsServiceDeps {
  logisticsRepo?: Partial<LogisticsRepository>;
  coverageRepo?: Partial<DeliveryCoverageRepository>;
  consignmentRepo?: Partial<ConsignmentRepository>;
}

export class LogisticsService {
  private logisticsRepo: LogisticsRepository;
  private coverageRepo: DeliveryCoverageRepository;
  private consignmentRepo: ConsignmentRepository;

  constructor(deps: LogisticsServiceDeps = {}) {
    this.logisticsRepo = (deps.logisticsRepo ?? logisticsRepository) as LogisticsRepository;
    this.coverageRepo = (deps.coverageRepo ??
      deliveryCoverageRepository) as DeliveryCoverageRepository;
    this.consignmentRepo = (deps.consignmentRepo ?? consignmentRepository) as ConsignmentRepository;
  }

  async dispatchOrder(payload: DispatchOrderType, actorStoreId: string | null = null) {
    const order = await this.logisticsRepo.findOrderForDispatch(payload.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Compare-and-Swap (CAS) guard: Prevent duplicate dispatch on retry or race condition.
    // An order that has already been handed over or delivered cannot be re-dispatched.
    if (
      order.status === OrderStatus.HANDED_OVER ||
      order.status === OrderStatus.OUT_FOR_DELIVERY ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Order has already been dispatched');
    }

    if ((order as { consignments?: unknown[] }).consignments?.length) {
      throw new BadRequestException('Order has already been dispatched');
    }

    // Tenant isolation: sellers can only dispatch orders that contain their own items
    if (actorStoreId) {
      const ownsItem = order.items.some((it) => it.vendorId === actorStoreId);
      if (!ownsItem) {
        throw new ForbiddenException('You do not own any item in this order');
      }
    }

    // Fail closed: a courier we cannot actually book must never be recorded as
    // dispatched. The request validator already refuses these at the edge, so this
    // guards a caller that skipped validation.
    const isCourierWithoutAdapter =
      payload.provider !== 'MANUAL' && payload.provider !== 'NEPAL_CAN_MOVE';

    if (isCourierWithoutAdapter) {
      throw new BadRequestException(
        `No courier adapter is configured for ${payload.provider}, so no consignment could be created.`,
      );
    }

    // Courier coverage check
    const coverage = await this.coverageRepo.coverageForAddress({
      logisticsZoneId: order.address.logisticsZoneId,
    });
    const isManualDispatch = payload.provider === 'MANUAL';

    if (!isDispatchAllowed(coverage.status, isManualDispatch)) {
      throw new BadRequestException(
        coverage.status === 'UNCOVERED'
          ? `Cannot dispatch to ${coverage.cityName ?? 'this area'}: the courier does not deliver there.`
          : 'Cannot dispatch: delivery coverage for this address is unconfirmed. The address needs a delivery district.',
      );
    }

    // ── Split Dispatch Planning ───────────────────────────────────────────────
    // Multi-seller basket support: group order lines into per-seller parcels
    const parcelInputs = (order.items || []).map((it) => {
      const lineItem = it as {
        id?: string;
        vendorId: string;
        quantity?: number;
        unitPrice?: Prisma.Decimal;
        unitWeightKg?: Prisma.Decimal;
      };
      const qty = lineItem.quantity ?? 1;
      const unitWeight = lineItem.unitWeightKg ?? new Prisma.Decimal('0.5');

      return {
        lineId: lineItem.id ?? `item-${lineItem.vendorId}`,
        vendorId: lineItem.vendorId,
        quantity: qty,
        declaredWeightKg: unitWeight.mul(qty),
        unitPrice: lineItem.unitPrice ?? new Prisma.Decimal(0),
      };
    });

    const sellerParcels = sellerParcelsFromLines(parcelInputs);

    // Determine each parcel's quoted courier fee share
    const parcelQuotes = sellerParcels.map((parcel) => {
      const courierFeeShare =
        order.courierFee && order.courierFee.gt(0) && sellerParcels.length > 0
          ? order.courierFee.div(sellerParcels.length)
          : new Prisma.Decimal(0);

      return {
        vendorId: parcel.vendorId,
        goodsAmount: parcel.goodsAmount,
        courierFee: courierFeeShare,
        declaredWeightKg: parcel.declaredWeightKg,
        lineIds: parcel.lineIds,
      };
    });

    // Plan consignments with exact paisa collectible allocation
    const plannedConsignments = splitOrderIntoConsignments({
      order: {
        orderId: order.id,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        courierFee: order.courierFee,
        codHandlingFee: order.codHandlingFee,
        totalAmount: order.totalAmount,
        isCOD: order.paymentMethod === 'COD',
      },
      parcels: parcelQuotes,
    });

    // ── Courier Consignment Booking ───────────────────────────────────────────
    const courierName =
      payload.manualCourierName ||
      (payload.provider === 'NEPAL_CAN_MOVE' ? 'Nepal Can Move' : 'Standard Delivery');
    let estimatedDelivery: Date | undefined;
    const consignmentRecords: CreateConsignmentRecord[] = [];
    const isMultiParcel = plannedConsignments.length > 1;

    for (let index = 0; index < plannedConsignments.length; index += 1) {
      const planned = plannedConsignments[index]!;
      let trackingNumber = '';
      let trackingUrl = '';

      if (payload.provider === 'NEPAL_CAN_MOVE') {
        const shipment = await nepalCanMoveAdapter.createShipment({
          orderId: `${order.id}-${index + 1}`,
          recipientName: order.address.fullName,
          recipientPhone: order.address.phone,
          deliveryAddress: `${order.address.streetAddress}, ${order.address.cityArea}`,
          city: order.address.cityArea,
          district: order.address.district,
          codAmount: planned.codAmount,
          weightKg: planned.declaredWeightKg.toNumber(),
        });

        trackingNumber = shipment.trackingNumber;
        trackingUrl = shipment.trackingUrl;
        estimatedDelivery = shipment.estimatedDelivery;
      } else {
        trackingNumber =
          isMultiParcel && payload.manualTrackingNumber
            ? `${payload.manualTrackingNumber}-${index + 1}`
            : payload.manualTrackingNumber || '';
        trackingUrl = payload.manualTrackingUrl || '';
      }

      consignmentRecords.push({
        orderId: order.id,
        vendorId: planned.vendorId,
        courierProvider: payload.provider,
        courierName,
        trackingNumber,
        trackingUrl: trackingUrl || null,
        courierFee: planned.courierFee,
        amountToCollect: planned.amountToCollect,
        codAmount: order.paymentMethod === 'COD' ? new Prisma.Decimal(planned.codAmount) : null,
        status: ConsignmentStatus.HANDED_OVER,
        lineIds: planned.lineIds,
        dispatchedAt: new Date(),
      });
    }

    // Persist consignments atomically
    await this.consignmentRepo.createConsignments(consignmentRecords);

    // Summary tracking details for existing screens & email notifications
    const allTrackingNumbers = consignmentRecords
      .map((c) => c.trackingNumber)
      .filter(Boolean)
      .join(', ');
    const primaryTrackingUrl = consignmentRecords[0]?.trackingUrl ?? '';

    const codStatus =
      order.paymentMethod === 'COD' ? CodStatus.PENDING_COLLECTION : CodStatus.NOT_APPLICABLE;
    const dispatchMode =
      payload.provider === 'MANUAL' ? DispatchMode.MANUAL : DispatchMode.AUTOMATED_3PL;

    const result = await this.logisticsRepo.updateDispatchedOrder({
      orderId: payload.orderId,
      dispatchMode,
      courierProvider: payload.provider,
      courierName,
      trackingNumber: allTrackingNumbers || payload.manualTrackingNumber || '',
      trackingUrl: primaryTrackingUrl || payload.manualTrackingUrl || '',
      codAmount: order.paymentMethod === 'COD' ? order.totalAmount : null,
      codStatus,
      estimatedDelivery,
      notes: payload.notes,
    });

    this.triggerDispatchEmail(
      payload.orderId,
      courierName,
      allTrackingNumbers || payload.manualTrackingNumber || '',
      primaryTrackingUrl || payload.manualTrackingUrl || '',
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
