import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.config';

const router = Router();

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

export default router;
