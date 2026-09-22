import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  changePasswordType,
  loginType,
  registerType,
  resendVerificationType,
  resetPasswordType,
  setupSuperadminType,
  vendorRegisterType,
  VerifyEmailResponse,
} from '@celebs/shared-types';
import {
  BadRequestException,
  ErrorCode,
  ForbiddenException,
  HttpException,
  HTTPSTATUS,
  logger,
  NotFoundException,
  UnauthorizedException,
} from '@celebs/shared-utils';

import { storeLifecycle } from '../store/store-lifecycle.service';
import { type VendorService, vendorService } from '../vendor/vendor.service';

import { type AuthRepository, authRepository } from './auth.repository';
import { type GoogleAuthService, googleAuthService } from './google-auth.service';
import { type TokenService, tokenService } from './token.service';
import { type VerificationService, verificationService } from './verification.service';

import { authCache } from '@/common/cache/auth-cache';
import { comparePassword, hashValue } from '@/common/utils/bcrypt';
import { config } from '@/config/app.config';

export interface RefreshResult {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
}

export interface AuthServiceDeps {
  authRepo?: AuthRepository;
  tokenService?: TokenService;
  verificationService?: VerificationService;
  googleAuthService?: GoogleAuthService;
  vendorService?: VendorService;
}

/** Previous-jti grace: a lost-response retry must not look like theft. */
const GRACE_WINDOW_MS = 60 * 1000;
const GRACE_MAX_USES = 3;

/**
 * Normalizes a User-Agent for device comparison: version numbers churn on
 * every browser update, so they are stripped and only client/OS tokens
 * are compared. Returns null when there is nothing stable to compare.
 */
