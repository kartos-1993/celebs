import { faker } from '@faker-js/faker';
import { afterEach, describe, expect, it } from 'vitest';

import { authRepository } from '../auth.repository';

import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('AuthRepository Integration Tests', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.verificationCode.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should create a user returning the full Prisma entity with hashed password', async () => {
    const rawPassword = 'Password123!';
    const hashedPassword = await hashValue(rawPassword);
    const email = faker.internet.exampleEmail().toLowerCase();
    const name = faker.person.fullName();

    const user = await authRepository.createUser({
      name,
      email,
      password: hashedPassword,
    });
    createdUserId = user.id;

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.name).toBe(name);
    expect(user.password).toBe(hashedPassword);
    expect(user.isEmailVerified).toBe(false);
  });

  it('should find user by email and user by id correctly', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await authRepository.createUser({
      name: 'Find Tester',
      email,
      password: await hashValue('pass123'),
    });
    createdUserId = user.id;

    const byEmail = await authRepository.findUserByEmail(email);
    expect(byEmail).not.toBeNull();
    expect(byEmail?.id).toBe(user.id);

    const byId = await authRepository.findUserById(user.id);
    expect(byId).not.toBeNull();
    expect(byId?.email).toBe(email);

    const nonExistent = await authRepository.findUserByEmail('doesnotexist@example.com');
    expect(nonExistent).toBeNull();
  });

  it('should manage session lifecycle: create, find, slide, and delete', async () => {
    const user = await authRepository.createUser({
      name: 'Session Tester',
      email: faker.internet.exampleEmail().toLowerCase(),
      password: await hashValue('pass123'),
    });
    createdUserId = user.id;

    const session = await authRepository.createSession({
      userId: user.id,
      userAgent: 'Test Agent',
      rotatedRefreshId: 'initial-jti',
      expiredAt: new Date(Date.now() + 60000),
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);

    const foundSession = await authRepository.findSessionWithUser(session.id);
    expect(foundSession).not.toBeNull();
    expect(foundSession?.user?.id).toBe(user.id);

    const newExpiredAt = new Date(Date.now() + 120000);
    const updated = await authRepository.slideSession(session.id, newExpiredAt, 'new-jti');
    expect(updated.rotatedRefreshId).toBe('new-jti');

    await authRepository.deleteSession(session.id);
    const deletedSession = await authRepository.findSessionWithUser(session.id);
    expect(deletedSession).toBeNull();
  });

  it('should manage verification code lifecycle correctly', async () => {
    const user = await authRepository.createUser({
      name: 'Code Tester',
      email: faker.internet.exampleEmail().toLowerCase(),
      password: await hashValue('pass123'),
    });
    createdUserId = user.id;

    const codeRecord = await authRepository.createVerificationCode(user.id);
    expect(codeRecord.id).toBeDefined();
    expect(codeRecord.type).toBe(VerificationEnum.EMAIL_VERIFICATION);

    const validCode = await authRepository.findValidVerificationCode(codeRecord.code);
    expect(validCode).not.toBeNull();
    expect(validCode?.id).toBe(codeRecord.id);

    const latest = await authRepository.findLatestVerificationCode(user.id);
    expect(latest?.id).toBe(codeRecord.id);

    await authRepository.deleteUserVerificationCodes(user.id);
    const afterDelete = await authRepository.findValidVerificationCode(codeRecord.code);
    expect(afterDelete).toBeNull();
  });
});
