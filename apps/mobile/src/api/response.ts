import { AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from './types';

/**
 * Safely unwrap an Axios response wrapping an ApiResponse<T> payload.
 */
export async function handleApiResponse<T>(
  requestPromise: Promise<AxiosResponse<ApiResponse<T>>>
): Promise<T> {
  try {
    const response = await requestPromise;
    if (response.data && response.data.success !== false) {
      return response.data.data;
    }
    throw {
      message: response.data?.message || 'Request failed',
    } as ApiError;
  } catch (error) {
    if ((error as ApiError).message) {
      throw error;
    }
    throw {
      message: 'Network request failed',
    } as ApiError;
  }
}
