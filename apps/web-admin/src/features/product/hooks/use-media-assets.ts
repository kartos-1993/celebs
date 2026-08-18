import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMediaFolderType,
  DeleteUnusedMediaType,
  MediaAssetFilterType,
} from '@celebs/shared-types';
import {
  cleanupUnusedMedia,
  createMediaFolder,
  deleteMediaAsset,
  deleteMediaFolder,
  getMediaAssets,
  getMediaFolders,
  getMediaQuota,
} from '../media-api';
import { MEDIA_QUERY_KEYS } from '../media-query-keys';

export function useMediaAssets(filters?: Partial<MediaAssetFilterType>) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.assets(filters),
    queryFn: () => getMediaAssets(filters),
    select: (res) => res.data,
  });
}

export function useMediaQuota() {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.quota(),
    queryFn: getMediaQuota,
    select: (res) => res.data,
  });
}

export function useMediaFolders() {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.folders(),
    queryFn: getMediaFolders,
    select: (res) => res.data || [],
  });
}

export function useCreateMediaFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMediaFolderType) => createMediaFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.folders() });
    },
  });
}

export function useDeleteMediaFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMediaFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.folders() });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assets() });
    },
  });
}

export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMediaAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assets() });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}

export function useCleanupUnusedMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteUnusedMediaType) => cleanupUnusedMedia(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assets() });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}
