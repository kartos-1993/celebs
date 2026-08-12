import { Router } from 'express';
import multer from 'multer';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { putImage } from './storage.service';

import { authenticateJWT, requireApprovedVendor } from '@/middlewares/auth.middleware';
import { uploadRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();
router.use(uploadRateLimiter);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

// Memory storage for S3/MinIO PutObject uploads
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: jpeg, png, webp, avif'));
    }
    cb(null, true);
  },
});

// All media routes require auth + approved vendor + product create permission
router.use(authenticateJWT);
router.use(requireApprovedVendor);
router.use(requirePermissions(Permission.PRODUCT_CREATE));

// POST /api/v1/media/upload
// field name: files (can be multiple) → MinIO/S3 via AWS SDK v3
router.post(
  '/upload',
  memoryUpload.array('files', 12),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const _userId = req.user?.userId || 'unknown';
    const payload = [];

    for (const file of files) {
      const stored = await putImage({
        buffer: file.buffer,
        originalname: file.originalname || 'image',
        mimeType: file.mimetype,
        folder: 'celebs/products',
      });

      payload.push({
        url: stored.url,
        publicId: stored.key,
        bytes: stored.bytes,
        format: file.mimetype || 'image',
        originalname: stored.originalname,
      });
    }

    return res.json({ data: payload });
  }),
);

export default router;
