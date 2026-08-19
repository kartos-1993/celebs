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

/**
 * Uploads a single file directly to Cloudflare R2 via a presigned PUT URL,
 * then confirms the upload with the backend to enqueue optimization.
 */
export async function directUploadFile(
  file: File,
  folder = 'celebs/products',
): Promise<string> {
  const mimeType = (file.type || 'image/jpeg') as PresignFileInput['mimeType'];

  // 1. Get presigned PUT URL
  const presignRes = await axiosClient.post<ApiResponse<PresignFileResponse>>(
    '/media/presign',
    {
      originalname: file.name,
      mimeType,
      size: file.size,
      folder,
    },
  );

  const presignData = presignRes.data?.data;
  if (!presignData?.uploadUrl) {
    throw new Error('Failed to obtain presigned upload URL');
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
    throw new Error(`Direct upload failed with status ${putRes.status}`);
  }

  // 3. Confirm upload with backend
  const confirmPayload: ConfirmUploadInput = {
    key: presignData.key,
    originalname: file.name,
    mimeType,
    size: file.size,
    scope: 'PRODUCT',
  };

  const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>(
    '/media/confirm',
    confirmPayload,
  );

  return confirmRes.data?.data?.url || presignData.publicUrl;
}

/**
 * Uploads multiple files in parallel directly to Cloudflare R2 via presigned PUT URLs.
 */
export async function directUploadBatch(
  files: File[],
  folder = 'celebs/products',
): Promise<string[]> {
  if (!files.length) return [];

  const presignPayload = {
    files: files.map((file) => ({
      originalname: file.name,
      mimeType: (file.type || 'image/jpeg') as PresignFileInput['mimeType'],
      size: file.size,
      folder,
    })),
  };

  // 1. Request batch presigned URLs
  const batchRes = await axiosClient.post<ApiResponse<PresignFileResponse[]>>(
    '/media/batch-presign',
    presignPayload,
  );

  const presignItems = batchRes.data?.data || [];

  // 2. Parallel upload and confirmation
  const uploadPromises = files.map(async (file, idx) => {
    const item = presignItems[idx];
    if (!item) throw new Error(`Missing presign item for file index ${idx}`);

    const mimeType = (file.type || 'image/jpeg') as PresignFileInput['mimeType'];

    const putRes = await fetch(item.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
      },
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed for ${file.name} (status ${putRes.status})`);
    }

    const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>(
      '/media/confirm',
      {
        key: item.key,
        originalname: file.name,
        mimeType,
        size: file.size,
        scope: 'PRODUCT',
      },
    );

    return confirmRes.data?.data?.url || item.publicUrl;
  });

  return Promise.all(uploadPromises);
}
