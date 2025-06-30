import { Router } from 'express';
import { authController } from './auth.module';
import { authenticateJWT } from '../../common/strategies/jwt.strategy';

const authRoutes = Router();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/verify-email', authController.verifyEmail);

export default authRoutes;
