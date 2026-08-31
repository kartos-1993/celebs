import { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

import {
  BadRequestException,
  ErrorCode,
  InternalServerException,
  logger,
  UnauthorizedException,
} from '@celebs/shared-utils';

import { AuthRepository,authRepository } from './auth.repository';

import { hashValue } from '@/common/utils/bcrypt';
import { config } from '@/config/app.config';

const googleClient = new OAuth2Client();

export interface GoogleVerifiedPayload {
  email: string;
  name: string;
}

export class GoogleAuthService {
  constructor(private authRepo: AuthRepository = authRepository) {}

  public async verifyGoogleToken(idToken: string): Promise<GoogleVerifiedPayload> {
    if (!idToken) {
      throw new BadRequestException(
        'Google ID token is required for Google Sign-In',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience:
          config.GOOGLE.ALLOWED_CLIENT_IDS.length > 0
            ? config.GOOGLE.ALLOWED_CLIENT_IDS
            : undefined,
      });
      payload = ticket.getPayload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: msg }, 'Google ID token verification failed');
      throw new UnauthorizedException(
        'Invalid or expired Google token',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    if (!payload || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Google account email is not verified',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.email.split('@')[0] || 'User';

    return { email, name };
  }

  public async findOrCreateGoogleUser(email: string, name: string): Promise<User> {
    logger.info(`Verified Google Sign-In request for email: ${email}`);

    let user = await this.authRepo.findUserByEmail(email);

    if (!user) {
      const randomPassword = await hashValue(Math.random().toString(36).slice(-10) + 'A1!');
      user = await this.authRepo.createUser({
        email,
        name,
        password: randomPassword,
        isEmailVerified: true,
      });
      logger.info(
        { userId: user.id, email: user.email },
        'New user auto-registered via Google Sign-In',
      );
    } else if (!user.isEmailVerified) {
      user = await this.authRepo.updateUser(user.id, {
        isEmailVerified: true,
      });
      logger.info({ userId: user.id }, 'Existing user email verified via Google Sign-In');
    }

    if (!user) {
      throw new InternalServerException(
        'Failed to create or resolve user record',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }

    return user;
  }
}

export const googleAuthService = new GoogleAuthService();
