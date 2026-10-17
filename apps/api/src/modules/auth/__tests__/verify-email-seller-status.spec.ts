import { faker } from '@faker-js/faker';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Seller account lifecycle during email verification', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.verificationCode.deleteMany({ where: { userId: createdUserId } });
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.vendorProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('blocks suspended seller from obtaining active sessions upon email verification', async () => {
    const rawPassword = 'Password123!';
    const email = faker.internet.exampleEmail().toLowerCase();

    // 1. Create a vendor user whose email is not yet verified
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email,
        password: await hashValue(rawPassword),
        role: 'VENDOR',
        isEmailVerified: false,
      },
    });
    createdUserId = user.id;

    // 2. Create an explicitly SUSPENDED vendor profile
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

    // 3. Create a valid email verification code
    const verificationCode = '987654';
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    // 4. Submit verification request
    const res = await request(app).post('/api/v1/auth/verify-email').send({
      code: verificationCode,
    });

    // 5. Must reject with 403 Forbidden (STORE_SUSPENDED), matching login lifecycle guard
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // 6. Assert that NO active session was created for the suspended seller
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions.length).toBe(0);
  });
});
