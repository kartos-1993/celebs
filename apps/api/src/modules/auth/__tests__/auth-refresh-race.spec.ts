import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';

describe('Refresh token concurrency and session revocation', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('allows only a single successful refresh when identical tokens are sent concurrently', async () => {
    const rawPassword = 'Password123!';
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue(rawPassword),
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    // Login to obtain valid session and initial token pair
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: rawPassword,
    });
    expect(loginRes.status).toBe(200);
    const initialRefreshToken = loginRes.body.data.refreshToken;
    expect(initialRefreshToken).toBeDefined();

    // Fire 5 concurrent refresh requests using the exact same refresh token
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', `refreshToken=${initialRefreshToken}`),
      ),
    );

    const statuses = results.map((r) => r.status);
    const successCount = statuses.filter((s) => s === 200).length;
    const failureCount = statuses.filter((s) => s === 401).length;

    // Concurrency guarantee: EXACTLY one request must succeed, all others must be rejected
    expect(successCount).toBe(1);
    expect(failureCount).toBe(4);
  });

  it('terminates all user sessions when a rotated refresh token is replayed', async () => {
    const rawPassword = 'Password123!';
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue(rawPassword),
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    // Session 1 (e.g. Work Laptop)
    const session1 = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Device A - Laptop',
        rotatedRefreshId: 'jti-device-a-v1',
      },
    });
    const tokenDeviceAV1 = signJwtToken(
      { sessionId: session1.id, jti: 'jti-device-a-v1' },
      { secret: config.JWT.REFRESH_SECRET },
    );

    // Session 2 (e.g. Phone)
    const session2 = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Device B - Phone',
        rotatedRefreshId: 'jti-device-b-v1',
      },
    });

    // Legitimate rotation of Device A to v2
    const rotateRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${tokenDeviceAV1}`);
    expect(rotateRes.status).toBe(200);

    // Attacker steals and replays tokenDeviceAV1 (old rotated token)
    const attackRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${tokenDeviceAV1}`);
    expect(attackRes.status).toBe(401);

    // Assert ALL active sessions for that user are revoked (both Device A and Device B)
    const remainingSessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(remainingSessions.length).toBe(0);

    const purgedSession2 = await prisma.session.findUnique({
      where: { id: session2.id },
    });
    expect(purgedSession2).toBeNull();
  });

  it('rejects refresh tokens that do not contain a tracking identifier', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Untracked Client',
        rotatedRefreshId: 'valid-jti-123',
      },
    });

    // Sign token WITHOUT jti claim using raw jwt.sign to simulate legacy or untracked token
    const tokenWithoutJti = jwt.sign({ sessionId: session.id }, config.JWT.REFRESH_SECRET);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${tokenWithoutJti}`);

    // Must be rejected with 401 — no free pass
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('expires sessions that have reached the maximum allowed lifetime', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    // Seed session created 35 days ago (past the 30-day absolute limit)
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Old Client',
        rotatedRefreshId: 'old-jti-xyz',
        createdAt: thirtyFiveDaysAgo,
        expiredAt: new Date(Date.now() + 1000 * 60 * 60), // recently slid future expiry
      },
    });

    const token = signJwtToken(
      { sessionId: session.id, jti: 'old-jti-xyz' },
      { secret: config.JWT.REFRESH_SECRET },
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${token}`);

    // Must be rejected with 401 and deleted due to reaching absolute lifetime cap
    expect(res.status).toBe(401);

    const sessionInDb = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(sessionInDb).toBeNull();
  });
});
