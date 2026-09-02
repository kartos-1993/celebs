import {
  ConfirmUploadInput,
  MediaAsset,
  PresignFileInput,
  PresignFileResponse,
} from '@celebs/shared-types';

import { axiosClient } from './axios/axios-client';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiErrorBody {
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

/**
 * Pulls a human-readable message out of an axios/API error:
 * prefers the server's field validation message, then its message,
 * then the JS error, then the caller's fallback.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as
    | { response?: { data?: ApiErrorBody }; data?: ApiErrorBody }
    | undefined;
  const body = candidate?.response?.data ?? candidate?.data;

  if (Array.isArray(body?.errors)) {
    const parts = body.errors
      .map((entry) => entry?.message)
      .filter((msg): msg is string => Boolean(msg));
    if (parts.length > 0) return parts.join('. ');
  }
  if (body?.message && body.message !== 'Validation failed') return body.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Encodes an image File to WebP in the browser (Daraz/Shein-style).
 * PDF files are preserved; failures fall back to the original file.
 */
export async function encodeToWebP(
  file: File,
): Promise<{ file: File; mimeType: string; originalName: string }> {
  if (file.type === 'application/pdf') {
    return { file, mimeType: file.type, originalName: file.name };
  }
  if (!file.type.startsWith('image/')) {
    return { file, mimeType: (file.type || 'image/jpeg') as string, originalName: file.name };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const webpBlob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    );
    if (!webpBlob) throw new Error('canvas.toBlob returned null');
    const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
    const webpFile = new File([webpBlob], webpName, { type: 'image/webp' });
    return { file: webpFile, mimeType: 'image/webp', originalName: webpName };
  } catch {
    return { file, mimeType: (file.type || 'image/jpeg') as string, originalName: file.name };
  }
}

/**
 * Uploads a single file directly to Cloudflare R2 via a presigned PUT URL,
 * then confirms the upload with the backend to enqueue optimization.
 * Images are browser-encoded to WebP before presign (zero API impact).
 */
export async function directUploadFile(
  file: File,
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
  existingKey?: string,
): Promise<string> {
  const encoded = await encodeToWebP(file);
  const uploadFile = encoded.file;
  const mimeType = encoded.mimeType as PresignFileInput['mimeType'];
  const originalName = encoded.originalName;

  // 1. Get presigned PUT URL (scope-aware, WebP-encoded)
  let presignData: PresignFileResponse | undefined;
  try {
    const presignRes = await axiosClient.post<ApiResponse<PresignFileResponse>>('/media/presign', {
      key: existingKey,
      originalname: originalName,
      mimeType,
      size: uploadFile.size,
      folder,
      scope,
    });
    presignData = presignRes.data?.data;
  } catch (error) {
    throw new Error(
      `"${file.name}" was rejected — ${extractApiErrorMessage(error, 'could not be queued for upload')}`,
    );
  }

  if (!presignData?.uploadUrl) {
    throw new Error(`"${file.name}" could not be queued for upload`);
  }

  // 2. Direct binary upload to Cloudflare R2
  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    body: uploadFile,
    headers: {
      'Content-Type': mimeType,
    },
  });

  if (!putRes.ok) {
    throw new Error(`"${file.name}" failed to transfer (status ${putRes.status})`);
  }

  // 3. Confirm upload with backend
  const confirmPayload: ConfirmUploadInput = {
    key: presignData.key,
    originalname: originalName,
    mimeType,
    size: uploadFile.size,
    scope,
  };

  try {
    const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>(
      '/media/confirm',
      confirmPayload,
    );
    return confirmRes.data?.data?.url || presignData.publicUrl;
  } catch (error) {
    throw new Error(
      `"${file.name}" uploaded but registration failed — ${extractApiErrorMessage(error, 'try again')}`,
    );
  }
}

/**
 * Backend caps batch presign requests at 12 files — stay under it and
 * process chunks sequentially to keep server load predictable.
 */
const PRESIGN_BATCH_SIZE = 10;

/**
 * Uploads any number of files directly to Cloudflare R2 via presigned PUT
 * URLs, transparently splitting into <=10-file batches.
 * Result order matches the input order.
 */
export async function directUploadBatch(
  files: File[],
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
): Promise<string[]> {
  if (!files.length) return [];

  const allUrls: string[] = [];
  for (let start = 0; start < files.length; start += PRESIGN_BATCH_SIZE) {
    const chunk = files.slice(start, start + PRESIGN_BATCH_SIZE);
    const urls = await directUploadChunk(chunk, folder, scope);
    allUrls.push(...urls);
  }
  return allUrls;
}

/**
 * Uploads a single (<=12 file) batch in parallel via one presign request.
 */
async function directUploadChunk(
  files: File[],
  folder: string,
  scope: ConfirmUploadInput['scope'],
): Promise<string[]> {
  // Browser-encode all images to WebP before presign (parallel)
  const encodedFiles = await Promise.all(files.map((f) => encodeToWebP(f)));

  const presignPayload = {
    files: encodedFiles.map(({ file, mimeType, originalName }) => ({
      originalname: originalName,
      mimeType: mimeType as PresignFileInput['mimeType'],
      size: file.size,
      folder,
      scope,
    })),
  };

  // 1. Request batch presigned URLs
  let presignItems: PresignFileResponse[];
  try {
    const batchRes = await axiosClient.post<ApiResponse<PresignFileResponse[]>>(
      '/media/batch-presign',
      presignPayload,
    );
    presignItems = batchRes.data?.data || [];
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'The server rejected this upload batch'));
  }

  // 2. Parallel upload and confirmation (using WebP-encoded files)
  const uploadPromises = encodedFiles.map(
    async ({ file: encFile, mimeType, originalName }, idx) => {
      const item = presignItems[idx];
      const origName = files[idx]?.name ?? originalName;
      if (!item) throw new Error(`"${origName}" was not accepted for upload`);

      const putRes = await fetch(item.uploadUrl, {
        method: 'PUT',
        body: encFile,
        headers: {
          'Content-Type': mimeType,
        },
      });

      if (!putRes.ok) {
        throw new Error(`"${origName}" failed to transfer (status ${putRes.status})`);
      }

      try {
        const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>('/media/confirm', {
          key: item.key,
          originalname: originalName,
          mimeType: mimeType as PresignFileInput['mimeType'],
          size: encFile.size,
          scope,
        });
        return confirmRes.data?.data?.url || item.publicUrl;
      } catch (error) {
        throw new Error(
          `"${origName}" uploaded but registration failed — ${extractApiErrorMessage(error, 'try again')}`,
        );
      }
    },
  );

  return Promise.all(uploadPromises);
}
