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
} from '../../common/utils/jwt';
import { sendEmail } from '../../mailers/mailer';
import { verifyEmailTemplate } from '../../mailers/templates/template';
import { HTTPSTATUS } from '../../config/http.config';
import { hashValue } from '../../common/utils/bcrypt';
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
}
