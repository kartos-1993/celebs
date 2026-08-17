import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  BatchPresignInput,
  batchPresignSchema,
  ConfirmUploadInput,
  confirmUploadSchema,
  PresignFileInput,
  presignFileSchema,
} from '@celebs/shared-types';
import { asyncHandler, logger } from '@celebs/shared-utils';

import {
  confirmUploadedObject,
  createPresignedPut,
} from './storage.service';

import { assetQueue } from '@/common/services/queue.service';
import { authenticateJWT, requireApprovedVendor } from '@/middlewares/auth.middleware';
import { uploadRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { validateBody } from '@/middlewares/validate';

const router = Router();
router.use(uploadRateLimiter);

// All media routes require auth + approved vendor + product create permission
router.use(authenticateJWT);
router.use(requireApprovedVendor);
router.use(requirePermissions(Permission.PRODUCT_CREATE));

/**
 * POST /api/v1/media/presign
 * Generates a single presigned PUT URL for direct browser → Cloudflare R2 / S3 upload.
 */
router.post(
  '/presign',
  validateBody(presignFileSchema),
  asyncHandler(async (req, res) => {
    const result = await createPresignedPut(req.body as PresignFileInput);
    return res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/v1/media/batch-presign
 * Generates multiple presigned PUT URLs for batch image uploads.
 */
router.post(
  '/batch-presign',
  validateBody(batchPresignSchema),
  asyncHandler(async (req, res) => {
    const { files } = req.body as BatchPresignInput;
    const results = await Promise.all(
      files.map((file: PresignFileInput) => createPresignedPut(file)),
    );
    return res.json({ success: true, data: results });
  }),
);

/**
 * POST /api/v1/media/confirm
 * Confirms uploaded object on Cloudflare R2 / S3 and enqueues async BullMQ optimization.
 */
router.post(
  '/confirm',
  validateBody(confirmUploadSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ConfirmUploadInput;
    const result = await confirmUploadedObject(body);

    // Enqueue BullMQ optimization job asynchronously
    assetQueue
      .add('optimize', {
        key: result.key,
        originalname: result.originalname,
        mimeType: req.body.mimeType,
      })
      .catch((err) => {
        logger.warn({ error: err.message, key: result.key }, 'Failed to enqueue asset optimization job');
      });

    return res.json({ success: true, data: result });
  }),
);

export default router;
