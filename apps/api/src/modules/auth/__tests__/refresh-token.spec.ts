import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';

describe('Refresh Token Lifecycle & Rotation Test Suite', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should successfully refresh tokens and slide session lifetime forward', async () => {
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

    // Login to get tokens and create session
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: rawPassword,
    });
    expect(loginRes.status).toBe(200);

    const refreshToken = loginRes.body.data.refreshToken;
    expect(refreshToken).toBeDefined();

    // Call refresh endpoint with cookie
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();

    // Verify session in DB has an active future expiredAt
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(session).not.toBeNull();
    expect(session!.expiredAt).not.toBeNull();
    expect(new Date(session!.expiredAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('should reject refresh when refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject refresh when refresh token is signed with wrong secret', async () => {
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
        userAgent: 'Test Agent',
      },
    });

    // Sign with ACCESS token secret instead of REFRESH token secret
    const tamperedToken = signJwtToken({ sessionId: session.id }, { secret: config.JWT.SECRET });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject refresh when seller account is suspended', async () => {
    const rawPassword = 'Password123!';
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue(rawPassword),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: faker.company.name(),
        phoneNumber: `98${faker.string.numeric(8)}`,
        panNumber: faker.string.numeric(9),
        citizenshipNumber: `11-${faker.string.numeric(8)}`,
        status: 'SUSPENDED',
      },
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Suspended Seller Agent',
      },
    });

    const refreshToken = signJwtToken(
      { sessionId: session.id },
      { secret: config.JWT.REFRESH_SECRET },
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should detect refresh token reuse and revoke the session family immediately', async () => {
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

    // 1. Initial Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: rawPassword,
    });
    expect(loginRes.status).toBe(200);

    const token1 = loginRes.body.data.refreshToken;

    // 2. Legitimate First Refresh
    const refresh1Res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${token1}`);

    expect(refresh1Res.status).toBe(200);
    const token2 = refresh1Res.body.data.refreshToken;
    expect(token2).toBeDefined();
    expect(token2).not.toEqual(token1);

    // 3. Attacker replays token1 (already rotated)
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${token1}`);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message).toContain('Session revoked due to token reuse');

    // 4. Verify session is deleted from DB
    const sessionInDb = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(sessionInDb).toBeNull();

    // 5. Subsequent refresh attempt with token2 now also fails because session is gone
    const failRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${token2}`);

    expect(failRes.status).toBe(401);
  });

  it('should allow legacy jti-less token to refresh once and upgrade the session', async () => {
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
        userAgent: 'Legacy Client',
      },
    });

    // Sign legacy token without jti
    const legacyToken = signJwtToken(
      { sessionId: session.id },
      { secret: config.JWT.REFRESH_SECRET },
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${legacyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeDefined();

    // Verify session now has rotatedRefreshId populated
    const updatedSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(updatedSession?.rotatedRefreshId).toBeDefined();
    expect(typeof updatedSession?.rotatedRefreshId).toBe('string');
  });
});
