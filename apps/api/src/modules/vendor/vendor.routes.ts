import { Router } from 'express';

import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

import multer from 'multer';

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed images: jpeg, png, webp, avif'));
    }
    cb(null, true);
  },
});

const vendorService = new VendorService();
const vendorController = new VendorController(vendorService);

const vendorRoutes = Router();

// All onboarding endpoints require active JWT authentication
vendorRoutes.use(authenticateJWT);

vendorRoutes.get('/onboarding-status', vendorController.getOnboardingStatus);
vendorRoutes.put('/profile', vendorController.updateProfile);
vendorRoutes.put('/warehouse', vendorController.updateWarehouse);
vendorRoutes.put('/documents', vendorController.updateDocuments);
vendorRoutes.put('/business-info', vendorController.updateBusinessInfo);
vendorRoutes.post('/submit-for-review', vendorController.submitForReview);
vendorRoutes.post('/resubmit', vendorController.resubmitForReview);
vendorRoutes.put('/holiday-mode', vendorController.toggleHolidayMode);

// Dedicated onboarding image upload endpoint (allows PENDING, UNDER_REVIEW, REJECTED, APPROVED vendors)
vendorRoutes.post(
  '/onboarding/upload',
  (req, res, next): void => {
    memoryUpload.array('files', 1)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ success: false, message: 'Each image must be <= 5MB' });
            return;
          }
          res.status(400).json({ success: false, message: err.message });
          return;
        }
        res.status(400).json({ success: false, message: err.message || 'File upload failed' });
        return;
      }
      next();
    });
  },
  vendorController.uploadOnboardingImage,
);

export default vendorRoutes;
