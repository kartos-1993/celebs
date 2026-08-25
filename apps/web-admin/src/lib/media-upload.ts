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
 * Uploads a single file directly to Cloudflare R2 via a presigned PUT URL,
 * then confirms the upload with the backend to enqueue optimization.
 */
export async function directUploadFile(
  file: File,
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
): Promise<string> {
  const mimeType = (file.type || 'image/jpeg') as PresignFileInput['mimeType'];

  // 1. Get presigned PUT URL
  let presignData: PresignFileResponse | undefined;
  try {
    const presignRes = await axiosClient.post<ApiResponse<PresignFileResponse>>('/media/presign', {
      originalname: file.name,
      mimeType,
      size: file.size,
      folder,
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
    body: file,
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
    originalname: file.name,
    mimeType,
    size: file.size,
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
  const presignPayload = {
    files: files.map((file) => ({
      originalname: file.name,
      mimeType: (file.type || 'image/jpeg') as PresignFileInput['mimeType'],
      size: file.size,
      folder,
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

  // 2. Parallel upload and confirmation
  const uploadPromises = files.map(async (file, idx) => {
    const item = presignItems[idx];
    if (!item) throw new Error(`"${file.name}" was not accepted for upload`);

    const mimeType = (file.type || 'image/jpeg') as PresignFileInput['mimeType'];

    const putRes = await fetch(item.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
      },
    });

    if (!putRes.ok) {
      throw new Error(`"${file.name}" failed to transfer (status ${putRes.status})`);
    }

    try {
      const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>('/media/confirm', {
        key: item.key,
        originalname: file.name,
        mimeType,
        size: file.size,
        scope,
      });
      return confirmRes.data?.data?.url || item.publicUrl;
    } catch (error) {
      throw new Error(
        `"${file.name}" uploaded but registration failed — ${extractApiErrorMessage(error, 'try again')}`,
      );
    }
  });

  return Promise.all(uploadPromises);
}
