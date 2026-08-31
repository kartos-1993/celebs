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
authRoutes.get('/verify-email', authRateLimiter, authController.verifyEmail);
authRoutes.post('/resend-verification', authRateLimiter, authController.resendVerification);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/setup-superadmin', authRateLimiter, authController.setupSuperadmin);
authRoutes.get('/setup-status', authController.getSetupStatus);

export default authRoutes;
