import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { getAccessTokenCookieOptions, getRefreshTokenCookieOptions } from '@/common/utils/cookie';
import { signJwtToken } from '@/common/utils/jwt';
import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';

describe('Staging cross-site cookie isolation and CSRF origin verification guard', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('attaches partitioned attribute to authentication cookies when sameSite is none', () => {
    // Test cookie options factory when sameSite is none (or in staging)
    const accessOptions = getAccessTokenCookieOptions();
    const refreshOptions = getRefreshTokenCookieOptions();

    if (config.COOKIE.SAME_SITE === 'none') {
      expect(accessOptions.partitioned).toBe(true);
      expect(refreshOptions.partitioned).toBe(true);
    } else {
      // In non-none environments, verify partitioned option is boolean or false
      expect(accessOptions.partitioned ?? false).toBe(false);
    }
  });

  it('blocks state-changing cookie-authenticated requests with unauthorized origin', async () => {
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

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'CSRF Attack Test Agent',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });

    // Attacker site attempts state-changing POST using ambient cookie
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `accessToken=${accessToken}`)
      .set('Origin', 'https://malicious-attacker-domain.evil');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cross-site request blocked');
  });

  it('blocks state-changing cookie-authenticated requests with missing origin header', async () => {
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

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'CSRF Missing Origin Test Agent',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });

    // Request carrying auth cookie but no Origin / Referer (e.g. CSRF via HTML form / blind POST)
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `accessToken=${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cross-site request blocked');
  });

  it('permits state-changing cookie-authenticated requests from allowed origin', async () => {
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

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Allowed Origin Test Agent',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });
    const primaryAllowedOrigin = Array.isArray(config.APP_ORIGIN)
      ? config.APP_ORIGIN[0]
      : config.APP_ORIGIN;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `accessToken=${accessToken}`)
      .set('Origin', primaryAllowedOrigin || 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('permits state-changing bearer-authenticated requests without origin header for mobile clients', async () => {
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

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Mobile Native App',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });

    // Mobile requests do not have Origin header and use Bearer auth
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
