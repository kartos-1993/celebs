import { faker } from '@faker-js/faker';
import request from 'supertest';
import { describe, expect,it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Session Integration Test Suite', () => {
  it('should create a valid session on login and allow authenticated requests', async () => {
    const rawPassword = 'Password123!';
    const hashedPassword = await hashValue(rawPassword);
    const email = faker.internet.email().toLowerCase();

    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: hashedPassword,
        isEmailVerified: true,
      },
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: rawPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();

    const accessToken = loginRes.body.data.accessToken;

    // Verify session was created in DB
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
    });

    expect(session).not.toBeNull();

    // Request protected route with valid bearer token
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);
  });

  it('should reject requests with invalid session token with 401 Unauthorized', async () => {
    const fakeToken = signJwtToken({
      userId: 'non-existent-user-id',
      sessionId: 'non-existent-session-id',
    });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });
});
