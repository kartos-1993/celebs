import {
  CodStatus,
  ConsignmentStatus,
  LedgerDirection,
  LedgerEntryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { consignmentRepository } from '../consignment.repository';
import { logisticsRepository } from '../logistics.repository';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Per-consignment COD settlement test suite.
 *
 * In split dispatch, multi-seller orders are split into individual seller parcels,
 * each with its own tracking number, carrier waybill, and COD collectible amount.
 * When the courier remits cash against a settlement statement, each parcel must be
 * reconcilable individually with exact vendor attribution in the ledger.
 *
 * Invariants tested:
 * 1. Settling a single seller parcel attributes COD_RECEIVED in the ledger directly to that seller's vendorId.
 * 2. Settling one parcel of a multi-seller order leaves other parcels in transit and does not prematurely mark the whole order settled.
 * 3. Once all consignments of an order are delivered/settled, the parent order transitions to COD_SETTLED and paymentStatus COMPLETED.
 * 4. Settling an order as a whole in split dispatch fans out to separate per-vendor ledger entries rather than an unallocated lump sum.
 * 5. Idempotent retries: re-submitting the same voucher reference is a harmless no-op that never creates duplicate ledger entries.
 */
describe('Per-Consignment COD Settlement', () => {
  let customerId: string;
  let vendorAId: string;
  let vendorBId: string;
  let addressId: string;
  let orderId: string;
  let trackingA: string;
  let trackingB: string;

  beforeEach(async () => {
    // 1. Seed Customer
    const customer = await prisma.user.create({
      data: {
        email: `buyer-${Date.now()}-${Math.random()}@test.celebs.com`,
        name: 'Test Buyer',
        password: 'Password123!',
      },
    });
    customerId = customer.id;

    // 2. Seed Vendor A
    const userA = await prisma.user.create({
      data: {
        email: `vendor-a-${Date.now()}-${Math.random()}@test.celebs.com`,
        name: 'Vendor A User',
        password: 'Password123!',
      },
    });
    const vendorA = await prisma.vendorProfile.create({
      data: {
        userId: userA.id,
        shopName: `Store Alpha ${Date.now()}`,
        phoneNumber: `984${Math.floor(1000000 + Math.random() * 9000000)}`,
        panNumber: `PAN-${Date.now()}-A`,
        citizenshipNumber: `CIT-${Date.now()}-A`,
      },
    });
    vendorAId = vendorA.id;

    // 3. Seed Vendor B
    const userB = await prisma.user.create({
      data: {
        email: `vendor-b-${Date.now()}-${Math.random()}@test.celebs.com`,
        name: 'Vendor B User',
        password: 'Password123!',
      },
    });
    const vendorB = await prisma.vendorProfile.create({
      data: {
        userId: userB.id,
        shopName: `Store Beta ${Date.now()}`,
        phoneNumber: `985${Math.floor(1000000 + Math.random() * 9000000)}`,
        panNumber: `PAN-${Date.now()}-B`,
        citizenshipNumber: `CIT-${Date.now()}-B`,
      },
    });
    vendorBId = vendorB.id;

    // 4. Seed Address
    const address = await prisma.address.create({
      data: {
        userId: customerId,
        fullName: 'Test Buyer',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Lazimpat',
        streetAddress: 'Main Road',
      },
    });
    addressId = address.id;

    // 5. Seed Multi-Seller COD Order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-SPLIT-${Date.now()}`,
        userId: customerId,
        addressId,
        subtotal: new Prisma.Decimal('2500.00'),
        shippingFee: new Prisma.Decimal('300.00'),
        courierFee: new Prisma.Decimal('300.00'),
        codHandlingFee: new Prisma.Decimal('28.00'),
        absorbedShippingCost: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('2828.00'),
        codAmount: new Prisma.Decimal('2828.00'),
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.HANDED_OVER,
        codStatus: CodStatus.PENDING_COLLECTION,
        courierProvider: 'PATHAO',
        trackingNumber: 'PT-SPLIT-PARENT',
      },
    });
    orderId = order.id;

    trackingA = `PT-PARCEL-A-${Date.now()}`;
    trackingB = `PT-PARCEL-B-${Date.now()}`;

    // 6. Seed Consignments for Vendor A (Rs 1500 COD) and Vendor B (Rs 1328 COD)
    await consignmentRepository.createConsignments([
      {
        orderId,
        vendorId: vendorAId,
        courierProvider: 'PATHAO',
        courierName: 'Pathao Courier',
        trackingNumber: trackingA,
        courierFee: new Prisma.Decimal('150.00'),
        amountToCollect: new Prisma.Decimal('1500.00'),
        codAmount: new Prisma.Decimal('1500.00'),
        status: ConsignmentStatus.HANDED_OVER,
        lineIds: ['item-a-1'],
      },
      {
        orderId,
        vendorId: vendorBId,
        courierProvider: 'PATHAO',
        courierName: 'Pathao Courier',
        trackingNumber: trackingB,
        courierFee: new Prisma.Decimal('150.00'),
        amountToCollect: new Prisma.Decimal('1328.00'),
        codAmount: new Prisma.Decimal('1328.00'),
        status: ConsignmentStatus.HANDED_OVER,
        lineIds: ['item-b-1'],
      },
    ]);
  });

  it('settles a single consignment and attributes cash in the ledger to that vendor', async () => {
    const result = await logisticsRepository.markConsignmentCodSettled({
      trackingNumber: trackingA,
      settlementReference: 'STMT-OCT-001',
    });

    expect(result.consignment.status).toBe(ConsignmentStatus.DELIVERED);
    expect(result.consignment.deliveredAt).not.toBeNull();

    // Verify ledger entry is attributed to Vendor A
    const entryA = await prisma.ledgerEntry.findFirstOrThrow({
      where: {
        sourceType: 'COD_SETTLEMENT',
        sourceId: `STMT-OCT-001:${trackingA}`,
      },
    });

    expect(entryA.type).toBe(LedgerEntryType.COD_RECEIVED);
    expect(entryA.direction).toBe(LedgerDirection.IN);
    expect(entryA.amount.toNumber()).toBe(1500);
    expect(entryA.vendorId).toBe(vendorAId);
    expect(entryA.orderId).toBe(orderId);

    // Verify the second consignment remains in transit
    const consignmentB = await prisma.consignment.findFirstOrThrow({
      where: { trackingNumber: trackingB },
    });
    expect(consignmentB.status).toBe(ConsignmentStatus.HANDED_OVER);

    // Verify the parent order is NOT yet marked COD_SETTLED because Parcel B is still outstanding
    const parentOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(parentOrder.codStatus).toBe(CodStatus.PENDING_COLLECTION);
    expect(parentOrder.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it('transitions the parent order to COD_SETTLED once all consignments are settled', async () => {
    // Settle parcel A
    await logisticsRepository.markConsignmentCodSettled({
      trackingNumber: trackingA,
      settlementReference: 'STMT-OCT-002',
    });

    // Settle parcel B
    const resultB = await logisticsRepository.markConsignmentCodSettled({
      trackingNumber: trackingB,
      settlementReference: 'STMT-OCT-002',
    });

    expect(resultB.consignment.status).toBe(ConsignmentStatus.DELIVERED);

    // Verify ledger entry for Vendor B
    const entryB = await prisma.ledgerEntry.findFirstOrThrow({
      where: {
        sourceType: 'COD_SETTLEMENT',
        sourceId: `STMT-OCT-002:${trackingB}`,
      },
    });
    expect(entryB.amount.toNumber()).toBe(1328);
    expect(entryB.vendorId).toBe(vendorBId);

    // Verify parent order is now fully settled
    const settledOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(settledOrder.codStatus).toBe(CodStatus.COD_SETTLED);
    expect(settledOrder.codReference).toBe('STMT-OCT-002');
    expect(settledOrder.paymentStatus).toBe(PaymentStatus.COMPLETED);
    expect(settledOrder.codSettledAt).not.toBeNull();
  });

  it('settling the entire multi-seller order at once creates separate vendor ledger entries', async () => {
    const settled = await logisticsRepository.markCodSettled(orderId, 'STMT-WHOLE-ORDER');

    expect(settled.codStatus).toBe(CodStatus.COD_SETTLED);
    expect(settled.paymentStatus).toBe(PaymentStatus.COMPLETED);

    // Both consignments must now be marked DELIVERED
    const consignments = await prisma.consignment.findMany({
      where: { orderId },
      orderBy: { trackingNumber: 'asc' },
    });
    expect(consignments.every((c) => c.status === ConsignmentStatus.DELIVERED)).toBe(true);

    // Two distinct ledger entries must exist, each attributed to its own vendor
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        sourceType: 'COD_SETTLEMENT',
        orderId,
      },
      orderBy: { amount: 'desc' },
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]!.vendorId).toBe(vendorAId);
    expect(entries[0]!.amount.toNumber()).toBe(1500);
    expect(entries[1]!.vendorId).toBe(vendorBId);
    expect(entries[1]!.amount.toNumber()).toBe(1328);
  });

  it('safely handles repeated settlements of the same consignment without creating duplicates', async () => {
    await logisticsRepository.markConsignmentCodSettled({
      trackingNumber: trackingA,
      settlementReference: 'STMT-IDEMPOTENT',
    });

    // Re-call with the exact same reference
    await logisticsRepository.markConsignmentCodSettled({
      trackingNumber: trackingA,
      settlementReference: 'STMT-IDEMPOTENT',
    });

    const entriesCount = await prisma.ledgerEntry.count({
      where: {
        sourceType: 'COD_SETTLEMENT',
        sourceId: `STMT-IDEMPOTENT:${trackingA}`,
      },
    });

    expect(entriesCount).toBe(1);
  });
});
