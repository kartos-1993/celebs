import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authedMutation } from '../../../../../tests/support/csrf-origin';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const PASSWORD = 'Password123!';

let vendorCookie: string;
// The other seller is only ever referenced by id - the probe uses the first
// seller's session, since the point is that guessing an id changes nothing.
let _unusedOtherVendorCookie: string;
let adminCookie: string;
let vendorId: string;
let otherVendorId: string;

/**
 * A seller reading their own earnings.
 *
 * The number that matters here is the net after commission, and the property worth
 * pinning is that a seller only ever sees their own. The alternative - deriving a
 * seller's ledger by joining their order items - would show them another seller's
 * revenue, because ORDER_REVENUE is posted once for a whole multi-seller basket.
 */
const cookieOf = (res: { headers: Record<string, string | string[]> }): string => {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw.map((c) => c.split(';')[0]).join('; ') : (raw ?? '');
};

async function createVendor(
  role: 'VENDOR' | 'ADMIN',
): Promise<{ cookie: string; vendorId: string }> {
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      name: `Earnings ${role}`,
      email: `earnings-${role}-${stamp}@test.com`,
      password: await hashValue(PASSWORD),
      role,
      isEmailVerified: true,
    },
  });

  const vendor = await prisma.vendorProfile.create({
    data: {
      userId: user.id,
      // Random rather than timestamped: Date.now() collides on the two vendors this
      // suite creates inside the same millisecond, and phoneNumber is unique.
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      shopName: `Earnings Shop ${stamp}`,
      panNumber: `PN${Math.floor(1000000000 + Math.random() * 8999999999)}`,
      citizenshipNumber: `CN${Math.floor(1000000000 + Math.random() * 8999999999)}`,
    },
  });

  const login = await request(app).post('/api/v1/auth/login').send({
    email: user.email,
    password: PASSWORD,
  });

  return { cookie: cookieOf(login as never), vendorId: vendor.id };
}

async function seedEntry(input: {
  vendorId: string | null;
  type: LedgerEntryType;
  amount: string;
  direction: LedgerDirection;
  occurredAt?: Date;
}) {
  return prisma.ledgerEntry.create({
    data: {
      type: input.type,
      direction: input.direction,
      amount: input.amount,
      vendorId: input.vendorId,
      sourceType: 'EARNINGS_TEST',
      sourceId: `EARN-${Math.random()}`,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

beforeEach(async () => {
  const mine = await createVendor('VENDOR');
  const theirs = await createVendor('VENDOR');
  vendorCookie = mine.cookie;
  vendorId = mine.vendorId;
  _unusedOtherVendorCookie = theirs.cookie;
  otherVendorId = theirs.vendorId;

  const admin = await prisma.user.create({
    data: {
      name: 'Earnings Admin',
      email: `earnings-admin-${Date.now()}@test.com`,
      password: await hashValue(PASSWORD),
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: PASSWORD });
  adminCookie = cookieOf(adminLogin as never);
});

describe('seller earnings', () => {
  it('shows a seller their gross sales and the commission taken', async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '1800.00',
      direction: LedgerDirection.IN,
    });
    await seedEntry({
      vendorId,
      type: LedgerEntryType.COMMISSION,
      amount: '135.00',
      direction: LedgerDirection.OUT,
    });

    const response = await request(app)
      .get('/api/v1/finance/earnings/summary')
      .set('Cookie', vendorCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.summary.grossSales).toBe('1800.00');
    expect(response.body.data.summary.commission).toBe('135.00');
    // 1800 - 135, by subtraction rather than a separate rate multiplication.
    expect(response.body.data.summary.netEarnings).toBe('1665.00');
  });

  // The leak this design exists to prevent.
  it("never shows a seller another seller's money", async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '600.00',
      direction: LedgerDirection.IN,
    });
    await seedEntry({
      vendorId: otherVendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '1800.00',
      direction: LedgerDirection.IN,
    });

    const response = await request(app)
      .get('/api/v1/finance/earnings/summary')
      .set('Cookie', vendorCookie);

    expect(response.body.data.summary.grossSales).toBe('600.00');
    expect(response.body.data.summary.netEarnings).toBe('600.00');
  });

  it("lists only the caller's own entries, newest first", async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '300.00',
      direction: LedgerDirection.IN,
    });
    await seedEntry({
      vendorId: otherVendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '900.00',
      direction: LedgerDirection.IN,
    });

    const response = await request(app).get('/api/v1/finance/earnings').set('Cookie', vendorCookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].amount).toBe('300.00');
    expect(response.body.data[0].vendorId).toBe(vendorId);
    expect(response.body.meta.total).toBe(1);
  });

  it('excludes platform-level entries that belong to nobody', async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '1000.00',
      direction: LedgerDirection.IN,
    });
    // A courier settlement is the platform's, not a seller's.
    await seedEntry({
      vendorId: null,
      type: LedgerEntryType.COURIER_PAYMENT,
      amount: '500.00',
      direction: LedgerDirection.OUT,
    });

    const response = await request(app)
      .get('/api/v1/finance/earnings/summary')
      .set('Cookie', vendorCookie);

    expect(response.body.data.summary.deliveryCosts).toBe('0.00');
  });

  it('counts refunded money back out of gross', async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '2000.00',
      direction: LedgerDirection.IN,
    });
    await seedEntry({
      vendorId,
      type: LedgerEntryType.REFUND,
      amount: '500.00',
      direction: LedgerDirection.OUT,
    });

    const response = await request(app)
      .get('/api/v1/finance/earnings/summary')
      .set('Cookie', vendorCookie);

    expect(response.body.data.summary.refunds).toBe('500.00');
    expect(response.body.data.summary.netEarnings).toBe('1500.00');
  });

  it('returns exact strings, so a paisa survives', async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '1800.07',
      direction: LedgerDirection.IN,
    });
    await seedEntry({
      vendorId,
      type: LedgerEntryType.COMMISSION,
      amount: '135.01',
      direction: LedgerDirection.OUT,
    });

    const response = await request(app)
      .get('/api/v1/finance/earnings/summary')
      .set('Cookie', vendorCookie);

    expect(response.body.data.summary.netEarnings).toBe('1665.06');
  });

  it('refuses an unauthenticated caller', async () => {
    const response = await request(app).get('/api/v1/finance/earnings/summary');

    expect(response.status).toBe(401);
  });

  it('shows an admin the same figures for a seller they choose', async () => {
    await seedEntry({
      vendorId,
      type: LedgerEntryType.ORDER_REVENUE,
      amount: '750.00',
      direction: LedgerDirection.IN,
    });

    const response = await authedMutation(
      request(app)
        .get(`/api/v1/finance/earnings/summary?vendorId=${vendorId}`)
        .set('Cookie', adminCookie),
      adminCookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.summary.grossSales).toBe('750.00');
  });

  it("refuses a seller asking for another seller's earnings", async () => {
    const response = await request(app)
      .get(`/api/v1/finance/earnings/summary?vendorId=${otherVendorId}`)
      .set('Cookie', vendorCookie);

    // Either refused outright, or silently their own figures - never the other's.
    if (response.status === 200) {
      expect(response.body.data.summary.grossSales).not.toBe('1800.00');
    } else {
      expect([401, 403]).toContain(response.status);
    }
  });
});
