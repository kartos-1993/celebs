import { CodStatus, ConsignmentStatus, DispatchMode, OrderStatus } from '@prisma/client';

import { DispatchOrderType } from '@celebs/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  logger,
  NotFoundException,
} from '@celebs/shared-utils';

import { isForwardOrderMove } from '../order/order.state-machine';

import { nepalCanMoveAdapter } from './adapters/nepal-can-move.adapter';
import { PathaoOrderClient, pathaoOrderClient } from './adapters/pathao-order.client';
import {
  PathaoTokenProvider,
  pathaoTokenProvider,
  resolvePathaoStoreId,
} from './adapters/pathao-token.provider';
import {
  type ConsignmentRepository,
  consignmentRepository,
  type CreateConsignmentRecord,
} from './consignment.repository';
import { courierWholeRupees } from './courier-amount';
import {
  CourierDestinationRepository,
  courierDestinationRepository,
} from './courier-destination.repository';
import { isDispatchAllowed } from './delivery-coverage';
import {
  type DeliveryCoverageRepository,
  deliveryCoverageRepository,
} from './delivery-coverage.repository';
import { type LogisticsRepository, logisticsRepository } from './logistics.repository';
import {
  isForwardConsignmentMove,
  mapPathaoEventToConsignmentStatus,
  mapPathaoEventToStatus,
} from './pathao-webhook-events';
import {
  buildSandboxTrackingNumber,
  isSandboxCourierFallbackAllowed,
} from './sandbox-courier-fallback';
import { sellerParcelsFromLines } from './seller-parcels';
import { splitOrderIntoConsignments } from './split-dispatch';

import { Prisma } from '@/config/db.prisma';

export interface LogisticsServiceDeps {
  logisticsRepo?: Partial<LogisticsRepository>;
  coverageRepo?: Partial<DeliveryCoverageRepository>;
  consignmentRepo?: Partial<ConsignmentRepository>;
  destinationRepo?: CourierDestinationRepository;
  pathaoClient?: PathaoOrderClient;
  tokenProvider?: PathaoTokenProvider;
}

export class LogisticsService {
  private logisticsRepo: LogisticsRepository;
  private coverageRepo: DeliveryCoverageRepository;
  private consignmentRepo: ConsignmentRepository;
  private destinationRepo: CourierDestinationRepository;
  private pathaoClient: PathaoOrderClient;
  private tokenProvider: PathaoTokenProvider;

