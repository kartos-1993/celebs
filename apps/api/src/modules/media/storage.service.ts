import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import {
  ConfirmUploadInput,
  MAX_MEDIA_FILE_BYTES,
  MediaAsset,
  MediaScope,
  PresignFileInput,
  PresignFileResponse,
} from '@celebs/shared-types';
import { BadRequestException } from '@celebs/shared-utils';

import { mediaRepository } from './media.repository';

import {
  buildPublicObjectUrl,
  ensureDevPublicReadAccess,
  s3Client,
} from '@/common/utils/s3.client';
import { config } from '@/config/app.config';

export const MAX_UPLOAD_BYTES = MAX_MEDIA_FILE_BYTES;
export const PRESIGN_EXPIRES_IN = 15 * 60; // 15 minutes
export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]);

export interface PutImageInput {
  buffer: Buffer;
  originalname: string;
  mimeType: string;
  folder?: string;
  vendorId?: string;
}

export type PutImageResult = MediaAsset;
export type PresignFileResult = PresignFileResponse;

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function buildVendorObjectKey(params: {
  vendorId?: string | null;
  scope?: MediaScope;
  originalname: string;
  folder?: string;
}): string {
  const safeName = sanitizeFileName(params.originalname);
  const scopeFolder = (params.scope || 'PRODUCT').toLowerCase();

  if (params.vendorId) {
    return `vendors/${params.vendorId}/${scopeFolder}/${uuidv4()}-${safeName}`;
  }

  const customFolder = params.folder ? params.folder.replace(/^\/+|\/+$/g, '') : 'platform';
  return `${customFolder}/${scopeFolder}/${uuidv4()}-${safeName}`;
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
    throw new BadRequestException('originalname is required');
  }
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp, avif, pdf');
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new BadRequestException('size must be a positive number');
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException(`Each image must be <= ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  return { originalname, mimeType, size };
}

export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return true;
  // WEBP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  // AVIF: ftyp (bytes 4..7)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return true;
  }
  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return true;
  }
  return false;
}

/**
 * Upload an image buffer to S3/R2 and return key + public URL.
 */
export async function putImage(input: PutImageInput): Promise<PutImageResult> {
  const { originalname } = assertUploadMeta({
    originalname: input.originalname,
    mimeType: input.mimeType,
    size: input.buffer.length || 1,
  });

  if (!validateImageMagicBytes(input.buffer)) {
    throw new BadRequestException('Invalid file magic bytes. Allowed: jpeg, png, webp, avif, pdf');
  }

  const nameWithoutExt = originalname.replace(/\.[^/.]+$/, '');
  const webpOriginalName = `${nameWithoutExt}.webp`;

  const key = buildVendorObjectKey({
    vendorId: input.vendorId,
    originalname: webpOriginalName,
    folder: input.folder,
  });

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

  const publicUrl = buildPublicObjectUrl(key);

  if (input.vendorId) {
    await mediaRepository.createAsset({
      vendorId: input.vendorId,
      originalName: webpOriginalName,
      key,
      url: publicUrl,
      mimeType: 'image/webp',
      sizeBytes: webpBuffer.length,
      scope: 'PRODUCT',
    });
  }

  return {
    key,
    url: publicUrl,
    bytes: webpBuffer.length,
    contentType: 'image/webp',
    originalname: webpOriginalName,
  };
}

/**
 * Create a presigned PUT URL for direct browser → Cloudflare R2 / S3 upload.
 */
export async function createPresignedPut(
  input: PresignFileInput & { vendorId?: string },
): Promise<PresignFileResult> {
  const { originalname, mimeType, size } = assertUploadMeta(input);

  // Quota enforcement for vendors
  if (input.vendorId) {
    const quota = await mediaRepository.getQuota(input.vendorId);
    if (quota.usedBytes + size > quota.maxBytes) {
      throw new BadRequestException(
        `Storage quota exceeded. Used: ${(quota.usedBytes / 1024 / 1024).toFixed(1)}MB / ${(quota.maxBytes / 1024 / 1024 / 1024).toFixed(0)}GB. Please delete unused assets.`,
      );
    }
  }

  const key = buildVendorObjectKey({
    vendorId: input.vendorId,
    scope: (input.scope as MediaScope) || 'PRODUCT',
    originalname,
    folder: input.folder,
  });

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
 * Verify object exists after browser PUT and catalog in MediaAsset table.
 */
export async function confirmUploadedObject(
  input: ConfirmUploadInput & { vendorId?: string; folderId?: string | null; scope?: MediaScope },
): Promise<PutImageResult> {
  const key = (input.key || '').trim();
  if (!key || key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
    throw new BadRequestException('Invalid object key');
  }

  const allowedPrefixes = ['celebs/products', 'celebs/kyc', 'vendors', 'platform'];
  const hasValidPrefix = allowedPrefixes.some((prefix) => key.startsWith(`${prefix}/`));
  if (!hasValidPrefix) {
    throw new BadRequestException('Invalid object key prefix');
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
    throw new BadRequestException(`Uploaded object exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  const publicUrl = buildPublicObjectUrl(key);

  // Catalog asset into PostgreSQL DAM
  await mediaRepository.createAsset({
    vendorId: input.vendorId || null,
    folderId: input.folderId || null,
    originalName: originalname,
    key,
    url: publicUrl,
    mimeType: head.ContentType || mimeType,
    sizeBytes: bytes,
    scope: input.scope || 'PRODUCT',
    isPrivate: input.scope === 'KYC',
  });

  return {
    key,
    url: publicUrl,
    bytes,
    contentType: head.ContentType || mimeType,
    originalname,
  };
}

/**
 * Delete an object permanently from S3/R2 storage.
 */
export async function deleteS3Object(key: string): Promise<void> {
  if (!key) return;
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.S3.BUCKET_NAME,
        Key: key,
      }),
    );
  } catch (error) {
    console.warn(`Failed to delete S3 object: ${key}`, error);
  }
}
