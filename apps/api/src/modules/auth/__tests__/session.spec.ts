import { faker } from '@faker-js/faker';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Session Integration & Dual-Transport Test Suite', () => {
  it('should authenticate via Cookie transport on GET /api/v1/session', async () => {
    const rawPassword = 'Password123!';
    const hashedPassword = await hashValue(rawPassword);
    const email = faker.internet.exampleEmail().toLowerCase();

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
    const rawCookies = loginRes.headers['set-cookie'];
    const authCookie = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies || '';

    // Fetch session using Cookie
    const sessionRes = await request(app)
      .get('/api/v1/session')
      .set('Cookie', authCookie);

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.success).toBe(true);
    expect(sessionRes.body.data.user.email).toBe(email);

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should authenticate via Bearer Header transport on GET /api/v1/session (Mobile Flow)', async () => {
    const rawPassword = 'Password123!';
    const hashedPassword = await hashValue(rawPassword);
    const email = faker.internet.exampleEmail().toLowerCase();

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
    const accessToken = loginRes.body.data.accessToken;

    // Fetch session using Bearer header
    const sessionRes = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.success).toBe(true);
    expect(sessionRes.body.data.user.email).toBe(email);

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should enforce instant server-side revocation on logout', async () => {
    const rawPassword = 'Password123!';
    const hashedPassword = await hashValue(rawPassword);
    const email = faker.internet.exampleEmail().toLowerCase();

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
    const accessToken = loginRes.body.data.accessToken;

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);

    // Subsequent request with the same access token must now be rejected
    const afterLogoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(afterLogoutRes.status).toBe(401);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
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
