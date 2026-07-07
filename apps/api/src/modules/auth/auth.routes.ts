import { Router } from 'express';
import { authController } from './auth.module';
import { authenticateJWT } from '../../common/strategies/jwt.strategy';

const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/vendor/register', authController.vendorRegister);
authRoutes.post('/login', authController.login);
authRoutes.post('/verify-email', authController.verifyEmail);
authRoutes.post('/logout', authenticateJWT, authController.logout);
authRoutes.post('/setup-superadmin', authController.setupSuperadmin);

export default authRoutes;
