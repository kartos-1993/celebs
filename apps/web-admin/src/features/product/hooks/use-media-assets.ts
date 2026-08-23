import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { PaginatedMediaAssetsResponse } from '../media-api';
import { MEDIA_QUERY_KEYS } from '../media-query-keys';

export function useMediaAssets(filters?: Partial<MediaAssetFilterType>) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.assets(filters),
    queryFn: () => getMediaAssets(filters),
    select: (res) => res.data,
    // Keep the previous grid visible while filters/search change
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
    },
  });
}

/**
 * Deletes a single asset with an OPTIMISTIC update: the tile disappears
 * instantly, only that tile is affected, and the list rolls back if the
 * server rejects the delete. Quota is refreshed in the background.
 */
export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMediaAsset(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      const previous = queryClient.getQueriesData<PaginatedMediaAssetsResponse>({
        queryKey: MEDIA_QUERY_KEYS.assetsRoot,
      });
      queryClient.setQueriesData<PaginatedMediaAssetsResponse>(
        { queryKey: MEDIA_QUERY_KEYS.assetsRoot },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((asset) => asset.id !== id),
                total: Math.max(0, old.total - 1),
              }
            : old,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}

/**
 * Bulk-removes unused assets optimistically (same rollback semantics as
 * single delete).
 */
export function useCleanupUnusedMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteUnusedMediaType) => cleanupUnusedMedia(data),
    onMutate: async ({ assetIds }) => {
      await queryClient.cancelQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      const ids = new Set(assetIds);
      const previous = queryClient.getQueriesData<PaginatedMediaAssetsResponse>({
        queryKey: MEDIA_QUERY_KEYS.assetsRoot,
      });
      queryClient.setQueriesData<PaginatedMediaAssetsResponse>(
        { queryKey: MEDIA_QUERY_KEYS.assetsRoot },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((asset) => !ids.has(asset.id ?? '')),
              }
            : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}
