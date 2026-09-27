import { Request, Response } from 'express';
import passport, { AuthenticateCallback, AuthenticateOptions } from 'passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import { extractTokenFromRequest, optionalAuthenticateJWT } from '../jwt.strategy';

/**
 * `mockImplementation` is typed against passport's LAST `authenticate`
 * overload, which has no callback parameter — the 3-arg middleware-producing
 * form used here is not selectable, so each mock asserts past that signature
 * once instead of leaving a `@ts-expect-error` that silently rots when the
 * inferred overload changes.
 */
type AuthenticateMock = (
  strategy: string,
  options: AuthenticateOptions,
  callback: AuthenticateCallback,
) => (req: Request, res: Response, next: () => void) => void;

const mockAuthenticate = (impl: AuthenticateMock) =>
  vi
    .spyOn(passport, 'authenticate')
    .mockImplementation(impl as unknown as typeof passport.authenticate);

describe('jwt.strategy unit tests', () => {
  describe('extractTokenFromRequest', () => {
    it('returns null when no auth header or cookie exists', () => {
      const req = { headers: {}, cookies: {} } as unknown as Request;
      expect(extractTokenFromRequest(req)).toBeNull();
    });

    it('returns null when Bearer token is "null" or "undefined"', () => {
      const req1 = {
        headers: { authorization: 'Bearer null' },
        cookies: {},
      } as unknown as Request;
      expect(extractTokenFromRequest(req1)).toBeNull();

      const req2 = {
        headers: { authorization: 'Bearer undefined' },
        cookies: {},
      } as unknown as Request;
      expect(extractTokenFromRequest(req2)).toBeNull();
    });

    it('extracts Bearer token correctly from authorization header', () => {
      const req = {
        headers: { authorization: 'Bearer valid-jwt-token-123' },
        cookies: {},
      } as unknown as Request;
      expect(extractTokenFromRequest(req)).toBe('valid-jwt-token-123');
    });

    it('falls back to accessToken cookie when no bearer header exists', () => {
      const req = {
        headers: {},
        cookies: { accessToken: 'cookie-jwt-token-456' },
      } as unknown as Request;
      expect(extractTokenFromRequest(req)).toBe('cookie-jwt-token-456');
    });
  });

  describe('optionalAuthenticateJWT', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('calls next() immediately without invoking passport if no credentials exist', () => {
      const req = { headers: {}, cookies: {} } as unknown as Request;
      const res = {} as unknown as Response;
      const next = vi.fn();
      const authSpy = vi.spyOn(passport, 'authenticate');

      optionalAuthenticateJWT(req, res, next);

      expect(authSpy).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('forwards UnauthorizedException to next(err) if Bearer token is provided but session is invalid', () => {
      const req = {
        headers: { authorization: 'Bearer expired-or-revoked-token' },
        cookies: {},
      } as unknown as Request;
      const res = {} as unknown as Response;
      const next = vi.fn();

      mockAuthenticate((_strategy, _options, callback) => () => {
        callback(
          new UnauthorizedException(
            'Session expired or invalid',
            ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
          ),
          false,
        );
      });

      optionalAuthenticateJWT(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const passedError = next.mock.calls[0]?.[0];
      expect(passedError).toBeInstanceOf(UnauthorizedException);
      expect((passedError as UnauthorizedException).message).toBe('Session expired or invalid');
      expect(req.user).toBeUndefined();
    });

    it('sets req.user and calls next() if token credentials are valid', () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      } as unknown as Request;
      const res = {} as unknown as Response;
      const next = vi.fn();
      // `sessionId` is required on the augmented Express.User the strategy assigns.
      const mockUser = { id: 'user-123', sessionId: 'sess-1', email: 'test@example.com' };

      mockAuthenticate((_strategy, _options, callback) => () => {
        callback(null, mockUser);
      });

      optionalAuthenticateJWT(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual(mockUser);
    });
  });
});
