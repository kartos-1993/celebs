import type { IApiResponse } from '@celebs/shared-types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  pushTokens: () => [...NOTIFICATION_QUERY_KEYS.all, 'push-tokens'] as const,
};

export async function registerPushTokenApi(pushToken: string): Promise<void> {
  await handleApiResponse(
    apiClient.post<IApiResponse<null>>('/notifications/push-tokens', { pushToken }),
  );
}

export async function unregisterPushTokenApi(pushToken: string): Promise<void> {
  await handleApiResponse(
    apiClient.delete<IApiResponse<null>>('/notifications/push-tokens', {
      data: { pushToken },
    }),
  );
}
