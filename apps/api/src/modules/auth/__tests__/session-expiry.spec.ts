import { faker } from '@faker-js/faker';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { refreshTokenSignOptions, signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';
import { SessionService } from '@/modules/session/session.service';

const sessionService = new SessionService();

describe('Session Lifecycle & Expiry Enforcement Test Suite', () => {
  it('should reject authenticated requests when session has passed expiredAt in DB', async () => {
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

    // Create a session that expired 5 minutes ago
    const pastDate = new Date(Date.now() - 5 * 60 * 1000);
    const expiredSession = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Test Agent',
        expiredAt: pastDate,
      },
    });

    const accessToken = signJwtToken({
      userId: user.id,
      sessionId: expiredSession.id,
    });

    // Attempt to access protected endpoint
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(401);

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should slide session expiredAt forward when refresh token is used', async () => {
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

    // Create initial session expiring in 10 minutes
    const initialExpiredAt = new Date(Date.now() + 10 * 60 * 1000);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Test Agent',
        expiredAt: initialExpiredAt,
      },
    });

    const refreshToken = signJwtToken(
      { sessionId: session.id },
      refreshTokenSignOptions,
    );

    // Use refresh token via x-refresh-token header
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('x-refresh-token', refreshToken);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    // Verify session expiredAt was slid forward (approx 30 days into future)
    const updatedSession = await prisma.session.findUnique({ where: { id: session.id } });
    expect(updatedSession).not.toBeNull();
    expect(updatedSession!.expiredAt.getTime()).toBeGreaterThan(Date.now() + 20 * 24 * 60 * 60 * 1000);

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should purge only expired sessions when purgeExpiredSessions() runs', async () => {
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

    // 1. Expired session
    const expired = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Expired Agent',
        expiredAt: new Date(Date.now() - 60000), // 1 minute ago
      },
    });

    // 2. Active session
    const active = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Active Agent',
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
      },
    });

    const deletedCount = await sessionService.purgeExpiredSessions();
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // Check specific records
    const expiredRecord = await prisma.session.findUnique({ where: { id: expired.id } });
    expect(expiredRecord).toBeNull();

    const activeRecord = await prisma.session.findUnique({ where: { id: active.id } });
    expect(activeRecord).not.toBeNull();

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
