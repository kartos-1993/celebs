/**
 * Store suspension must revoke in-flight sessions for the owner AND every
 * staff member of that store — instantly, and permanently (reinstatement
 * must never resurrect pre-suspension tokens).
 */
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { refreshTokenSignOptions, signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/v1';
let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

const PASSWORD = 'Password123!';

async function seedApprovedStoreWithStaff() {
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Owner',
      email: `${uniq('own')}@revocation.test`,
      password: await hashValue(PASSWORD),
      role: 'VENDOR',
      isEmailVerified: true,
    },
  });
  const store = await prisma.vendorProfile.create({
    data: {
      userId: ownerUser.id,
      shopName: uniq('Revocation Shop'),
      phoneNumber: uniq('980'),
      panNumber: uniq('PAN'),
      citizenshipNumber: uniq('CIT'),
      status: 'APPROVED',
    },
  });
  const staffUser = await prisma.user.create({
    data: {
      name: 'Staff',
      email: `${uniq('stf')}@revocation.test`,
      password: await hashValue(PASSWORD),
      role: 'STAFF',
      isEmailVerified: true,
      vendorId: store.id,
    },
  });
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin',
      email: `${uniq('adm')}@revocation.test`,
      password: await hashValue(PASSWORD),
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  const mkTokens = async (userId: string) => {
    const session = await prisma.session.create({
      data: { userId, userAgent: 'revocation-test' },
    });
    return {
      access: signJwtToken({ userId, sessionId: session.id }),
      refresh: signJwtToken({ sessionId: session.id }, refreshTokenSignOptions),
    };
  };

  const owner = await mkTokens(ownerUser.id);
  const staff = await mkTokens(staffUser.id);
  const admin = await mkTokens(adminUser.id);

  return { storeId: store.id, ownerUser, staffUser, owner, staff, admin };
}

describe('Store lifecycle session revocation', () => {
  it('suspension kills owner AND staff sessions instantly; reinstate never resurrects old tokens', async () => {
    const env = await seedApprovedStoreWithStaff();
    const sellerCenter = (token?: string) =>
      request(app)
        .get(`${BASE}/media/folders`)
        .set(token ? { Authorization: `Bearer ${token}` } : {});

    // Sanity: approved-store staff can use the seller center before suspension.
    await sellerCenter(env.staff.access).expect(200);

    // Suspend via the platform endpoint.
    const suspendRes = await request(app)
      .patch(`${BASE}/admin/vendors/${env.storeId}/suspend`)
      .set('Authorization', `Bearer ${env.admin.access}`)
      .send({});
    expect(suspendRes.status).toBe(200);

    // Both member tokens die on next use — no grace period.
    await sellerCenter(env.staff.access).expect(401);
    await sellerCenter(env.owner.access).expect(401);

    // Refresh flow is dead too (session rows deleted).
    const refreshed = await request(app)
      .post(`${BASE}/auth/refresh`)
      .set('x-refresh-token', env.owner.refresh);
    expect(refreshed.status).toBe(401);

    // Reinstatement must NOT resurrect pre-suspension tokens.
    const approveRes = await request(app)
      .patch(`${BASE}/admin/vendors/${env.storeId}/approve`)
      .set('Authorization', `Bearer ${env.admin.access}`)
      .send({});
    expect(approveRes.status).toBe(200);

    await sellerCenter(env.owner.access).expect(401);
    await sellerCenter(env.staff.access).expect(401);

    // A reinstated seller can authenticate afresh.
    const login = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: env.ownerUser.email, password: PASSWORD });
    expect(login.status).toBe(200);
  }, 30_000);

  it('suspended sellers cannot log back in while suspended', async () => {
    const env = await seedApprovedStoreWithStaff();
    await request(app)
      .patch(`${BASE}/admin/vendors/${env.storeId}/suspend`)
      .set('Authorization', `Bearer ${env.admin.access}`)
      .send({})
      .expect(200);

    const login = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: env.staffUser.email, password: PASSWORD });

    expect(login.status).toBe(403);
    expect(login.body?.errorCode).toBe('STORE_SUSPENDED');
  }, 30_000);
});
