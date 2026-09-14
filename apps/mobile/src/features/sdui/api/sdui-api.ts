import type { IApiResponse } from '@celebs/shared-types';

import type { SDUIPageLayout } from '../types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const SDUI_QUERY_KEYS = {
  all: ['sdui'] as const,
  layout: (pageId: string) => [...SDUI_QUERY_KEYS.all, 'layout', pageId] as const,
};

export interface PublicSettingsPayload {
  parsed?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function fetchSDUILayout(pageId: string = 'home'): Promise<SDUIPageLayout | null> {
  if (pageId === 'home') {
    try {
      return await handleApiResponse(
        apiClient.get<IApiResponse<SDUIPageLayout>>('/storefront/home', {
          skipAuth: true,
        }),
      );
    } catch {
      // Graceful fallback to settings/public if composite endpoint is unreachable
    }
  }

  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<PublicSettingsPayload>>('/settings/public', {
      skipAuth: true,
    }),
  );

  const customLayout = payload?.parsed?.[`layout_${pageId}`] as SDUIPageLayout | undefined;
  return customLayout ?? null;
}
