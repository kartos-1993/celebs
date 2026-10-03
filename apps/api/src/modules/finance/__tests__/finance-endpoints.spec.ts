import { LedgerDirection, LedgerEntryType, SettlementBatchStatus } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authedMutation } from '../../../../tests/support/csrf-origin';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

/**
 * The platform courier ledger.
 *
 * These routes carry the whole marketplace's delivery costs and its agreements
 * with couriers, which is why they do not reuse the shop-scoped FINANCE_VIEW that
 * a seller holds: "review shop revenue" must never become "review every other
 * seller's delivery costs". The split is the whole point of the permission
 * tests here, and the vendor refusals are the regression guard for it.
 *
 * STAFF is used as a second refusal case because it holds no permissions at all,
 * so it separates "the wrong permission" from "no permission".
 */

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const PASSWORD = 'Password123!';
const PERIOD_START = new Date('2026-09-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-10-01T00:00:00.000Z');

let adminCookie: string;
let staffCookie: string;
let vendorCookie: string;
let batchId: string;

const cookieOf = (res: { headers: Record<string, string | string[]> }): string => {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw.map((c) => c.split(';')[0]).join('; ') : (raw ?? '');
};

async function createAndLogin(role: 'ADMIN' | 'STAFF' | 'VENDOR'): Promise<string> {
  const email = `finance-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;

  await prisma.user.create({
    data: {
      name: `Finance ${role}`,
      email,
      password: await hashValue(PASSWORD),
      role,
      isEmailVerified: true,
    },
  });

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  return cookieOf(response as never);
}

/**
 * Fixtures are built per test, not in beforeAll: the shared setup truncates every
 * table before each test, so a user created in beforeAll is gone - and its session
 * cookie authenticates nothing - by the time the first assertion runs.
 */
beforeEach(async () => {
  adminCookie = await createAndLogin('ADMIN');
  staffCookie = await createAndLogin('STAFF');
  vendorCookie = await createAndLogin('VENDOR');

  batchId = (
    await prisma.settlementBatch.create({
      data: {
        courier: 'PATHAO',
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        expectedCollected: 2000,
        expectedFees: 200,
        status: SettlementBatchStatus.OPEN,
      },
    })
  ).id;

  await prisma.ledgerEntry.create({
    data: {
      type: LedgerEntryType.COURIER_DELIVERY_FEE,
      direction: LedgerDirection.OUT,
      amount: 200,
      courier: 'PATHAO',
      sourceType: 'CONSIGNMENT',
      sourceId: `cons-${Math.random()}`,
      memo: 'Delivery charge from Pathao',
    },
  });
});

describe('platform finance permissions', () => {
  // A seller legitimately holds the shop-scoped FINANCE_VIEW. It must not carry
  // them into the platform ledger.
  it('refuses a seller who only holds their own shop finance permission', async () => {
    const response = await request(app).get('/api/v1/finance/ledger').set('Cookie', vendorCookie);

    expect([401, 403]).toContain(response.status);
  });

  it('refuses staff, who hold no permissions at all', async () => {
    const response = await request(app).get('/api/v1/finance/ledger').set('Cookie', staffCookie);

    expect([401, 403]).toContain(response.status);
  });

  it('refuses an unauthenticated caller', async () => {
    const response = await request(app).get('/api/v1/finance/ledger');

    expect([401, 403]).toContain(response.status);
  });
});

describe('finance ledger', () => {
  it('lists entries to an admin', async () => {
    const response = await request(app).get('/api/v1/finance/ledger').set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.meta).toMatchObject({ page: 1 });
  });

  it('carries a request id and timestamp', async () => {
    const response = await request(app).get('/api/v1/finance/ledger').set('Cookie', adminCookie);

    expect(typeof response.body.requestId).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
  });

  // Decimal to an exact string: a JSON number would round a paisa away, and this is
  // the figure an accountant copies into a spreadsheet.
  it('sends amounts as exact strings so paisa survives', async () => {
    const response = await request(app).get('/api/v1/finance/ledger').set('Cookie', adminCookie);

    expect(typeof response.body.data[0].amount).toBe('string');
  });

  it('narrows to one courier when asked', async () => {
    const response = await request(app)
      .get('/api/v1/finance/ledger?courier=PATHAO')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.every((e: { courier: string }) => e.courier === 'PATHAO')).toBe(true);
  });
});

describe('finance settlements', () => {
  it('lets an admin read settlement batches', async () => {
    const response = await request(app)
      .get('/api/v1/finance/settlements')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.some((b: { id: string }) => b.id === batchId)).toBe(true);
  });

  it('stops a seller recording a statement, because that moves money', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', vendorCookie),
      vendorCookie,
    ).send({ declaredCollected: 2000, declaredFees: 200 });

    expect(response.status).toBe(403);
  });

  it('stops a seller marking a settlement paid', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', vendorCookie),
      vendorCookie,
    );

    expect(response.status).toBe(403);
  });

  it('lets an admin record a statement and shows the variance', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800, declaredFees: 200, reference: 'PATHAO-STMT-09' });

    expect(response.status).toBe(200);
    expect(response.body.data.declaredCollected).toBe('1800.00');
    expect(response.body.data.variance).toBe('-200.00');
    expect(response.body.data.reference).toBe('PATHAO-STMT-09');
  });

  it('keeps both the expected and the declared figure visible', async () => {
    await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800, declaredFees: 200 });

    const response = await request(app)
      .get('/api/v1/finance/settlements')
      .set('Cookie', adminCookie);

    const batch = response.body.data.find((b: { id: string }) => b.id === batchId);
    expect(batch.expectedCollected).toBe('2000.00');
    expect(batch.declaredCollected).toBe('1800.00');
    expect(batch.variance).toBe('-200.00');
  });

  it('rejects a statement with a negative figure', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: -100, declaredFees: 0 });

    expect(response.status).toBe(400);
  });

  it('answers 404 for a batch that does not exist', async () => {
    const response = await authedMutation(
      request(app)
        .patch('/api/v1/finance/settlements/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 100, declaredFees: 0 });

    expect(response.status).toBe(404);
  });

  it('refuses to reconcile a batch that has no courier statement recorded', async () => {
    // The batch is fresh: nothing has been declared. The declared figures default
    // to zero, so without an explicit record of the statement arriving, a zero
    // batch looks identical to a real statement of zero and would reconcile and
    // then pay against money nobody ever declared.
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'RECONCILED' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/statement/i);
  });

  // The one route to PAID that must stay shut. If a request could carry its own
  // statement and ask to be paid in the same call, reconciliation would be
  // something a caller could talk past rather than a step it has to pass.
  it('refuses to pay in the same request that records the statement', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800, declaredFees: 200, status: 'PAID' });

    expect(response.status).toBe(409);

    const batch = await prisma.settlementBatch.findUniqueOrThrow({ where: { id: batchId } });
    expect(batch.status).toBe('OPEN');
    expect(
      await prisma.ledgerEntry.count({ where: { sourceType: 'SETTLEMENT', sourceId: batchId } }),
    ).toBe(0);
  });

  it('refuses a statement that is missing its figures', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800 });

    expect(response.status).toBe(400);
  });

  it('refuses to pay a settlement nobody has reconciled', async () => {
    const response = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'PAID' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/OPEN to PAID/);
  });

  it('reconciles, then pays, and records the payment in the ledger', async () => {
    await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800, declaredFees: 200 });

    const reconciled = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'RECONCILED' });
    expect(reconciled.status).toBe(200);
    expect(reconciled.body.data.status).toBe('RECONCILED');

    const paid = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'PAID' });
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');

    const entry = await prisma.ledgerEntry.findFirstOrThrow({
      where: { sourceType: 'SETTLEMENT', sourceId: batchId },
    });
    // 1800 declared less the 200 of fees the courier charged.
    expect(entry.amount.toNumber()).toBe(1600);
    expect(entry.direction).toBe(LedgerDirection.OUT);
  });

  it('will not pay the same settlement twice', async () => {
    await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ declaredCollected: 1800, declaredFees: 200 });

    await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'RECONCILED' });
    await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'PAID' });

    const second = await authedMutation(
      request(app).patch(`/api/v1/finance/settlements/${batchId}`).set('Cookie', adminCookie),
      adminCookie,
    ).send({ status: 'PAID' });

    expect(second.status).toBe(409);
    expect(
      await prisma.ledgerEntry.count({ where: { sourceType: 'SETTLEMENT', sourceId: batchId } }),
    ).toBe(1);
  });
});
