import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { LedgerService } from '../ledger.service';

import prisma from '@/config/db.prisma';

/**
 * The ledger's one job is to be a record you can add up. That is only true if
 * nothing can be added twice, because couriers redeliver webhooks, admins retry,
 * and a queue will happily hand the same event to two workers.
 *
 * Idempotency is enforced by the database rather than by a check in this service.
 * A read-then-write guard loses to two concurrent arrivals, and the loser posts a
 * duplicate that nobody notices until a courier statement disagrees with the books.
 */

describe('LedgerService', () => {
  let service: LedgerService;
  let orderId: string;

  beforeEach(async () => {
    service = new LedgerService();

    const user = await prisma.user.create({
      data: {
        name: 'Ledger Customer',
        email: `ledger-${Date.now()}-${Math.random()}@example.com`,
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
    const order = await prisma.order.create({
      data: {
        orderNumber: `LED-${Date.now()}-${Math.random()}`,
        userId: user.id,
        addressId: address.id,
        subtotal: 1000,
        totalAmount: 1000,
        paymentMethod: 'COD',
      },
    });
    orderId = order.id;
  });

  it('records money arriving with a positive amount and an IN direction', async () => {
    const entry = await service.post({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: 2500,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });

    expect(entry.amount.toNumber()).toBe(2500);
    expect(entry.direction).toBe(LedgerDirection.IN);
    expect(entry.type).toBe(LedgerEntryType.ORDER_REVENUE);
  });

  it('never stores a negative amount, because the direction carries the sign', async () => {
    await expect(
      service.post({
        type: LedgerEntryType.COURIER_DELIVERY_FEE,
        direction: LedgerDirection.OUT,
        amount: -80,
        sourceType: 'ORDER',
        sourceId: orderId,
      }),
    ).rejects.toThrow(/negative/i);
  });

  it('refuses a zero amount, which records nothing but pretends to', async () => {
    await expect(
      service.post({
        type: LedgerEntryType.COURIER_DELIVERY_FEE,
        direction: LedgerDirection.OUT,
        amount: 0,
        sourceType: 'ORDER',
        sourceId: orderId,
      }),
    ).rejects.toThrow();
  });

  // The whole reason the unique index exists.
  it('posts a second identical entry only once', async () => {
    const input = {
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      courier: 'PATHAO',
      amount: 80,
      sourceType: 'ORDER',
      sourceId: orderId,
    };

    const first = await service.post(input);
    const second = await service.post(input);

    expect(second.id).toBe(first.id);
    expect(await prisma.ledgerEntry.count({ where: { sourceId: orderId } })).toBe(1);
  });

  it('refuses a different amount for the same source and type rather than keeping the first', async () => {
    const input = {
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      courier: 'PATHAO',
      sourceType: 'ORDER',
      sourceId: orderId,
    };
    await service.post({ ...input, amount: 80 });

    // One courier's fee for one parcel is one number. If the same source arrives
    // with a different figure that is a bug upstream, and quietly keeping the
    // first would hide it until a courier statement disagreed with the books.
    await expect(service.post({ ...input, amount: 90 })).rejects.toThrow(/already exists/i);

    const entries = await prisma.ledgerEntry.findMany({ where: { sourceId: orderId } });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.amount.toNumber()).toBe(80);
  });

  it('records several different entry types for the same order', async () => {
    await service.post({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: 3200,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });
    await service.post({
      type: LedgerEntryType.DELIVERY_CHARGED,
      direction: LedgerDirection.IN,
      amount: 180,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });
    await service.post({
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      courier: 'PATHAO',
      amount: 80,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });

    expect(await prisma.ledgerEntry.count({ where: { orderId } })).toBe(3);
  });

  it('totals what came in against what went out for one order', async () => {
    await service.post({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: 3200,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });
    await service.post({
      type: LedgerEntryType.DELIVERY_CHARGED,
      direction: LedgerDirection.IN,
      amount: 180,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });
    await service.post({
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      courier: 'PATHAO',
      amount: 80,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
    });

    const margin = await service.netForOrder(orderId);

    expect(margin.toNumber()).toBe(3300);
  });

  it('counts a delivery given away as money out, not as nothing', async () => {
    await service
      .post({
        type: LedgerEntryType.DELIVERY_CHARGED,
        direction: LedgerDirection.IN,
        amount: 0,
        sourceType: 'ORDER',
        sourceId: orderId,
      })
      .catch(() => undefined);

    await service.post({
      type: LedgerEntryType.FREE_DELIVERY_ABSORBED,
      direction: LedgerDirection.OUT,
      amount: 180,
      sourceType: 'ORDER',
      sourceId: orderId,
      orderId,
      memo: 'Free delivery threshold applied',
    });

    const margin = await service.netForOrder(orderId);

    expect(margin.toNumber()).toBe(-180);
  });

  it('keeps one courier out of another courier total', async () => {
    await service.post({
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      amount: 80,
      courier: 'PATHAO',
      sourceType: 'ORDER',
      sourceId: orderId,
    });
    await service.post({
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      amount: 120,
      courier: 'NEPAL_CAN_MOVE',
      sourceType: 'ORDER',
      sourceId: `${orderId}-b`,
    });

    expect((await service.courierFeesBetween('PATHAO', new Date(0), new Date())).toNumber()).toBe(
      80,
    );
    expect(
      (await service.courierFeesBetween('NEPAL_CAN_MOVE', new Date(0), new Date())).toNumber(),
    ).toBe(120);
  });

  it('rejects a courier cost that was posted without saying which courier', async () => {
    await expect(
      service.post({
        type: LedgerEntryType.COURIER_DELIVERY_FEE,
        direction: LedgerDirection.OUT,
        amount: 80,
        sourceType: 'ORDER',
        sourceId: orderId,
      }),
    ).rejects.toThrow(/courier/i);
  });

  it('allows a non-courier entry to have no courier', async () => {
    await expect(
      service.post({
        type: LedgerEntryType.ORDER_REVENUE,
        direction: LedgerDirection.IN,
        amount: 100,
        sourceType: 'ORDER',
        sourceId: orderId,
      }),
    ).resolves.toBeDefined();
  });
});
