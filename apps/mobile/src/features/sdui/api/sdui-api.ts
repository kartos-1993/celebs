import type { IApiResponse } from '@celebs/shared-types';

import type { SDUIPageLayout } from '../types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export interface PublicSettingsPayload {
  parsed?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function fetchSDUILayout(pageId: string = 'home'): Promise<SDUIPageLayout | null> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<PublicSettingsPayload>>('/settings/public', {
      skipAuth: true,
    }),
  );

  const customLayout = payload?.parsed?.[`layout_${pageId}`] as SDUIPageLayout | undefined;
  return customLayout ?? null;
}
