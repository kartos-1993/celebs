import { describe, expect, it } from 'vitest';

import { isAboveZero, isBelowZero, isExactlyZero } from '../decimal';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Pinned because the shortcut this replaces looks correct and is not.
 *
 * `Decimal.isPositive()` in this Prisma Decimal means "not negative", so it answers
 * `true` for zero - whether the zero was constructed in memory or read back from a
 * column. A ledger written against it treats "no delivery was absorbed" as "some
 * delivery was absorbed", and posts a line for money that does not exist.
 */
describe('decimal predicates', () => {
  async function readZeroFromDatabase(): Promise<Prisma.Decimal> {
    const user = await prisma.user.create({
      data: { name: 'Decimal Probe', email: `dec-${Date.now()}@e.com`, password: 'Password123!' },
    });
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        fullName: 'R',
        phone: '9841000000',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Thamel',
        streetAddress: 'S',
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `DEC-${Date.now()}`,
        userId: user.id,
        addressId: address.id,
        subtotal: 100,
        shippingFee: 0,
        absorbedShippingCost: 0,
        totalAmount: 100,
        paymentMethod: 'KHALTI',
      },
    });
    const read = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { absorbedShippingCost: true },
    });
    return read.absorbedShippingCost!;
  }

  it('does not treat a zero read from the database as a positive amount', async () => {
    const fromDb = await readZeroFromDatabase();

    expect(fromDb.toNumber()).toBe(0);
    expect(isAboveZero(fromDb)).toBe(false);
    expect(isBelowZero(fromDb)).toBe(false);
    expect(isExactlyZero(fromDb)).toBe(true);
  });

  it('records why the shortcut is banned', async () => {
    const fromDb = await readZeroFromDatabase();

    // The bug itself, asserted so the comment above cannot become a lie: zero
    // answers true to isPositive from either source, because it means "not
    // negative" rather than "greater than zero".
    expect(fromDb.isPositive()).toBe(true);
    expect(new Prisma.Decimal(0).isPositive()).toBe(true);
    expect(new Prisma.Decimal(-80).isPositive()).toBe(false);
  });

  it('recognises a real amount whichever way it arrived', () => {
    expect(isAboveZero(new Prisma.Decimal(180))).toBe(true);
    expect(isAboveZero(new Prisma.Decimal('180.00'))).toBe(true);
    expect(isExactlyZero(new Prisma.Decimal(0))).toBe(true);
  });

  it('recognises an amount below zero', () => {
    expect(isBelowZero(new Prisma.Decimal(-80))).toBe(true);
    expect(isBelowZero(new Prisma.Decimal(80))).toBe(false);
  });

  it('treats a missing amount as zero rather than crashing', () => {
    expect(isAboveZero(null)).toBe(false);
    expect(isAboveZero(undefined)).toBe(false);
    expect(isBelowZero(null)).toBe(false);
    expect(isExactlyZero(null)).toBe(true);
  });
});
