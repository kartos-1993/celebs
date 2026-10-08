import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authedMutation,TEST_ORIGIN } from '../../../../../tests/support/csrf-origin';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Seller statements over HTTP.
 *
 * The route layer is where scoping is actually enforced, so these tests are about
 * who can see and do what - not about the arithmetic, which seller-statement.spec
 * covers. Two properties carry the weight:
 *
 *   1. A seller sees their own statements and cannot reach another seller's by
 *      passing an id, however they obtained it.
 *   2. The four workflow steps are separately gated, and the prepare/approve
 *      inequality survives being driven through real endpoints.
 *
 * Mutating requests go through authedMutation so they carry an allowed Origin.
 * Without it the CSRF guard answers 403, which reads exactly like RBAC refusing
 * a permission the caller genuinely holds.
 */
describe('seller statement endpoints', () => {
  const BASE = '/api/v1/finance/statements';

  let vendorAId: string;
  let vendorBId: string;
  let adminId: string;
  let sellerCookie: string;
  let otherSellerCookie: string;
  let adminCookie: string;
  let approverCookie: string;

  const postEntry = async (input: {
    vendorId: string;
    type: LedgerEntryType;
    direction: LedgerDirection;
    amount: string;
    sourceId: string;
  }) =>
    prisma.ledgerEntry.create({
      data: {
        type: input.type,
        direction: input.direction,
        amount: new Prisma.Decimal(input.amount),
        sourceType: 'TEST',
        sourceId: input.sourceId,
        vendorId: input.vendorId,
        occurredAt: new Date('2026-01-10T00:00:00.000Z'),
      },
    });

  const makeVendor = async (label: string) => {
    const user = await prisma.user.create({
      data: {
        name: `Vendor ${label}`,
        email: `stmt-${label}-${Date.now()}-${Math.random()}@test.celebs.com`,
        password: await hashValue('Password123!'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    const profile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Shop ${label} ${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `PAN-${label}-${Date.now()}`,
        citizenshipNumber: `CIT-${label}-${Date.now()}`,
        status: 'APPROVED',
      },
    });
    return { user, profile };
  };

  const login = async (email: string) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', TEST_ORIGIN)
      .send({ email, password: 'Password123!' });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    const list = Array.isArray(cookies) ? cookies : [cookies];
    return list
      .filter((c): c is string => typeof c === 'string')
      .map((c) => c.split(';')[0])
      .join('; ');
  };

  beforeEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.sellerStatement.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.vendorProfile.deleteMany({});
    await prisma.user.deleteMany({});

    const a = await makeVendor('a');
    const b = await makeVendor('b');
    vendorAId = a.profile.id;
    vendorBId = b.profile.id;

    const admin = await prisma.user.create({
      data: {
        name: 'Statement Admin',
        email: `stmt-admin-${Date.now()}@test.celebs.com`,
        password: await hashValue('Password123!'),
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    adminId = admin.id;

    // A second platform operator. The happy path needs two people: one to freeze
    // the figures and another to authorise the payout, which is the whole point.
    const approver = await prisma.user.create({
      data: {
        name: 'Statement Approver',
        email: `stmt-approver-${Date.now()}@test.celebs.com`,
        password: await hashValue('Password123!'),
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    sellerCookie = await login(a.user.email);
    otherSellerCookie = await login(b.user.email);
    adminCookie = await login(admin.email);
    approverCookie = await login(approver.email);
  });

  afterEach(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.sellerStatement.deleteMany({});
    await prisma.vendorProfile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  const janStart = new Date('2026-01-01T00:00:00.000Z');
  const febStart = new Date('2026-02-01T00:00:00.000Z');
  const period = { periodStart: janStart.toISOString(), periodEnd: febStart.toISOString() };

  const draftFor = (cookie: string, vendorId: string) =>
    authedMutation(request(app).post(`${BASE}/generate`), cookie).send({ ...period, vendorId });

  it('drafts a statement for a named seller and returns exact strings', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '1000.00',
      sourceId: 'o1',
    });
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.COMMISSION,
      direction: LedgerDirection.OUT,
      amount: '150.00',
      sourceId: 'o1',
    });

    const res = await draftFor(adminCookie, vendorAId);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grossSales).toBe('1000.00');
    expect(res.body.data.netPayable).toBe('850.00');
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('refuses to draft a statement for no seller at all', async () => {
    const res = await authedMutation(request(app).post(`${BASE}/generate`), adminCookie).send(
      period,
    );

    expect(res.status).toBe(403);
  });

  it('shows a seller their own statements', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '500.00',
      sourceId: 'o2',
    });

    const generated = await draftFor(adminCookie, vendorAId);

    const res = await request(app).get(BASE).set('Cookie', sellerCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(generated.body.data.id);
  });

  it('will not let a seller read another seller by id', async () => {
    await postEntry({
      vendorId: vendorBId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '900.00',
      sourceId: 'o3',
    });

    const generated = await draftFor(adminCookie, vendorBId);

    const res = await request(app)
      .get(`${BASE}/${generated.body.data.id}`)
      .set('Cookie', sellerCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('ignores a seller trying to widen their own view with a query parameter', async () => {
    await postEntry({
      vendorId: vendorBId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '900.00',
      sourceId: 'o4',
    });
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '100.00',
      sourceId: 'o5',
    });

    await draftFor(adminCookie, vendorAId);
    await draftFor(adminCookie, vendorBId);

    const res = await request(app)
      .get(`${BASE}?vendorId=${vendorBId}`)
      .set('Cookie', otherSellerCookie);

    expect(res.status).toBe(200);
    // One statement, and it is theirs: naming another seller bought nothing.
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].vendorId).toBe(vendorBId);
  });

  it('walks a statement from draft to paid over the endpoints', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '750.00',
      sourceId: 'o6',
    });

    const generated = await draftFor(adminCookie, vendorAId);
    const id = generated.body.data.id;

    const locked = await authedMutation(request(app).post(`${BASE}/${id}/lock`), adminCookie).send(
      {},
    );
    expect(locked.status).toBe(200);
    expect(locked.body.data.status).toBe('LOCKED');
    expect(locked.body.data.lockedBy).toBe(adminId);

    // A different operator approves, because the person who froze the figures
    // is not allowed to authorise the payout.
    const approved = await authedMutation(
      request(app).post(`${BASE}/${id}/approve`),
      approverCookie,
    ).send({});
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(approved.body.data.approvedBy).not.toBe(adminId);

    const paid = await authedMutation(request(app).post(`${BASE}/${id}/pay`), approverCookie).send({
      payoutReference: 'BANK-123',
    });
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');
    expect(paid.body.data.payoutReference).toBe('BANK-123');
  });

  // Separation of duties, driven end to end. One admin account, two steps: the
  // second must be refused even though that account holds both permissions.
  it('refuses when the person who locked it also tries to approve it', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '750.00',
      sourceId: 'o7',
    });

    const generated = await draftFor(adminCookie, vendorAId);
    const id = generated.body.data.id;

    await authedMutation(request(app).post(`${BASE}/${id}/lock`), adminCookie).send({});

    const approved = await authedMutation(
      request(app).post(`${BASE}/${id}/approve`),
      adminCookie,
    ).send({});

    expect(approved.status).toBe(409);
    expect(approved.body.success).toBe(false);
  });

  it('refuses to pay a statement that was never approved', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '750.00',
      sourceId: 'o8',
    });

    const generated = await draftFor(adminCookie, vendorAId);

    const paid = await authedMutation(
      request(app).post(`${BASE}/${generated.body.data.id}/pay`),
      adminCookie,
    ).send({ payoutReference: 'BANK-999' });

    expect(paid.status).toBe(409);
  });

  it('refuses a seller every write step', async () => {
    await postEntry({
      vendorId: vendorAId,
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: '750.00',
      sourceId: 'o9',
    });

    const generated = await draftFor(adminCookie, vendorAId);
    const id = generated.body.data.id;

    for (const step of ['lock', 'approve']) {
      const res = await authedMutation(
        request(app).post(`${BASE}/${id}/${step}`),
        sellerCookie,
      ).send({});
      expect(res.status).toBe(403);
    }

    const paid = await authedMutation(request(app).post(`${BASE}/${id}/pay`), sellerCookie).send({
      payoutReference: 'X',
    });
    expect(paid.status).toBe(403);

    const drafted = await draftFor(sellerCookie, vendorBId);
    expect(drafted.status).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refuses a payout with no reference', async () => {
    const res = await authedMutation(
      request(app).post(`${BASE}/00000000-0000-4000-8000-000000000000/pay`),
      adminCookie,
    ).send({});

    // Validation runs before the lookup, so this is a 400 about the body rather
    // than a 404 about the id.
    expect(res.status).toBe(400);
  });
});
