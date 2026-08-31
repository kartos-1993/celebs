import { faker } from '@faker-js/faker';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authRepository } from '../auth.repository';
import { verificationService } from '../verification.service';

import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('VerificationService Integration Tests', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    if (createdUserId) {
      await prisma.verificationCode.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  it('should send verification email, superseding old codes', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await authRepository.createUser({
      name: 'Verify Test User',
      email,
      password: await hashValue('Password123!'),
    });
    createdUserId = user.id;

    // Create an old code
    await authRepository.createVerificationCode(user.id);

    // Send verification email
    await verificationService.sendVerificationEmail(user);

    // Verify exactly 1 code exists
    const codes = await prisma.verificationCode.findMany({
      where: { userId: user.id, type: VerificationEnum.EMAIL_VERIFICATION },
    });
    expect(codes).toHaveLength(1);
  });

  it('should verify code, update user status, and delete consumed code', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await authRepository.createUser({
      name: 'Verify Test User',
      email,
      password: await hashValue('Password123!'),
    });
    createdUserId = user.id;

    const codeRecord = await authRepository.createVerificationCode(user.id);

    const verifiedUser = await verificationService.verifyCode(codeRecord.code);
    expect(verifiedUser.isEmailVerified).toBe(true);

    const codeInDb = await prisma.verificationCode.findUnique({
      where: { id: codeRecord.id },
    });
    expect(codeInDb).toBeNull();
  });

  it('should reject invalid or expired verification code', async () => {
    await expect(verificationService.verifyCode('non-existent-code')).rejects.toThrowError(
      'Verification code not found or expired',
    );
  });

  it('should enforce 60-second database throttling on resend', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await authRepository.createUser({
      name: 'Throttle Test User',
      email,
      password: await hashValue('Password123!'),
    });
    createdUserId = user.id;

    // Initial code
    const initialCode = await authRepository.createVerificationCode(user.id);

    // Immediate resend must fail
    await expect(verificationService.resendWithThrottle({ email })).rejects.toThrowError(
      /Please wait/,
    );

    // Simulate elapsed 65 seconds
    await prisma.verificationCode.update({
      where: { id: initialCode.id },
      data: {
        createdAt: new Date(Date.now() - 65 * 1000),
      },
    });

    // Now resend should succeed
    const res = await verificationService.resendWithThrottle({ email });
    expect(res.message).toBe('Verification link sent successfully');
  });

  it('should reject resend if email is already verified', async () => {
    const email = faker.internet.exampleEmail().toLowerCase();
    const user = await authRepository.createUser({
      name: 'Already Verified User',
      email,
      password: await hashValue('Password123!'),
      isEmailVerified: true,
    });
    createdUserId = user.id;

    await expect(verificationService.resendWithThrottle({ email })).rejects.toThrowError(
      'Email address is already verified',
    );
  });
});
