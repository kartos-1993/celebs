import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const vendorService = new VendorService();
const vendorController = new VendorController(vendorService);

const vendorRoutes = Router();

// All onboarding endpoints require active JWT authentication
vendorRoutes.use(authenticateJWT);

vendorRoutes.get('/onboarding-status', asyncHandler(vendorController.getOnboardingStatus));
vendorRoutes.put('/profile', asyncHandler(vendorController.updateProfile));
vendorRoutes.put('/warehouse', asyncHandler(vendorController.updateWarehouse));
vendorRoutes.put('/documents', asyncHandler(vendorController.updateDocuments));
vendorRoutes.put('/business-info', asyncHandler(vendorController.updateBusinessInfo));
vendorRoutes.post('/submit-for-review', asyncHandler(vendorController.submitForReview));
vendorRoutes.post('/resubmit', asyncHandler(vendorController.resubmitForReview));
vendorRoutes.put('/holiday-mode', asyncHandler(vendorController.toggleHolidayMode));

export default vendorRoutes;
