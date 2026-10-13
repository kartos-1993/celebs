import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { hostUri: 'localhost:8081' } },
}));

import { apiClient } from '../client';
import { ApiError } from '../types';

describe('Mobile API Client Error Response Interceptor', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('preserves canonical errorCode from backend response in rejected ApiError code property', async () => {
    // Simulate server 422 error carrying canonical IApiResponse errorCode
    apiClient.defaults.adapter = async (config) => {
      const error = new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_REQUEST',
        config,
        null,
        {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: {},
          config,
          data: {
            success: false,
            message: 'Requested variant is currently out of stock',
            errorCode: 'INSUFFICIENT_STOCK',
            errors: [{ field: 'quantity', message: 'Not enough inventory' }],
          },
        },
      );
      return Promise.reject(error);
    };

    let caughtError: ApiError | undefined;
    try {
      await apiClient.get('/test-endpoint');
    } catch (err) {
      caughtError = err as ApiError;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError?.statusCode).toBe(422);
    expect(caughtError?.message).toBe('Requested variant is currently out of stock');
    // Must capture the canonical server errorCode, not Axios internal error.code ('ERR_BAD_REQUEST')
    expect(caughtError?.code).toBe('INSUFFICIENT_STOCK');
    expect(caughtError?.errors).toEqual([{ field: 'quantity', message: 'Not enough inventory' }]);
  });

  it('falls back to Axios error code when network connection fails with no server response', async () => {
    // Simulate network error with zero server response
    apiClient.defaults.adapter = async (config) => {
      const networkError = new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined);
      return Promise.reject(networkError);
    };

    let caughtError: ApiError | undefined;
    try {
      await apiClient.get('/test-endpoint');
    } catch (err) {
      caughtError = err as ApiError;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toBe('Network Error');
    expect(caughtError?.code).toBe('ERR_NETWORK');
  });
});
