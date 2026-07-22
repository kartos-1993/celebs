import { Router } from 'express';
import { authController } from './auth.module';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { authRateLimiter } from '@/middlewares/rate-limiter.middleware';

const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, authController.register);
authRoutes.post('/vendor/register', authRateLimiter, authController.vendorRegister);
authRoutes.post('/login', authRateLimiter, authController.login);
authRoutes.post('/verify-email', authRateLimiter, authController.verifyEmail);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/setup-superadmin', authRateLimiter, authController.setupSuperadmin);
authRoutes.get('/setup-status', authController.getSetupStatus);

export default authRoutes;
