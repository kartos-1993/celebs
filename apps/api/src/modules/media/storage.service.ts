import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import {
  ConfirmUploadInput,
  MAX_MEDIA_FILE_BYTES,
  MediaAsset,
  MediaScope,
  PresignFileInput,
  PresignFileResponse,
  SCOPE_MAX_BYTES,
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
// WONTFIX: no server-side pixel-dimension allowlist and no per-domain MIME
// allowlist. Both are a product/infra decision (which categories may carry
// SVG/HEIC, and the minimum storefront render size). Until that lands, clients
// send min/max dimensions for UI feedback only and confirm-time trust stays on
// magic bytes + byte size. Do not add one here ad hoc.
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

/**
 * Immutable content addressing: the object key embeds a SHA-256 fingerprint
 * of the bytes, so identical uploads always resolve to the same key and URL.
 * Re-uploads are idempotent no-ops — no version stamps, no propagation sweeps.
 */
export const CONTENT_HASH_LENGTH = 24; // hex chars (96-bit) — plenty for media dedup

export function contentHashKey(tempKey: string, hash: string, originalname: string): string {
  const prefix = tempKey.includes('/') ? tempKey.slice(0, tempKey.lastIndexOf('/')) : 'platform';
  const safeName = sanitizeFileName(originalname);
  return `${prefix}/${hash}-${safeName}`;
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Best-effort object removal: every rejection path that refuses a confirmation
 * purges the uploaded bytes so a rejected upload never lingers in R2 (the
 * age-cutoff orphan reaper is only the backstop).
 */
async function deleteQuietly(key: string): Promise<void> {
  await s3Client
    .send(new DeleteObjectCommand({ Bucket: config.S3.BUCKET_NAME, Key: key }))
    .catch(() => null);
}

const ALLOWED_KEY_PREFIXES = [
  'celebs/products',
  'celebs/kyc',
  'vendors',
  'platform',
  'reviews',
] as const;

/**
 * Single source of truth for which object keys the upload pipeline accepts.
 * Enforced at presign time (fail fast before any bytes leave the browser)
 * and again at confirm time (defense in depth against direct confirm calls).
 */
export function validateObjectKey(rawKey: string): string {
  const key = (rawKey || '').trim();
  if (!key || key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
    throw new BadRequestException('Invalid object key');
  }

  const hasValidPrefix = ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(`${prefix}/`));
  if (!hasValidPrefix) {
    throw new BadRequestException(
      `Invalid object key prefix. Allowed prefixes: ${ALLOWED_KEY_PREFIXES.join(', ')}`,
    );
  }

  return key;
}

export function assertUploadMeta(input: {
  originalname?: string;
  mimeType?: string;
  size?: number;
  scope?: MediaScope;
}): { originalname: string; mimeType: string; size: number } {
  const originalname = (input.originalname || 'image').trim();
  const mimeType = (input.mimeType || '').trim().toLowerCase();
  const size = Number(input.size ?? 0);
  const scope = (input.scope as MediaScope) || 'PRODUCT';

  if (!originalname) {
    throw new BadRequestException('originalname is required');
  }
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp, avif, pdf');
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new BadRequestException('size must be a positive number');
  }
  const scopeLimit = SCOPE_MAX_BYTES[scope] ?? MAX_UPLOAD_BYTES;
  if (size > scopeLimit) {
    throw new BadRequestException(`${scope} files must be <= ${scopeLimit / (1024 * 1024)}MB`);
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException(`Each image must be <= ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  return { originalname, mimeType, size };
}

export function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return 'image/png';
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
    return 'image/webp';
  }
  // AVIF: ftyp (bytes 4..7)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return 'image/avif';
  }
  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  return null;
}

export function validateImageMagicBytes(buffer: Buffer): boolean {
  return detectMimeFromMagicBytes(buffer) !== null;
}

/**
 * Confirm-time size check. The declared size is client metadata and therefore
 * untrusted, so it must be present (a missing size used to be defaulted to 1,
 * which let a client declare one byte and slip past every size limit) and it
 * must equal the byte count R2 actually stored. A mismatch means the object is
 * not what was declared, so the object is purged (same orphan-safety as the
 * magic-byte rejection) and the confirmation is refused.
 */
async function assertDeclaredSizeMatchesObject(
  key: string,
  declaredSize: number,
  actualBytes: number,
): Promise<void> {
  if (actualBytes === declaredSize) return;
  await deleteQuietly(key);
  throw new BadRequestException(
    `File size mismatch: uploaded ${actualBytes} bytes but declared ${declaredSize}`,
  );
}

/**
 * Upload an image buffer to S3/R2 and return key + public URL.
 *
 * @deprecated DEAD CODE — the upload pipeline is presign → browser PUT →
 *   `confirmUploadedObject` (bytes are encoded to WebP in the browser). Nothing
 *   calls `putImage` anymore, so the `sharp` re-encode path is orphaned. Left
 *   untouched on purpose: reviving it would drag `sharp` into the request
 *   path. Delete it (and the `sharp` import) once no consumer is left.
 */
export async function putImage(input: PutImageInput): Promise<PutImageResult> {
  const { originalname } = assertUploadMeta({
    originalname: input.originalname,
    mimeType: input.mimeType,
    size: input.buffer.length || 1,
    scope: 'PRODUCT',
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
  const { originalname, mimeType, size } = assertUploadMeta({
    ...input,
    scope: (input.scope as MediaScope) || 'PRODUCT',
  });

  // Quota enforcement for vendors
  if (input.vendorId) {
    const quota = await mediaRepository.getQuota(input.vendorId);
    if (quota.usedBytes + size > quota.maxBytes) {
      throw new BadRequestException(
        `Storage quota exceeded. Used: ${(quota.usedBytes / 1024 / 1024).toFixed(1)}MB / ${(quota.maxBytes / 1024 / 1024 / 1024).toFixed(0)}GB. Please delete unused assets.`,
      );
    }
  }

  const key = input.key
    ? validateObjectKey(input.key)
    : buildVendorObjectKey({
        vendorId: input.vendorId,
        scope: (input.scope as MediaScope) || 'PRODUCT',
        originalname,
        folder: input.folder,
      });

  // Fail fast: reject disallowed prefixes/traversal BEFORE the browser
  // uploads bytes, so bad requests never produce orphaned R2 objects.
  validateObjectKey(key);

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
 * Create a presigned PUT URL for customer review photo upload.
 */
export async function createReviewPresignedPut(params: {
  userId: string;
  originalname: string;
  mimeType: string;
  size: number;
}): Promise<PresignFileResult> {
  const { originalname, mimeType, size } = assertUploadMeta({
    originalname: params.originalname,
    mimeType: params.mimeType,
    size: params.size,
    scope: 'PRODUCT',
  });

  const safeName = sanitizeFileName(originalname);
  const key = `reviews/${params.userId}/${uuidv4()}-${safeName}`;
  validateObjectKey(key);

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
  // Defense in depth: clients could bypass presign and confirm arbitrary keys.
  const key = validateObjectKey(input.key);

  // `size` is mandatory here (no default): a missing or non-positive declared
  // size is rejected outright rather than defaulted, because every size limit
  // below would otherwise be computed from a value the client invented.
  const {
    originalname,
    mimeType,
    size: declaredSize,
  } = assertUploadMeta({
    originalname: input.originalname,
    mimeType: input.mimeType,
    size: input.size,
    scope: input.scope || 'PRODUCT',
  });

  if (input.folderId) {
    const folder = await mediaRepository.findFolderById(input.folderId, input.vendorId ?? null);
    if (!folder) {
      throw new BadRequestException('Target folder not found or does not belong to this store');
    }
  }

  const head = await s3Client.send(
    new HeadObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
    }),
  );

  const bytes = Number(head.ContentLength ?? declaredSize);
  await assertDeclaredSizeMatchesObject(key, declaredSize, bytes);
  const effectiveScope = (input.scope as MediaScope) || 'PRODUCT';
  const scopeLimit = SCOPE_MAX_BYTES[effectiveScope] ?? MAX_UPLOAD_BYTES;
  if (bytes > scopeLimit) {
    throw new BadRequestException(
      `${effectiveScope} files must be <= ${scopeLimit / (1024 * 1024)}MB`,
    );
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    throw new BadRequestException(`Uploaded object exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }

  // Authoritative content hash — the bytes in R2 are the source of truth,
  // never client-declared metadata.
  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
    }),
  );
  const contentBytes = await streamToBuffer(object.Body);

  const detectedMime = detectMimeFromMagicBytes(contentBytes);
  if (!detectedMime) {
    await deleteQuietly(key);
    throw new BadRequestException(
      'File failed binary magic byte inspection: unrecognized or forbidden file format',
    );
  }

  if (detectedMime !== mimeType) {
    await deleteQuietly(key);
    throw new BadRequestException(
      `File MIME mismatch: detected ${detectedMime} but declared ${mimeType}`,
    );
  }

  const hash = createHash('sha256')
    .update(contentBytes)
    .digest('hex')
    .slice(0, CONTENT_HASH_LENGTH);
  const finalKey = contentHashKey(key, hash, originalname);

  if (finalKey !== key) {
    // Idempotent re-confirm: identical bytes already catalogued under the hash key.
    const existing = await mediaRepository.findAssetByKey(finalKey);
    if (existing) {
      // Temp upload key is unreferenced — best-effort removal (age-cutoff
      // reaper is the backstop).
      await deleteQuietly(key);
      return {
        key: existing.key,
        url: existing.url,
        bytes: existing.sizeBytes,
        contentType: existing.mimeType,
        originalname: existing.originalName,
      };
    }
    // Promote temp upload to its immutable address with long-lived cache headers.
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: config.S3.BUCKET_NAME,
        Key: finalKey,
        CopySource: `${config.S3.BUCKET_NAME}/${key}`,
        ContentType: head.ContentType || mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
        MetadataDirective: 'REPLACE',
      }),
    );
    await deleteQuietly(key);
  }

  // Immutable public URL — no version stamp, ever. Same bytes = same URL.
  const publicUrl = buildPublicObjectUrl(finalKey);

  // Catalog asset into PostgreSQL DAM (upsert by key is idempotent: same key
  // implies same bytes, so the update branch can only rewrite identical values).
  await mediaRepository.createAsset({
    vendorId: input.vendorId || null,
    folderId: input.folderId || null,
    originalName: originalname,
    key: finalKey,
    url: publicUrl,
    mimeType: head.ContentType || mimeType,
    sizeBytes: bytes,
    hashSha256: hash,
    scope: input.scope || 'PRODUCT',
    isPrivate: input.scope === 'KYC',
  });

  return {
    key: finalKey,
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

/**
 * Retrieve an object stream from S3/R2 storage for CORS proxying.
 */
export async function getS3ObjectStream(key: string) {
  validateObjectKey(key);
  const command = new GetObjectCommand({
    Bucket: config.S3.BUCKET_NAME,
    Key: key,
  });
  const response = await s3Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType || 'image/webp',
    contentLength: response.ContentLength,
  };
}
