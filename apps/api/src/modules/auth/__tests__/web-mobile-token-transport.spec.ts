import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { refreshTokenSignOptions, signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Dual-transport authentication token delivery across client surfaces', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('delivers authentication tokens strictly in secure HTTP-only cookies for web clients', async () => {
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

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: rawPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(email);

    // Web clients must NOT receive tokens in JSON body
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();

    // Cookies must be set
    const setCookieHeaders = res.headers['set-cookie'];
    expect(setCookieHeaders).toBeDefined();
    const cookieStrings = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    expect(cookieStrings.some((c: string) => c.startsWith('accessToken='))).toBe(true);
    expect(cookieStrings.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('delivers authentication tokens in JSON response body when x-surface indicates a mobile client', async () => {
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

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('x-surface', 'mobile')
      .send({ email, password: rawPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.refreshToken).toBeDefined();
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('omits tokens from JSON response body during token refresh for web clients while setting cookies', async () => {
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

    const jti = randomUUID();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Web Browser',
        rotatedRefreshId: jti,
      },
    });

    const refreshToken = signJwtToken({ sessionId: session.id, jti }, refreshTokenSignOptions);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();

    const setCookieHeaders = res.headers['set-cookie'];
    expect(setCookieHeaders).toBeDefined();
    const cookieStrings = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    expect(cookieStrings.some((c: string) => c.startsWith('accessToken='))).toBe(true);
    expect(cookieStrings.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('delivers new authentication tokens in JSON response body during token refresh for mobile clients', async () => {
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

    const jti = randomUUID();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Mobile App',
        rotatedRefreshId: jti,
      },
    });

    const refreshToken = signJwtToken({ sessionId: session.id, jti }, refreshTokenSignOptions);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('x-surface', 'mobile')
      .set('x-refresh-token', refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.refreshToken).toBeDefined();
    expect(typeof res.body.data.refreshToken).toBe('string');
  });
});