  constructor(deps: LogisticsServiceDeps = {}) {
    this.logisticsRepo = (deps.logisticsRepo ?? logisticsRepository) as LogisticsRepository;
    this.coverageRepo = (deps.coverageRepo ??
      deliveryCoverageRepository) as DeliveryCoverageRepository;
    this.consignmentRepo = (deps.consignmentRepo ?? consignmentRepository) as ConsignmentRepository;
    this.destinationRepo = deps.destinationRepo ?? courierDestinationRepository;
    this.pathaoClient = deps.pathaoClient ?? pathaoOrderClient;
    this.tokenProvider = deps.tokenProvider ?? pathaoTokenProvider;
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
      payload.provider !== 'MANUAL' &&
      payload.provider !== 'NEPAL_CAN_MOVE' &&
      payload.provider !== 'PATHAO';

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

    // Fail closed rather than book nothing.
    //
    // Split dispatch works by planning one consignment per seller parcel, and an
    // order with no lines plans none. Without this guard the loop below simply
    // doesn't run, no courier is ever contacted, and the order is then recorded as
    // HANDED_OVER with an empty tracking number - an order marked as shipped that
    // nobody will pick up, and a shipment that no courier invoice will ever match.
    if (plannedConsignments.length === 0) {
      throw new BadRequestException(
        `Cannot dispatch order ${order.orderNumber}: it has no items to ship.`,
      );
    }

    // ── Courier Consignment Booking ───────────────────────────────────────────
    const courierName =
      payload.manualCourierName ||
      (payload.provider === 'PATHAO'
        ? 'Pathao Courier'
        : payload.provider === 'NEPAL_CAN_MOVE'
          ? 'Nepal Can Move'
          : 'Standard Delivery');
    let estimatedDelivery: Date | undefined;
    const consignmentRecords: CreateConsignmentRecord[] = [];
    const isMultiParcel = plannedConsignments.length > 1;

    let pathaoDestination: { cityExternalId: number; zoneExternalId: number } | null = null;
    let pathaoStoreId = 0;

    if (payload.provider === 'PATHAO') {
      const dest = await this.destinationRepo.forZoneId(order.address.logisticsZoneId);
      pathaoDestination = {
        cityExternalId: dest.cityExternalId,
        zoneExternalId: dest.zoneExternalId,
      };
      // Fetched inside the booking loop's try/catch rather than out here: a token
      // failure is as much a courier outage as a createOrder failure, and out here
      // it would abort the dispatch before any consignment could be planned.
      pathaoStoreId = resolvePathaoStoreId();

      const estDate = new Date();
      estDate.setDate(estDate.getDate() + 3);
      estimatedDelivery = estDate;
    }

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
      } else if (payload.provider === 'PATHAO') {
        const amountToCollect =
          order.paymentMethod === 'COD' ? courierWholeRupees(planned.amountToCollect) : 0;
        const merchantOrderId = isMultiParcel
          ? `${order.orderNumber}-${index + 1}`
          : order.orderNumber;

        const createOrder = async () =>
          this.pathaoClient.createOrder({
            storeId: pathaoStoreId,
            merchantOrderId,
            recipientName: order.address.fullName,
            recipientPhone: order.address.phone,
            recipientAddress: `${order.address.streetAddress}, ${order.address.cityArea}`,
            recipientCityId: pathaoDestination!.cityExternalId,
            recipientZoneId: pathaoDestination!.zoneExternalId,
            itemQuantity: Math.max(1, planned.lineIds.length),
            itemWeightKg: planned.declaredWeightKg,
            amountToCollect,
            itemDescription: `Order ${order.orderNumber} parcel ${index + 1}`,
            accessToken: await this.tokenProvider.getToken(),
          });

        try {
          const shipment = await createOrder();

          trackingNumber = shipment.consignmentId;
          trackingUrl = shipment.trackingUrl;
        } catch (error: unknown) {
          // Outside production only: a sandbox outage should not stop a developer
          // testing fulfilment end to end. The consignment is real (it is what the
          // rest of the flow reads) but its tracking number is ours, marked so
          // nobody can mistake it for a courier's.
          if (!isSandboxCourierFallbackAllowed()) throw error;

          trackingNumber = buildSandboxTrackingNumber(order.orderNumber, index);
          trackingUrl = '';

          logger.warn(
            {
              orderId: order.id,
              courierError: (error as Error).message,
              trackingNumber,
            },
            'Pathao was unreachable; booked a SANDBOX consignment so local fulfilment can be tested',
          );
        }
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

  /**
   * Reconciles COD cash for an individual seller parcel consignment.
   */
  async markConsignmentCodSettled(trackingNumber: string, settlementReference: string) {
    return this.logisticsRepo.markConsignmentCodSettled({
      trackingNumber,
      settlementReference,
    });
  }

  async processCourierWebhook(payload: {
    consignmentId?: string;
    merchantOrderId?: string;
    event: string;
  }) {
    // Consignment-first routing: the courier's id identifies one parcel.
    // Split dispatch stores several ids comma-joined on the order, so an exact
    // order lookup can never match them; the legacy single-parcel lookup stays
    // as the fallback for orders booked before consignments existed.
    const consignment = payload.consignmentId
      ? await this.consignmentRepo.findByTrackingNumber(payload.consignmentId)
      : null;

    const order = consignment
      ? await this.logisticsRepo.findOrderById(consignment.orderId)
      : payload.consignmentId
        ? await this.logisticsRepo.findOrderByTrackingNumber(payload.consignmentId)
        : null;

    if (!order) {
      throw new NotFoundException(
        `Shipment not found for consignment: ${payload.consignmentId ?? payload.merchantOrderId ?? 'unknown'}`,
      );
    }

    const mappedStatus = mapPathaoEventToStatus(payload.event);
    const consignmentStatus = mapPathaoEventToConsignmentStatus(payload.event);

    if (
      consignment &&
      consignmentStatus &&
      isForwardConsignmentMove(consignment.status, consignmentStatus)
    ) {
      await this.consignmentRepo.updateConsignmentStatus(consignment.id, consignmentStatus);
    }

    // Forward-only: a missed intermediate must not stall a real delivery, but a
    // stale or forged event must never regress the order. A clamp still records
    // the event on the timeline; it just does not move the status.
    const status =
      mappedStatus && isForwardOrderMove(order.status, mappedStatus) ? mappedStatus : order.status;

    const defaultTitles: Record<string, string> = {
      HANDED_OVER: 'Package In Transit',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Package Delivered',
      RETURNED: 'Delivery Failed - Returned',
    };

    const title = defaultTitles[status] ?? `Status updated to ${status} (${payload.event})`;
    const description = `Carrier reported ${payload.event} for consignment ${payload.consignmentId ?? 'unknown'}.`;

    const { event, statusChanged } = await this.logisticsRepo.applyAutomatedTrackingEvent({
      orderId: order.id,
      status,
      title,
      description,
      location: undefined,
      source: 'COURIER_WEBHOOK',
    });

    if (statusChanged) {
      if (status === OrderStatus.DELIVERED) {
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
          status,
          trackingNumber: payload.consignmentId ?? '',
        });
      } catch {
        // Non-blocking push notification dispatch
      }
    }

    return {
      orderId: order.id,
      consignmentId: payload.consignmentId ?? null,
      status,
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
