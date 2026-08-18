import type { MediaAssetFilterType } from '@celebs/shared-types';

export const MEDIA_QUERY_KEYS = {
  all: ['media'] as const,
  assets: (filters?: Partial<MediaAssetFilterType>) => ['media', 'assets', filters] as const,
  quota: () => ['media', 'quota'] as const,
  folders: () => ['media', 'folders'] as const,
};
