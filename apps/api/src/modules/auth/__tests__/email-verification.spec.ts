import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/db';

describe('Email Verification End-to-End Suite', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.verificationCode.deleteMany({ where: { userId: createdUserId } });
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should verify email and auto-login user via POST /api/v1/auth/verify-email', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: false,
      },
    });
    createdUserId = user.id;

    const verificationCode = `V-${faker.string.alphanumeric(8).toUpperCase()}`;
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000), // 45 min in future
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ code: verificationCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeDefined();

    // Verify DB user is now marked verified
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.isEmailVerified).toBe(true);

    // Verify verification code was deleted (replay protection)
    const codeInDb = await prisma.verificationCode.findFirst({
      where: { code: verificationCode },
    });
    expect(codeInDb).toBeNull();
  });

  it('should verify email and redirect to onboarding via GET /api/v1/auth/verify-email?code=...', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: false,
      },
    });
    createdUserId = user.id;

    const verificationCode = `V-${faker.string.alphanumeric(8).toUpperCase()}`;
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
    });

    const res = await request(app).get(`/api/v1/auth/verify-email?code=${verificationCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/onboarding');
    expect(res.headers.location).toContain('verified=true');

    // Verify DB user is now marked verified
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.isEmailVerified).toBe(true);
  });

  it('should reject non-existent or invalid verification code', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ code: 'INVALID-NONEXISTENT-CODE' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should reject expired verification code', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: false,
      },
    });
    createdUserId = user.id;

    const expiredCode = `EXP-${faker.string.alphanumeric(8).toUpperCase()}`;
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: expiredCode,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 min ago
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ code: expiredCode });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should prevent replay of already-used verification code', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: false,
      },
    });
    createdUserId = user.id;

    const verificationCode = `V-${faker.string.alphanumeric(8).toUpperCase()}`;
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
    });

    // First use: Success
    const firstRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ code: verificationCode });
    expect(firstRes.status).toBe(200);

    // Second use: Must be rejected
    const secondRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ code: verificationCode });
    expect(secondRes.status).toBe(404);
  });
});
