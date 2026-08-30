import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Multi-Device Session Isolation & Selective Logout Suite', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should maintain independent sessions for multiple devices and selectively revoke only the logged-out device', async () => {
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

    // Login 1: Desktop Web Browser
    const loginWebRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0')
      .send({ email, password: rawPassword });
    expect(loginWebRes.status).toBe(200);
    const webAccessToken = loginWebRes.body.data.accessToken;

    // Login 2: Mobile App
    const loginMobileRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'CelebsMobile/1.0.0 (Android 14; Pixel 8)')
      .send({ email, password: rawPassword });
    expect(loginMobileRes.status).toBe(200);
    const mobileAccessToken = loginMobileRes.body.data.accessToken;

    // Verify 2 distinct sessions exist in DB for this user
    const dbSessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(dbSessions.length).toBe(2);

    // Logout from Desktop Web Browser only
    const logoutWebRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${webAccessToken}`);
    expect(logoutWebRes.status).toBe(200);

    // Desktop Web Token must now be rejected
    const testWebAfterLogout = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${webAccessToken}`);
    expect(testWebAfterLogout.status).toBe(401);

    // Mobile App Token must STILL be active and valid!
    const testMobileActive = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${mobileAccessToken}`);
    expect(testMobileActive.status).toBe(200);
    expect(testMobileActive.body.data.user.email).toBe(email);

    // Verify exactly 1 session remains in DB
    const remainingSessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(remainingSessions.length).toBe(1);
  });
});
