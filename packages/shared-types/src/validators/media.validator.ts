import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const MAX_MEDIA_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export const presignFileSchema = z.object({
  originalname: z.string().trim().min(1, 'originalname is required').max(120),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({ message: 'Invalid file type. Allowed: jpeg, png, webp, avif' }),
  }),
  size: z
    .number()
    .int()
    .positive('size must be a positive integer')
    .max(MAX_MEDIA_FILE_BYTES, 'Each image must be <= 5MB'),
  folder: z.string().trim().optional().default('celebs/products'),
});

export const batchPresignSchema = z.object({
  files: z
    .array(presignFileSchema)
    .min(1, 'At least one file is required')
    .max(12, 'Maximum 12 files at once'),
});

export const confirmUploadSchema = z.object({
  key: z.string().trim().min(1, 'key is required'),
  originalname: z.string().trim().min(1, 'originalname is required'),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({ message: 'Invalid file type. Allowed: jpeg, png, webp, avif' }),
  }),
  size: z.number().int().positive().optional(),
});
