import { randomUUID } from 'node:crypto';

import {
  loginType,
  registerType,
  resendVerificationType,
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
  InternalServerException,
  logger,
  UnauthorizedException,
} from '@celebs/shared-utils';

import { storeLifecycle } from '../store/store-lifecycle.service';
import { VendorService, vendorService as defaultVendorService } from '../vendor/vendor.service';

import { AuthRepository, authRepository } from './auth.repository';
import {
  GoogleAuthService,
  googleAuthService as defaultGoogleAuthService,
} from './google-auth.service';
import { TokenService, tokenService as defaultTokenService } from './token.service';
import {
  VerificationService,
  verificationService as defaultVerificationService,
} from './verification.service';

import { authCache } from '@/common/cache/auth-cache';
import { ensurePlatformVendor } from '@/common/constants/platform-vendor';
import { comparePassword, hashValue } from '@/common/utils/bcrypt';
import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';

export class AuthService {
  constructor(
    private authRepo: AuthRepository = authRepository,
    private tokenService: TokenService = defaultTokenService,
    private verificationService: VerificationService = defaultVerificationService,
    private googleAuthService: GoogleAuthService = defaultGoogleAuthService,
    private vendorService: VendorService = defaultVendorService,
  ) {}

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

    if (setupSecret !== config.SETUP_SECRET) {
      throw new ForbiddenException('Invalid setup secret key');
    }

    const superadminExists = await this.authRepo.findSuperadmin();
    if (superadminExists) {
      throw new HttpException('A SUPERADMIN user already exists', HTTPSTATUS.CONFLICT);
    }

    const hashedPassword = await hashValue(password);
    const newUser = await this.authRepo.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'SUPERADMIN',
      isEmailVerified: true,
    });

    await ensurePlatformVendor(prisma, newUser.id);

    return {
      user: this.tokenService.stripPassword(newUser),
    };
  }

  public async refreshToken(token: string) {
    const payload = this.tokenService.verifyRefreshToken(token);

    const session = await this.authRepo.findSessionWithUser(payload.sessionId);
    if (!session || !session.user || (session.expiredAt && session.expiredAt <= new Date())) {
      throw new UnauthorizedException(
        'Session expired or invalid',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const presentedJti = payload.jti;
    if (presentedJti && session.rotatedRefreshId && presentedJti !== session.rotatedRefreshId) {
      await this.authRepo.deleteSession(session.id);
      await authCache.invalidateSessions([session.id]);
      logger.error(
        { sessionId: session.id, userId: session.userId },
        'security.refresh_reuse_detected — session terminated',
      );
      throw new UnauthorizedException(
        'Session revoked due to token reuse',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const user = session.user;
    await storeLifecycle.assertSellerLoginAllowed(user);

    const newJti = randomUUID();

    try {
      const newExpiredAt = new Date(Date.now() + config.SESSION.EXPIRY_MS);
      await this.authRepo.slideSession(session.id, newExpiredAt, newJti);
      await authCache.invalidateSessions([session.id]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        { error: errMsg, sessionId: session.id },
        'Failed to slide session window in database',
      );
      throw new InternalServerException('Failed to extend session lifetime');
    }

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
}
