import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../config/s3.config';
import { config } from '../../config/app.config';

const router = Router();

// Upload policy (keep in sync with render policy)
const UPLOAD_POLICY = {
  minWidth: 1500,
  minHeight: 1500,
  aspectRatio: 1, // 1:1 square
  ratioTolerance: 0.03, // 3%
};

// Memory storage for S3 uploads
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// Helper function to upload file buffer to S3 / R2
const uploadToS3 = async (
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  folder: string = 'media'
) => {
  const ext = originalname.split('.').pop() || 'webp';
  const key = `${folder}/${uuidv4()}.${ext}`;

  if (!config.S3.BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: 'public, max-age=31536000',
    })
  );

  const baseUrl = config.S3.PUBLIC_BASE_URL
    ? config.S3.PUBLIC_BASE_URL.replace(/\/$/, '')
    : `${config.S3.ENDPOINT.replace(/\/$/, '')}/${config.S3.BUCKET_NAME}`;

  return {
    url: `${baseUrl}/${key}`,
    publicId: key,
  };
};

// POST /api/v1/media/upload
// field name: files (can be multiple)
router.post('/upload', memoryUpload.array('files', 12), async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const payload = await Promise.all(
      files.map(async (file) => {
        const uploadResult = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          'media'
        );
        return {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          bytes: file.size,
          format: file.mimetype.split('/').pop() || 'image',
          originalname: file.originalname,
        };
      })
    );
    return res.json({ data: payload });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Upload failed' });
  }
});

// POST /api/v1/media/product-image
// Upload a single product image (for main or color variant) and return derived variants
// field name: image, optional fields: color, kind ("main" | "color")
router.post('/product-image', memoryUpload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { color, kind = 'color' } = req.body || {};

    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    // Validate original dimensions and aspect ratio
    const w = Number(metadata.width || 0);
    const h = Number(metadata.height || 0);
    const ratio = w && h ? w / h : 0;
    const withinAspect = Math.abs(ratio - UPLOAD_POLICY.aspectRatio) <= UPLOAD_POLICY.ratioTolerance;
    const sizeOk = w >= UPLOAD_POLICY.minWidth && h >= UPLOAD_POLICY.minHeight;

    if (!sizeOk || !withinAspect) {
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

    // Generate product and thumbnail WebP buffers locally
    const originalBuffer = await image
      .resize(2000, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const productBuffer = await image
      .resize(1000, 1000, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbBuffer = await image
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .webp({ quality: 75 })
      .toBuffer();

    const id = uuidv4();
    const folder = 'products';

    const originalRes = await uploadToS3(originalBuffer, `${id}-original.webp`, 'image/webp', folder);
    const productRes = await uploadToS3(productBuffer, `${id}-product.webp`, 'image/webp', folder);
    const thumbRes = await uploadToS3(thumbBuffer, `${id}-thumb.webp`, 'image/webp', folder);

    const originalMetadata = await sharp(originalBuffer).metadata();

    const payload = {
      kind,
      color: color || null,
      original: {
        url: originalRes.url,
        publicId: originalRes.publicId,
        width: originalMetadata.width,
        height: originalMetadata.height,
        bytes: originalBuffer.length,
        format: 'webp',
      },
      product: {
        url: productRes.url,
        width: 1000,
        height: 1000,
      },
      thumbnail: {
        url: thumbRes.url,
        width: 300,
        height: 300,
      },
    };

    return res.json({ data: payload });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Upload failed' });
  }
});

export default router;
