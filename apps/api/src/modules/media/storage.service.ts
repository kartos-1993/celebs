import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { config } from '@/config/app.config';
import {
  buildPublicObjectUrl,
  ensureDevPublicReadAccess,
  s3Client,
} from '@/common/utils/s3.client';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
export const PRESIGN_EXPIRES_IN = 15 * 60; // 15 minutes
export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export interface PutImageInput {
  buffer: Buffer;
  originalname: string;
  mimeType: string;
  /** Object key prefix, default celebs/products */
  folder?: string;
}

export interface PutImageResult {
  key: string;
  url: string;
  bytes: number;
  contentType: string;
  originalname: string;
}

export interface PresignFileInput {
  originalname: string;
  mimeType: string;
  size: number;
  folder?: string;
}

export interface PresignFileResult {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
  originalname: string;
  mimeType: string;
  size: number;
}

export interface ConfirmUploadInput {
  key: string;
  originalname: string;
  mimeType: string;
  size?: number;
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function buildObjectKey(originalname: string, folder = 'celebs/products'): string {
  const safeFolder = folder.replace(/^\/+|\/+$/g, '');
  const safeName = sanitizeFileName(originalname);
  return `${safeFolder}/${uuidv4()}-${safeName}`;
}

export function assertUploadMeta(input: {
  originalname?: string;
  mimeType?: string;
  size?: number;
}): { originalname: string; mimeType: string; size: number } {
  const originalname = (input.originalname || 'image').trim();
  const mimeType = (input.mimeType || '').trim().toLowerCase();
  const size = Number(input.size ?? 0);

  if (!originalname) {
    throw new Error('originalname is required');
  }
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    throw new Error('Invalid file type. Allowed: jpeg, png, webp, avif');
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('size must be a positive number');
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(`Each image must be <= ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  return { originalname, mimeType, size };
}

/**
 * Upload an image buffer to S3/MinIO and return key + public URL.
 * Kept as multipart fallback (Phase 1).
 */
export async function putImage(input: PutImageInput): Promise<PutImageResult> {
  const { originalname } = assertUploadMeta({
    originalname: input.originalname,
    mimeType: input.mimeType,
    size: input.buffer.length || 1,
  });

  // Convert the originalname extension to .webp
  const nameWithoutExt = originalname.replace(/\.[^/.]+$/, '');
  const webpOriginalName = `${nameWithoutExt}.webp`;

  // Build S3 object key with .webp extension
  const key = buildObjectKey(webpOriginalName, input.folder);

  // Synchronously convert input buffer to optimized WebP
  const webpBuffer = await sharp(input.buffer).webp({ quality: 85 }).toBuffer();

  await ensureDevPublicReadAccess();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
    }),
  );

  return {
    key,
    url: buildPublicObjectUrl(key),
    bytes: webpBuffer.length,
    contentType: 'image/webp',
    originalname: webpOriginalName,
  };
}

/**
 * Create a presigned PUT URL for direct browser → MinIO/S3 upload.
 * Browser MUST send the same Content-Type header when uploading.
 */
export async function createPresignedPut(input: PresignFileInput): Promise<PresignFileResult> {
  const { originalname, mimeType, size } = assertUploadMeta(input);
  const key = buildObjectKey(originalname, input.folder);

  await ensureDevPublicReadAccess();

  const command = new PutObjectCommand({
    Bucket: config.S3.BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGN_EXPIRES_IN,
  });

  return {
    key,
    uploadUrl,
    publicUrl: buildPublicObjectUrl(key),
    headers: {
      'Content-Type': mimeType,
    },
    expiresIn: PRESIGN_EXPIRES_IN,
    originalname,
    mimeType,
    size,
  };
}

/**
 * Verify object exists after browser PUT; return catalog metadata.
 */
export async function confirmUploadedObject(input: ConfirmUploadInput): Promise<PutImageResult> {
  const key = (input.key || '').trim();
  if (!key || key.includes('..') || key.startsWith('/')) {
    throw new Error('Invalid object key');
  }
  // Only allow our product media prefix
  if (!key.startsWith('celebs/products/')) {
    throw new Error('Invalid object key prefix');
  }

  const { originalname, mimeType } = assertUploadMeta({
    originalname: input.originalname,
    mimeType: input.mimeType,
    size: input.size && input.size > 0 ? input.size : 1,
  });

  const head = await s3Client.send(
    new HeadObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
    }),
  );

  const bytes = Number(head.ContentLength ?? input.size ?? 0);
  if (bytes > MAX_UPLOAD_BYTES) {
    throw new Error(`Uploaded object exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  return {
    key,
    url: buildPublicObjectUrl(key),
    bytes,
    contentType: head.ContentType || mimeType,
    originalname,
  };
}
