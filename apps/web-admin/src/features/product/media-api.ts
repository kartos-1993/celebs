import type {
  ConfirmUploadInput,
  CreateMediaFolderType,
  DeleteUnusedMediaType,
  IApiResponse,
  MediaAsset,
  MediaAssetFilterType,
  MediaFolder,
  MediaQuota,
  MoveMediaType,
  PresignFileInput,
  PresignFileResponse,
} from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

export interface PaginatedMediaAssetsResponse {
  items: MediaAsset[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const BASE_PATH = '/media';

export async function getMediaAssets(
  filters?: Partial<MediaAssetFilterType>,
): Promise<IApiResponse<PaginatedMediaAssetsResponse>> {
  const response = await axiosClient.get<IApiResponse<PaginatedMediaAssetsResponse>>(
    `${BASE_PATH}/assets`,
    { params: filters },
  );
  return response.data;
}

export async function getMediaQuota(): Promise<IApiResponse<MediaQuota>> {
  const response = await axiosClient.get<IApiResponse<MediaQuota>>(`${BASE_PATH}/quota`);
  return response.data;
}

export async function getMediaFolders(): Promise<IApiResponse<MediaFolder[]>> {
  const response = await axiosClient.get<IApiResponse<MediaFolder[]>>(`${BASE_PATH}/folders`);
  return response.data;
}

export async function createMediaFolder(
  data: CreateMediaFolderType,
): Promise<IApiResponse<MediaFolder>> {
  const response = await axiosClient.post<IApiResponse<MediaFolder>>(`${BASE_PATH}/folders`, data);
  return response.data;
}

export async function deleteMediaFolder(id: string): Promise<IApiResponse<{ message: string }>> {
  const response = await axiosClient.delete<IApiResponse<{ message: string }>>(
    `${BASE_PATH}/folders/${id}`,
  );
  return response.data;
}

export async function deleteMediaAsset(id: string): Promise<IApiResponse<{ message: string }>> {
  const response = await axiosClient.delete<IApiResponse<{ message: string }>>(
    `${BASE_PATH}/assets/${id}`,
  );
  return response.data;
}

export async function cleanupUnusedMedia(
  data: DeleteUnusedMediaType,
): Promise<IApiResponse<{ deletedCount: number }>> {
  const response = await axiosClient.post<IApiResponse<{ deletedCount: number }>>(
    `${BASE_PATH}/cleanup-unused`,
    data,
  );
  return response.data;
}

export async function presignMedia(
  data: PresignFileInput,
): Promise<IApiResponse<PresignFileResponse>> {
  const response = await axiosClient.post<IApiResponse<PresignFileResponse>>(
    `${BASE_PATH}/presign`,
    data,
  );
  return response.data;
}

export async function batchPresignMedia(
  files: PresignFileInput[],
): Promise<IApiResponse<PresignFileResponse[]>> {
  const response = await axiosClient.post<IApiResponse<PresignFileResponse[]>>(
    `${BASE_PATH}/batch-presign`,
    { files },
  );
  return response.data;
}

export async function confirmMediaUpload(
  data: ConfirmUploadInput,
): Promise<IApiResponse<MediaAsset>> {
  const response = await axiosClient.post<IApiResponse<MediaAsset>>(`${BASE_PATH}/confirm`, data);
  return response.data;
}

export async function moveMediaAssets(
  data: MoveMediaType,
): Promise<IApiResponse<{ movedCount: number }>> {
  const response = await axiosClient.post<IApiResponse<{ movedCount: number }>>(
    `${BASE_PATH}/assets/move`,
    data,
  );
  return response.data;
}
