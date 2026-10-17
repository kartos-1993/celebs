import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { comparePassword, hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Password lifecycle management and universal session revocation', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.verificationCode.deleteMany({ where: { userId: createdUserId } });
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('prevents account enumeration by returning identical generic success on unregistered email', async () => {
    const unknownEmail = `nonexistent-${Date.now()}@example.com`;

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: unknownEmail });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('password reset link has been sent');

    // Ensure zero verification codes were created
    const codes = await prisma.verificationCode.findMany({
      where: { user: { email: unknownEmail } },
    });
    expect(codes.length).toBe(0);
  });

  it('generates single-use expiring verification code and dispatches reset email for valid accounts', async () => {
    const rawPassword = 'OldPassword123!';
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

    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('password reset link has been sent');

    // Verify verification code exists in DB with PASSWORD_RESET type
    const codeRecord = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(codeRecord).not.toBeNull();
    expect(codeRecord!.code).toBeDefined();
    expect(codeRecord!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects password reset with invalid or expired verification code', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      verificationCode: 'invalid-non-existent-code-12345',
      password: 'NewStrongPassword123!',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('resets password and revokes all active sessions across all devices immediately', async () => {
    const rawPassword = 'InitialPassword123!';
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

    // Create 2 active sessions (e.g. desktop and mobile)
    const session1 = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Desktop Browser',
        rotatedRefreshId: randomUUID(),
      },
    });

    const session2 = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Mobile Device',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken1 = signJwtToken({ userId: user.id, sessionId: session1.id });
    const accessToken2 = signJwtToken({ userId: user.id, sessionId: session2.id });

    // Sanity check: both sessions should work before reset
    const preCheckRes = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${accessToken1}`);
    expect(preCheckRes.status).toBe(200);

    // Create password reset code
    const resetCode = await prisma.verificationCode.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const newPassword = 'BrandNewPassword123!';
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      verificationCode: resetCode.code,
      password: newPassword,
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 1. Verify password in DB was actually updated
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const isNewPasswordValid = await comparePassword(newPassword, updatedUser.password);
    expect(isNewPasswordValid).toBe(true);

    // 2. Verify all prior sessions are revoked from DB
    const remainingSessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(remainingSessions.length).toBe(0);

    // 3. Verify previous access tokens now fail with 401 Unauthorized
    const postReset1 = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${accessToken1}`);
    expect(postReset1.status).toBe(401);

    const postReset2 = await request(app)
      .get('/api/v1/session')
      .set('Authorization', `Bearer ${accessToken2}`);
    expect(postReset2.status).toBe(401);

    // 4. Verify the used verification code was deleted
    const usedCode = await prisma.verificationCode.findUnique({ where: { id: resetCode.id } });
    expect(usedCode).toBeNull();
  });

  it('allows authenticated user to change password and revokes all sessions', async () => {
    const oldPassword = 'OldPassword123!';
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue(oldPassword),
        isEmailVerified: true,
      },
    });
    createdUserId = user.id;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: 'Change Password Client',
        rotatedRefreshId: randomUUID(),
      },
    });

    const accessToken = signJwtToken({ userId: user.id, sessionId: session.id });

    // Reject incorrect current password
    const wrongCurrentRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword123!',
      });
    expect(wrongCurrentRes.status).toBe(400);

    // Accept correct current password
    const newPassword = 'BrandNewPassword123!';
    const successRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: oldPassword,
        newPassword,
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    // Verify password was updated
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const isNewPasswordValid = await comparePassword(newPassword, updatedUser.password);
    expect(isNewPasswordValid).toBe(true);

    // Verify sessions revoked
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBe(0);
  });
});
