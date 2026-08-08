import { Router } from 'express';
import multer from 'multer';
import cloudinary from '@/config/cloudinary.config';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';
import { asyncHandler, logger } from '@celebs/shared-utils';
import { putImage } from './storage.service';
import { assetQueue } from '@/common/services/queue.service';
import { uploadRateLimiter } from '@/middlewares/rate-limiter.middleware';

const router = Router();
router.use(uploadRateLimiter);

// Upload policy (keep in sync with render policy)
const UPLOAD_POLICY = {
  maxWidth: 2000,
  maxHeight: 2000,
};

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

// Memory storage for S3/MinIO PutObject uploads (and legacy Cloudinary stream)
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

// All media routes require auth + product create permission
router.use(authenticateJWT);
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

    const userId = req.user?.userId || 'unknown';
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

// POST /api/v1/media/product-image
// Legacy Cloudinary path (eager variants). Admin UI does not call this yet.
// field name: image, optional fields: color, kind ("main" | "color")
router.post('/product-image', memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { color, kind = 'color' } = req.body || {};

    const eager = [
      {
        width: 1000,
        height: 1000,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:good',
        fetch_format: 'webp',
      },
      {
        width: 300,
        height: 300,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:eco',
        fetch_format: 'webp',
      },
    ];

    const uploadOptions: any = {
      folder: 'celebs/products',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      transformation: [{ width: 2000, crop: 'limit', quality: 'auto', fetch_format: 'webp' }],
      eager,
      eager_async: false,
    };

    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      });
      const file = req.file as Express.Multer.File;
      stream.end(file.buffer);
    });

    const w = Number(result.width || 0);
    const h = Number(result.height || 0);
    const sizeOk = w <= UPLOAD_POLICY.maxWidth && h <= UPLOAD_POLICY.maxHeight;

    if (!sizeOk) {
      try {
        if (result.public_id) {
          await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' });
        }
      } catch {
        /* best effort */
      }
      return res.status(400).json({
        message: `Image dimensions must not exceed ${UPLOAD_POLICY.maxWidth}x${UPLOAD_POLICY.maxHeight}px`,
        policy: UPLOAD_POLICY,
        received: { width: w, height: h },
      });
    }

    const [productVar, thumbVar] = (result.eager as any[]) || [];

    const payload = {
      kind,
      color: color || null,
      original: {
        url: result.secure_url || result.url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      },
      product: productVar
        ? {
            url: productVar.secure_url || productVar.url,
            width: productVar.width,
            height: productVar.height,
          }
        : null,
      thumbnail: thumbVar
        ? {
            url: thumbVar.secure_url || thumbVar.url,
            width: thumbVar.width,
            height: thumbVar.height,
          }
        : null,
    };

    return res.json({ data: payload });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Upload failed' });
  }
});

export default router;
