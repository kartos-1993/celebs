import { faker } from '@faker-js/faker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRepository } from '../auth.repository';
import { googleAuthService } from '../google-auth.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  };
});

describe('GoogleAuthService Unit & Integration Tests', () => {
  let createdUserId: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
      createdUserId = null;
    }
  });

  describe('verifyGoogleToken', () => {
    it('should return email and name when valid Google idToken is provided', async () => {
      const email = faker.internet.email().toLowerCase();
      const name = faker.person.fullName();

      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email,
          name,
          email_verified: true,
          sub: 'google-sub-123',
        }),
      });

      const payload = await googleAuthService.verifyGoogleToken('valid-token');
      expect(payload.email).toBe(email);
      expect(payload.name).toBe(name);
    });

    it('should reject when email is not verified by Google', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email: 'unverified@gmail.com',
          email_verified: false,
        }),
      });

      await expect(googleAuthService.verifyGoogleToken('unverified-token')).rejects.toThrowError(
        'Google account email is not verified',
      );
    });

    it('should reject when Google token verification fails or is expired', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Token used too late'));

      await expect(googleAuthService.verifyGoogleToken('expired-token')).rejects.toThrowError(
        'Invalid or expired Google token',
      );
    });

    it('should reject when idToken is empty or missing', async () => {
      await expect(googleAuthService.verifyGoogleToken('')).rejects.toThrowError(
        'Google ID token is required for Google Sign-In',
      );
    });
  });

  describe('findOrCreateGoogleUser', () => {
    it('should auto-create a new user with verified email when user does not exist', async () => {
      const email = faker.internet.email().toLowerCase();
      const name = faker.person.fullName();

      const user = await googleAuthService.findOrCreateGoogleUser(email, name);
      createdUserId = user.id;

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe(name);
      expect(user.isEmailVerified).toBe(true);

      const dbUser = await authRepository.findUserByEmail(email);
      expect(dbUser).not.toBeNull();
      expect(dbUser?.isEmailVerified).toBe(true);
    });

    it('should upgrade isEmailVerified on existing unverified user', async () => {
      const email = faker.internet.email().toLowerCase();
      const existingUser = await authRepository.createUser({
        name: 'Existing User',
        email,
        password: await hashValue('Password123!'),
        isEmailVerified: false,
      });
      createdUserId = existingUser.id;

      const user = await googleAuthService.findOrCreateGoogleUser(email, 'Existing User');
      expect(user.id).toBe(existingUser.id);
      expect(user.isEmailVerified).toBe(true);

      const dbUser = await authRepository.findUserByEmail(email);
      expect(dbUser?.isEmailVerified).toBe(true);
    });
  });
});
