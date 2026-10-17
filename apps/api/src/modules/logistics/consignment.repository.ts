import { ConsignmentStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Record required to persist a newly booked consignment.
 *
 * All money amounts are strict Prisma.Decimals.
 */
export interface CreateConsignmentRecord {
  orderId: string;
  vendorId: string;
  courierProvider: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  courierFee: Prisma.Decimal;
  amountToCollect: Prisma.Decimal;
  codAmount?: Prisma.Decimal | null;
  status?: ConsignmentStatus;
  lineIds: string[];
  dispatchedAt?: Date | null;
}

/**
 * Repository encapsulating database operations for the Consignment model.
 *
 * Gate 9 Compliance: Every entity model accessed by services MUST have a dedicated
 * Repository. Domain services never call prisma.* or raw queries directly.
 *
 * Concurrency & Performance:
 * Consignments are created in batch using createMany to minimize round-trips and
 * preserve connection pool capacity on port 6543.
 */
export class ConsignmentRepository {
  /**
   * Persists multiple seller parcel consignments for an order atomically.
   *
   * @param records Array of consignment records to create.
   * @param tx Optional interactive transaction client for atomic multi-step operations.
   */
  public async createConsignments(
    records: CreateConsignmentRecord[],
    tx?: Prisma.TransactionClient,
  ) {
    if (records.length === 0) {
      return { count: 0 };
    }

    const client = tx ?? prisma;
    return client.consignment.createMany({
      data: records.map((record) => ({
        orderId: record.orderId,
        vendorId: record.vendorId,
        courierProvider: record.courierProvider,
        courierName: record.courierName,
        trackingNumber: record.trackingNumber,
        trackingUrl: record.trackingUrl ?? null,
        courierFee: record.courierFee,
        amountToCollect: record.amountToCollect,
        codAmount: record.codAmount ?? null,
        status: record.status ?? ConsignmentStatus.CREATED,
        lineIds: record.lineIds,
        dispatchedAt: record.dispatchedAt ?? new Date(),
      })),
    });
  }

  /**
   * Finds all consignments for an order, ordered deterministically by vendorId.
   */
  public async findByOrderId(orderId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.consignment.findMany({
      where: { orderId },
      orderBy: { vendorId: 'asc' },
    });
  }

  /**
   * Finds a consignment by its courier waybill tracking number.
   */
  public async findByTrackingNumber(trackingNumber: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.consignment.findFirst({
      where: { trackingNumber },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            status: true,
            paymentMethod: true,
            totalAmount: true,
          },
        },
        vendor: {
          select: {
            id: true,
            shopName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Updates the lifecycle status of an individual consignment.
   */
  public async updateConsignmentStatus(
    consignmentId: string,
    status: ConsignmentStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.consignment.update({
      where: { id: consignmentId },
      data: {
        status,
        ...(status === ConsignmentStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
      },
    });
  }

  /**
   * Checks whether all consignments for an order have reached a terminal delivery state
   * (DELIVERED, CANCELLED, or RETURNED).
   *
   * Used during split dispatch reconciliation: an order's payment and delivery status
   * transitions to COMPLETED / COD_SETTLED only once all parcel shipments are resolved.
   */
  public async areAllConsignmentsDelivered(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const consignments = await client.consignment.findMany({
      where: { orderId },
      select: { status: true },
    });

    if (consignments.length === 0) {
      return true;
    }

    return consignments.every(
      (c) =>
        c.status === ConsignmentStatus.DELIVERED ||
        c.status === ConsignmentStatus.CANCELLED ||
        c.status === ConsignmentStatus.RETURNED,
    );
  }
}

export const consignmentRepository = new ConsignmentRepository();
