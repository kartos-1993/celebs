import { Router } from 'express';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@celebs/shared-utils';
import { ProductModule } from './product.module';

const productRoutes = Router();
const productController = ProductModule.getInstance().getProductController();

productRoutes.use(authenticateJWT);
productRoutes.post('/', asyncHandler(productController.createProduct));

export default productRoutes;
