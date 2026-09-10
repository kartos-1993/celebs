import { AxiosResponse } from 'axios';

import type { IApiResponse } from '@celebs/shared-types';

import { ApiError } from './types';

/**
 * Safely unwrap an Axios response wrapping a canonical IApiResponse<T> payload.
 * Returns the inner T data directly, or throws a normalized ApiError.
 */
export async function handleApiResponse<T>(
  requestPromise: Promise<AxiosResponse<IApiResponse<T>>>,
): Promise<T> {
  try {
    const response = await requestPromise;
    const body = response.data;
    if (body && body.success !== false) {
      return body.data as T;
    }
    throw {
      message: body?.message || 'Request failed',
    } as ApiError;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      throw error;
    }
    throw {
      message: 'Network request failed',
    } as ApiError;
  }
}
