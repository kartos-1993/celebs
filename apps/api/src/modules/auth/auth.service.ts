import {
  loginType,
  registerType,
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
  NotFoundException,
  UnauthorizedException,
} from '@celebs/shared-utils';

import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { comparePassword,hashValue } from '@/common/utils/bcrypt';
import {
  fortyFiveMinutesFromNow,
} from '@/common/utils/date-time';
import {
  AccessTPayload,
  refreshTokenSignOptions,
  RefreshTPayload,
  signJwtToken,
  verifyJwtToken,
} from '@/common/utils/jwt';
import { buildWebUrl } from '@/common/utils/url';
import { config } from '@/config/app.config';
import prisma, { Prisma } from '@/db';
import { sendEmail } from '@/mailers/mailer';
import { verifyEmailTemplate } from '@/mailers/templates/template';

export class AuthService {
  public async register(registerData: registerType) {
    const { name, email, password } = registerData;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }

    // Hash the password before saving
    const hashedPassword = await hashValue(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Log user registration
    logger.info({ email: newUser.email, id: newUser.id }, 'New user registered');

    const verification = await prisma.verificationCode.create({
      data: {
        userId: newUser.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
        // code: generateCode(), // If you have a code generator
      },
    });

    const verificationUrl = buildWebUrl('/verify-email', { code: verification.code });
    logger.info({ email: newUser.email, verificationUrl }, 'Attempting to send verification email');
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Verify your email address',
        text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: newUser.email }, 'Verification email sent');
    } catch (err) {
      logger.error({ err, email: newUser.email }, 'Failed to send verification email');
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn(
          { verificationUrl, email: newUser.email },
          '[DEV/TEST FALLBACK] Verification email failed to send. Click link in logs to verify manually.',
        );
      } else {
        throw new InternalServerException('Failed to send verification email');
      }
    }

    const { password: _, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
    };
  }

  public async vendorRegister(registerData: vendorRegisterType) {
    const {
      name,
      email,
      password,
      shopName,
      shopDescription,
      phoneNumber,
      panNumber,
      citizenshipNumber,
      panDocumentUrl,
      citizenshipDocumentUrl,
      ownerPhotoUrl,
    } = registerData;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }

    const existingShop = await prisma.vendorProfile.findUnique({
      where: { shopName },
    });
    if (existingShop) {
      throw new BadRequestException('Shop name is already taken', ErrorCode.INVALID_REQUEST);
    }

    const existingPhone = await prisma.vendorProfile.findUnique({
      where: { phoneNumber },
    });
    if (existingPhone) {
      throw new BadRequestException(
        'Phone number is already registered',
        ErrorCode.INVALID_REQUEST,
      );
    }

    const existingPan = await prisma.vendorProfile.findUnique({
      where: { panNumber },
    });
    if (existingPan) {
      throw new BadRequestException('PAN number is already registered', ErrorCode.INVALID_REQUEST);
    }

    const existingCitizenship = await prisma.vendorProfile.findUnique({
      where: { citizenshipNumber },
    });
    if (existingCitizenship) {
      throw new BadRequestException(
        'Citizenship number is already registered',
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Hash the password before saving
    const hashedPassword = await hashValue(password);

    // Create user and vendor profile in a transaction
    const newUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'VENDOR',
        },
      });

      await tx.vendorProfile.create({
        data: {
          userId: user.id,
          phoneNumber,
          shopName,
          shopDescription,
          panNumber,
          citizenshipNumber,
          panDocumentUrl,
          citizenshipDocumentUrl,
          ownerPhotoUrl,
          status: 'PENDING',
        },
      });

      return user;
    });

    // Log vendor registration
    logger.info(
      { email: newUser.email, id: newUser.id, shopName },
      'New vendor registered, profile pending approval',
    );

    const verification = await prisma.verificationCode.create({
      data: {
        userId: newUser.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
      },
    });

    const verificationUrl = buildWebUrl('/verify-email', { code: verification.code });
    logger.info(
      { email: newUser.email, verificationUrl },
      'Attempting to send verification email to vendor',
    );
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Verify your email address',
        text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: newUser.email }, 'Verification email sent to vendor');
    } catch (err) {
      logger.error({ err, email: newUser.email }, 'Failed to send verification email to vendor');
      if (process.env.NODE_ENV === 'development') {
        logger.warn(
          { verificationUrl, email: newUser.email },
          '[DEV FALLBACK] Vendor verification email failed to send. Click link in logs to verify manually.',
        );
      } else {
        throw new InternalServerException('Failed to send verification email');
      }
    }

    const { password: _, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
    };
  }

  public async login(LoginData: loginType) {
    const { email, password, userAgent } = LoginData;
    logger.info(`Login attempt for email: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        vendorProfile: true,
      },
    });

    if (!user) {
      logger.warn(`Login failed: User with email ${email} not found`);
      throw new UnauthorizedException(
        'Invalid email or password',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      throw new UnauthorizedException(
        'Invalid email or password',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    logger.info({ userId: user.id }, 'User authenticated successfully');

    if (user.role === 'VENDOR') {
      if (!user.isEmailVerified) {
        throw new ForbiddenException(
          'Email address is not verified. Please check your inbox for the verification link.',
          ErrorCode.VERIFICATION_ERROR,
        );
      }

      const profile = await prisma.vendorProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile || profile.status === 'SUSPENDED') {
        throw new ForbiddenException(
          'Your seller account has been suspended. Please contact support.',
          ErrorCode.FORBIDDEN_ACCESS,
        );
      }
    }

    // Create session
    logger.info({ userId: user.id }, 'Creating session');
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent,
      },
    });

    logger.info({ userId: user.id, sessionId: session.id }, 'Session created successfully');

    // Generate tokens
    const accessTokenPayload: AccessTPayload = {
      userId: user.id,
      sessionId: session.id,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId: session.id,
    };

    const accessToken = signJwtToken(accessTokenPayload);
    const refreshToken = signJwtToken(refreshTokenPayload, refreshTokenSignOptions);

    logger.info({ userId: user.id, sessionId: session.id }, 'Authentication tokens generated');

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  public async verifyEmail(code: string): Promise<VerifyEmailResponse> {
    const validCode = await prisma.verificationCode.findFirst({
      where: {
        type: VerificationEnum.EMAIL_VERIFICATION,
        code,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!validCode) {
      throw new NotFoundException(
        'Verification code not found or expired',
        ErrorCode.VERIFICATION_ERROR,
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: validCode.userId },
      data: { isEmailVerified: true },
    });

    if (!updatedUser) {
      throw new BadRequestException('Unable to verify email', ErrorCode.VERIFICATION_ERROR);
    }

    await prisma.verificationCode.delete({
      where: { id: validCode.id },
    });

    // Create a session for the auto-login
    logger.info({ userId: updatedUser.id }, 'Creating session after email verification');
    const userAgent = 'Email Verification Auto-Login';
    const session = await prisma.session.create({
      data: {
        userId: updatedUser.id,
        userAgent,
      },
    });

    logger.info(
      { userId: updatedUser.id, sessionId: session.id },
      'Session created successfully after email verification',
    );

    // Generate tokens for auto-login
    const accessTokenPayload: AccessTPayload = {
      userId: updatedUser.id,
      sessionId: session.id,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId: session.id,
    };

    const accessToken = signJwtToken(accessTokenPayload);
    const refreshToken = signJwtToken(refreshTokenPayload, refreshTokenSignOptions);

    logger.info(
      { userId: updatedUser.id, sessionId: session.id },
      'Authentication tokens generated after email verification',
    );

    const { password: _, ...userWithoutPassword } = updatedUser;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  public async logout(sessionId: string) {
    await prisma.session
      .delete({
        where: {
          id: sessionId,
        },
      })
      .catch((err: Error) => {
        logger.error({ err, sessionId }, 'Failed to delete session on logout');
      });
  }

  public async setupSuperadmin(setupData: setupSuperadminType) {
    const { name, email, password, setupSecret } = setupData;

    // Verify secret
    if (setupSecret !== config.SETUP_SECRET) {
      throw new ForbiddenException('Invalid setup secret key');
    }

    // Check if any SUPERADMIN user exists
    const superadminExists = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });
    if (superadminExists) {
      throw new HttpException('A SUPERADMIN user already exists', HTTPSTATUS.CONFLICT);
    }

    // Hash password
    const hashedPassword = await hashValue(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'SUPERADMIN',
        isEmailVerified: true,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
    };
  }

  public async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token missing', ErrorCode.AUTH_TOKEN_NOT_FOUND);
    }

    const { payload, error } = verifyJwtToken<RefreshTPayload>(token);
    if (error || !payload?.sessionId) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    // Check if session exists in DB
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: { include: { vendorProfile: true } } },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException(
        'Session expired or invalid',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    const user = session.user;
    if (user.role === 'VENDOR' && user.vendorProfile) {
      const status = user.vendorProfile.status;
      if (status === 'REJECTED' || status === 'SUSPENDED') {
        throw new ForbiddenException(
          'Access denied: Seller account is suspended or rejected.',
          ErrorCode.FORBIDDEN_ACCESS,
        );
      }
    }

    // Generate new Access and Refresh tokens (Refresh Token Rotation)
    const accessTokenPayload: AccessTPayload = {
      userId: user.id,
      sessionId: session.id,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId: session.id,
    };

    const newAccessToken = signJwtToken(accessTokenPayload);
    const newRefreshToken = signJwtToken(refreshTokenPayload, refreshTokenSignOptions);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public async isSuperadminSetupRequired() {
    const superadminExists = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });
    return !superadminExists;
  }

  public async googleSignIn(data: {
    email: string;
    name: string;
    picture?: string;
    googleId?: string;
    userAgent?: string;
  }) {
    const { email, name, userAgent } = data;
    logger.info(`Google Sign-In request for email: ${email}`);

    if (!email) {
      throw new BadRequestException(
        'Email is required for Google Sign-In',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        vendorProfile: true,
      },
    });

    if (!user) {
      const randomPassword = await hashValue(Math.random().toString(36).slice(-10) + 'A1!');
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0] || 'User',
          password: randomPassword,
          isEmailVerified: true,
        },
        include: {
          vendorProfile: true,
        },
      });
      logger.info(
        { userId: user.id, email: user.email },
        'New user auto-registered via Google Sign-In',
      );
    }

    if (!user) {
      throw new InternalServerException(
        'Failed to create or resolve user record',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }

    if (user.role === 'VENDOR') {
      const profile = await prisma.vendorProfile.findUnique({
        where: { userId: user.id },
      });

      if (!profile || profile.status === 'REJECTED' || profile.status === 'SUSPENDED') {
        throw new ForbiddenException(
          'Access denied: Seller account is suspended or rejected.',
          ErrorCode.FORBIDDEN_ACCESS,
        );
      }
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: userAgent || 'Mobile Google Sign-In',
      },
    });

    const accessTokenPayload: AccessTPayload = {
      userId: user.id,
      sessionId: session.id,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId: session.id,
    };

    const accessToken = signJwtToken(accessTokenPayload);
    const refreshToken = signJwtToken(refreshTokenPayload, refreshTokenSignOptions);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }
}