export function normalizeFingerprint(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  const stripped = userAgent
    .replace(/\d+(\.\d+)*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length >= 8 ? stripped : null;
}

export class AuthService {
  private authRepo: AuthRepository;
  private tokenService: TokenService;
  private verificationService: VerificationService;
  private googleAuthService: GoogleAuthService;
  private vendorService: VendorService;

  constructor(deps: AuthServiceDeps = {}) {
    this.authRepo = deps.authRepo ?? authRepository;
    this.tokenService = deps.tokenService ?? tokenService;
    this.verificationService = deps.verificationService ?? verificationService;
    this.googleAuthService = deps.googleAuthService ?? googleAuthService;
    this.vendorService = deps.vendorService ?? vendorService;
  }

  public async register(registerData: registerType) {
    const { name, email, password } = registerData;

    const existingUser = await this.authRepo.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }

    const hashedPassword = await hashValue(password);
    const newUser = await this.authRepo.createUser({
      name,
      email,
      password: hashedPassword,
    });

    logger.info({ email: newUser.email, id: newUser.id }, 'New user registered');

    await this.verificationService.sendVerificationEmail(newUser);

    return {
      user: this.tokenService.stripPassword(newUser),
    };
  }

  public async vendorRegister(registerData: vendorRegisterType) {
    const user = await this.vendorService.onboardVendor(registerData);
    await this.verificationService.sendVerificationEmail(user, { isVendor: true });

    return {
      user: this.tokenService.stripPassword(user),
    };
  }

  public async login(LoginData: loginType, surface?: string) {
    const { email, password, userAgent } = LoginData;
    logger.info(`Login attempt for email: ${email}, surface: ${surface || 'default'}`);

    const user = await this.authRepo.findUserWithVendor(email);
    if (!user) {
      logger.warn(`Login failed: User with email ${email} not found`);
      throw new UnauthorizedException(
        'Invalid email or password',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      throw new UnauthorizedException(
        'Invalid email or password',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    if (surface === 'admin') {
      const isPlatform = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
      const isSeller = user.role === 'VENDOR' || user.role === 'STAFF';

      if (!isPlatform && !isSeller) {
        logger.warn(
          { userId: user.id, role: user.role },
          'Login rejected: Non-administrative user attempted to authenticate against admin surface',
        );
        throw new ForbiddenException(
          'Access denied: Customer accounts cannot access the administrative portal.',
          ErrorCode.PLATFORM_ACCESS_REQUIRED,
        );
      }
    }

    logger.info({ userId: user.id }, 'User authenticated successfully');
    await storeLifecycle.assertSellerLoginAllowed(user);

    logger.info({ userId: user.id }, 'Creating session');
    const jti = randomUUID();
    const session = await this.authRepo.createSession({
      userId: user.id,
      userAgent,
      rotatedRefreshId: jti,
    });

    logger.info({ userId: user.id, sessionId: session.id }, 'Session created successfully');

    const { accessToken, refreshToken } = this.tokenService.issueTokenPair(
      user.id,
      session.id,
      jti,
    );

    logger.info({ userId: user.id, sessionId: session.id }, 'Authentication tokens generated');

    return {
      user: this.tokenService.stripPassword(user),
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  public async verifyEmail(code: string): Promise<VerifyEmailResponse> {
    const updatedUser = await this.verificationService.verifyCode(code);

    await storeLifecycle.assertSellerLoginAllowed(updatedUser);

    logger.info({ userId: updatedUser.id }, 'Creating session after email verification');
    const userAgent = 'Email Verification Auto-Login';
    const jti = randomUUID();
    const session = await this.authRepo.createSession({
      userId: updatedUser.id,
      userAgent,
      rotatedRefreshId: jti,
    });

    logger.info(
      { userId: updatedUser.id, sessionId: session.id },
      'Session created successfully after email verification',
    );

    const { accessToken, refreshToken } = this.tokenService.issueTokenPair(
      updatedUser.id,
      session.id,
      jti,
    );

    logger.info(
      { userId: updatedUser.id, sessionId: session.id },
      'Authentication tokens generated after email verification',
    );

    return {
      user: this.tokenService.stripPassword(updatedUser),
      accessToken,
      refreshToken,
    };
  }

  public async resendVerification(data: resendVerificationType) {
    return this.verificationService.resendWithThrottle(data);
  }

  public async logout(sessionId: string) {
    await this.authRepo.deleteSession(sessionId);
    await authCache.invalidateSessions([sessionId]);
  }

  public async setupSuperadmin(setupData: setupSuperadminType) {
    const { name, email, password, setupSecret } = setupData;

    if (!config.SETUP_SECRET) {
      throw new ForbiddenException('Setup secret is not configured on the server');
    }

    const userSecretHash = new Uint8Array(
      createHash('sha256')
        .update(setupSecret || '')
        .digest(),
    );
    const expectedSecretHash = new Uint8Array(
      createHash('sha256').update(config.SETUP_SECRET).digest(),
    );

    if (!timingSafeEqual(userSecretHash, expectedSecretHash)) {
      throw new ForbiddenException('Invalid setup secret key');
    }

    const superadminExists = await this.authRepo.findSuperadmin();
    if (superadminExists) {
      throw new HttpException('A SUPERADMIN user already exists', HTTPSTATUS.CONFLICT);
    }

    // Clean up any legacy phantom platform account if present
    await this.authRepo.purgePhantomPlatformUsers();

    const hashedPassword = await hashValue(password);
    const newUser = await this.authRepo.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'SUPERADMIN',
      isEmailVerified: true,
    });

    await this.authRepo.provisionPlatformVendor(newUser.id);

    return {
      user: this.tokenService.stripPassword(newUser),
    };
  }

  /** In-flight refreshes keyed by presented token: identical concurrent
   *  requests (StrictMode, double-click, tab races) share one rotation
   *  instead of tripping reuse detection on each other. */
  private readonly inflightRefreshes = new Map<string, Promise<RefreshResult>>();

  public async refreshToken(
    token: string,
    context?: { userAgent?: string },
  ): Promise<RefreshResult> {
    const inFlight = this.inflightRefreshes.get(token);
    if (inFlight) return inFlight;

    const pending = this.executeRefresh(token, context).finally(() => {
      if (this.inflightRefreshes.get(token) === pending) {
        this.inflightRefreshes.delete(token);
      }
    });
    this.inflightRefreshes.set(token, pending);
    return pending;
  }

  private async revokeSessionFamily(
    session: { id: string; userId: string },
    reason: string,
  ): Promise<never> {
    const revokedSessionIds = await this.authRepo.deleteAllUserSessions(session.userId);
    await authCache.invalidateSessions(revokedSessionIds);
    logger.error(
      { sessionId: session.id, userId: session.userId, revokedCount: revokedSessionIds.length },
      `${reason} — all user sessions terminated`,
    );
    throw new UnauthorizedException(
      'Session revoked due to token reuse',
      ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
    );
  }

  private async executeRefresh(
    token: string,
    context?: { userAgent?: string },
  ): Promise<RefreshResult> {
    const payload = this.tokenService.verifyRefreshToken(token);

    const session = await this.authRepo.findSessionWithUser(payload.sessionId);
    if (!session || !session.user || (session.expiredAt && session.expiredAt <= new Date())) {
      throw new UnauthorizedException(
        'Session expired or invalid',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const presentedJti = payload.jti;
    if (session.rotatedRefreshId && presentedJti !== session.rotatedRefreshId) {
      const expectedFingerprint = normalizeFingerprint(session.userAgent);
      const presentedFingerprint = normalizeFingerprint(context?.userAgent);
      const fingerprintMismatch =
        expectedFingerprint !== null &&
        presentedFingerprint !== null &&
        expectedFingerprint !== presentedFingerprint;
      if (fingerprintMismatch) {
        return this.revokeSessionFamily(session, 'security.refresh_fingerprint_mismatch');
      }

      const withinWindow =
        session.previousRefreshId === presentedJti &&
        session.previousIssuedAt !== null &&
        Date.now() - session.previousIssuedAt.getTime() <= GRACE_WINDOW_MS;
      if (withinWindow && session.oldTokenUseCount < GRACE_MAX_USES) {
        const useCount = await this.authRepo.recordGraceUse(session.id);
        if (useCount > GRACE_MAX_USES) {
          return this.revokeSessionFamily(session, 'security.refresh_grace_exhausted');
        }
        logger.warn(
          { sessionId: session.id, userId: session.userId, useCount },
          'security.refresh_grace_used — previous jti accepted without rotation',
        );
        const { accessToken, refreshToken } = this.tokenService.issueTokenPair(
          session.user.id,
          session.id,
          session.rotatedRefreshId,
        );
        return {
          user: this.tokenService.stripPassword(session.user),
          accessToken,
          refreshToken,
        };
      }

      return this.revokeSessionFamily(session, 'security.refresh_reuse_detected');
    }

    const sessionLifetimeMs = Date.now() - session.createdAt.getTime();
    if (sessionLifetimeMs > config.SESSION.EXPIRY_MS) {
      await this.authRepo.deleteSession(session.id);
      await authCache.invalidateSessions([session.id]);
      logger.warn(
        { sessionId: session.id, userId: session.userId },
        'Session lifetime expired — terminated',
      );
      throw new UnauthorizedException(
        'Session lifetime expired',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const user = session.user;
    await storeLifecycle.assertSellerLoginAllowed(user);

    const newJti = randomUUID();
    const newExpiredAt = new Date(Date.now() + config.SESSION.EXPIRY_MS);

    const updated = await this.authRepo.rotateSessionCas(
      session.id,
      presentedJti,
      newJti,
      newExpiredAt,
    );

    if (!updated) {
      logger.warn(
        { sessionId: session.id, presentedJti },
        'Concurrent refresh detected: CAS slide failed',
      );
      throw new UnauthorizedException(
        'Session revoked or refreshed concurrently',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    await authCache.invalidateSessions([session.id]);

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      this.tokenService.issueTokenPair(user.id, session.id, newJti);

    return {
      user: this.tokenService.stripPassword(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public async isSuperadminSetupRequired() {
    const superadminExists = await this.authRepo.findSuperadmin();
    return !superadminExists;
  }

  public async googleSignIn(data: { idToken: string; userAgent?: string }) {
    const { email, name } = await this.googleAuthService.verifyGoogleToken(data.idToken);
    const user = await this.googleAuthService.findOrCreateGoogleUser(email, name);

    await storeLifecycle.assertSellerLoginAllowed(user);

    const jti = randomUUID();
    const session = await this.authRepo.createSession({
      userId: user.id,
      userAgent: data.userAgent || 'Google Sign-In',
      rotatedRefreshId: jti,
    });

    const { accessToken, refreshToken } = this.tokenService.issueTokenPair(
      user.id,
      session.id,
      jti,
    );

    return {
      user: this.tokenService.stripPassword(user),
      accessToken,
      refreshToken,
    };
  }

  public async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepo.findUserByEmail(email.toLowerCase());
    if (!user) {
      logger.warn({ email }, 'Password reset requested for non-existent email — silently ignored');
      return;
    }

    // Invalidate existing reset tokens for this user
    await this.authRepo.deleteUserPasswordResetCodes(user.id);

    // Create fresh single-use reset token (15-minute expiry)
    const verification = await this.authRepo.createPasswordResetCode(user.id);
    await this.verificationService.sendPasswordResetEmail(user, verification.code);

    logger.info({ userId: user.id, email: user.email }, 'Password reset email dispatched');
  }

  public async resetPassword(data: resetPasswordType): Promise<void> {
    const validCode = await this.authRepo.findValidPasswordResetCode(data.verificationCode);
    if (!validCode) {
      throw new BadRequestException(
        'Invalid or expired password reset verification code',
        ErrorCode.VERIFICATION_ERROR,
      );
    }

    const hashedPassword = await hashValue(data.password);
    await this.authRepo.updateUser(validCode.userId, { password: hashedPassword });

    // Universal session revocation: invalidate all active sessions for this user across all devices
    const revokedSessionIds = await this.authRepo.deleteAllUserSessions(validCode.userId);
    await authCache.invalidateSessions(revokedSessionIds);

    // Single-use code burn
    await this.authRepo.deleteVerificationCodeById(validCode.id);

    logger.info(
      { userId: validCode.userId, revokedCount: revokedSessionIds.length },
      'User password reset completed — all active sessions terminated',
    );
  }

  public async changePassword(
    userId: string,
    currentSessionId: string,
    data: changePasswordType,
  ): Promise<void> {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await comparePassword(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException(
        'Current password is incorrect',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const hashedPassword = await hashValue(data.newPassword);
    await this.authRepo.updateUser(user.id, { password: hashedPassword });

    // Revoke all sessions across all devices to guarantee no stale credentials remain active
    const revokedSessionIds = await this.authRepo.deleteAllUserSessions(user.id);
    await authCache.invalidateSessions(revokedSessionIds);

    logger.info(
      { userId, currentSessionId, revokedCount: revokedSessionIds.length },
      'User password changed — all active sessions terminated',
    );
  }
}

export const authService = new AuthService();
