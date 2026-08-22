import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth.service';

import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

vi.mock('@/mailers/mailer', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('AuthService - Resend Verification & Token Superseding', () => {
  let authService: AuthService;
  const testEmail = `test-resend-${Date.now()}@example.com`;

  beforeEach(async () => {
    authService = new AuthService();
  });

  it('should supersede previous tokens and enforce 60-second database throttling', async () => {
    const hashedPassword = await hashValue('TestPassword123!');
    const user = await prisma.user.create({
      data: {
        name: 'Resend Test User',
        email: testEmail,
        password: hashedPassword,
        isEmailVerified: false,
      },
    });

    // 1. Initial verification token creation
    const initialCode = await prisma.verificationCode.create({
      data: {
        userId: user.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
    });

    expect(initialCode).toBeDefined();

    // 2. Attempt resending immediately (< 60s) -> Should throw BadRequestException (throttled)
    await expect(
      authService.resendVerification({ email: testEmail }),
    ).rejects.toThrow(/Please wait/);

    // 3. Simulate 61 seconds passing by updating initial token createdAt
    await prisma.verificationCode.update({
      where: { id: initialCode.id },
      data: {
        createdAt: new Date(Date.now() - 65 * 1000),
      },
    });

    // 4. Resend verification now -> Should succeed
    const resendResult = await authService.resendVerification({ email: testEmail });
    expect(resendResult.message).toBe('Verification link sent successfully');

    // 5. Verify token superseding: Initial code must be deleted from DB
    const oldCodeLookup = await prisma.verificationCode.findUnique({
      where: { id: initialCode.id },
    });
    expect(oldCodeLookup).toBeNull();

    // 6. Verify only 1 active code exists for user
    const userCodes = await prisma.verificationCode.findMany({
      where: {
        userId: user.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
      },
    });
    expect(userCodes).toHaveLength(1);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
});
