import { Router } from 'express';

import { AuthController } from './auth.controller';
import { authService } from './auth.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const authController = new AuthController(authService);
import { authRateLimiter } from '@/middlewares/rate-limiter.middleware';

const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/vendor/register', authRateLimiter, authController.vendorRegister);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.post('/google', authRateLimiter, authController.googleSignIn);
authRoutes.post('/refresh', authRateLimiter, authController.refreshToken);
authRoutes.post('/verify-email', authRateLimiter, authController.verifyEmail);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', authRateLimiter, authController.resendVerification);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/setup-superadmin', authRateLimiter, authController.setupSuperadmin);
// Public read-only boolean — must not consume the credential-attempt budget.
authRoutes.get('/setup-status', authController.getSetupStatus);
authRoutes.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', authRateLimiter, authController.resetPassword);
authRoutes.post(
  '/change-password',
  authenticateJWT,
  authRateLimiter,
  authController.changePassword,
);

export default authRoutes;
