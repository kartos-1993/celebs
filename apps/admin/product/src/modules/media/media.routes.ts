import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.config';

const router = Router();

// Upload policy (keep in sync with render policy)
const UPLOAD_POLICY = {
  minWidth: 1500,
  minHeight: 1500,
  aspectRatio: 1, // 1:1 square
  ratioTolerance: 0.03, // 3%
};

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'celebs/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, crop: 'limit' }],
    resource_type: 'image',
  }) as any,
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// Memory storage for custom Cloudinary upload with eager transforms
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/v1/media/upload
// field name: files (can be multiple)
router.post('/upload', upload.array('files', 12), async (req, res) => {
  try {
    const files = (req.files as any[]) || [];
    const toUrl = (f: any) => f?.path || f?.secure_url || f?.url || '';
    const toPublicId = (f: any) => f?.filename || f?.public_id || f?.publicId || '';
    const payload = files.map((f) => ({
      url: toUrl(f),
      publicId: toPublicId(f),
      bytes: f?.size ?? 0,
      format: f?.mimetype || f?.format || 'image',
      originalname: f?.originalname || '',
    }));
    return res.json({ data: payload });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Upload failed' });
  }
});

// POST /api/v1/media/product-image
// Upload a single product image (for main or color variant) and return derived variants
// field name: image, optional fields: color, kind ("main" | "color")
router.post('/product-image', memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { color, kind = 'color' } = req.body || {};

    // Eager transformations for product and thumbnail variants
    const eager = [
      // Product image (squareish, good quality)
      { width: 1000, height: 1000, crop: 'fill', gravity: 'auto', quality: 'auto:good', fetch_format: 'webp' },
      // Thumbnail (smaller, lower quality)
      { width: 300, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto:eco', fetch_format: 'webp' },
    ];

    // Upload original with a reasonable cap and web delivery defaults
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

    // Upload from buffer via upload_stream
    const result: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      });
      // req.file is guaranteed by earlier guard
      const file = req.file as Express.Multer.File;
      stream.end(file.buffer);
    });

    // Validate original dimensions and aspect ratio
    const w = Number(result.width || 0);
    const h = Number(result.height || 0);
    const ratio = w && h ? w / h : 0;
    const withinAspect = Math.abs(ratio - UPLOAD_POLICY.aspectRatio) <= UPLOAD_POLICY.ratioTolerance;
    const sizeOk = w >= UPLOAD_POLICY.minWidth && h >= UPLOAD_POLICY.minHeight;

    if (!sizeOk || !withinAspect) {
      // Best effort cleanup
      try {
        if (result.public_id) await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' });
      } catch {}
      return res.status(400).json({
        message: 'Image does not meet upload policy',
        policy: {
          minWidth: UPLOAD_POLICY.minWidth,
          minHeight: UPLOAD_POLICY.minHeight,
          aspectRatio: '1:1',
          ratioTolerance: UPLOAD_POLICY.ratioTolerance,
        },
        received: { width: w, height: h, aspect: ratio },
      });
    }

    // Map eager results: by order we defined above
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
