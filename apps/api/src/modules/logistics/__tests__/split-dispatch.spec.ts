import { describe, expect, it } from 'vitest';

import {
  type OrderForSplitDispatch,
  type SellerParcelForSplitDispatch,
  splitOrderIntoConsignments,
} from '../split-dispatch';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

/**
 * Split dispatch planning: turns an order with multiple seller parcels into
 * distinct, reconcilable consignments for fulfillment.
 *
 * Checkout charges delivery per seller and computes an exact order total. When
 * dispatching, each seller parcel becomes its own courier consignment.
 *
 * Invariants proven here:
 * 1. On COD orders: sum(consignment.amountToCollect) === order.totalAmount to the exact paisa.
 * 2. On prepaid orders: every consignment has amountToCollect = 0 and codAmount = 0.
 * 3. Each consignment retains its own quoted courier fee and declared weight.
 * 4. Free-delivery thresholds waive the customer charge without zeroing courier costs.
 * 5. Consignments are sorted deterministically by vendorId to ensure stable booking.
 */
describe('splitOrderIntoConsignments', () => {
  const sampleOrder: OrderForSplitDispatch = {
    orderId: 'order-123',
    subtotal: dec('3000.00'),
    shippingFee: dec('360.00'),
    courierFee: dec('360.00'),
    codHandlingFee: dec('33.60'),
    totalAmount: dec('3393.60'),
    isCOD: true,
  };

  const sampleParcels: SellerParcelForSplitDispatch[] = [
    {
      vendorId: 'sellerA',
      goodsAmount: dec('2000.00'),
      courierFee: dec('150.00'),
      declaredWeightKg: dec('0.900'),
      lineIds: ['line-1', 'line-2'],
    },
    {
      vendorId: 'sellerB',
      goodsAmount: dec('1000.00'),
      courierFee: dec('210.00'),
      declaredWeightKg: dec('1.500'),
      lineIds: ['line-3'],
    },
  ];

  it('splits collectible amounts across multiple seller parcels proportionally on COD', () => {
    const consignments = splitOrderIntoConsignments({
      order: sampleOrder,
      parcels: sampleParcels,
    });

    expect(consignments).toHaveLength(2);

    const a = consignments.find((c) => c.vendorId === 'sellerA')!;
    const b = consignments.find((c) => c.vendorId === 'sellerB')!;

    // Seller A: 2000 goods + 150 delivery share = 2150 base. With 1% COD handling = 2171.50
    expect(a.amountToCollect.toFixed(2)).toBe('2171.50');
    expect(a.codAmount).toBe(2171);
    expect(a.courierFee.toFixed(2)).toBe('150.00');

    // Seller B: 1000 goods + 210 delivery share = 1210 base. With 1% COD handling = 1222.10
    expect(b.amountToCollect.toFixed(2)).toBe('1222.10');
    expect(b.codAmount).toBe(1222);
    expect(b.courierFee.toFixed(2)).toBe('210.00');

    const totalCollected = consignments.reduce(
      (sum, c) => sum.add(c.amountToCollect),
      new Prisma.Decimal(0),
    );
    expect(totalCollected.toFixed(2)).toBe(sampleOrder.totalAmount.toFixed(2));
  });

  it('sums exactly to order.totalAmount when rounding remainders occur', () => {
    // 3 sellers with equal goods (333.33 each) and total 1000.00
    const order: OrderForSplitDispatch = {
      orderId: 'order-remainder',
      subtotal: dec('1000.00'),
      shippingFee: dec('0.00'),
      courierFee: dec('450.00'),
      codHandlingFee: dec('0.00'),
      totalAmount: dec('1000.00'),
      isCOD: true,
    };

    const parcels: SellerParcelForSplitDispatch[] = [
      {
        vendorId: 'vendor-1',
        goodsAmount: dec('333.33'),
        courierFee: dec('150.00'),
        declaredWeightKg: dec('0.5'),
        lineIds: ['l1'],
      },
      {
        vendorId: 'vendor-2',
        goodsAmount: dec('333.33'),
        courierFee: dec('150.00'),
        declaredWeightKg: dec('0.5'),
        lineIds: ['l2'],
      },
      {
        vendorId: 'vendor-3',
        goodsAmount: dec('333.34'),
        courierFee: dec('150.00'),
        declaredWeightKg: dec('0.5'),
        lineIds: ['l3'],
      },
    ];

    const consignments = splitOrderIntoConsignments({ order, parcels });
    const totalCollected = consignments.reduce(
      (sum, c) => sum.add(c.amountToCollect),
      new Prisma.Decimal(0),
    );

    expect(totalCollected.toFixed(2)).toBe('1000.00');
  });

  it('allocates zero collectible and zero codAmount for prepaid orders', () => {
    const prepaidOrder: OrderForSplitDispatch = {
      ...sampleOrder,
      isCOD: false,
    };

    const consignments = splitOrderIntoConsignments({
      order: prepaidOrder,
      parcels: sampleParcels,
    });

    expect(consignments).toHaveLength(2);
    for (const c of consignments) {
      expect(c.amountToCollect.toFixed(2)).toBe('0.00');
      expect(c.codAmount).toBe(0);
    }

    // Courier fees still exist because the courier still carries the parcels
    expect(consignments[0]!.courierFee.toFixed(2)).toBe('150.00');
    expect(consignments[1]!.courierFee.toFixed(2)).toBe('210.00');
  });

  it('handles free delivery orders where customer delivery charge is zero', () => {
    // Free delivery: customer paid 0 delivery fee, platform absorbed courier costs
    const freeDeliveryOrder: OrderForSplitDispatch = {
      orderId: 'order-free-delivery',
      subtotal: dec('5000.00'),
      shippingFee: dec('0.00'),
      courierFee: dec('360.00'),
      codHandlingFee: dec('50.00'),
      totalAmount: dec('5050.00'),
      isCOD: true,
    };

    const parcels: SellerParcelForSplitDispatch[] = [
      {
        vendorId: 'sellerA',
        goodsAmount: dec('3000.00'),
        courierFee: dec('150.00'),
        declaredWeightKg: dec('1.0'),
        lineIds: ['l1'],
      },
      {
        vendorId: 'sellerB',
        goodsAmount: dec('2000.00'),
        courierFee: dec('210.00'),
        declaredWeightKg: dec('1.2'),
        lineIds: ['l2'],
      },
    ];

    const consignments = splitOrderIntoConsignments({
      order: freeDeliveryOrder,
      parcels,
    });

    const a = consignments.find((c) => c.vendorId === 'sellerA')!;
    const b = consignments.find((c) => c.vendorId === 'sellerB')!;

    // 3000 / 5000 * 5050 = 3030.00
    expect(a.amountToCollect.toFixed(2)).toBe('3030.00');
    expect(a.customerDeliveryChargeShare.toFixed(2)).toBe('0.00');
    expect(a.courierFee.toFixed(2)).toBe('150.00');

    // 2000 / 5000 * 5050 = 2020.00
    expect(b.amountToCollect.toFixed(2)).toBe('2020.00');
    expect(b.customerDeliveryChargeShare.toFixed(2)).toBe('0.00');
    expect(b.courierFee.toFixed(2)).toBe('210.00');

    const totalCollected = consignments.reduce(
      (sum, c) => sum.add(c.amountToCollect),
      new Prisma.Decimal(0),
    );
    expect(totalCollected.toFixed(2)).toBe('5050.00');
  });

  it('assigns courier fees to each seller parcel matching quoted courier costs', () => {
    const consignments = splitOrderIntoConsignments({
      order: sampleOrder,
      parcels: sampleParcels,
    });

    const totalCourierFee = consignments.reduce(
      (sum, c) => sum.add(c.courierFee),
      new Prisma.Decimal(0),
    );
    expect(totalCourierFee.toFixed(2)).toBe(sampleOrder.courierFee.toFixed(2));
  });

  it('handles single seller orders cleanly', () => {
    const singleParcel: SellerParcelForSplitDispatch[] = [
      {
        vendorId: 'sellerSolo',
        goodsAmount: dec('1500.00'),
        courierFee: dec('160.00'),
        declaredWeightKg: dec('0.5'),
        lineIds: ['l1'],
      },
    ];

    const order: OrderForSplitDispatch = {
      orderId: 'order-single',
      subtotal: dec('1500.00'),
      shippingFee: dec('160.00'),
      courierFee: dec('160.00'),
      codHandlingFee: dec('16.60'),
      totalAmount: dec('1676.60'),
      isCOD: true,
    };

    const consignments = splitOrderIntoConsignments({ order, parcels: singleParcel });

    expect(consignments).toHaveLength(1);
    expect(consignments[0]!.amountToCollect.toFixed(2)).toBe('1676.60');
    expect(consignments[0]!.codAmount).toBe(1676);
    expect(consignments[0]!.courierFee.toFixed(2)).toBe('160.00');
    expect(consignments[0]!.customerDeliveryChargeShare.toFixed(2)).toBe('160.00');
  });

  it('returns empty array when order has no parcels', () => {
    const consignments = splitOrderIntoConsignments({
      order: sampleOrder,
      parcels: [],
    });

    expect(consignments).toHaveLength(0);
  });

  it('orders planned consignments deterministically by vendorId', () => {
    const reversedParcels = [...sampleParcels].reverse();
    const consignments = splitOrderIntoConsignments({
      order: sampleOrder,
      parcels: reversedParcels,
    });

    expect(consignments[0]!.vendorId).toBe('sellerA');
    expect(consignments[1]!.vendorId).toBe('sellerB');
  });
});
