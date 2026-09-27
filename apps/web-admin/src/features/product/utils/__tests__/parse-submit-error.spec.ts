import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios/axios-client', () => ({
  axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/media-upload', () => ({ directUploadBatch: vi.fn() }));

import { type ParsedSubmitError, parseSubmitError } from '../../api';

/**
 * The express error-handler flattens the envelope on the axios response
 * interceptor, so a structured 400 arrives with `errors` at the ROOT.
 */
const structuredRejection = (errors: Array<{ field?: string; message: string }>) => ({
  status: 400,
  success: false,
  message: errors[0]?.message ?? 'Validation failed',
  errorCode: 'VALIDATION_ERROR',
  errors,
  data: null,
});

describe('parseSubmitError — structured server shape (errors[])', () => {
  it('maps every field-mapped entry to a form path', () => {
    const parsed = parseSubmitError(
      structuredRejection([
        { field: 'name', message: 'Name must be at least 30 characters' },
        { field: 'sku.default.price', message: 'Price must be positive' },
      ]),
    );

    expect(parsed.fieldErrors).toEqual([
      { path: 'name', message: 'Name must be at least 30 characters' },
      { path: 'sku.default.price', message: 'Price must be positive' },
    ]);
    expect(parsed.message).toBe('Name must be at least 30 characters');
  });

  it('reads the array off a raw AxiosError envelope too', () => {
    const parsed = parseSubmitError({
      response: {
        data: {
          message: 'Invalid payload',
          errors: [{ field: 'brand', message: 'Unknown brand' }],
        },
      },
    });

    expect(parsed.fieldErrors).toEqual([{ path: 'brand', message: 'Unknown brand' }]);
    expect(parsed.message).toBe('Invalid payload');
  });

  it('treats a field-less entry as a global message, not a field error', () => {
    const parsed = parseSubmitError(
      structuredRejection([{ message: 'Category is locked for published products' }]),
    );

    expect(parsed.fieldErrors).toEqual([]);
    expect(parsed.message).toBe('Category is locked for published products');
  });

  it('accepts the `path` alias used by some serializers', () => {
    const parsed = parseSubmitError({
      errors: [{ path: 'colorMeta', message: 'Swatch is required' }],
    });

    expect(parsed.fieldErrors).toEqual([{ path: 'colorMeta', message: 'Swatch is required' }]);
  });

  it('ignores entries without a usable message', () => {
    const parsed = parseSubmitError({
      message: 'Something failed',
      errors: [{ field: 'name' }, {}, { field: 'brand', message: '   ' }],
    });

    expect(parsed.fieldErrors).toEqual([]);
    expect(parsed.message).toBe('Something failed');
  });
});

describe('parseSubmitError — legacy shapes', () => {
  it('falls back to the envelope message when no detail array exists', () => {
    const parsed = parseSubmitError({
      status: 409,
      message: 'A record with this sellerSku already exists.',
      errorCode: 'CONFLICT',
    });

    expect(parsed).toEqual({
      fieldErrors: [],
      message: 'A record with this sellerSku already exists.',
    });
  });

  it('falls back to a legacy `data` array of bare strings', () => {
    const parsed = parseSubmitError({ message: 'Invalid payload', data: ['First problem'] });

    expect(parsed).toEqual({ fieldErrors: [], message: 'First problem' });
  });

  it('falls back to a legacy `data` array of { message } objects', () => {
    const parsed = parseSubmitError({ data: [{ field: 'price', message: 'Price is required' }] });

    expect(parsed.fieldErrors).toEqual([{ path: 'price', message: 'Price is required' }]);
  });

  it('normalizes unusable input to an empty contract', () => {
    const expected: ParsedSubmitError = { fieldErrors: [], message: '' };
    expect(parseSubmitError(undefined)).toEqual(expected);
    expect(parseSubmitError(null)).toEqual(expected);
    expect(parseSubmitError('boom')).toEqual({ fieldErrors: [], message: 'boom' });
    expect(parseSubmitError({ errors: [] })).toEqual({ fieldErrors: [], message: '' });
    expect(parseSubmitError({ errors: 'not-an-array' })).toEqual({ fieldErrors: [], message: '' });
  });

  it('trims whitespace-only noise out of the mapped path', () => {
    const parsed = parseSubmitError({
      errors: [{ field: '  brand  ', message: '  Unknown brand ' }],
    });

    expect(parsed).toEqual({
      fieldErrors: [{ path: 'brand', message: 'Unknown brand' }],
      message: '',
    });
  });
});
