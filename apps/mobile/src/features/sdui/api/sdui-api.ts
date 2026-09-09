import type { IApiResponse } from '@celebs/shared-types';

import type { SDUIPageLayout } from '../types';

import { apiClient } from '@/api/client';

export interface PublicSettingsPayload {
  parsed?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function fetchSDUILayout(pageId: string = 'home'): Promise<SDUIPageLayout | null> {
  const response = await apiClient.get<IApiResponse<PublicSettingsPayload>>('/settings/public', {
    skipAuth: true,
  });

  const customLayout = response.data?.data?.parsed?.[`layout_${pageId}`] as
    | SDUIPageLayout
    | undefined;

  return customLayout ?? null;
}
