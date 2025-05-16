import { ErrorCode } from '../../common/enums/error-code.enum';
import { VerificationEnum } from '../../common/enums/verification-code.enum';
import {
  LoginDto,
  RegisterDto,
  resetPasswordDto,
} from '../../common/interface/auth.interface';
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/utils/catch-errors';
import {
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  threeMinutesAgo,
} from '../../common/utils/date-time';
import { config } from '../../config/app.config';
import {
  refreshTokenSignOptions,
  RefreshTPayload,
  signJwtToken,
  verifyJwtToken,
  AccessTPayload,
} from '../../common/utils/jwt';
import { sendEmail } from '../../mailers/mailer';
import { verifyEmailTemplate } from '../../mailers/templates/template';
import { HTTPSTATUS } from '../../config/http.config';
import { hashValue, comparePassword } from '../../common/utils/bcrypt';
import { logger } from '../../common/utils/logger';
import prisma from '../../db';

export class AuthService {
  public async register(registerData: RegisterDto) {
    const { name, email, password } = registerData;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
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
    logger.info(
      { email: newUser.email, id: newUser.id },
      'New user registered'
    );

    const verification = await prisma.verificationCode.create({
      data: {
        userId: newUser.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
        // code: generateCode(), // If you have a code generator
      },
    });

    const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verification.code}`;
    logger.info(
      { email: newUser.email, verificationUrl },
      'Attempting to send verification email'
    );
    try {
      await sendEmail({
        to: newUser.email,
        subject: 'Verify your email address',
        text: `Please verify your email by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: newUser.email }, 'Verification email sent');
    } catch (err) {
      logger.error(
        { err, email: newUser.email },
        'Failed to send verification email'
      );
      throw new InternalServerException('Failed to send verification email');
    }

    return {
      user: newUser,
    };
  }
  public async login(LoginData: LoginDto) {
    const { email, password, userAgent } = LoginData;
    logger.info(`Login attempt for email: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn(`Login failed: User with email ${email} not found`);
      throw new NotFoundException(
        'User not found with this email',
        ErrorCode.AUTH_NOT_FOUND
      );
    }
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      throw new UnauthorizedException(
        'Invalid credentials',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS
      );
    }

    logger.info({ userId: user.id }, 'User authenticated successfully');

    // Create session
    logger.info({ userId: user.id }, 'Creating session');
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent,
      },
    });

    logger.info(
      { userId: user.id, sessionId: session.id },
      'Session created successfully'
    );

    // Generate tokens
    const accessTokenPayload: AccessTPayload = {
      userId: user.id,
      sessionId: session.id,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId: session.id,
    };

    const accessToken = signJwtToken(accessTokenPayload);
    const refreshToken = signJwtToken(
      refreshTokenPayload,
      refreshTokenSignOptions
    );

    logger.info(
      { userId: user.id, sessionId: session.id },
      'Authentication tokens generated'
    );

    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  public async verifyEmail(code: string) {
    const validCode = await prisma.verificationCode.findFirst({
      where: {
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!validCode) {
      throw new NotFoundException(
        'Verification code not found or expired',
        ErrorCode.VERIFICATION_ERROR
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: validCode.userId },
      data: { isEmailVerified: true },
    });

    if (!updatedUser) {
      throw new BadRequestException(
        'Unable to verify email',
        ErrorCode.VERIFICATION_ERROR
      );
    }

    await prisma.verificationCode.delete({
      where: { id: validCode.id },
    });

    return {
      user: updatedUser,
    };
  }
}
