import { Router } from 'express';
import { asyncHandler } from '@celebs/shared-utils';
import { MobileModule } from './mobile.module';

const mobileRoutes = Router();
const mobileController = MobileModule.getInstance().getMobileController();

mobileRoutes.get('/home', asyncHandler(mobileController.getHomeFeed));
mobileRoutes.get('/products', asyncHandler(mobileController.getProducts));

export default mobileRoutes;
