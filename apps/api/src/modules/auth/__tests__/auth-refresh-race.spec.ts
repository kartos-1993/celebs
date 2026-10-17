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

  const ORIGIN = 'http://localhost:5173';

  function cookieToken(res: request.Response): string {
    const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
    const joined = Array.isArray(raw) ? raw.join(';') : (raw ?? '');
    return joined.match(/refreshToken=([^;]+)/)?.[1] ?? '';
  }

  function refreshWith(token: string, userAgent = 'RefreshRaceTest/1.0') {
    return request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', `refreshToken=${token}`)
      .set('User-Agent', userAgent);
  }

  it('shares one rotation across concurrent identical refreshes without revoking anything', async () => {
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
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('User-Agent', 'RefreshRaceTest/1.0')
      .send({
        email,
        password: rawPassword,
      });
    expect(loginRes.status).toBe(200);
    const initialRefreshToken = cookieToken(loginRes);
    expect(initialRefreshToken).not.toBe('');

    // Fire 5 concurrent refresh requests using the exact same refresh token
    const results = await Promise.all(
      Array.from({ length: 5 }, () => refreshWith(initialRefreshToken)),
    );

    const statuses = results.map((r) => r.status);
    const successCount = statuses.filter((s) => s === 200).length;

    // In-flight dedup: all duplicates share the single rotation result.
    expect(successCount).toBe(5);
    const pairs = results.map((r) => cookieToken(r));
    for (const pair of pairs) {
      expect(pair).not.toBe('');
      expect(pair).toBe(pairs[0]);
    }

    // Nobody got revoked for a benign race.
    const sessionInDb = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(sessionInDb).not.toBeNull();
  });

  it('absorbs a benign replay but revokes every session once the grace budget is spent', async () => {
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
        userAgent: 'RefreshRaceTest/1.0',
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
        userAgent: 'RefreshRaceTest/1.0',
        rotatedRefreshId: 'jti-device-b-v1',
      },
    });

    // Legitimate rotation of Device A to v2
    const rotateRes = await refreshWith(tokenDeviceAV1);
    expect(rotateRes.status).toBe(200);

    // Benign lost-response retry of tokenDeviceAV1: accepted, both devices survive.
    const retryRes = await refreshWith(tokenDeviceAV1);
    expect(retryRes.status).toBe(200);
    expect((await prisma.session.findMany({ where: { userId: user.id } })).length).toBe(2);

    // Repeated replays exhaust the grace budget → full family revocation.
    expect((await refreshWith(tokenDeviceAV1)).status).toBe(200);
    expect((await refreshWith(tokenDeviceAV1)).status).toBe(200);
    const attackRes = await refreshWith(tokenDeviceAV1);
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

    const res = await refreshWith(tokenWithoutJti);

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

    const res = await refreshWith(token);

    // Must be rejected with 401 and deleted due to reaching absolute lifetime cap
    expect(res.status).toBe(401);

    const sessionInDb = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(sessionInDb).toBeNull();
  });
});
