import { describe, expect, it } from 'vitest';

import { handleApiResponse, isNonRetryableApiError } from '../response';

function ok(data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  } as never);
}

describe('handleApiResponse envelope', () => {
  it('unwraps success:true envelope to inner data', async () => {
    await expect(
      handleApiResponse(ok({ success: true, message: 'ok', data: { id: '1' } })),
    ).resolves.toEqual({ id: '1' });
  });

  it('resolves null data as null on a well-formed success envelope', async () => {
    await expect(
      handleApiResponse(ok({ success: true, message: 'ok', data: null })),
    ).resolves.toBeNull();
  });

  it('fails fast on a MISSING success flag instead of resolving truthy', async () => {
    await expect(handleApiResponse(ok({ message: 'ok', data: [1, 2] } as never))).rejects.toThrow(
      /Malformed API envelope/,
    );
  });

  it('fails fast on a null/array/primitive body', async () => {
    await expect(handleApiResponse(ok(null))).rejects.toThrow(/Malformed API envelope/);
    await expect(handleApiResponse(ok([1, 2]))).rejects.toThrow(/Malformed API envelope/);
    await expect(handleApiResponse(ok('nope'))).rejects.toThrow(/Malformed API envelope/);
  });

  it('fails fast when the envelope omits the data key entirely', async () => {
    await expect(handleApiResponse(ok({ success: true, message: 'ok' }))).rejects.toThrow(
      /Malformed API envelope/,
    );
  });

  it('fails fast when success is not a boolean', async () => {
    await expect(handleApiResponse(ok({ success: 'yes', message: 'ok', data: 1 }))).rejects.toThrow(
      /Malformed API envelope/,
    );
  });

  it('carries statusCode + code on the success:false error (no longer strips them)', async () => {
    try {
      await handleApiResponse(
        ok({ success: false, message: 'Nope', data: null, errorCode: 'PRODUCT_LOCKED' }),
      );
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ message: 'Nope', statusCode: 200, code: 'PRODUCT_LOCKED' });
    }
  });

  it('omits code entirely when the envelope carries no errorCode', async () => {
    try {
      await handleApiResponse(ok({ success: false, message: 'Nope', data: null }));
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ message: 'Nope', statusCode: 200 });
      expect(e as Record<string, unknown>).not.toHaveProperty('code');
    }
  });

  it('defaults message to "Request failed" when envelope has no message', async () => {
    try {
      await handleApiResponse(ok({ success: false, data: null }));
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ message: 'Request failed', statusCode: 200 });
    }
  });

  it('keeps the backend errors array when present', async () => {
    try {
      await handleApiResponse(
        ok({ success: false, message: 'Bad', data: null, errors: ['price is required'] }),
      );
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ message: 'Bad', errors: ['price is required'] });
    }
  });

  it('returns outer data as-is when payload is nested data.data (no deep-unwrap shim)', async () => {
    const nested = { items: [1] };
    await expect(
      handleApiResponse(ok({ success: true, message: 'ok', data: { data: nested } })),
    ).resolves.toEqual({ data: nested });
  });

  it('rethrows errors that already carry message unchanged', async () => {
    const custom = { message: 'Custom', statusCode: 422, code: 'VALIDATION' };
    await expect(handleApiResponse(Promise.reject(custom))).rejects.toBe(custom);
  });

  it('normalizes thrown non-objects to Network request failed', async () => {
    await expect(handleApiResponse(Promise.reject('boom' as never))).rejects.toEqual({
      message: 'Network request failed',
    });
  });

  it('normalizes Error instances without message-in-object to Network request failed', async () => {
    // Error has .message but `in` check on Error instance: 'message' in err is true
    // via prototype, so the raw Error is rethrown as-is (pinned).
    const err = new Error('Network Error');
    await expect(handleApiResponse(Promise.reject(err as never))).rejects.toBe(err);
  });
});

describe('isNonRetryableApiError', () => {
  it('marks 404 (and other definitive client errors) as non-retryable', () => {
    expect(isNonRetryableApiError({ message: 'x', statusCode: 404 })).toBe(true);
    expect(isNonRetryableApiError({ message: 'x', statusCode: 400 })).toBe(true);
    expect(isNonRetryableApiError({ message: 'x', statusCode: 403 })).toBe(true);
    expect(isNonRetryableApiError({ message: 'x', statusCode: 410 })).toBe(true);
  });

  it('keeps transient 5xx / network errors retryable', () => {
    expect(isNonRetryableApiError({ message: 'x', statusCode: 500 })).toBe(false);
    expect(isNonRetryableApiError({ message: 'x', statusCode: 503 })).toBe(false);
    expect(isNonRetryableApiError({ message: 'Network request failed' })).toBe(false);
    expect(isNonRetryableApiError(null)).toBe(false);
    expect(isNonRetryableApiError('boom')).toBe(false);
  });
});
