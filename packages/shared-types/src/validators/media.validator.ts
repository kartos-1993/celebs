import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const;

export const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export const mediaScopeSchema = z.enum(['PRODUCT', 'BRANDING', 'KYC', 'MARKETING']);

export const presignFileSchema = z.object({
  originalname: z.string().trim().min(1, 'originalname is required').max(120),
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({ message: 'Invalid file type. Allowed: jpeg, png, webp, avif, pdf' }),
  }),
  size: z
    .number()
    .int()
    .positive('size must be a positive integer')
    .max(MAX_MEDIA_FILE_BYTES, 'Each image must be <= 10MB'),
  scope: mediaScopeSchema.optional().default('PRODUCT'),
  folderId: z.string().uuid().optional().nullable(),
  folder: z.string().trim().optional(),
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
    errorMap: () => ({ message: 'Invalid file type. Allowed: jpeg, png, webp, avif, pdf' }),
  }),
  size: z.number().int().positive().optional(),
  folderId: z.string().uuid().optional().nullable(),
  scope: mediaScopeSchema.optional().default('PRODUCT'),
});

export const createMediaFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(80),
  parentId: z.string().uuid('Invalid Parent Folder ID').optional().nullable(),
});

export const updateMediaFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(80),
});

export const mediaAssetFilterSchema = z.object({
  search: z.string().optional(),
  folderId: z.string().optional(),
  scope: mediaScopeSchema.optional(),
  mimeType: z.string().optional(),
  unusedOnly: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('24')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 24))),
});

export const deleteUnusedMediaSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1, 'At least one asset ID must be provided'),
});

export type MediaScopeType = z.infer<typeof mediaScopeSchema>;
export type CreateMediaFolderType = z.infer<typeof createMediaFolderSchema>;
export type UpdateMediaFolderType = z.infer<typeof updateMediaFolderSchema>;
export type MediaAssetFilterType = z.infer<typeof mediaAssetFilterSchema>;
export type DeleteUnusedMediaType = z.infer<typeof deleteUnusedMediaSchema>;
