import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const authService = new AuthService();
const authController = new AuthController(authService);
console.log(authController, '1111111111111111111111111111111');

export { authService, authController };
