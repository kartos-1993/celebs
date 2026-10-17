import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { REFRESH_PATH } from '@/common/utils/cookie';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Cookie attributes on session termination', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('clears access and refresh cookies with matching path and flags on logout', async () => {
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
        userAgent: 'Logout Agent',
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);

    const setCookieHeaders = res.headers['set-cookie'];
    expect(setCookieHeaders).toBeDefined();
    const cookieStrings = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    // Verify accessToken cookie deletion includes Path=/
    const accessClear = cookieStrings.find((c: string) => c.startsWith('accessToken='));
    expect(accessClear).toBeDefined();
    expect(accessClear).toContain('Path=/');

    // Verify refreshToken cookie deletion includes exact Path=REFRESH_PATH
    const refreshClear = cookieStrings.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshClear).toBeDefined();
    expect(refreshClear).toContain(`Path=${REFRESH_PATH}`);
  });
});
