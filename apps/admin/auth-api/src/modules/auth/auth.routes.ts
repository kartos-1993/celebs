import { Router } from 'express';
import { authController } from './auth.module';
import { authenticateJWT } from '../../common/strategies/jwt.strategy';
authenticateJWT;

const authRoutes = Router();

authRoutes.post('/register', authController.register);

export default authRoutes;
