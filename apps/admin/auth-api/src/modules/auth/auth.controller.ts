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

  public login = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers['user-agent'];
      const body = loginSchema.parse({
        ...req.body,
        userAgent,
      });
      const { user, accessToken, refreshToken, mfaRequired } =
        await this.authService.login(body);
      setAuthenticationCookies({ res, accessToken, refreshToken });
      const response: IApiResponse<typeof user> = {
        success: true,
        message: 'User logged in successfully',
        data: user,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code } = verificationEmailSchema.parse(req.body);
      const { user, accessToken, refreshToken } =
        await this.authService.verifyEmail(code);

      // Set authentication cookies just like login endpoint
      setAuthenticationCookies({ res, accessToken, refreshToken });

      const response: IApiResponse<typeof user> = {
        success: true,
        message: 'Email verified successfully',
        data: user,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    }
  );

}
