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

let adminCookie: string;
let superAdminCookie: string;
let vendorCookie: string;

const cookieOf = (res: { headers: Record<string, string | string[]> }): string => {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw.map((c) => c.split(';')[0]).join('; ') : (raw ?? '');
};

async function createAndLogin(role: 'ADMIN' | 'SUPERADMIN' | 'VENDOR'): Promise<string> {
  const email = `commission-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;

  await prisma.user.create({
    data: {
      name: `Commission ${role}`,
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
 * The rate is the platform's money, so who may change it is the whole security
 * question. A seller editing their own commission is not a UI gap, it is a
 * revenue leak, and these refusals are the regression guard for it.
 */
beforeEach(async () => {
  adminCookie = await createAndLogin('ADMIN');
  superAdminCookie = await createAndLogin('SUPERADMIN');
  vendorCookie = await createAndLogin('VENDOR');
});

describe('commission permissions', () => {
  it('refuses a seller changing any rate', async () => {
    const response = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', vendorCookie),
      vendorCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 1 });

    expect(response.status).toBe(403);
  });

  it('refuses an admin changing the rate, because only superadmin may', async () => {
    const response = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', adminCookie),
      adminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 1 });

    expect(response.status).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    const response = await request(app)
      .get('/api/v1/finance/commissions')
      .set('Cookie', 'not-a-session');

    expect(response.status).toBe(401);
  });
});

describe('commission rates', () => {
  it('rejects a rate above 100%, which would pay the seller to list', async () => {
    const response = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 100.01 });

    expect(response.status).toBe(400);
  });

  it('rejects a negative rate', async () => {
    const response = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: -1 });

    expect(response.status).toBe(400);
  });

  it('rejects a category rule with no category', async () => {
    const response = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'CATEGORY', ratePercent: 8 });

    expect(response.status).toBe(400);
  });

  it('publishes a global rate, and a change closes the old one instead of rejecting it', async () => {
    // Effective dating, not in-place edit and not a conflict: publishing a new
    // global rate is a legitimate change of rate, so it succeeds and the previous
    // rule is closed with an effectiveTo. Orders already placed keep the rate
    // frozen on their line regardless.
    const first = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 7.5 });

    expect(first.status).toBe(201);
    expect(first.body.data.ratePercent).toBe('7.50');
    expect(first.body.data.effectiveFrom).not.toBeNull();

    const second = await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 9 });

    expect(second.status).toBe(201);

    // The first rule is closed, not rewritten or deleted.
    const closed = await prisma.commissionRule.findUniqueOrThrow({
      where: { id: first.body.data.id },
    });
    expect(closed.ratePercent.toFixed(2)).toBe('7.50');
    expect(closed.effectiveTo).not.toBeNull();

    // And only the newest counts as current.
    const current = await request(app)
      .get('/api/v1/finance/commissions')
      .set('Cookie', superAdminCookie);
    expect(current.body.data.current).toHaveLength(1);
    expect(current.body.data.current[0].ratePercent).toBe('9.00');
  });

  it('lets superadmin read the current rate and its history', async () => {
    await authedMutation(
      request(app).post('/api/v1/finance/commissions').set('Cookie', superAdminCookie),
      superAdminCookie,
    ).send({ scope: 'GLOBAL', ratePercent: 7.5 });

    const current = await request(app)
      .get('/api/v1/finance/commissions')
      .set('Cookie', superAdminCookie);

    expect(current.status).toBe(200);
    expect(current.body.data.current).toHaveLength(1);
    expect(current.body.data.current[0].ratePercent).toBe('7.50');

    const history = await request(app)
      .get('/api/v1/finance/commissions/history')
      .set('Cookie', superAdminCookie);

    expect(history.status).toBe(200);
    expect(history.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('shows a seller their own net for a listed price', async () => {
    const response = await request(app)
      .get('/api/v1/finance/commissions/quote?desiredNet=900.00&ratePercent=7.5')
      .set('Cookie', vendorCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.listPrice).toBe('972.97');
    expect(response.body.data.commission).toBe('72.97');
    expect(response.body.data.sellerNet).toBe('900.00');
  });

  it('refuses the calculator at a rate that nets nothing', async () => {
    const response = await request(app)
      .get('/api/v1/finance/commissions/quote?desiredNet=900.00&ratePercent=100')
      .set('Cookie', vendorCookie);

    expect(response.status).toBe(400);
  });
});
