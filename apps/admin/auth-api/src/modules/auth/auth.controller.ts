import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { AuthService } from './auth.service';
import { HTTPSTATUS } from '../../config/http.config';
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationEmailSchema,
} from '../../common/validators/auth.validator';
import {
  clearAuthenticationCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from '../../common/utils/cookie';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '../../common/utils/catch-errors';
import { ErrorCode } from '../../common/enums/error-code.enum';

export class AuthController {
  private authService: AuthService;
  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public register = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      let body;
      try {
        body = registerSchema.parse({
          ...req.body,
        });
      } catch (err) {
        // Standardize validation error
        throw new BadRequestException(
          'Validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      }
      const { user } = await this.authService.register(body);
      return res.status(HTTPSTATUS.CREATED).json({
        message: 'User registered successfully',
        data: user,
      });
    }
  );
}
