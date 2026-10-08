import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { SellerStatementRepository } from '../seller-statement.repository';
import { SellerStatementService } from '../seller-statement.service';

import { Prisma } from '@/config/db.prisma';
import prisma from '@/config/db.prisma';

/**
 * A closed period is an assertion about history, not a view of the present.
 *
 * Three properties matter more than anything else here, and each is the reason
 * the feature exists:
 *   1. Locking freezes the figures. Ledger activity dated inside the period must
 *      not afterwards change what the seller was told they earned.
 *   2. Whoever locked a statement cannot also approve it.
 *   3. A snapshot and the live earnings screen agree, because they share one
 *      calculation rather than each having their own.
 */
describe('SellerStatement lifecycle', () => {
  const repo = new SellerStatementRepository();
  const service = new SellerStatementService({ repo });

  let vendorId: string;
  const janStart = new Date('2026-01-01T00:00:00.000Z');
  const febStart = new Date('2026-02-01T00:00:00.000Z');
  const marStart = new Date('2026-03-01T00:00:00.000Z');

  const postEntry = async (input: {
    type: LedgerEntryType;
    direction: LedgerDirection;
    amount: string;
    occurredAt: Date;
    sourceId: string;
    orderId?: string;
  }) =>
    prisma.ledgerEntry.create({
      data: {
        type: input.type,
        direction: input.direction,
        amount: new Prisma.Decimal(input.amount),
        sourceType: 'TEST',
        sourceId: input.sourceId,
        orderId: input.orderId,
        vendorId,
        occurredAt: input.occurredAt,
      },
    });

  beforeEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.sellerStatement.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.vendorProfile.deleteMany({});

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Statement Vendor',
        email: `stmt-${Date.now()}-${Math.random()}@test.celebs.com`,
        password: 'Password123!',
        role: 'VENDOR',
      },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        shopName: `Statement Shop ${Date.now()}`,
        phoneNumber: `987${Math.floor(1000000 + Math.random() * 9000000)}`,
        panNumber: `PAN-STMT-${Date.now()}`,
        citizenshipNumber: `CIT-STMT-${Date.now()}`,
        status: 'APPROVED',
      },
    });
    vendorId = vendor.id;
  });

  it('drafts a period from the ledger and derives net by subtraction', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '1000.00',
      occurredAt: new Date('2026-01-10T00:00:00.000Z'),
      sourceId: 'ord-1',
    });
    await postEntry({
      type: LedgerEntryType.COMMISSION,
      direction: LedgerDirection.OUT,
      amount: '150.00',
      occurredAt: new Date('2026-01-10T00:00:00.000Z'),
      sourceId: 'ord-1',
    });

    const statement = await service.generate({
      vendorId,
      periodStart: janStart,
      periodEnd: febStart,
    });

    expect(statement.status).toBe('DRAFT');
    expect(statement.grossSales.toFixed(2)).toBe('1000.00');
    expect(statement.commission.toFixed(2)).toBe('150.00');
    expect(statement.netPayable.toFixed(2)).toBe('850.00');
  });

  it('returns the same statement when a period is generated twice', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '500.00',
      occurredAt: new Date('2026-01-05T00:00:00.000Z'),
      sourceId: 'ord-2',
    });

    const first = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    const second = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });

    expect(second.id).toBe(first.id);
    expect(await prisma.sellerStatement.count({ where: { vendorId } })).toBe(1);
  });

  // The core guarantee. A refund posted later must land in a later statement,
  // never rewrite a period a seller has already been shown.
  it('does not change a locked statement when a refund lands inside that period later', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '1000.00',
      occurredAt: new Date('2026-01-10T00:00:00.000Z'),
      sourceId: 'ord-3',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    const locked = await service.lock(draft.id, 'finance-a');
    expect(locked.status).toBe('LOCKED');

    // The refund happened in March, about a January order.
    await postEntry({
      type: LedgerEntryType.REFUND,
      direction: LedgerDirection.OUT,
      amount: '400.00',
      occurredAt: new Date('2026-01-20T00:00:00.000Z'),
      sourceId: 'refund-1',
    });

    const reread = await repo.findById(draft.id);
    expect(reread?.grossSales.toFixed(2)).toBe('1000.00');
    expect(reread?.netPayable.toFixed(2)).toBe('1000.00');

    // And the live ledger, which is allowed to move, now disagrees on purpose.
    const liveTotals = await repo.totalsFor(vendorId, janStart, febStart);
    expect(liveTotals.netPayable.toFixed(2)).toBe('600.00');

    // A later period picks the refund up, which is what a ledger is for.
    const march = new Date('2026-03-01T00:00:00.000Z');
    const april = new Date('2026-04-01T00:00:00.000Z');
    const laterTotals = await repo.totalsFor(vendorId, march, april);
    expect(laterTotals.refunds.toFixed(2)).toBe('0.00');
  });

  it('refuses to let the person who locked a statement also approve it', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '900.00',
      occurredAt: new Date('2026-01-11T00:00:00.000Z'),
      sourceId: 'ord-4',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    await service.lock(draft.id, 'finance-a');

    await expect(service.approve(draft.id, 'finance-a')).rejects.toThrow(/cannot also approve it/);
  });

  it('lets a second person approve, then pay', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '900.00',
      occurredAt: new Date('2026-01-12T00:00:00.000Z'),
      sourceId: 'ord-5',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    await service.lock(draft.id, 'finance-a');
    const approved = await service.approve(draft.id, 'finance-b');
    expect(approved.status).toBe('APPROVED');

    const paid = await service.markPaid(draft.id, 'treasury', 'BANK-REF-9');
    expect(paid.status).toBe('PAID');
    expect(paid.payoutReference).toBe('BANK-REF-9');
  });

  it('refuses to skip a step', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '300.00',
      occurredAt: new Date('2026-01-13T00:00:00.000Z'),
      sourceId: 'ord-6',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });

    // A draft has nothing to approve and nothing to pay.
    await expect(service.approve(draft.id, 'finance-b')).rejects.toThrow(/locked statement/);
    await expect(service.markPaid(draft.id, 'treasury', 'REF')).rejects.toThrow(
      /approved statement/,
    );
  });

  it('lets only one of two concurrent lockers win', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '700.00',
      occurredAt: new Date('2026-01-14T00:00:00.000Z'),
      sourceId: 'ord-7',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });

    const results = await Promise.allSettled([
      service.lock(draft.id, 'finance-a'),
      service.lock(draft.id, 'finance-b'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await repo.findById(draft.id))?.lockedBy).toBeTruthy();
  });

  it('withdraws a locked statement but never an approved one', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '400.00',
      occurredAt: new Date('2026-01-15T00:00:00.000Z'),
      sourceId: 'ord-8',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    await service.lock(draft.id, 'finance-a');
    const voided = await service.voidStatement(draft.id, 'finance-a', 'wrong figures');
    expect(voided.status).toBe('VOID');

    const second = await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '400.00',
      occurredAt: new Date('2026-02-10T00:00:00.000Z'),
      sourceId: 'ord-9',
    });
    expect(second).toBeTruthy();

    const febDraft = await service.generate({
      vendorId,
      periodStart: febStart,
      periodEnd: marStart,
    });
    await service.lock(febDraft.id, 'finance-a');
    await service.approve(febDraft.id, 'finance-b');

    await expect(service.voidStatement(febDraft.id, 'finance-a')).rejects.toThrow(
      /can no longer be withdrawn/,
    );
  });

  it('does not show a draft as a settled figure', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '600.00',
      occurredAt: new Date('2026-01-16T00:00:00.000Z'),
      sourceId: 'ord-10',
    });

    const draft = await service.generate({ vendorId, periodStart: janStart, periodEnd: febStart });
    expect(await service.lockedFor(vendorId, janStart)).toBeNull();

    await service.lock(draft.id, 'finance-a');
    expect((await service.lockedFor(vendorId, janStart))?.id).toBe(draft.id);
  });

  it('refuses a period that ends before it starts', async () => {
    await expect(
      service.generate({ vendorId, periodStart: febStart, periodEnd: janStart }),
    ).rejects.toThrow(/must end after it starts/);
  });

  it('agrees with the live earnings screen for the same period', async () => {
    await postEntry({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '1234.56',
      occurredAt: new Date('2026-01-17T00:00:00.000Z'),
      sourceId: 'ord-11',
    });
    await postEntry({
      type: LedgerEntryType.COMMISSION,
      direction: LedgerDirection.OUT,
      amount: '185.18',
      occurredAt: new Date('2026-01-17T00:00:00.000Z'),
      sourceId: 'ord-11',
    });

    const statement = await service.generate({
      vendorId,
      periodStart: janStart,
      periodEnd: febStart,
    });
    const { EarningsRepository } = await import('../../earnings/earnings.repository');
    const earnings = await new EarningsRepository().summarise({
      vendorId,
      from: janStart,
      to: febStart,
    });

    expect(statement.netPayable.toFixed(2)).toBe(earnings.netEarnings.toFixed(2));
    expect(statement.commission.toFixed(2)).toBe(earnings.commission.toFixed(2));
  });
});
