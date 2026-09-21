import { Request, Response } from 'express';

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  setupSuperadminSchema,
  vendorRegisterSchema,
} from '@celebs/shared-types';
import { asyncHandler, BadRequestException, ErrorCode } from '@celebs/shared-utils';

import { toAuthResponseDto } from './auth.presenter';
import { AuthService } from './auth.service';

import { clearAuthenticationCookies, setAuthenticationCookies } from '@/common/utils/cookie';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';
import { buildWebUrl } from '@/common/utils/url';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }
  public register = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const body = registerSchema.parse(req.body);
    const { user } = await this.authService.register(body);
    return sendCreated(res, user, 'User registered successfully');
  });

  public vendorRegister = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const body = vendorRegisterSchema.parse(req.body);
    const { user } = await this.authService.vendorRegister(body);
    return sendCreated(res, user, 'Vendor registered successfully. Approval is pending.');
  });

  public login = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userAgent = req.headers['user-agent'];
    const surface = (req.headers['x-surface'] || req.body?.surface) as string | undefined;
    const body = loginSchema.parse({
      ...req.body,
      userAgent,
    });
    const { user, accessToken, refreshToken } = await this.authService.login(body, surface);
    setAuthenticationCookies({ res, accessToken, refreshToken });
    return sendSuccess(
      res,
      toAuthResponseDto(req, user, { accessToken, refreshToken }),
      'User logged in successfully',
    );
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

      return sendSuccess(
        res,
        toAuthResponseDto(req, user, { accessToken, refreshToken }),
        'Email verified successfully',
      );
    },
  );

  public resendVerification = asyncHandler(
    async (req: Request, res: Response): Promise<Response> => {
      const body = resendVerificationSchema.parse(req.body);
      const result = await this.authService.resendVerification(body);
      return sendSuccess(res, result, 'Verification link sent successfully');
    },
  );

  public logout = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    clearAuthenticationCookies(res);
    return sendSuccess(res, null, 'Logged out successfully');
  });

  public setupSuperadmin = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const body = setupSuperadminSchema.parse(req.body);
    const { user } = await this.authService.setupSuperadmin(body);
    return sendCreated(res, user, 'Superadmin setup completed successfully');
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

    return sendSuccess(
      res,
      toAuthResponseDto(req, user, { accessToken, refreshToken: newRefreshToken }),
      'Token refreshed successfully',
    );
  });

  public getSetupStatus = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const setupRequired = await this.authService.isSuperadminSetupRequired();
    return sendSuccess(res, { setupRequired }, 'Setup status fetched successfully');
  });

  public googleSignIn = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userAgent = req.headers['user-agent'];
    const { idToken } = req.body;
    const { user, accessToken, refreshToken } = await this.authService.googleSignIn({
      idToken,
      userAgent,
    });
    setAuthenticationCookies({ res, accessToken, refreshToken });
    return sendSuccess(
      res,
      toAuthResponseDto(req, user, { accessToken, refreshToken }),
      'Google sign in successful',
    );
  });

  public forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const body = forgotPasswordSchema.parse(req.body);
    await this.authService.forgotPassword(body.email);
    return sendSuccess(
      res,
      null,
      'If an account exists with that email, a password reset link has been sent.',
    );
  });

  public resetPassword = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const body = resetPasswordSchema.parse(req.body);
    await this.authService.resetPassword(body);
    clearAuthenticationCookies(res);
    return sendSuccess(
      res,
      null,
      'Password reset successfully. Please log in with your new credentials.',
    );
  });

  public changePassword = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = req.user?.id;
    const sessionId = req.user?.sessionId || '';
    if (!userId) {
      throw new BadRequestException('User not authenticated', ErrorCode.AUTH_UNAUTHORIZED_ACCESS);
    }
    const body = changePasswordSchema.parse(req.body);
    await this.authService.changePassword(userId, sessionId, body);
    clearAuthenticationCookies(res);
    return sendSuccess(res, null, 'Password changed successfully.');
  });
}
