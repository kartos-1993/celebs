import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { expectNoStore } from '../support/http-headers';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Private Customer Endpoints Mandatory No-Store Contract', () => {
  let createdUserId: string | null = null;
  let authToken: string | null = null;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Private Cache Test Customer',
        email: `private-cache-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
        password: await hashValue('Secret123!'),
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    const jti = randomUUID();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Test Agent',
        rotatedRefreshId: jti,
      },
    });

    authToken = signJwtToken({
      userId: user.id,
      sessionId: session.id,
    });
  });

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
      authToken = null;
    }
  });

  it('mandates no-store cache control directives on customer cart read', async () => {
    const res = await request(app).get('/api/v1/cart');

    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it('mandates no-store cache control directives on customer wishlist read', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it('mandates no-store cache control directives on customer order history read', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expectNoStore(res);
  });

  it('mandates no-store cache control directives on live unread notification count polling', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expectNoStore(res);
  });
});
