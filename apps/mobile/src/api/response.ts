import { AxiosResponse } from 'axios';

import type { IApiResponse } from '@celebs/shared-types';

import { ApiError } from './types';

/**
 * HTTP statuses a retry can never fix. Retrying them (TanStack Query's
 * default is 3 attempts) only delays the real error state and hammers a
 * resource that answered definitively.
 */
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 405, 409, 410, 422]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasMessage(value: unknown): value is { message: string } {
  return isRecord(value) && typeof value.message === 'string' && value.message.length > 0;
}

/**
 * Canonical IApiResponse guard (mobile AGENTS.md §5/§7).
 *
 * A payload is only a valid envelope when it is an object carrying a boolean
 * `success` and a `data` key. Anything else is a broken contract and must fail
 * fast — the backend controller is the thing to fix, never a client-side
 * fallback cascade.
 */
function isApiEnvelope(body: unknown): body is IApiResponse<unknown> {
  return isRecord(body) && typeof body.success === 'boolean' && 'data' in body;
}

function describeBody(body: unknown): string {
  if (body === null) return 'null';
  if (Array.isArray(body)) return `an array of length ${body.length}`;
  if (typeof body !== 'object') return typeof body;
  return `an object with keys [${Object.keys(body as Record<string, unknown>).join(', ')}]`;
}

/**
 * Safely unwrap an Axios response wrapping a canonical IApiResponse<T> payload.
 * Returns the inner T data directly, or throws a normalized ApiError that keeps
 * the HTTP status, backend code, and validation errors.
 */
export async function handleApiResponse<T>(
  requestPromise: Promise<AxiosResponse<IApiResponse<T>>>,
): Promise<T> {
  let response: AxiosResponse<IApiResponse<T>>;
  try {
    response = await requestPromise;
  } catch (error: unknown) {
    // Already normalized by the apiClient response interceptor (or by a caller).
    if (hasMessage(error)) throw error;
    throw { message: 'Network request failed' } as ApiError;
  }

  const body: unknown = response.data;

  if (!isApiEnvelope(body)) {
    throw {
      message:
        `Malformed API envelope from ${response.config?.url ?? 'the API'}: expected ` +
        `{ success: boolean, message, data } but received ${describeBody(body)}. ` +
        'Fix the backend controller instead of adding a client-side fallback.',
    } as ApiError;
  }

  if (body.success === false) {
    throw {
      message: body.message || 'Request failed',
      statusCode: response.status,
      ...(typeof body.errorCode === 'string' ? { code: body.errorCode } : {}),
      ...(Array.isArray(body.errors) ? { errors: body.errors } : {}),
    } as ApiError;
  }

  return body.data as T;
}

/**
 * True when the failure is definitive and must not be retried (notably 404).
 * Anything without a numeric statusCode is treated as transient.
 */
export function isNonRetryableApiError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const status = error.statusCode;
  return typeof status === 'number' && NON_RETRYABLE_STATUSES.has(status);
}
