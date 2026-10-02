import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { postOrderPlacementEntries } from '../ledger-posting.service';

import prisma from '@/config/db.prisma';

/**
 * Where an order's money first becomes a fact.
 *
 * Three things are decided at checkout and nowhere else: what the goods sold for,
 * what the customer was charged for delivery, and - when a threshold was met -
 * what delivery cost us anyway. Recording them here means the sales and delivery
 * figures exist before the parcel has moved, which is the only way a period's
 * revenue is not something reconstructed at the end of it.
 *
 * COD is deliberately absent. The sale is recorded; the cash has not moved yet and
 * is recorded when it does, so counting it here would count the same money twice.
 */

async function seedOrder(overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      name: 'Posting Customer',
      email: `post-${Date.now()}-${Math.random()}@example.com`,
      password: 'Password123!',
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      fullName: 'Ram Bahadur',
      phone: '9841000000',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'Thamel',
      streetAddress: 'Chaksibari Marg',
    },
  });
  return prisma.order.create({
    data: {
      orderNumber: `POST-${Date.now()}-${Math.random()}`,
      userId: user.id,
      addressId: address.id,
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: 'KHALTI',
      ...overrides,
    } as never,
  });
}

describe('posting an order placement to the ledger', () => {
  beforeEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
  });

  it('records what the goods sold for', async () => {
    const order = await seedOrder({ subtotal: 3200, shippingFee: 180, totalAmount: 3380 });

    await postOrderPlacementEntries({ orderId: order.id });

    const revenue = await prisma.ledgerEntry.findFirstOrThrow({
      where: { orderId: order.id, type: LedgerEntryType.ORDER_REVENUE },
    });
    expect(revenue.amount.toNumber()).toBe(3200);
    expect(revenue.direction).toBe(LedgerDirection.IN);
  });

  it('records the delivery the customer was charged', async () => {
    const order = await seedOrder({ subtotal: 3200, shippingFee: 180, totalAmount: 3380 });

    await postOrderPlacementEntries({ orderId: order.id });

    const charged = await prisma.ledgerEntry.findFirstOrThrow({
      where: { orderId: order.id, type: LedgerEntryType.DELIVERY_CHARGED },
    });
    expect(charged.amount.toNumber()).toBe(180);
    expect(charged.direction).toBe(LedgerDirection.IN);
  });

  it('does not record a delivery charge when delivery was free and nothing was absorbed', async () => {
    const order = await seedOrder({
      subtotal: 3200,
      shippingFee: 0,
      absorbedShippingCost: 0,
      totalAmount: 3200,
    });

    await postOrderPlacementEntries({ orderId: order.id });

    expect(
      await prisma.ledgerEntry.count({
        where: { orderId: order.id, type: LedgerEntryType.DELIVERY_CHARGED },
      }),
    ).toBe(0);
  });

  // The threshold giveaway is a real cost and has to appear as one. Reported as
  // revenue it would flatter the period; reported nowhere it would be invisible.
  it('records delivery given away to reach a threshold as a cost', async () => {
    const order = await seedOrder({
      subtotal: 5200,
      shippingFee: 0,
      absorbedShippingCost: 180,
      totalAmount: 5200,
    });

    await postOrderPlacementEntries({ orderId: order.id });

    const absorbed = await prisma.ledgerEntry.findFirstOrThrow({
      where: { orderId: order.id, type: LedgerEntryType.FREE_DELIVERY_ABSORBED },
    });
    expect(absorbed.amount.toNumber()).toBe(180);
    expect(absorbed.direction).toBe(LedgerDirection.OUT);
  });

  it('does not count the same order twice', async () => {
    const order = await seedOrder({ subtotal: 3200, shippingFee: 180, totalAmount: 3380 });

    await postOrderPlacementEntries({ orderId: order.id });
    await postOrderPlacementEntries({ orderId: order.id });

    expect(await prisma.ledgerEntry.count({ where: { orderId: order.id } })).toBe(2);
  });

  // The courier will hold this cash, but it is not ours until it is remitted.
  it('does not record cash the courier has not collected yet', async () => {
    const order = await seedOrder({
      subtotal: 3200,
      shippingFee: 180,
      totalAmount: 3380,
      paymentMethod: 'COD',
      codAmount: 3380,
    });

    await postOrderPlacementEntries({ orderId: order.id });

    expect(
      await prisma.ledgerEntry.count({
        where: { orderId: order.id, type: LedgerEntryType.COD_EXPECTED },
      }),
    ).toBe(0);
  });

  it('records nothing at all for an order with no value', async () => {
    const order = await seedOrder({ subtotal: 0, shippingFee: 0, totalAmount: 0 });

    await postOrderPlacementEntries({ orderId: order.id });

    expect(await prisma.ledgerEntry.count({ where: { orderId: order.id } })).toBe(0);
  });

  it('keeps revenue and absorbed delivery on the same order so the margin is readable', async () => {
    const order = await seedOrder({
      subtotal: 5200,
      shippingFee: 0,
      absorbedShippingCost: 180,
      totalAmount: 5200,
    });

    await postOrderPlacementEntries({ orderId: order.id });

    const entries = await prisma.ledgerEntry.findMany({ where: { orderId: order.id } });
    const net = entries
      .filter((e) => e.direction === LedgerDirection.IN)
      .reduce((sum, e) => sum.plus(e.amount), entries[0]!.amount.mul(0))
      .minus(
        entries
          .filter((e) => e.direction === LedgerDirection.OUT)
          .reduce((sum, e) => sum.plus(e.amount), entries[0]!.amount.mul(0)),
      );

    // 5200 taken, 180 of delivery given away.
    expect(net.toNumber()).toBe(5020);
  });
});
