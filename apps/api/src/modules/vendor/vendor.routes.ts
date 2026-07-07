import { Router } from 'express';
import { vendorController } from './vendor.module';
import { authenticateJWT } from '../../common/strategies/jwt.strategy';

const vendorRoutes = Router();

// All onboarding endpoints require active JWT authentication
vendorRoutes.use(authenticateJWT);

vendorRoutes.get('/onboarding-status', vendorController.getOnboardingStatus);
vendorRoutes.put('/profile', vendorController.updateProfile);
vendorRoutes.put('/warehouse', vendorController.updateWarehouse);
vendorRoutes.put('/documents', vendorController.updateDocuments);
vendorRoutes.put('/business-info', vendorController.updateBusinessInfo);
vendorRoutes.post('/submit-for-review', vendorController.submitForReview);
vendorRoutes.put('/holiday-mode', vendorController.toggleHolidayMode);

export default vendorRoutes;
