import { CodStatus, ConsignmentStatus, DispatchMode, OrderStatus } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { consignmentRepository } from './consignment.repository';

import prisma, { Prisma } from '@/config/db.prisma';
import { isAboveZero } from '@/modules/finance/ledger/decimal';
import { postCodReceiptEntries } from '@/modules/finance/ledger/ledger-posting.service';

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
      include: {
        address: true,
        items: {
          select: {
            id: true,
            vendorId: true,
            quantity: true,
            unitPrice: true,
            unitWeightKg: true,
          },
        },
        consignments: true,
      },
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

  /**
   * Reconciles collected cash against a courier deposit.
   *
   * Idempotent for a repeat of the same voucher, because an accountant working a
   * deposit list will submit one twice and a retry must not look like a second
   * payment. A *different* voucher against an order that is already settled is
   * refused instead: the cash was matched against one bank reference, and
   * overwriting it would destroy the only link between this order and the money
   * that arrived. A mistyped reference is corrected by support, not by silently
   * replacing the evidence.
   */
  public async markCodSettled(orderId: string, settlementReference: string) {
    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: { codStatus: true, codReference: true },
    });

    if (current?.codStatus === CodStatus.COD_SETTLED) {
      if (current.codReference === settlementReference) {
        return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      }

      throw new AppError(
        `Order ${orderId} is already settled against voucher ${current.codReference ?? 'unknown'}; refusing to replace it with ${settlementReference}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_REQUEST,
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const settled = await tx.order.update({
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
          include: { trackingEvents: true },
        });

        // Cash actually arriving is what a courier statement is reconciled against,
        // so it is recorded rather than left to be reconstructed later. Keyed on the
        // voucher, so a deposit submitted twice cannot be counted twice. Everything
        // below joins the same transaction as the status flip above: an order that
        // reads COD_SETTLED must have its money lines already written.
        const consignments = await consignmentRepository.findByOrderId(settled.id, tx);

        if (consignments.length > 0) {
          // In split dispatch, record COD receipt per seller parcel so each ledger entry
          // is attributed directly to the corresponding seller vendorId.
          for (const consignment of consignments) {
            const consignmentCod = consignment.codAmount ?? new Prisma.Decimal(0);
            if (isAboveZero(consignmentCod)) {
              await postCodReceiptEntries(
                {
                  orderId: settled.id,
                  courier: consignment.courierProvider,
                  amount: consignmentCod,
                  settlementReference: `${settlementReference}:${consignment.trackingNumber}`,
                  vendorId: consignment.vendorId,
                },
                undefined,
                tx,
              );
            }
            if (consignment.status !== ConsignmentStatus.DELIVERED) {
              await consignmentRepository.updateConsignmentStatus(
                consignment.id,
                ConsignmentStatus.DELIVERED,
                tx,
              );
            }
          }
        } else {
          await postCodReceiptEntries(
            {
              orderId: settled.id,
              courier: settled.courierProvider ?? undefined,
              amount: settled.codAmount ?? new Prisma.Decimal(0),
              settlementReference,
            },
            undefined,
            tx,
          );
        }

        return settled;
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  /**
   * Reconciles COD cash collected by the courier for an individual seller parcel consignment.
   *
   * In split dispatch:
   * 1. Attributes the COD_RECEIVED ledger entry directly to the seller's vendorId.
   * 2. Keyed idempotently on `${settlementReference}:${consignment.trackingNumber}`.
   * 3. Transitions the consignment status to DELIVERED.
   * 4. Checks whether all parcels for the order are now resolved: if all are delivered,
   *    automatically transitions the parent Order to COD_SETTLED and paymentStatus COMPLETED.
   */
  public async markConsignmentCodSettled(input: {
    trackingNumber: string;
    settlementReference: string;
  }) {
    const consignment = await consignmentRepository.findByTrackingNumber(input.trackingNumber);

    if (!consignment) {
      throw new AppError(
        `Consignment not found for tracking number ${input.trackingNumber}`,
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    // The money line, the parcel flip and the parent resolution join one
    // transaction: a parcel that reads DELIVERED must have its cash recorded,
    // and two parcels settling the last mile concurrently cannot both observe
    // an unfinished sibling and strand the parent short of COD_SETTLED.
    return prisma.$transaction(
      async (tx) => {
        // 1. Post ledger entry for this parcel's collectible cash if above zero
        const consignmentCod = consignment.codAmount ?? new Prisma.Decimal(0);
        if (isAboveZero(consignmentCod)) {
          await postCodReceiptEntries(
            {
              orderId: consignment.orderId,
              courier: consignment.courierProvider,
              amount: consignmentCod,
              settlementReference: `${input.settlementReference}:${consignment.trackingNumber}`,
              vendorId: consignment.vendorId,
            },
            undefined,
            tx,
          );
        }

        // 2. Transition consignment to DELIVERED if not already
        const updatedConsignment =
          consignment.status === ConsignmentStatus.DELIVERED
            ? consignment
            : await consignmentRepository.updateConsignmentStatus(
                consignment.id,
                ConsignmentStatus.DELIVERED,
                tx,
              );

        // 3. Check if all consignments for the parent order are delivered
        const allDelivered = await consignmentRepository.areAllConsignmentsDelivered(
          consignment.orderId,
          tx,
        );

        let parentOrderSettled = false;

        if (allDelivered) {
          await tx.order.update({
            where: { id: consignment.orderId },
            data: {
              codStatus: CodStatus.COD_SETTLED,
              codSettledAt: new Date(),
              codReference: input.settlementReference,
              paymentStatus: 'COMPLETED',
              trackingEvents: {
                create: {
                  status: OrderStatus.DELIVERED,
                  title: 'COD Payment Settled',
                  description: `Cash reconciled against courier deposit for parcel ${consignment.trackingNumber}. Ref: ${input.settlementReference}`,
                  source: 'PLATFORM',
                },
              },
            },
          });
          parentOrderSettled = true;
        } else {
          await tx.orderTrackingEvent.create({
            data: {
              orderId: consignment.orderId,
              status: OrderStatus.OUT_FOR_DELIVERY,
              title: 'Parcel Delivered & Settled',
              description: `Parcel ${consignment.trackingNumber} reconciled against courier deposit (Ref: ${input.settlementReference})`,
              source: 'PLATFORM',
            },
          });
        }

        return {
          consignment: updatedConsignment,
          parentOrderSettled,
        };
      },
      { maxWait: 5000, timeout: 10000 },
    );
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
