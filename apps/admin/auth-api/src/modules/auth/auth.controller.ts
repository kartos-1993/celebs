import { Request, Response } from 'express';
import { z } from 'zod';
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
import { IApiResponse } from '../../common/interface/api-response.interface';

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
        // Pass the Zod error to the error handler to format properly
        if (err instanceof z.ZodError) {
          throw err;
        }
        // For other validation errors
        throw new BadRequestException(
          'Validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      }
      const { user } = await this.authService.register(body);
      const response: IApiResponse<typeof user> = {
        success: true,
        message: 'User registered successfully',
        data: user,
      };
      return res.status(HTTPSTATUS.CREATED).json(response);
    }
  );
}
