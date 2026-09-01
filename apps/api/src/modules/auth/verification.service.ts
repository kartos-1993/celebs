import { User } from '@prisma/client';

import { resendVerificationType } from '@celebs/shared-types';
import {
  BadRequestException,
  ErrorCode,
  InternalServerException,
  logger,
  NotFoundException,
} from '@celebs/shared-utils';

import { AuthRepository, authRepository } from './auth.repository';

import { enqueueMail } from '@/common/services/mail.queue';
import { buildWebUrl } from '@/common/utils/url';
import { verifyEmailTemplate } from '@/mailers/templates/template';

export class VerificationService {
  constructor(private authRepo: AuthRepository = authRepository) {}

  public async sendVerificationEmail(
    user: { id: string; email: string },
    options?: { isVendor?: boolean },
  ): Promise<void> {
    // Supersede any prior verification tokens for this user
    await this.authRepo.deleteUserVerificationCodes(user.id);

    const verification = await this.authRepo.createVerificationCode(user.id);
    const verificationUrl = buildWebUrl('/verify-email', { code: verification.code });

    const subject = options?.isVendor ? 'Verify your email address' : 'Verify your email address';
    const logContext = options?.isVendor
      ? 'Attempting to send verification email to vendor'
      : 'Attempting to send verification email';

    logger.info({ email: user.email, verificationUrl }, logContext);

    try {
      await enqueueMail({
        to: user.email,
        subject,
        text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: user.email }, 'Verification email sent');
    } catch (err) {
      logger.error({ err, email: user.email }, 'Failed to send verification email');
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn(
          { verificationUrl, email: user.email },
          '[DEV/TEST FALLBACK] Verification email failed to send. Click link in logs to verify manually.',
        );
      } else {
        throw new InternalServerException('Failed to send verification email');
      }
    }
  }

  public async verifyCode(code: string): Promise<User> {
    const validCode = await this.authRepo.findValidVerificationCode(code);

    if (!validCode) {
      throw new NotFoundException(
        'Verification code not found or expired',
        ErrorCode.VERIFICATION_ERROR,
      );
    }

    const updatedUser = await this.authRepo.updateUser(validCode.userId, {
      isEmailVerified: true,
    });

    if (!updatedUser) {
      throw new BadRequestException('Unable to verify email', ErrorCode.VERIFICATION_ERROR);
    }

    await this.authRepo.deleteVerificationCodeById(validCode.id);

    return updatedUser;
  }

  public async resendWithThrottle(data: resendVerificationType): Promise<{ message: string }> {
    const { email } = data;
    const user = await this.authRepo.findUserByEmail(email);

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException(
        'Email address is already verified',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    // Check 60-second database throttling cooldown
    const latestCode = await this.authRepo.findLatestVerificationCode(user.id);

    if (latestCode) {
      const elapsedSeconds = Math.floor((Date.now() - latestCode.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting another verification email`,
          ErrorCode.VALIDATION_ERROR,
        );
      }
    }

    // Supersede & delete all older verification codes for this user
    await this.authRepo.deleteUserVerificationCodes(user.id);

    const verification = await this.authRepo.createVerificationCode(user.id);
    const verificationUrl = buildWebUrl('/verify-email', { code: verification.code });
    logger.info({ email: user.email, verificationUrl }, 'Attempting to resend verification email');

    try {
      await enqueueMail({
        to: user.email,
        subject: 'Activate your celebs.com.np account',
        text: `Please activate your account by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: user.email }, 'Resent verification email successfully');
    } catch (err) {
      logger.error({ err, email: user.email }, 'Failed to resend verification email');
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn(
          { verificationUrl, email: user.email },
          '[DEV/TEST FALLBACK] Verification email failed to send. Click link in logs to verify manually.',
        );
      } else {
        throw new InternalServerException('Failed to send verification email');
      }
    }

    return { message: 'Verification link sent successfully' };
  }
}

export const verificationService = new VerificationService();
