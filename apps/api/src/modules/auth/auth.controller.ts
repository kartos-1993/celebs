import { Request, Response } from 'express';
import { z } from 'zod';

import {
  IApiResponse,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  setupSuperadminSchema,
  vendorRegisterSchema,
} from '@celebs/shared-types';
import { asyncHandler, BadRequestException, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { AuthService } from './auth.service';

import { clearAuthenticationCookies, setAuthenticationCookies } from '@/common/utils/cookie';
import { buildWebUrl } from '@/common/utils/url';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }
  public register = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    let body;
    try {
      body = registerSchema.parse({
        ...req.body,
      });
    } catch (err: unknown) {
      if (err instanceof z.ZodError || (err as { name?: string })?.name === 'ZodError') {
        const issues = (err as z.ZodError).issues;
        const msg = issues?.[0]?.message || 'Validation failed';
        throw new BadRequestException(msg, ErrorCode.VALIDATION_ERROR);
      }
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

  public vendorRegister = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    let body;
    try {
      body = vendorRegisterSchema.parse({
        ...req.body,
      });
    } catch (err: unknown) {
      if (err instanceof z.ZodError || (err as { name?: string })?.name === 'ZodError') {
        const issues = (err as z.ZodError).issues;
        const msg = issues?.[0]?.message || 'Validation failed';
        throw new BadRequestException(msg, ErrorCode.VALIDATION_ERROR);
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

  public login = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userAgent = req.headers['user-agent'];
    let body;
    try {
      body = loginSchema.parse({
        ...req.body,
        userAgent,
      });
    } catch (err: unknown) {
      if (err instanceof z.ZodError || (err as { name?: string })?.name === 'ZodError') {
        const issues = (err as z.ZodError).issues;
        const msg = issues?.[0]?.message || 'Validation failed';
        throw new BadRequestException(msg, ErrorCode.VALIDATION_ERROR);
      }
      throw new BadRequestException('Validation failed', ErrorCode.VALIDATION_ERROR);
    }
    const { user, accessToken, refreshToken } = await this.authService.login(body);
    setAuthenticationCookies({ res, accessToken, refreshToken });
    const response: IApiResponse<{ user: typeof user; accessToken: string; refreshToken: string }> =
      {
        success: true,
        message: 'User logged in successfully',
        data: { user, accessToken, refreshToken },
      };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<Response | void> => {
      const code = (req.body?.code || req.query?.code) as string;
      if (!code) {
        throw new BadRequestException(
          'Verification code is required',
          ErrorCode.VERIFICATION_ERROR,
        );
      }
      const { user, accessToken, refreshToken } = await this.authService.verifyEmail(code);

      setAuthenticationCookies({ res, accessToken, refreshToken });

      if (req.method === 'GET') {
        return res.redirect(buildWebUrl('/onboarding', { verified: 'true' }));
      }

      const response: IApiResponse<{
        user: typeof user;
        accessToken: string;
        refreshToken: string;
      }> = {
        success: true,
        message: 'Email verified successfully',
        data: { user, accessToken, refreshToken },
      };
      return res.status(HTTPSTATUS.OK).json(response);
    },
  );

  public resendVerification = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      let body;
      try {
        body = resendVerificationSchema.parse(req.body);
      } catch (err: unknown) {
        if (err instanceof z.ZodError || (err as { name?: string })?.name === 'ZodError') {
          const issues = (err as z.ZodError).issues;
          const msg = issues?.[0]?.message || 'Validation failed';
          throw new BadRequestException(msg, ErrorCode.VALIDATION_ERROR);
        }
        throw new BadRequestException('Validation failed', ErrorCode.VALIDATION_ERROR);
      }
      const result = await this.authService.resendVerification(body);
      const response: IApiResponse<typeof result> = {
        success: true,
        message: 'Verification link sent successfully',
        data: result,
      };
      return res.status(HTTPSTATUS.OK).json(response);
    },
  );

  public logout = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
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

  public setupSuperadmin = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    let body;
    try {
      body = setupSuperadminSchema.parse(req.body);
    } catch (err: unknown) {
      if (err instanceof z.ZodError || (err as { name?: string })?.name === 'ZodError') {
        const issues = (err as z.ZodError).issues;
        const msg = issues?.[0]?.message || 'Validation failed';
        throw new BadRequestException(msg, ErrorCode.VALIDATION_ERROR);
      }
      throw new BadRequestException('Validation failed', ErrorCode.VALIDATION_ERROR);
    }
    const { user } = await this.authService.setupSuperadmin(body);
    const response: IApiResponse<typeof user> = {
      success: true,
      message: 'Superadmin setup completed successfully',
      data: user,
    };
    return res.status(HTTPSTATUS.CREATED).json(response);
  });

  public refreshToken = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
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

  public getSetupStatus = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const setupRequired = await this.authService.isSuperadminSetupRequired();
    const response: IApiResponse<{ setupRequired: boolean }> = {
      success: true,
      message: 'Setup status fetched successfully',
      data: { setupRequired },
    };
    return res.status(HTTPSTATUS.OK).json(response);
  });

  public googleSignIn = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
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
