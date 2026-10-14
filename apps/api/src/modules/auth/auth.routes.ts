import { Router } from 'express';

import { AuthController } from './auth.controller';
import { authService } from './auth.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const authController = new AuthController(authService);
import { credentialRateLimiter, sessionRateLimiter } from '@/middlewares/rate-limiter.middleware';

const authRoutes = Router();

authRoutes.post('/register', credentialRateLimiter, authController.register);
authRoutes.post('/vendor/register', credentialRateLimiter, authController.vendorRegister);
authRoutes.post('/login', credentialRateLimiter, authController.login);
authRoutes.post('/google', credentialRateLimiter, authController.googleSignIn);
authRoutes.post('/refresh', sessionRateLimiter, authController.refreshToken);
authRoutes.post('/verify-email', sessionRateLimiter, authController.verifyEmail);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', sessionRateLimiter, authController.resendVerification);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/setup-superadmin', credentialRateLimiter, authController.setupSuperadmin);
// Public read-only boolean — must not consume the credential-attempt budget.
authRoutes.get('/setup-status', authController.getSetupStatus);
authRoutes.post('/forgot-password', credentialRateLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', credentialRateLimiter, authController.resetPassword);
authRoutes.post(
  '/change-password',
  authenticateJWT,
  credentialRateLimiter,
  authController.changePassword,
);

export default authRoutes;
