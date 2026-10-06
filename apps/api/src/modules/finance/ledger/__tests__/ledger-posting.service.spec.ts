import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { postOrderCommissionEntries, postOrderPlacementEntries } from '../ledger-posting.service';

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

/**
 * Commission is posted per seller, against the order line it came from.
 *
 * Two properties this has to hold. The entry must carry the seller, because
 * ORDER_REVENUE is posted once for a whole basket and a multi-vendor order would
 * otherwise credit one seller with another's goods. And the commission must be a
 * distinct entry rather than a reduction of revenue, so a seller reading their
 * ledger can see what was taken.
 */
describe('posting commission to the ledger', () => {
  beforeEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
  });

  async function seedOrderWithLine(subtotal: number, commissionAmount: number) {
    const order = await seedOrder({ subtotal, shippingFee: 0, totalAmount: subtotal });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: (
          await prisma.user.create({
            data: {
              name: 'Line Seller',
              email: `lineseller-${Date.now()}-${Math.random()}@example.com`,
              password: 'Password123!',
            },
          })
        ).id,
        phoneNumber: `98${Date.now()}`.slice(0, 10),
        shopName: `Line Shop ${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        panNumber: `P${Date.now()}${Math.random().toString(36).slice(2, 8)}`
          .toUpperCase()
          .slice(0, 10),
        citizenshipNumber: `C${Date.now()}${Math.random().toString(36).slice(2, 8)}`
          .toUpperCase()
          .slice(0, 14),
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        inventoryId: (
          await prisma.productInventory.create({
            data: {
              productId: (
                await prisma.product.create({
                  data: {
                    name: 'Commission Test Product',
                    slug: `commission-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    categoryId: (
                      await prisma.category.create({
                        data: {
                          name: `CC-${Date.now()}`,
                          slug: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        },
                      })
                    ).id,
                    vendorId: vendor.id,
                    price: subtotal,
                  },
                })
              ).id,
              colorVariantName: 'Default',
              size: 'M',
              sku: `COMM-SKU-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              quantity: 10,
              reservedQuantity: 0,
            },
          })
        ).id,
        vendorId: vendor.id,
        productName: 'Commission Test Product',
        colorVariantName: 'Default',
        size: 'M',
        unitPrice: subtotal,
        quantity: 1,
        subtotal,
        commissionAmount,
        sellerNetAmount: subtotal - commissionAmount,
      },
    });

    return { order, vendor };
  }

  it('records the platform cut as its own entry, attributed to the seller', async () => {
    const { order, vendor } = await seedOrderWithLine(1000, 75);

    await postOrderCommissionEntries({ orderId: order.id });

    const entries = await prisma.ledgerEntry.findMany({
      where: { type: LedgerEntryType.COMMISSION },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.amount.toNumber()).toBe(75);
    expect(entries[0]?.direction).toBe(LedgerDirection.OUT);
    expect(entries[0]?.vendorId).toBe(vendor.id);
  });

  it('records nothing for a line that paid no commission', async () => {
    // A zero-commission rule must not produce a zero-valued movement that reads
    // like a transaction.
    const { order } = await seedOrderWithLine(1000, 0);

    await postOrderCommissionEntries({ orderId: order.id });

    expect(await prisma.ledgerEntry.count({ where: { type: LedgerEntryType.COMMISSION } })).toBe(0);
  });

  it('does not double-post when a checkout is retried', async () => {
    const { order } = await seedOrderWithLine(1000, 75);

    await postOrderCommissionEntries({ orderId: order.id });
    await postOrderCommissionEntries({ orderId: order.id });

    expect(await prisma.ledgerEntry.count({ where: { type: LedgerEntryType.COMMISSION } })).toBe(1);
  });

  it('records one entry per seller, so a shared basket is not credited to one of them', async () => {
    const { order, vendor: firstVendor } = await seedOrderWithLine(1000, 75);

    const secondVendor = await prisma.vendorProfile.create({
      data: {
        userId: (
          await prisma.user.create({
            data: {
              name: 'Second Seller',
              email: `secondseller-${Date.now()}-${Math.random()}@example.com`,
              password: 'Password123!',
            },
          })
        ).id,
        phoneNumber: `97${Date.now()}`.slice(0, 10),
        shopName: `Second Shop ${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        panNumber: `Q${Date.now()}${Math.random().toString(36).slice(2, 8)}`
          .toUpperCase()
          .slice(0, 10),
        citizenshipNumber: `D${Date.now()}${Math.random().toString(36).slice(2, 8)}`
          .toUpperCase()
          .slice(0, 14),
      },
    });

    const secondItem = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

    await prisma.orderItem.create({
      data: {
        ...secondItem,
        id: undefined,
        inventoryId: secondItem.inventoryId,
        vendorId: secondVendor.id,
        subtotal: 600,
        commissionAmount: 45,
        sellerNetAmount: 555,
      },
    });

    await postOrderCommissionEntries({ orderId: order.id });

    const entries = await prisma.ledgerEntry.findMany({
      where: { type: LedgerEntryType.COMMISSION },
      orderBy: { amount: 'asc' },
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.vendorId).sort()).toEqual([firstVendor.id, secondVendor.id].sort());
    // Each seller is charged only their own line's commission.
    expect(entries.map((e) => e.amount.toNumber()).sort()).toEqual([45, 75]);
  });
});
