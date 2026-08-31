import { describe, expect, it } from 'vitest';

import { tokenService } from '../token.service';

import { signJwtToken } from '@/common/utils/jwt';
import { config } from '@/config/app.config';

describe('TokenService Unit Tests', () => {
  it('should issue a valid accessToken and refreshToken pair', () => {
    const userId = 'user-uuid-123';
    const sessionId = 'session-uuid-456';
    const jti = 'jti-uuid-789';

    const tokens = tokenService.issueTokenPair(userId, sessionId, jti);

    expect(tokens).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.accessToken.length).toBeGreaterThan(20);
    expect(tokens.refreshToken.length).toBeGreaterThan(20);

    const verified = tokenService.verifyRefreshToken(tokens.refreshToken);
    expect(verified.sessionId).toBe(sessionId);
    expect(verified.jti).toBe(jti);
  });

  it('should reject missing refresh token with UnauthorizedException', () => {
    expect(() => tokenService.verifyRefreshToken(undefined)).toThrowError('Refresh token missing');
  });

  it('should reject refresh token signed with wrong secret', () => {
    const wrongSecretToken = signJwtToken(
      { sessionId: 'test-session-id' },
      { secret: config.JWT.SECRET }, // Signed with Access secret instead of Refresh secret
    );

    expect(() => tokenService.verifyRefreshToken(wrongSecretToken)).toThrowError(
      'Invalid or expired refresh token',
    );
  });

  it('should strip password field from user object cleanly', () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-secret-bcrypt-value',
      role: 'CUSTOMER',
      isEmailVerified: false,
    };

    const sanitized = tokenService.stripPassword(mockUser);

    expect(sanitized).toBeDefined();
    expect('password' in sanitized).toBe(false);
    expect(sanitized.id).toBe(mockUser.id);
    expect(sanitized.email).toBe(mockUser.email);
    expect(sanitized.name).toBe(mockUser.name);
    expect(sanitized.role).toBe(mockUser.role);
    expect(sanitized.isEmailVerified).toBe(false);
  });
});
