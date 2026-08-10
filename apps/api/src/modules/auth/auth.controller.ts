import { Request, Response } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  HTTPSTATUS,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ErrorCode,
} from '@celebs/shared-utils';
import { AuthService } from './auth.service';

import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationEmailSchema,
  vendorRegisterSchema,
  setupSuperadminSchema,
  IApiResponse,
} from '@celebs/shared-types';
import {
  clearAuthenticationCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from '@/common/utils/cookie';

export class AuthController {
  private authService: AuthService;
  constructor(authService: AuthService) {
    this.authService = authService;
  }
  public register = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    let body;
    try {
      body = registerSchema.parse({
        ...req.body,
      });
    } catch (err: any) {
      // Pass the Zod error to the error handler to format properly
      if (
        err instanceof z.ZodError ||
        err?.name === 'ZodError' ||
        err?.constructor?.name === 'ZodError'
      ) {
        throw err;
      }
      // For other validation errors
      throw new BadRequestException('Validation failed', ErrorCode.VALIDATION_ERROR);
    }
    const { user } = await this.authService.register(body);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'User registered successfully',
      data: user,
    };
    return res.status(HTTPSTATUS.CREATED).json(response);
  });

  public vendorRegister = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    let body;
    try {
      body = vendorRegisterSchema.parse({
        ...req.body,
      });
    } catch (err: any) {
      if (
        err instanceof z.ZodError ||
        err?.name === 'ZodError' ||
        err?.constructor?.name === 'ZodError'
      ) {
        console.log(
          'ZOD VALIDATION ERROR IN VENDOR REGISTRATION:',
          JSON.stringify(err.errors || err.issues, null, 2),
        );
        throw err;
      }
      throw new BadRequestException('Validation failed', ErrorCode.VALIDATION_ERROR);
    }
    const { user } = await this.authService.vendorRegister(body);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'Vendor registered successfully. Approval is pending.',
      data: user,
    };
    return res.status(HTTPSTATUS.CREATED).json(response);
  });

  public login = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userAgent = req.headers['user-agent'];
    const body = loginSchema.parse({
      ...req.body,
      userAgent,
    });
    const { user, accessToken, refreshToken, mfaRequired } = await this.authService.login(body);
    setAuthenticationCookies({ res, accessToken, refreshToken });
    const response: IApiResponse<{ user: typeof user; accessToken: string; refreshToken: string }> =
      {
        success: true,
        message: 'User logged in successfully',
        data: { user, accessToken, refreshToken },
      };
    return res.status(HTTPSTATUS.OK).json(response);
  });
  public verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { code } = verificationEmailSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await this.authService.verifyEmail(code);

    // Set authentication cookies just like login endpoint
    setAuthenticationCookies({ res, accessToken, refreshToken });

    const response: IApiResponse<{ user: typeof user; accessToken: string; refreshToken: string }> =
      {
        success: true,
        message: 'Email verified successfully',
        data: { user, accessToken, refreshToken },
      };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public logout = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    clearAuthenticationCookies(res);
    const response: IApiResponse<null> = {
      success: true,
      message: 'Logged out successfully',
      data: null,
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public setupSuperadmin = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const body = setupSuperadminSchema.parse(req.body);
    const { user } = await this.authService.setupSuperadmin(body);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'Superadmin setup completed successfully',
      data: user,
    };
    return res.status(HTTPSTATUS.CREATED).json(response);
  });

  public refreshToken = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.headers['x-refresh-token'] ||
      req.headers.authorization?.replace('Bearer ', '');

    const {
      user,
      accessToken,
      refreshToken: newRefreshToken,
    } = await this.authService.refreshToken(refreshToken as string);

    setAuthenticationCookies({
      res,
      accessToken,
      refreshToken: newRefreshToken,
    });

    const response: IApiResponse<{
      user: typeof user;
      accessToken: string;
      refreshToken: string;
    }> = {
      success: true,
      message: 'Token refreshed successfully',
      data: { user, accessToken, refreshToken: newRefreshToken },
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public getSetupStatus = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const setupRequired = await this.authService.isSuperadminSetupRequired();
    const response: IApiResponse<{ setupRequired: boolean }> = {
      success: true,
      message: 'Setup status fetched successfully',
      data: { setupRequired },
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public googleSignIn = asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userAgent = req.headers['user-agent'];
    const { email, name, picture, googleId } = req.body;
    const { user, accessToken, refreshToken } = await this.authService.googleSignIn({
      email,
      name,
      picture,
      googleId,
      userAgent,
    });
    setAuthenticationCookies({ res, accessToken, refreshToken });
    const response: IApiResponse<{ user: typeof user; accessToken: string; refreshToken: string }> =
      {
        success: true,
        message: 'Google sign in successful',
        data: { user, accessToken, refreshToken },
      };
    return res.status(HTTPSTATUS.OK).json(response);
  });
}
