import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateMediaFolderType,
  DeleteUnusedMediaType,
  IApiResponse,
  MediaAssetFilterType,
  MoveMediaType,
} from '@celebs/shared-types';

import type { PaginatedMediaAssetsResponse } from '../media-api';
import {
  cleanupUnusedMedia,
  createMediaFolder,
  deleteMediaAsset,
  deleteMediaFolder,
  getMediaAssets,
  getMediaFolders,
  getMediaQuota,
  moveMediaAssets,
} from '../media-api';
import { MEDIA_QUERY_KEYS } from '../media-query-keys';

export function useMediaAssets(filters?: Partial<MediaAssetFilterType>) {
  const normalized: Partial<MediaAssetFilterType> = { scope: 'PRODUCT', ...filters };
  // Media Center is product-only (Daraz-style); other scopes live in their domain pages
  if (!normalized.scope) normalized.scope = 'PRODUCT' as MediaAssetFilterType['scope'];
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.assets(normalized),
    queryFn: () => getMediaAssets(normalized),
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
 * Deletes a single asset with safe optimistic cache update and query invalidation.
 */
export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMediaAsset(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      const previous = queryClient.getQueriesData({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      queryClient.setQueriesData<IApiResponse<PaginatedMediaAssetsResponse>>(
        { queryKey: MEDIA_QUERY_KEYS.assetsRoot },
        (old) => {
          if (!old) return old;
          if (old.data && Array.isArray(old.data.items)) {
            return {
              ...old,
              data: {
                ...old.data,
                items: old.data.items.filter((asset) => asset.id !== id),
                total: Math.max(0, old.data.total - 1),
              },
            };
          }
          return old;
        },
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous?.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}

/**
 * Bulk-removes unused assets optimistically with safe rollback and invalidation.
 */
export function useCleanupUnusedMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteUnusedMediaType) => cleanupUnusedMedia(data),
    onMutate: async ({ assetIds }) => {
      await queryClient.cancelQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      const ids = new Set(assetIds);
      const previous = queryClient.getQueriesData({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      queryClient.setQueriesData<IApiResponse<PaginatedMediaAssetsResponse>>(
        { queryKey: MEDIA_QUERY_KEYS.assetsRoot },
        (old) => {
          if (!old) return old;
          if (old.data && Array.isArray(old.data.items)) {
            return {
              ...old,
              data: {
                ...old.data,
                items: old.data.items.filter((asset) => !ids.has(asset.id ?? '')),
                total: Math.max(0, old.data.total - ids.size),
              },
            };
          }
          return old;
        },
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous?.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.quota() });
    },
  });
}

export function useMoveMediaAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MoveMediaType) => moveMediaAssets(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.assetsRoot });
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.folders() });
    },
  });
}
