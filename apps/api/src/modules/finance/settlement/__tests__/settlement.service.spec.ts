import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettlementService } from '../settlement.service';

import prisma from '@/config/db.prisma';
import { Prisma } from '@/config/db.prisma';

/**
 * A courier statement is a claim. This is what holds it against our own books.
 *
 * Both numbers are kept rather than only a difference, because a variance with
 * nothing to explain it cannot be argued about - and arguing with a courier about
 * money is the entire reason this exists. The expectation is computed from what
 * our orders say was owed and what the ledger says a courier charged, never typed
 * in by hand, so the comparison stays honest as the period is worked.
 */

const PERIOD_START = new Date('2026-09-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-10-01T00:00:00.000Z');

async function seedOrderInPeriod(overrides: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: {
      name: 'Recon',
      email: `rec-${Date.now()}-${Math.random()}@e.com`,
      password: 'Password123!',
    },
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
  return prisma.order.create({
    data: {
      orderNumber: `REC-${Date.now()}-${Math.random()}`,
      userId: user.id,
      addressId: address.id,
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: 'COD',
      courierProvider: 'PATHAO',
      codAmount: 1200,
      codSettledAt: new Date('2026-09-15T00:00:00.000Z'),
      ...overrides,
    } as never,
  });
}

async function postFee(amount: number, occurredAt: Date, courier = 'PATHAO', orderId?: string) {
  return prisma.ledgerEntry.create({
    data: {
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      amount: new Prisma.Decimal(amount),
      courier,
      sourceType: 'CONSIGNMENT',
      sourceId: `cons-${Math.random()}`,
      orderId,
      occurredAt,
    },
  });
}

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    service = new SettlementService();
  });

  describe('opening a batch', () => {
    it('expects the cash our own orders say the courier should have collected', async () => {
      await seedOrderInPeriod({ codAmount: 1200 });
      await seedOrderInPeriod({ codAmount: 800 });

      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(batch.expectedCollected.toNumber()).toBe(2000);
    });

    it('expects the fees the ledger recorded in that period', async () => {
      await postFee(80, new Date('2026-09-10T00:00:00.000Z'));
      await postFee(120, new Date('2026-09-20T00:00:00.000Z'));

      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(batch.expectedFees.toNumber()).toBe(200);
    });

    // The point of separating expectation from declaration: retail money must not
    // be mistaken for a courier's collection.
    it('does not count goods sold as cash the courier collected', async () => {
      await seedOrderInPeriod({ codAmount: 1200 });
      await prisma.ledgerEntry.create({
        data: {
          type: LedgerEntryType.ORDER_REVENUE,
          direction: LedgerDirection.IN,
          amount: new Prisma.Decimal(5000),
          sourceType: 'ORDER',
          sourceId: `rev-${Math.random()}`,
          occurredAt: new Date('2026-09-11T00:00:00.000Z'),
        },
      });

      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(batch.expectedCollected.toNumber()).toBe(1200);
    });

    it('leaves out money belonging to a different courier', async () => {
      await postFee(80, new Date('2026-09-10T00:00:00.000Z'), 'PATHAO');
      await postFee(500, new Date('2026-09-10T00:00:00.000Z'), 'NEPAL_CAN_MOVE');

      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(batch.expectedFees.toNumber()).toBe(80);
    });

    it('ignores fees from outside the period', async () => {
      await postFee(80, new Date('2026-09-10T00:00:00.000Z'));
      await postFee(999, new Date('2026-08-01T00:00:00.000Z'));

      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(batch.expectedFees.toNumber()).toBe(80);
    });

    it('does not open a second batch for the same courier and period', async () => {
      await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
      const second = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(await prisma.settlementBatch.count()).toBe(1);
      expect(second.status).toBe('OPEN');
    });

    it('opens a separate batch for a different courier', async () => {
      await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
      await service.openBatch({
        courier: 'NEPAL_CAN_MOVE',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });

      expect(await prisma.settlementBatch.count()).toBe(2);
    });
  });

  describe('comparing the statement to our books', () => {
    async function openWithExpectation(expectedCollected: number, expectedFees: number) {
      const orders = [];
      if (expectedCollected > 0) {
        orders.push(await seedOrderInPeriod({ codAmount: expectedCollected }));
      }
      if (expectedFees > 0) {
        await postFee(expectedFees, new Date('2026-09-10T00:00:00.000Z'), 'PATHAO', orders[0]?.id);
      }
      return service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
    }

    it('reports no variance when the courier agrees with us', async () => {
      const batch = await openWithExpectation(2000, 200);

      const reconciled = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 2000,
        declaredFees: 200,
      });

      expect(reconciled.variance.toNumber()).toBe(0);
    });

    // The case this whole feature exists for: they say they collected less than
    // our orders say they should have.
    it('reports a shortfall when the courier declares less than we expected', async () => {
      const batch = await openWithExpectation(2000, 200);

      const reconciled = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1800,
        declaredFees: 200,
      });

      // (1800 - 200) - (2000 - 200) = -200
      expect(reconciled.variance.toNumber()).toBe(-200);
    });

    it('reports an overage when the courier declares more than we expected', async () => {
      const batch = await openWithExpectation(2000, 200);

      const reconciled = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 2000,
        declaredFees: 150,
      });

      // They charged us 50 less than we thought: (2000-150)-(2000-200) = 50
      expect(reconciled.variance.toNumber()).toBe(50);
    });

    it('keeps the courier reference so a dispute has something to point at', async () => {
      const batch = await openWithExpectation(2000, 200);

      const reconciled = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 2000,
        declaredFees: 200,
        reference: 'PATHAO-STMT-2026-09',
      });

      expect(reconciled.reference).toBe('PATHAO-STMT-2026-09');
    });

    it('keeps both figures, not just the difference', async () => {
      const batch = await openWithExpectation(2000, 200);

      const reconciled = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1800,
        declaredFees: 200,
      });

      expect(reconciled.expectedCollected.toNumber()).toBe(2000);
      expect(reconciled.declaredCollected.toNumber()).toBe(1800);
      expect(reconciled.expectedFees.toNumber()).toBe(200);
      expect(reconciled.declaredFees.toNumber()).toBe(200);
    });

    it('lets a mistyped statement be corrected while the batch is still open', async () => {
      const batch = await openWithExpectation(2000, 200);
      await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1500,
        declaredFees: 200,
      });

      // Still open means nobody has signed it off yet, so fixing a typo is fine.
      const corrected = await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1800,
        declaredFees: 200,
      });

      expect(corrected.declaredCollected.toNumber()).toBe(1800);
    });

    it('does not let a signed-off batch be quietly restated', async () => {
      const batch = await openWithExpectation(2000, 200);
      await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1800,
        declaredFees: 200,
      });
      await service.reconcile({ batchId: batch.id, reconciledBy: 'finance-1' });

      // Someone signed off on these figures. Rewriting them after that would
      // change what was agreed without leaving a trace.
      await expect(
        service.recordStatement({ batchId: batch.id, declaredCollected: 2000, declaredFees: 200 }),
      ).rejects.toThrow(/already reconciled/i);

      const stored = await prisma.settlementBatch.findUniqueOrThrow({ where: { id: batch.id } });
      expect(stored.declaredCollected.toNumber()).toBe(1800);
    });
  });

  describe('settling up', () => {
    async function reconciledBatch() {
      const order = await seedOrderInPeriod({ codAmount: 2000 });
      await postFee(200, new Date('2026-09-10T00:00:00.000Z'), 'PATHAO', order.id);
      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
      await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 2000,
        declaredFees: 200,
      });
      return service.reconcile({ batchId: batch.id, reconciledBy: 'finance-1' });
    }

    it('records who reconciled and when', async () => {
      const batch = await reconciledBatch();

      expect(batch.status).toBe('RECONCILED');
      expect(batch.reconciledBy).toBe('finance-1');
      expect(batch.reconciledAt).not.toBeNull();
    });

    it('posts the payment to the courier as money going out', async () => {
      const batch = await reconciledBatch();

      const paid = await service.markPaid({ batchId: batch.id, paidBy: 'finance-1' });

      expect(paid.status).toBe('PAID');
      expect(paid.paidBy).toBe('finance-1');

      const entry = await prisma.ledgerEntry.findFirstOrThrow({
        where: { sourceType: 'SETTLEMENT', sourceId: batch.id },
      });
      expect(entry.type).toBe(LedgerEntryType.COURIER_PAYMENT);
      expect(entry.direction).toBe(LedgerDirection.OUT);
      // Net owed: 2000 collected less the 200 of fees they charged.
      expect(entry.amount.toNumber()).toBe(1800);
    });

    it('does not pay the same batch twice', async () => {
      const batch = await reconciledBatch();
      await service.markPaid({ batchId: batch.id, paidBy: 'finance-1' });

      await expect(service.markPaid({ batchId: batch.id, paidBy: 'finance-1' })).rejects.toThrow();

      expect(
        await prisma.ledgerEntry.count({ where: { sourceType: 'SETTLEMENT', sourceId: batch.id } }),
      ).toBe(1);
    });

    it('refuses to pay a batch nobody has reconciled', async () => {
      const order = await seedOrderInPeriod({ codAmount: 2000 });
      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
      await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 2000,
        declaredFees: 0,
      });
      void order;

      await expect(service.markPaid({ batchId: batch.id, paidBy: 'finance-1' })).rejects.toThrow(
        /reconcil/i,
      );
    });

    it('pays what the courier says is owed, not what we hoped', async () => {
      const order = await seedOrderInPeriod({ codAmount: 2000 });
      await postFee(200, new Date('2026-09-10T00:00:00.000Z'), 'PATHAO', order.id);
      const batch = await service.openBatch({
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      });
      await service.recordStatement({
        batchId: batch.id,
        declaredCollected: 1800,
        declaredFees: 200,
      });
      await service.reconcile({ batchId: batch.id, reconciledBy: 'finance-1' });

      await service.markPaid({ batchId: batch.id, paidBy: 'finance-1' });

      const entry = await prisma.ledgerEntry.findFirstOrThrow({
        where: { sourceType: 'SETTLEMENT', sourceId: batch.id },
      });
      expect(entry.amount.toNumber()).toBe(1600);
    });
  });
});
